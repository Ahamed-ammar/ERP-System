/**
 * AI Phone Order Assistant — Admin Page
 *
 * Allows the admin to receive phone orders in Tamil/English/Tanglish
 * (text or audio), have Gemini extract the structured data, review it,
 * and confirm — which calls the existing ERP order creation flow.
 *
 * Layout matches the existing admin pages exactly (md:ml-64, same cards,
 * same buttons, same Tailwind design tokens).
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  createDraft,
  sendChatMessage,
  sendVoiceMessage,
  confirmDraft,
  cancelDraft,
  listDrafts,
} from '../../api/aiOrderApi';

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL = {
  collecting:               'Collecting information…',
  waiting_for_clarification:'Needs clarification',
  ready_for_confirmation:   'Ready to confirm',
  confirmed:                'Confirmed',
  created:                  '✅ Order created',
  cancelled:                'Cancelled',
  failed:                   'Failed',
};

const STATUS_COLOR = {
  collecting:               'text-on-surface-variant',
  waiting_for_clarification:'text-amber-600',
  ready_for_confirmation:   'text-primary font-bold',
  confirmed:                'text-primary',
  created:                  'text-primary',
  cancelled:                'text-error',
  failed:                   'text-error',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** A single chat bubble */
const ChatBubble = ({ msg }) => {
  const isAdmin = msg.role === 'admin';
  return (
    <div className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black ${
        isAdmin ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'
      }`}>
        {isAdmin ? 'MOM' : 'AI'}
      </div>
      {/* Bubble */}
      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
        isAdmin
          ? 'bg-primary text-on-primary rounded-tr-none'
          : 'bg-surface-container-low text-on-surface rounded-tl-none'
      }`}>
        {msg.content}
      </div>
    </div>
  );
};

/** Draft Order panel showing extracted fields */
const DraftPanel = ({ draft, onConfirm, onCancel, confirming }) => {
  if (!draft) return null;
  const e = draft.extractedOrder || {};
  const v = draft.validation     || {};
  const isReady = draft.status === 'ready_for_confirmation';
  const isDone  = ['created', 'cancelled', 'confirmed'].includes(draft.status);

  return (
    <div className="bg-surface-container-lowest rounded-xl shadow-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-on-surface">Draft Order</h3>
        <span className={`text-xs font-bold ${STATUS_COLOR[draft.status] ?? 'text-on-surface-variant'}`}>
          {STATUS_LABEL[draft.status] ?? draft.status}
        </span>
      </div>

      {/* Customer */}
      <Field label="Customer" value={e.customerName} resolved={!!e.customerId} />

      {/* Items */}
      {Array.isArray(e.items) && e.items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Items</p>
          {e.items.map((item, i) => (
            <div key={i} className="bg-surface-container-low rounded-xl px-4 py-3 text-sm space-y-1">
              <p className="font-bold text-on-surface">
                {item.productName ?? <span className="text-amber-600 italic">Product missing</span>}
                {item.productId && <span className="ml-1 text-[10px] text-primary font-black">✓</span>}
              </p>
              <p className="text-on-surface-variant">
                {item.quantityKg ? `${item.quantityKg} kg` : <MissingTag label="qty" />}
                {' · '}
                {item.grindType  ?? <MissingTag label="grind" />}
                {' · '}
                {item.orderType  ? (item.orderType === 'buyAndService' ? 'Buy & Service' : 'Service Only')
                                 : <MissingTag label="order type" />}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <Field label="Items" value={null} />
      )}

      {/* Delivery */}
      <Field label="Delivery Type" value={e.deliveryType} />
      {e.deliveryType === 'Delivery' && (
        <Field
          label="Address"
          value={
            e.deliveryAddress?.houseName
              ? `${e.deliveryAddress.doorNo}, ${e.deliveryAddress.houseName}, ${e.deliveryAddress.streetType}`
              : null
          }
        />
      )}

      {/* Missing fields */}
      {v.missingFields?.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Missing information</p>
          <ul className="space-y-1">
            {v.missingFields.map(f => (
              <li key={f} className="text-xs text-amber-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">error_outline</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ambiguous fields */}
      {v.ambiguousFields?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Needs clarification</p>
          <ul className="space-y-1">
            {v.ambiguousFields.map(f => (
              <li key={f} className="text-xs text-orange-800 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[13px]">help_outline</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      {!isDone && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={!isReady || confirming}
            className="flex-1 sage-gradient text-on-primary font-headline font-bold py-3 rounded-full shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {confirming ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Confirm Order
              </>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={confirming}
            className="px-5 py-3 bg-surface-container-low text-on-surface font-headline font-bold rounded-full hover:bg-surface-container-high transition-all disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      )}

      {draft.status === 'created' && (
        <div className="bg-primary-container/20 rounded-xl px-4 py-3 text-center">
          <p className="font-headline font-bold text-primary">Order created successfully!</p>
          <p className="text-xs text-on-surface-variant mt-1">It now appears in the Orders management page.</p>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, resolved }) => (
  <div className="flex justify-between items-start">
    <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">{label}</span>
    <span className={`text-sm font-medium ${value ? 'text-on-surface' : 'text-amber-600 italic'}`}>
      {value
        ? <>{value}{resolved && <span className="ml-1 text-[10px] text-primary font-black">✓</span>}</>
        : 'Missing'}
    </span>
  </div>
);

const MissingTag = ({ label }) => (
  <span className="text-amber-600 italic">{label} missing</span>
);

// ─── Main Page ────────────────────────────────────────────────────────────────

const AiPhoneOrderPage = () => {
  const navigate = useNavigate();

  // Chat state
  const [messages,   setMessages]   = useState([]);
  const [inputText,  setInputText]  = useState('');
  const [draft,      setDraft]      = useState(null);
  const [draftId,    setDraftId]    = useState(null);
  const [sending,    setSending]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [starting,   setStarting]   = useState(false);

  // Audio upload state
  const [audioFile,   setAudioFile]   = useState(null);
  const fileInputRef = useRef(null);
  const chatEndRef   = useRef(null);

  // Session list (show recent drafts on mount)
  const [recentDrafts, setRecentDrafts] = useState([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load recent drafts on mount
  useEffect(() => {
    listDrafts()
      .then(res => setRecentDrafts(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingDrafts(false));
  }, []);

  // ── Session management ────────────────────────────────────────────────────

  const startNewSession = async () => {
    setStarting(true);
    try {
      const res = await createDraft();
      setDraftId(res.data.draftId);
      setDraft({ status: res.data.status, extractedOrder: {}, validation: {} });
      setMessages([{
        role:    'ai',
        content: '👋 Hello! Please tell me the customer\'s phone order.\n\nYou can type in Tamil, English, or Tanglish — or upload an audio file.\n\nExample: "ரவி கடைக்கு 5 கிலோ மிளகாய் fine அரைக்கணும். delivery பண்ணிடுங்க."',
        timestamp: new Date(),
      }]);
      setInputText('');
      setAudioFile(null);
    } catch (err) {
      toast.error('Failed to start session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const resumeSession = (existingDraft) => {
    setDraftId(existingDraft._id);
    setDraft(existingDraft);
    const msgs = (existingDraft.messages || []).map(m => ({
      role:      m.role,
      content:   m.content,
      timestamp: new Date(m.timestamp),
    }));
    if (msgs.length === 0) {
      msgs.push({
        role:    'ai',
        content: '👋 Session resumed. Continue from where you left off.',
        timestamp: new Date(),
      });
    }
    setMessages(msgs);
  };

  // ── Send text ─────────────────────────────────────────────────────────────

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || !draftId || sending) return;

    // Optimistically add admin message
    const adminMsg = { role: 'admin', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, adminMsg]);
    setInputText('');
    setSending(true);

    try {
      const res = await sendChatMessage(draftId, text);
      const { aiMessage, extractedOrder, validation, status } = res.data;
      setMessages(prev => [...prev, { role: 'ai', content: aiMessage, timestamp: new Date() }]);
      setDraft(prev => ({ ...prev, extractedOrder, validation, status }));
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Something went wrong. Please try again.';
      setMessages(prev => [...prev, {
        role:    'ai',
        content: `⚠️ ${errMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
    }
  };

  // ── Send audio ────────────────────────────────────────────────────────────

  const handleAudioUpload = async (file) => {
    if (!file || !draftId) return;
    setAudioFile(file);

    const adminMsg = {
      role:    'admin',
      content: `🎙️ Audio uploaded: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, adminMsg]);
    setSending(true);

    try {
      const res = await sendVoiceMessage(draftId, file);
      const { aiMessage, extractedOrder, validation, status } = res.data;
      setMessages(prev => [...prev, { role: 'ai', content: aiMessage, timestamp: new Date() }]);
      setDraft(prev => ({ ...prev, extractedOrder, validation, status }));
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Failed to process audio.';
      setMessages(prev => [...prev, {
        role:    'ai',
        content: `⚠️ ${errMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setSending(false);
      setAudioFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Confirm ───────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    if (!draftId || confirming) return;
    setConfirming(true);
    try {
      const res = await confirmDraft(draftId);
      setDraft(prev => ({ ...prev, status: 'created' }));
      setMessages(prev => [...prev, {
        role:    'ai',
        content: `✅ Order created successfully!\nOrder ID: ${String(res.data.orderId).slice(-8).toUpperCase()}\nTotal: ₹${res.data.totalAmount?.toFixed(0)}\nEstimated ready: ${res.data.estimatedReadyDate ? new Date(res.data.estimatedReadyDate).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : 'TBD'}`,
        timestamp: new Date(),
      }]);
      toast.success('Phone order created successfully!');
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || 'Order creation failed.';
      toast.error(errMsg);
      setMessages(prev => [...prev, {
        role:    'ai',
        content: `❌ Could not create order: ${errMsg}`,
        timestamp: new Date(),
      }]);
    } finally {
      setConfirming(false);
    }
  };

  // ── Cancel ────────────────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!draftId) return;
    try {
      await cancelDraft(draftId);
      setDraft(prev => ({ ...prev, status: 'cancelled' }));
      setMessages(prev => [...prev, {
        role: 'ai', content: 'Order draft cancelled.', timestamp: new Date(),
      }]);
    } catch {
      toast.error('Failed to cancel draft');
    }
  };

  // ── Keyboard submit ───────────────────────────────────────────────────────

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sessionActive = !!draftId && !['cancelled', 'failed'].includes(draft?.status);
  const sessionDone   = draft?.status === 'created';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="md:ml-64 min-h-screen bg-background pt-16 md:pt-0">
      <div className="p-6 md:p-8 max-w-6xl mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <section className="mb-8">
          <nav className="flex items-center gap-2 text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest mb-2">
            <span>Admin</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary">AI Phone Orders</span>
          </nav>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h1 className="font-headline text-4xl font-extrabold text-on-background tracking-tight">
                AI Phone Order Assistant
              </h1>
              <p className="text-on-surface-variant mt-1">
                Convert Tamil phone orders into verified ERP orders
              </p>
            </div>
            {!sessionActive && (
              <button
                onClick={startNewSession}
                disabled={starting}
                className="sage-gradient text-on-primary px-8 py-4 rounded-full font-headline font-bold flex items-center gap-3 shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-50"
              >
                {starting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Starting…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add_call</span>
                    New Phone Order
                  </>
                )}
              </button>
            )}
            {(sessionDone || draft?.status === 'cancelled') && (
              <button
                onClick={startNewSession}
                className="flex items-center gap-2 px-6 py-3 bg-surface-container-low text-on-surface rounded-full font-headline font-bold hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Start New Session
              </button>
            )}
          </div>
        </section>

        {/* ── No active session — show intro + recent drafts ────────────────── */}
        {!sessionActive && !draft && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* How it works */}
            <div className="bg-surface-container-lowest rounded-xl shadow-card p-8 space-y-5">
              <h2 className="font-headline font-bold text-xl text-on-surface">How it works</h2>
              {[
                { icon: 'record_voice_over', step: '1', text: 'Customer calls and places an order in Tamil or English' },
                { icon: 'chat',              step: '2', text: 'Type what the customer said, or upload an audio recording' },
                { icon: 'psychology',        step: '3', text: 'AI extracts product, quantity, grind type, and delivery details' },
                { icon: 'fact_check',        step: '4', text: 'Review the extracted order. Fill in any missing details.' },
                { icon: 'check_circle',      step: '5', text: 'Confirm to create the order in the ERP — pricing and inventory handled automatically' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-lg">{s.icon}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant pt-1.5">{s.text}</p>
                </div>
              ))}
            </div>

            {/* Recent drafts */}
            <div className="bg-surface-container-lowest rounded-xl shadow-card p-8">
              <h2 className="font-headline font-bold text-xl text-on-surface mb-5">Recent Sessions</h2>
              {loadingDrafts ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : recentDrafts.length === 0 ? (
                <p className="text-on-surface-variant text-sm text-center py-8">No recent sessions</p>
              ) : (
                <div className="space-y-3">
                  {recentDrafts.slice(0, 8).map(d => (
                    <button
                      key={d._id}
                      onClick={() => resumeSession(d)}
                      className="w-full flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-on-surface truncate">
                          {d.extractedOrder?.customerName || 'Unknown customer'}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {new Date(d.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`text-xs font-bold flex-shrink-0 ${STATUS_COLOR[d.status] ?? ''}`}>
                        {STATUS_LABEL[d.status] ?? d.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Active chat session ───────────────────────────────────────────── */}
        {(sessionActive || sessionDone) && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Chat area */}
            <div className="lg:col-span-7 flex flex-col gap-4">

              {/* Messages */}
              <div className="bg-surface-container-lowest rounded-xl shadow-card p-6 flex flex-col gap-4 min-h-[480px] max-h-[600px] overflow-y-auto">
                {messages.map((msg, i) => (
                  <ChatBubble key={i} msg={msg} />
                ))}
                {sending && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-xs font-black text-on-surface">AI</div>
                    <div className="bg-surface-container-low rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1.5 items-center h-4">
                        {[0,1,2].map(i => (
                          <div key={i} className="w-2 h-2 rounded-full bg-on-surface-variant animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input area */}
              {!sessionDone && draft?.status !== 'cancelled' && (
                <div className="bg-surface-container-lowest rounded-xl shadow-card p-4 space-y-3">
                  {/* Audio file selected indicator */}
                  {audioFile && (
                    <div className="flex items-center gap-2 bg-primary-container/20 px-3 py-2 rounded-lg text-sm">
                      <span className="material-symbols-outlined text-primary text-base">audio_file</span>
                      <span className="text-on-surface flex-1 truncate">{audioFile.name}</span>
                      <button onClick={() => { setAudioFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                        className="text-on-surface-variant hover:text-error">
                        <span className="material-symbols-outlined text-base">close</span>
                      </button>
                    </div>
                  )}

                  <div className="flex gap-3 items-end">
                    <textarea
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type in Tamil, English, or Tanglish… (Enter to send)"
                      rows={2}
                      disabled={sending}
                      className="flex-1 bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none disabled:opacity-50"
                      style={{ fontSize: '16px' }}
                    />
                    {/* Audio upload button */}
                    <label
                      className="p-3 rounded-xl bg-surface-container-low hover:bg-surface-container-high transition-all cursor-pointer text-on-surface-variant hover:text-primary flex-shrink-0"
                      title="Upload audio recording"
                    >
                      <span className="material-symbols-outlined">mic</span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={e => { if (e.target.files[0]) handleAudioUpload(e.target.files[0]); }}
                      />
                    </label>
                    {/* Send button */}
                    <button
                      onClick={handleSend}
                      disabled={(!inputText.trim() && !audioFile) || sending}
                      className="p-3 sage-gradient text-on-primary rounded-xl shadow-sage hover:shadow-sage-lg active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
                    >
                      <span className="material-symbols-outlined">send</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-on-surface-variant">
                    💡 Tip: You can upload a .wav, .mp3, .m4a, or .webm audio file of the phone call.
                  </p>
                </div>
              )}
            </div>

            {/* Draft panel */}
            <div className="lg:col-span-5">
              <DraftPanel
                draft={draft}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                confirming={confirming}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AiPhoneOrderPage;
