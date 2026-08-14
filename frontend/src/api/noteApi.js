import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
});

export const createNote = async (expiresAt = null) => {
  const response = await api.post('/notes', { expiresAt });
  return response.data;
};

export const getNote = async (slug, password = null) => {
  const config = {};
  if (password) {
    config.headers = { 'x-note-password': password };
  }
  const response = await api.get(`/notes/${slug}`, config);
  return response.data;
};

export const updateNote = async (slug, content) => {
  const response = await api.put(`/notes/${slug}`, { content });
  return response.data;
};

export const renameNote = async (slug, newSlug) => {
  const response = await api.put(`/notes/${slug}/rename`, { newSlug });
  return response.data;
};

export const setPassword = async (slug, password, currentPassword = null) => {
  const response = await api.post(`/notes/${slug}/password`, { password, currentPassword });
  return response.data;
};

export const removePassword = async (slug, password) => {
  const response = await api.delete(`/notes/${slug}/password`, { data: { password } });
  return response.data;
};

export const setExpiry = async (slug, expiresAt) => {
  const response = await api.put(`/notes/${slug}/expiry`, { expiresAt });
  return response.data;
};

export const sendMessage = async (slug, text, sender) => {
  const response = await api.post(`/notes/${slug}/messages`, { text, sender });
  return response.data;
};

export const uploadAttachment = async (slug, file, sender) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('uploadedBy', sender);
  const response = await api.post(`/notes/${slug}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const deleteAttachment = async (slug, attachmentId) => {
  const response = await api.delete(`/notes/${slug}/attachments/${attachmentId}`);
  return response.data;
};
