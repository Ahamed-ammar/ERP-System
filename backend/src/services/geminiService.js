/**
 * AI Service (Groq backend) — Phase AI
 *
 * Replaces the original Gemini implementation.
 * Uses Groq's free API:
 *   - Text extraction:  llama-3.3-70b-versatile  (fast, understands Tamil/Tanglish)
 *   - Audio transcription: whisper-large-v3-turbo → then text extraction
 *
 * The public API surface is identical to the original geminiService.js
 * so no other files need to change.
 */

import Groq from 'groq-sdk';
import { Readable } from 'stream';
import logger from '../utils/logger.js';

// ─── Client ───────────────────────────────────────────────────────────────────

let _client = null;

const getClient = () => {
  if (!_client) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY is not set in environment variables');
    _client = new Groq({ apiKey });
  }
  return _client;
};

// Model config — override via env vars
const TEXT_MODEL  = () => process.env.GROQ_TEXT_MODEL  || 'llama-3.3-70b-versatile';
const AUDIO_MODEL = () => process.env.GROQ_AUDIO_MODEL || 'whisper-large-v3-turbo';

// ─── Empty extraction schema ──────────────────────────────────────────────────

export const EMPTY_EXTRACTION = () => ({
  customer: { name: null, phone: null, customerId: null },
  items: [],
  deliveryType: null,
  deliveryAddress: null,
  missingFields: [],
  clarificationQuestion: null,
  confidence: {
    customer: null, items: null, quantity: null,
    grindType: null, orderType: null, deliveryType: null,
  },
  readyForConfirmation: false,
});

// ─── System prompt ────────────────────────────────────────────────────────────

const buildSystemPrompt = (context) => `
You are the AI Order Assistant for OrderNest, a flour and spice grinding mill ERP.
Your ONLY job is to extract structured order information from Tamil, English, or Tanglish messages.

STRICT RULES:
1. NEVER invent information. If unknown, use null.
2. NEVER calculate prices or create database records.
3. Return ALL field values in ENGLISH.
4. For grind type: "நைஸ்"/"fine"/"podi" → "Fine", "medium" → "Medium", "coarse"/"kora" → "Coarse". Unknown → null.
5. For order type: customer brings own material (service only) → "serviceOnly". Mill provides material → "buyAndService". Unknown → null.
6. For delivery: "delivery"/"வீட்டுக்கு" → "Delivery". "pickup"/"வாங்கிக்கிறேன்" → "Pickup". Unknown → null.
7. Only use product names from this list: ${context.productNames.join(', ')}.
8. If product mentioned does not match list, use null for productName.
9. Preserve existing draft values. Only update fields explicitly mentioned.
10. Never mark readyForConfirmation=true.

Return ONLY valid JSON, no markdown, no explanation:
{
  "customer": { "name": string|null, "phone": string|null, "customerId": null },
  "items": [{ "productName": string|null, "productId": null, "quantityKg": number|null, "grindType": "Fine"|"Medium"|"Coarse"|null, "orderType": "serviceOnly"|"buyAndService"|null }],
  "deliveryType": "Pickup"|"Delivery"|null,
  "deliveryAddress": null,
  "missingFields": [string],
  "clarificationQuestion": string|null,
  "confidence": { "customer": "high"|"medium"|"low"|null, "items": "high"|"medium"|"low"|null, "quantity": "high"|"medium"|"low"|null, "grindType": "high"|"medium"|"low"|null, "orderType": "high"|"medium"|"low"|null, "deliveryType": "high"|"medium"|"low"|null },
  "readyForConfirmation": false
}
`.trim();

// ─── Text extraction ──────────────────────────────────────────────────────────

export const extractFromText = async (userMessage, currentDraft, context) => {
  const client = getClient();

  const draftContext = currentDraft && Object.keys(currentDraft).length
    ? `\nCURRENT DRAFT (preserve these unless user explicitly changes):\n${JSON.stringify(currentDraft, null, 2)}`
    : '';

  const userContent = `${draftContext}\n\nNEW MESSAGE:\n"${userMessage}"\n\nExtract or update order info. Return only JSON.`;

  try {
    const completion = await client.chat.completions.create({
      model:       TEXT_MODEL(),
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user',   content: userContent },
      ],
      temperature:  0.1,
      max_tokens:   1024,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';
    return parseJSON(raw);
  } catch (err) {
    const msg = err?.message || String(err);
    logger.error('Groq text extraction failed', { error: msg });
    throw new Error(`Groq API error: ${msg}`);
  }
};

// ─── Audio extraction ─────────────────────────────────────────────────────────

export const extractFromAudio = async (audioBuffer, mimeType, currentDraft, context) => {
  const client = getClient();

  // Step 1 — Transcribe with Whisper
  let transcript = '';
  try {
    // Groq needs a File-like object with a name
    const ext = mimeType.includes('mp4') || mimeType.includes('m4a') ? 'm4a'
              : mimeType.includes('mp3') || mimeType.includes('mpeg') ? 'mp3'
              : mimeType.includes('ogg') ? 'ogg'
              : mimeType.includes('wav') ? 'wav'
              : 'webm';

    // Convert Buffer → File (Groq SDK accepts File objects or Blob with name)
    const blob = new Blob([audioBuffer], { type: mimeType });
    const file = new File([blob], `recording.${ext}`, { type: mimeType });

    const transcription = await client.audio.transcriptions.create({
      file,
      model:    AUDIO_MODEL(),
      language: 'ta',   // Tamil — Whisper also auto-detects English/mixed
      response_format: 'text',
    });

    transcript = typeof transcription === 'string'
      ? transcription
      : transcription?.text ?? '';

    logger.info('Audio transcribed', { transcript: transcript.slice(0, 100) });
  } catch (err) {
    const msg = err?.message || String(err);
    logger.error('Groq audio transcription failed', { error: msg });
    throw new Error(`Groq API error: ${msg}`);
  }

  if (!transcript.trim()) {
    const empty = EMPTY_EXTRACTION();
    empty.clarificationQuestion = 'I could not understand the audio. Could you please speak more clearly or type the order?';
    return empty;
  }

  // Step 2 — Extract order info from transcript using text model
  return extractFromText(
    `[Transcribed from voice recording]: ${transcript}`,
    currentDraft,
    context
  );
};

// ─── JSON parser ──────────────────────────────────────────────────────────────

const parseJSON = (raw) => {
  const cleaned = raw
    .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      customer:              parsed.customer              ?? { name: null, phone: null, customerId: null },
      items:                 Array.isArray(parsed.items)  ? parsed.items : [],
      deliveryType:          parsed.deliveryType          ?? null,
      deliveryAddress:       parsed.deliveryAddress       ?? null,
      missingFields:         Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      clarificationQuestion: parsed.clarificationQuestion ?? null,
      confidence:            parsed.confidence            ?? {},
      readyForConfirmation:  false,
    };
  } catch {
    logger.warn('Failed to parse AI JSON', { raw: raw.slice(0, 150) });
    const empty = EMPTY_EXTRACTION();
    empty.clarificationQuestion = 'I could not understand that. Could you please rephrase the order?';
    return empty;
  }
};
