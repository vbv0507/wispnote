import express from 'express';
import { createNote, getNote, updateNote, renameNote, setPassword, removePassword, getRawNote, getMarkdownNote, setExpiry, addMessage } from '../controllers/noteController.js';
import { createNoteLimiter, writeLimiter, readLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/', createNoteLimiter, createNote);
router.get('/:slug/raw', readLimiter, getRawNote);
router.get('/:slug/markdown', readLimiter, getMarkdownNote);
router.get('/:slug', readLimiter, getNote);
router.post('/:slug/messages', writeLimiter, addMessage);
router.put('/:slug', writeLimiter, updateNote);
router.put('/:slug/rename', writeLimiter, renameNote);
router.put('/:slug/expiry', writeLimiter, setExpiry);
router.post('/:slug/password', writeLimiter, setPassword);
router.delete('/:slug/password', writeLimiter, removePassword);

export default router;
