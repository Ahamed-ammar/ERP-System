/**
 * AI Order Routes — Phase AI
 *
 * All routes require authenticate + requireAdmin.
 * The general rate limiter from app.js already covers /api/*.
 */

import express from 'express';
import { authenticate, requireAdmin } from '../middleware/authMiddleware.js';
import {
  createDraftHandler,
  chatHandler,
  voiceHandler,
  getDraftHandler,
  listDraftsHandler,
  confirmDraftHandler,
  cancelDraftHandler,
  handleAudioUpload,
} from '../controllers/aiOrderController.js';

const router = express.Router();

// All AI routes require admin authentication
router.use(authenticate, requireAdmin);

// Draft management
router.get( '/orders/drafts',         listDraftsHandler);    // GET  /api/ai/orders/drafts
router.post('/orders/drafts',         createDraftHandler);   // POST /api/ai/orders/drafts
router.get( '/orders/drafts/:id',     getDraftHandler);      // GET  /api/ai/orders/drafts/:id
router.post('/orders/drafts/:id/confirm', confirmDraftHandler); // POST /api/ai/orders/drafts/:id/confirm
router.post('/orders/drafts/:id/cancel',  cancelDraftHandler);  // POST /api/ai/orders/drafts/:id/cancel

// Chat (text message)
router.post('/orders/chat',  chatHandler);  // POST /api/ai/orders/chat  { draftId, message }

// Voice/audio upload
router.post('/orders/voice', handleAudioUpload, voiceHandler); // POST /api/ai/orders/voice (multipart)

export default router;
