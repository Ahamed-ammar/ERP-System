/**
 * AI Service (Groq backend) — Phase AI
 *
 * Replaces the original Gemini implementation.
 * Uses Groq's free API:
 *   - Text extraction:  llama-3.3-70b-versatile  (json_object mode, handles Tamil/Tanglish)
 *   - Audio transcription: whisper-large-v3-turbo → then text extraction
 *
 * The public API surface is identical to the original geminiService.js
 * so no other files need to change.
 */

import Groq from 'groq-sdk';
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
// llama-3.3-70b-versatile supports json_object mode reliably on Groq.
// qwen3/deepseek thinking models do NOT support json_object mode on Groq.
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
You are an order extraction assistant for a flour and spice grinding mill.
Extract order details from Tamil, English, or Tanglish customer messages.

RULES:
1. Never invent information. Use null for anything not mentioned.
2. Return ALL values in English.
3. Grind type mapping: "fine"/"podi"/"நைஸ்" → "Fine", "medium" → "Medium", "coarse"/"kora" → "Coarse"
4. Order type: customer brings own material → "serviceOnly", mill provides material → "buyAndService"
5. Delivery type: "pickup"/"வாங்கிக்கிறேன்" → "Pickup", "delivery"/"வீட்டுக்கு" → "Delivery"
6. Valid products: ${context.productNames.join(', ')}
7. If a product is mentioned but not in the valid list, use null for productName.
8. Only update fields that the user explicitly mentioned — preserve all others from the draft.

You MUST return a JSON object with exactly this structure:
{
  "customer": {
    "name": null,
    "phone": null,
    "customerId": null
  },
  "items": [
    {
      "productName": null,
      "productId": null,
      "quantityKg": null,
      "grindType": null,
      "orderType": null
    }
  ],
  "deliveryType": null,
  "deliveryAddress": null,
  "missingFields": [],
  "clarificationQuestion": null,
  "confidence": {
    "customer": null,
    "items": null,
    "quantity": null,
    "grindType": null,
    "orderType": null,
    "deliveryType": null
  },
  "readyForConfirmation": false
}

Fill in the values you can extract. Leave everything else as null.
`.trim();

// ─── Text extraction ──────────────────────────────────────────────────────────

export const extractFromText = async (userMessage, currentDraft, context) => {
  const client = getClient();

  const draftContext = currentDraft && Object.keys(currentDraft).length > 0
    ? `\nCURRENT DRAFT (preserve these values unless user explicitly changes them):\n${JSON.stringify(currentDraft, null, 2)}\n`
    : '';

  const userContent = `${draftContext}\nNEW MESSAGE FROM CUSTOMER:\n"${userMessage}"\n\nExtract the order information from the message and return JSON.`;

  try {
    // qwen3 thinking models don't support response_format on Groq — only llama does
    const isLlama = TEXT_MODEL().includes('llama');
    const requestParams = {
      model:    TEXT_MODEL(),
      messages: [
        { role: 'system', content: buildSystemPrompt(context) },
        { role: 'user',   content: userContent },
      ],
      temperature: 0.0,
      max_tokens:  1024,
    };
    if (isLlama) requestParams.response_format = { type: 'json_object' };

    const completion = await client.chat.completions.create(requestParams);

    const raw = completion.choices[0]?.message?.content?.trim() ?? '{}';

    // Log what the model actually returned for debugging
    logger.info('Groq extraction raw response', {
      model:   TEXT_MODEL(),
      message: userMessage.slice(0, 100),
      raw:     raw.slice(0, 300),
    });

    return parseJSON(raw);
  } catch (err) {
    const msg = err?.message || String(err);
    logger.error('Groq text extraction failed', { error: msg, model: TEXT_MODEL() });
    throw new Error(`Groq API error: ${msg}`);
  }
};

// ─── Audio extraction ─────────────────────────────────────────────────────────

export const extractFromAudio = async (audioBuffer, mimeType, currentDraft, context) => {
  const client = getClient();

  // Step 1 — Transcribe with Whisper
  let transcript = '';
  try {
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
      model:           AUDIO_MODEL(),
      // No language override — Whisper auto-detects Tamil/English/Tanglish
      response_format: 'text',
    });

    transcript = typeof transcription === 'string'
      ? transcription
      : transcription?.text ?? '';

    logger.info('Audio transcribed', { transcript: transcript.slice(0, 200) });
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
    `[Transcribed from voice]: ${transcript}`,
    currentDraft,
    context
  );
};

// ─── JSON parser ──────────────────────────────────────────────────────────────

const parseJSON = (raw) => {
  // Strip any accidental markdown code fences
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

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
  } catch (e) {
    logger.warn('Failed to parse AI JSON response', { raw: raw.slice(0, 300), error: e.message });
    const empty = EMPTY_EXTRACTION();
    empty.clarificationQuestion = 'I could not understand that. Could you please rephrase the order?';
    return empty;
  }
};
