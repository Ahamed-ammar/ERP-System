/**
 * AI Order Controller — Phase AI
 *
 * Handles HTTP layer for the AI Phone Order Assistant.
 * Delegates all business logic to aiOrderService.
 * Uses existing authenticate + requireAdmin middleware.
 */

import multer from 'multer';
import {
  createDraft,
  processTextMessage,
  processAudioMessage,
  confirmDraft,
  cancelDraft,
  listDrafts,
} from '../services/aiOrderService.js';
import AIOrderDraft from '../models/AIOrderDraft.js';
import { HTTP_STATUS, ERROR_CODES } from '../config/constants.js';
import logger from '../utils/logger.js';

// ─── Audio upload (memory storage — no disk write) ────────────────────────────

const ALLOWED_AUDIO_TYPES = [
  'audio/wav', 'audio/mp3', 'audio/mpeg',
  'audio/m4a', 'audio/x-m4a',
  'audio/ogg', 'audio/webm',
  'audio/aac',
];

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio format: ${file.mimetype}. Supported: wav, mp3, m4a, ogg, webm`), false);
    }
  },
}).single('audio');

export const handleAudioUpload = (req, res, next) => {
  audioUpload(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'FILE_TOO_LARGE', message: 'Audio file must be under 20 MB' },
      });
    }
    if (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'INVALID_AUDIO', message: err.message },
      });
    }
    next();
  });
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/orders/drafts
 * Create a new AI order draft session.
 */
export const createDraftHandler = async (req, res) => {
  try {
    const draft = await createDraft(req.user.userId);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data:    { draftId: draft._id, status: draft.status },
      message: 'New AI order session started',
    });
  } catch (err) {
    logger.error('Failed to create AI draft', { error: err.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to start session' },
    });
  }
};

/**
 * POST /api/ai/orders/chat
 * Send a text message to the AI assistant.
 * Body: { draftId: string, message: string }
 */
export const chatHandler = async (req, res) => {
  try {
    const { draftId, message } = req.body;

    if (!draftId || typeof draftId !== 'string') {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'draftId is required' },
      });
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'message is required' },
      });
    }

    const { draft, aiMessage } = await processTextMessage(
      draftId, message.trim(), req.user.userId
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        draftId:      draft._id,
        aiMessage,
        extractedOrder: draft.extractedOrder,
        validation:     draft.validation,
        status:         draft.status,
      },
    });
  } catch (err) {
    logger.error('AI chat error', { error: err.message, requestId: req.requestId });

    const isGeminiError = err.message.startsWith('Gemini API');
    return res.status(isGeminiError ? 503 : HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code:    isGeminiError ? 'AI_UNAVAILABLE' : ERROR_CODES.INTERNAL_ERROR,
        message: isGeminiError
          ? 'AI service is temporarily unavailable. Please try again.'
          : err.message,
      },
    });
  }
};

/**
 * POST /api/ai/orders/voice
 * Upload audio and extract order information.
 * Multipart/form-data: { draftId: string, audio: File }
 */
export const voiceHandler = async (req, res) => {
  try {
    const { draftId } = req.body;

    if (!draftId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'draftId is required' },
      });
    }
    if (!req.file) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: { code: 'NO_AUDIO', message: 'No audio file was uploaded' },
      });
    }

    const { draft, aiMessage } = await processAudioMessage(
      draftId,
      req.file.buffer,
      req.file.mimetype,
      req.user.userId
    );

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        draftId:       draft._id,
        aiMessage,
        extractedOrder: draft.extractedOrder,
        validation:     draft.validation,
        status:         draft.status,
      },
    });
  } catch (err) {
    logger.error('AI voice error', { error: err.message, requestId: req.requestId });
    const isGeminiError = err.message.startsWith('Gemini API');
    return res.status(isGeminiError ? 503 : HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code:    isGeminiError ? 'AI_UNAVAILABLE' : ERROR_CODES.INTERNAL_ERROR,
        message: isGeminiError ? 'AI service temporarily unavailable' : err.message,
      },
    });
  }
};

/**
 * GET /api/ai/orders/drafts/:id
 * Get current state of an AI order draft.
 */
export const getDraftHandler = async (req, res) => {
  try {
    const draft = await AIOrderDraft.findOne({
      _id:     req.params.id,
      adminId: req.user.userId,
    }).lean();

    if (!draft) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Draft not found' },
      });
    }

    return res.status(HTTP_STATUS.OK).json({ success: true, data: draft });
  } catch (err) {
    logger.error('Get draft error', { error: err.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to fetch draft' },
    });
  }
};

/**
 * GET /api/ai/orders/drafts
 * List recent drafts for this admin.
 */
export const listDraftsHandler = async (req, res) => {
  try {
    const drafts = await listDrafts(req.user.userId);
    return res.status(HTTP_STATUS.OK).json({ success: true, data: drafts });
  } catch (err) {
    logger.error('List drafts error', { error: err.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to list drafts' },
    });
  }
};

/**
 * POST /api/ai/orders/drafts/:id/confirm
 * Explicitly confirm and create the real ERP order.
 */
export const confirmDraftHandler = async (req, res) => {
  try {
    const { order, draft } = await confirmDraft(req.params.id, req.user.userId);
    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      data: {
        orderId:   order._id,
        draftId:   draft._id,
        totalAmount: order.totalAmount,
        status:    order.status,
        estimatedReadyDate: order.estimatedReadyDate,
      },
      message: '✅ Order created successfully from phone order!',
    });
  } catch (err) {
    logger.error('Confirm draft error', { error: err.message, requestId: req.requestId });

    const statusCode = err.message.includes('missing fields')
      ? HTTP_STATUS.UNPROCESSABLE_ENTITY
      : err.message.includes('not found')
        ? HTTP_STATUS.NOT_FOUND
        : err.message.includes('unavailable') || err.message.includes('Insufficient')
          ? HTTP_STATUS.UNPROCESSABLE_ENTITY
          : HTTP_STATUS.INTERNAL_SERVER_ERROR;

    return res.status(statusCode).json({
      success: false,
      error: { code: ERROR_CODES.VALIDATION_ERROR, message: err.message },
    });
  }
};

/**
 * POST /api/ai/orders/drafts/:id/cancel
 * Cancel a draft.
 */
export const cancelDraftHandler = async (req, res) => {
  try {
    const draft = await cancelDraft(req.params.id, req.user.userId);
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data:    { draftId: draft._id, status: draft.status },
      message: 'Draft cancelled',
    });
  } catch (err) {
    logger.error('Cancel draft error', { error: err.message, requestId: req.requestId });
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: err.message },
    });
  }
};
