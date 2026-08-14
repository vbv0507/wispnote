import Note from '../models/Note.js';
import { deleteFile } from '../config/blobStorage.js';

export const startCleanupJob = () => {
  // Run the cleanup job every 1 minute
  setInterval(async () => {
    try {
      const now = new Date();
      
      // Find all notes that have expired
      const expiredNotes = await Note.find({
        expiresAt: { $ne: null, $lt: now }
      });

      if (expiredNotes.length > 0) {
        console.log(`Found ${expiredNotes.length} expired notes to clean up.`);

        for (const note of expiredNotes) {
          try {
            // 1. Delete all attachments from Azure Blob Storage
            if (note.attachments && note.attachments.length > 0) {
              for (const attachment of note.attachments) {
                try {
                  await deleteFile(attachment.fileUrl);
                } catch (blobErr) {
                  console.error(`Failed to delete blob ${attachment.fileUrl}:`, blobErr);
                  // We continue even if one blob fails, to ensure we try deleting the rest and the note
                }
              }
            }

            // 2. Delete the note from MongoDB
            await Note.findByIdAndDelete(note._id);
            console.log(`Successfully deleted expired note: ${note.slug}`);

          } catch (noteErr) {
            console.error(`Error processing expired note ${note.slug}:`, noteErr);
          }
        }
      }
    } catch (err) {
      console.error('Error during expired notes cleanup job:', err);
    }
  }, 60000); // 60,000 ms = 1 minute
};
