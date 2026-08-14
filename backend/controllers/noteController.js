import Note from '../models/Note.js';
import { customAlphabet } from 'nanoid';
import bcrypt from 'bcryptjs';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

const verifyNotePassword = async (note, req) => {
  if (!note.passwordHash) return { ok: true };

  const password = req.headers['x-note-password'];
  if (!password) {
    return { ok: false, status: 401, error: 'Password required', locked: true };
  }

  const isMatch = await bcrypt.compare(password, note.passwordHash);
  if (!isMatch) {
    return { ok: false, status: 401, error: 'Incorrect password', locked: true };
  }

  return { ok: true };
};

const validateExpiryDate = (expiresAt) => {
  if (!expiresAt) return { valid: true, date: null };
  const parsedDate = new Date(expiresAt);
  if (isNaN(parsedDate.getTime())) {
    return { valid: false, error: 'Invalid expiry date' };
  }
  if (parsedDate <= new Date()) {
    return { valid: false, error: 'Expiry must be in the future' };
  }
  return { valid: true, date: parsedDate };
};

const isExpired = (note) => {
  return note.expiresAt && note.expiresAt < new Date();
};

const generateSlug = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz-', 8);

export const createNote = async (req, res, next) => {
  try {
    let { expiresAt } = req.body;
    
    if (!expiresAt) {
      expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString();
    }

    const expiryValidation = validateExpiryDate(expiresAt);
    if (!expiryValidation.valid) {
      return res.status(400).json({ error: expiryValidation.error });
    }

    let slug;
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 5) {
      slug = generateSlug();
      const existingNote = await Note.findOne({ slug });
      if (!existingNote) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ error: 'Failed to generate a unique slug' });
    }

    const note = await Note.create({
      slug,
      content: '',
      expiresAt: expiryValidation.date
    });

    res.status(201).json({
      slug: note.slug,
      content: note.content,
      createdAt: note.createdAt,
      expiresAt: note.expiresAt,
      locked: false
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get note by slug
// @route   GET /api/notes/:slug
// @access  Public
export const getNote = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const note = await Note.findOne({ slug: slug.toLowerCase() });

    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    const responseNote = note.toObject();
    responseNote.locked = !!note.passwordHash;
    delete responseNote.passwordHash;
    res.json(responseNote);
  } catch (error) {
    next(error);
  }
};

export const getRawNote = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const note = await Note.findOne({ slug: slug.toLowerCase() });

    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    res.set('Content-Type', 'text/plain');
    res.send(note.content);
  } catch (error) {
    next(error);
  }
};

export const getMarkdownNote = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const note = await Note.findOne({ slug: slug.toLowerCase() });

    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    const html = DOMPurify.sanitize(marked.parse(note.content));
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    next(error);
  }
};

export const updateNote = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { content } = req.body;

    if (content === undefined || content === null || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    if (content.length > 500000) {
      return res.status(400).json({ error: 'Content exceeds maximum length' });
    }

    const lowerSlug = slug.toLowerCase();

    let note = await Note.findOne({ slug: lowerSlug });

    if (note && isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note) {

      note = await Note.create({
        slug: lowerSlug,
        content
      });
    } else {
      note.content = content;
      await note.save();
    }

    res.json(note);
  } catch (error) {
    next(error);
  }
};

export const addMessage = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { text, sender } = req.body;

    if (!text || typeof text !== 'string' || text.length > 2000) {
      return res.status(400).json({ error: 'Text must be a non-empty string max 2000 characters' });
    }
    if (!sender || typeof sender !== 'string') {
      return res.status(400).json({ error: 'Sender is required' });
    }

    const lowerSlug = slug.toLowerCase();
    const note = await Note.findOne({ slug: lowerSlug });

    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    const newMessage = { text, sender, sentAt: new Date() };
    note.messages.push(newMessage);
    await note.save();

    res.status(201).json({ message: newMessage, messages: note.messages });
  } catch (error) {
    next(error);
  }
};

export const setExpiry = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { expiresAt } = req.body;

    const expiryValidation = validateExpiryDate(expiresAt);
    if (!expiryValidation.valid) {
      return res.status(400).json({ error: expiryValidation.error });
    }

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.expiresAt = expiryValidation.date;
    await note.save();

    res.json(note);
  } catch (error) {
    next(error);
  }
};

export const renameNote = async (req, res, next) => {
  try {
    const { slug } = req.params;
    let { newSlug } = req.body;

    if (!newSlug || typeof newSlug !== 'string') {
      return res.status(400).json({ error: 'Slug must be a string' });
    }

    newSlug = newSlug.toLowerCase();

    const isValidSlug = /^[a-z0-9-]{3,30}$/.test(newSlug);
    if (!isValidSlug) {
      return res.status(400).json({ error: 'Slug must be 3-30 characters, lowercase letters, numbers, and hyphens only' });
    }

    if (slug.toLowerCase() === newSlug) {
      const currentNote = await Note.findOne({ slug: newSlug });
      if (!currentNote) return res.status(404).json({ error: 'Note not found' });
      return res.json(currentNote);
    }

    const existingNote = await Note.findOne({ slug: newSlug });
    if (existingNote && !isExpired(existingNote)) {
      return res.status(409).json({ error: 'This URL is already taken' });
    }

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    note.slug = newSlug;
    await note.save();

    res.json(note);
  } catch (error) {
    next(error);
  }
};

export const setPassword = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { password, currentPassword } = req.body;

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({ error: 'Password must be a string with at least 4 characters' });
    }

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.passwordHash) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to change the password' });
      }
      const isMatch = await bcrypt.compare(currentPassword, note.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect current password' });
      }
    }

    note.passwordHash = await bcrypt.hash(password, 10);
    await note.save();

    res.json({ message: 'Password set' });
  } catch (error) {
    next(error);
  }
};

export const removePassword = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { password } = req.body;

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (!note.passwordHash) {
      return res.status(400).json({ error: 'Note is not password protected' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Current password is required to remove it' });
    }

    const isMatch = await bcrypt.compare(password, note.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password' });
    }

    note.passwordHash = null;
    await note.save();

    res.json({ message: 'Password removed' });
  } catch (error) {
    next(error);
  }
};

import { uploadFile, deleteFile } from '../config/blobStorage.js';

export const uploadAttachment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { uploadedBy } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    const { originalname, mimetype, size, buffer } = req.file;

    const fileUrl = await uploadFile(buffer, originalname, mimetype);

    const newAttachment = {
      fileName: originalname,
      fileUrl,
      fileType: mimetype,
      fileSize: size,
      uploadedBy: uploadedBy || 'Anonymous',
      uploadedAt: new Date()
    };

    note.attachments.push(newAttachment);
    await note.save();

    res.status(201).json(note);
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (req, res, next) => {
  try {
    const { slug, attachmentId } = req.params;

    const note = await Note.findOne({ slug: slug.toLowerCase() });
    if (!note || isExpired(note)) {
      return res.status(404).json({ error: 'Note not found' });
    }

    const auth = await verifyNotePassword(note, req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error, locked: auth.locked });
    }

    const attachmentIndex = note.attachments.findIndex(a => a._id.toString() === attachmentId);
    if (attachmentIndex === -1) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const attachment = note.attachments[attachmentIndex];

    try {
      await deleteFile(attachment.fileUrl);
    } catch (err) {
      console.error('Failed to delete blob from Azure, but will remove from DB anyway:', err);
    }

    note.attachments.splice(attachmentIndex, 1);
    await note.save();

    res.json(note);
  } catch (error) {
    next(error);
  }
};
