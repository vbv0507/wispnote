import express from 'express';
import multer from 'multer';
import { 
  createNote, getNote, updateNote, renameNote, setPassword, 
  removePassword, getRawNote, getMarkdownNote, setExpiry, 
  addMessage, uploadAttachment, deleteAttachment 
} from '../controllers/noteController.js';
import { createNoteLimiter, writeLimiter, readLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'text/csv'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images, PDFs, and common documents are allowed.'));
    }
  }
});

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

router.post('/:slug/attachments', writeLimiter, upload.single('file'), uploadAttachment);
router.delete('/:slug/attachments/:attachmentId', writeLimiter, deleteAttachment);

export default router;
