import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true,
    lowercase: true
  },
  content: {
    type: String,
    default: ""
  },
  messages: [{
    text: { type: String, required: true },
    sender: { type: String, required: true },
    sentAt: { type: Date, default: Date.now }
  }],
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number,
    uploadedBy: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  passwordHash: {
    type: String,
    default: null
  },
  expiresAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

noteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

noteSchema.pre('save', function () {
  this.updatedAt = Date.now();
});

const Note = mongoose.model('Note', noteSchema);

export default Note;
