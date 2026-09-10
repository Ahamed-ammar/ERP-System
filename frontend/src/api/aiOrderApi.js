/**
 * AI Order API — Phase AI
 * All calls go through the existing Axios instance (JWT injected automatically).
 */

import axiosInstance from './axiosConfig';

// Create a new draft session
export const createDraft = async () => {
  const res = await axiosInstance.post('/ai/orders/drafts');
  return res.data;
};

// Get a specific draft
export const getDraft = async (draftId) => {
  const res = await axiosInstance.get(`/ai/orders/drafts/${draftId}`);
  return res.data;
};

// List recent drafts
export const listDrafts = async () => {
  const res = await axiosInstance.get('/ai/orders/drafts');
  return res.data;
};

// Send a text message
export const sendChatMessage = async (draftId, message) => {
  const res = await axiosInstance.post('/ai/orders/chat', { draftId, message });
  return res.data;
};

// Upload an audio file (multipart/form-data)
export const sendVoiceMessage = async (draftId, audioFile) => {
  const form = new FormData();
  form.append('draftId', draftId);
  form.append('audio', audioFile);
  const res = await axiosInstance.post('/ai/orders/voice', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

// Confirm draft → create real ERP order
export const confirmDraft = async (draftId) => {
  const res = await axiosInstance.post(`/ai/orders/drafts/${draftId}/confirm`);
  return res.data;
};

// Cancel draft
export const cancelDraft = async (draftId) => {
  const res = await axiosInstance.post(`/ai/orders/drafts/${draftId}/cancel`);
  return res.data;
};
