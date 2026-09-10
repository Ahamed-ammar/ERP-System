/**
 * Gemini Service — Phase AI
 *
 * ALL communication with the Google Gemini API lives here.
 * The API key is never exposed to the frontend.
 *
 * Supports:
 *   - Tamil text input
 *   - English text input
 *   - Tanglish (Tamil-English mixed) input
 *   - Audio file input (wav, mp3, m4a, ogg, webm)
 *
 * Returns structured JSON conforming to the AI_ORDER_EXTRACTION_SCHEMA.
 */

import { GoogleGenAI } from '@google/genai';
import logger from '../utils/logger.js';

// ─── Gemini client ────────────────────────────────────────────────────────────

let _client = null;

const getClient = () => {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set in environment variables');
    _client = new GoogleGenAI({ apiKey });
  }
  return _client;
};

const getModel = () => process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// ─── Structured output schema ─────────────────────────────────────────────────

/**
 * The schema we ask Gemini to return.
 * null means "not yet known" — never a guess or placeholder.
 */
export const EMPTY_EXTRACTION = () => ({
  customer: {
    name:       null,
    phone:      null,
    customerId: null,
  },
  items: [],
  deliveryType:     null,
  deliveryAddress:  null,
  missingFields:    [],
  clarificationQuestion: null,
  confidence: {
    customer:     null,
    items:        null,
    quantity:     null,
    grindType:    null,
    orderType:    null,
    deliveryType: null,
  },
  readyForConfirmation: false,
});

// ─── System instruction ───────────────────────────────────────────────────────

const buildSystemInstruction = (context) => `
You are the AI Order Assistant for OrderNest, a flour and spice grinding ERP system.

Your ONLY job is to understand Tamil, English, and Tamil-English mixed (Tanglish) 
customer order messages spoken or typed by the mill owner or her assistant, 
and extract structured order information from them.

STRICT RULES — never violate these:
1. NEVER invent information. NEVER guess. If a field is unknown, return null.
2. NEVER calculate prices, deduct inventory, or create database records.
3. NEVER change a quantity the user did not explicitly update.
4. NEVER change a product name unless the user explicitly corrects it.
5. NEVER invent customer names or phone numbers.
6. NEVER invent product names — only use names from this list: ${context.productNames.join(', ')}
7. If the product mentioned does not clearly match one entry in the list, return null for productName.
8. Return all ERP field values in ENGLISH regardless of input language.
9. For grind type, map Tamil/Tanglish terms:
   - "நைஸ்" / "நல்லா பொடி" / "fine" / "maavu" → "Fine"
   - "medium" / "நடுத்தரம்" → "Medium"  
   - "coarse" / "கொரகொர" / "rough" → "Coarse"
   - If ambiguous or unknown → null
10. For order type:
    - Customer brings their own material + grinding only → "serviceOnly"
    - Mill provides material + grinding → "buyAndService"
    - If unclear → null
11. For delivery type: "delivery" / "வீட்டுக்கு அனுப்பு" → "Delivery", 
    "pickup" / "நானே வருவேன்" / "கடைல வாங்கிக்கிறேன்" → "Pickup"
    If unclear → null
12. Preserve conversation context. Only update fields that were explicitly mentioned in the CURRENT message.
13. When the user confirms ("yes", "confirm", "சரி", "ஆம்", "create பண்ணு", "ok"), 
    do NOT mark readyForConfirmation=true yourself — the backend does that.
    Instead just acknowledge.

SUPPORTED PRODUCTS: ${context.productNames.join(', ')}
SUPPORTED GRIND TYPES: Fine, Medium, Coarse
SUPPORTED ORDER TYPES: serviceOnly, buyAndService
SUPPORTED DELIVERY TYPES: Pickup, Delivery

Return ONLY valid JSON matching this exact schema. No markdown. No explanation. Pure JSON:
{
  "customer": { "name": string|null, "phone": string|null, "customerId": null },
  "items": [
    {
      "productName": string|null,
      "productId": null,
      "quantityKg": number|null,
      "grindType": "Fine"|"Medium"|"Coarse"|null,
      "orderType": "serviceOnly"|"buyAndService"|null
    }
  ],
  "deliveryType": "Pickup"|"Delivery"|null,
  "deliveryAddress": null,
  "missingFields": [string],
  "clarificationQuestion": string|null,
  "confidence": {
    "customer": "high"|"medium"|"low"|null,
    "items": "high"|"medium"|"low"|null,
    "quantity": "high"|"medium"|"low"|null,
    "grindType": "high"|"medium"|"low"|null,
    "orderType": "high"|"medium"|"low"|null,
    "deliveryType": "high"|"medium"|"low"|null
  },
  "readyForConfirmation": false
}

The clarificationQuestion must be in English and concise. Ask for ONE piece of information at a time.
`;

// ─── Extract from text ────────────────────────────────────────────────────────

/**
 * Send a text message (Tamil/English/Tanglish) plus the current draft context to Gemini.
 * Returns parsed extraction JSON.
 *
 * @param {string}   userMessage   — the raw text the admin typed
 * @param {object}   currentDraft  — existing extractedOrder (so Gemini can merge, not reset)
 * @param {object}   context       — { productNames: string[] }
 * @returns {object} extraction
 */
export const extractFromText = async (userMessage, currentDraft, context) => {
  const ai = getClient();
  const model = getModel();

  const existingDraftText = currentDraft
    ? `\nCURRENT DRAFT (preserve these values unless the user explicitly changes them):\n${JSON.stringify(currentDraft, null, 2)}`
    : '';

  const prompt = `${existingDraftText}

NEW MESSAGE FROM ADMIN:
"${userMessage}"

Extract or update order information from this message. Return only JSON.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: buildSystemInstruction(context),
        temperature:       0.1,   // low temperature = more deterministic
        maxOutputTokens:   1024,
      },
    });

    const text = response.text?.trim() ?? '';
    return parseGeminiJSON(text);
  } catch (err) {
    logger.error('Gemini text extraction failed', { error: err.message });
    throw new Error(`Gemini API error: ${err.message}`);
  }
};

// ─── Extract from audio ───────────────────────────────────────────────────────

/**
 * Send an audio buffer to Gemini for transcription + extraction.
 * Supports: audio/wav, audio/mp3, audio/mpeg, audio/m4a, audio/ogg, audio/webm
 *
 * @param {Buffer}   audioBuffer   — raw audio bytes
 * @param {string}   mimeType      — e.g. 'audio/wav'
 * @param {object}   currentDraft  — existing extractedOrder
 * @param {object}   context       — { productNames: string[] }
 * @returns {object} extraction
 */
export const extractFromAudio = async (audioBuffer, mimeType, currentDraft, context) => {
  const ai = getClient();
  const model = getModel();

  const existingDraftText = currentDraft
    ? `CURRENT DRAFT (preserve these values unless the audio explicitly changes them):\n${JSON.stringify(currentDraft, null, 2)}\n\n`
    : '';

  const prompt = `${existingDraftText}The following audio contains a customer order spoken in Tamil, English, or a mix of both.
Listen carefully, transcribe, and extract structured order information.
Return only JSON matching the schema. No markdown. No explanation.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioBuffer.toString('base64'),
          },
        },
        { text: prompt },
      ],
      config: {
        systemInstruction: buildSystemInstruction(context),
        temperature:       0.1,
        maxOutputTokens:   1024,
      },
    });

    const text = response.text?.trim() ?? '';
    return parseGeminiJSON(text);
  } catch (err) {
    logger.error('Gemini audio extraction failed', { error: err.message });
    throw new Error(`Gemini API error: ${err.message}`);
  }
};

// ─── Parse helper ─────────────────────────────────────────────────────────────

/**
 * Parse Gemini's JSON response, stripping any markdown code fences.
 * Returns a safe empty extraction if parsing fails.
 */
const parseGeminiJSON = (raw) => {
  // Strip ```json ... ``` if present
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    // Ensure required shape exists
    return {
      customer:             parsed.customer              ?? { name: null, phone: null, customerId: null },
      items:                Array.isArray(parsed.items)  ? parsed.items : [],
      deliveryType:         parsed.deliveryType          ?? null,
      deliveryAddress:      parsed.deliveryAddress       ?? null,
      missingFields:        Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
      clarificationQuestion: parsed.clarificationQuestion ?? null,
      confidence:           parsed.confidence            ?? {},
      readyForConfirmation: false, // ALWAYS false from Gemini — backend decides
    };
  } catch (parseErr) {
    logger.warn('Failed to parse Gemini JSON response', { raw: raw.slice(0, 200) });
    // Return a safe shell so the caller can handle gracefully
    const empty = EMPTY_EXTRACTION();
    empty.clarificationQuestion = 'I could not understand that. Could you please rephrase the order?';
    return empty;
  }
};
