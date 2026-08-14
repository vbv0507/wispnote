import { BlobServiceClient } from '@azure/storage-blob';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'note-attachments';

let blobServiceClient;
let containerClient;

if (connectionString) {
  try {
    blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  } catch (err) {
    console.error('Error initializing Azure Blob Storage client:', err);
  }
} else {
  console.warn('AZURE_STORAGE_CONNECTION_STRING is not set in .env');
}

/**
 * Uploads a file buffer to Azure Blob Storage.
 * @param {Buffer} buffer - The file buffer.
 * @param {string} fileName - The original file name.
 * @param {string} mimeType - The file's MIME type.
 * @returns {Promise<string>} - The public URL of the uploaded blob.
 */
export const uploadFile = async (buffer, fileName, mimeType) => {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not configured properly.');
  }

  // Ensure container exists
  await containerClient.createIfNotExists({ access: 'blob' });

  // Generate a unique blob name to prevent collisions
  const uniqueBlobName = `${nanoid()}-${fileName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

  await blockBlobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimeType }
  });

  return blockBlobClient.url;
};

/**
 * Deletes a file from Azure Blob Storage using its public URL.
 * @param {string} blobUrl - The public URL of the blob to delete.
 */
export const deleteFile = async (blobUrl) => {
  if (!containerClient) {
    throw new Error('Azure Blob Storage is not configured properly.');
  }

  try {
    // Extract the blob name from the URL
    const url = new URL(blobUrl);
    // The path usually looks like /<containerName>/<blobName>
    const decodedPath = decodeURIComponent(url.pathname);
    const pathPrefix = `/${containerName}/`;
    
    if (decodedPath.startsWith(pathPrefix)) {
      const blobName = decodedPath.slice(pathPrefix.length);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.deleteIfExists();
    } else {
      console.warn('Could not extract blob name from URL:', blobUrl);
    }
  } catch (err) {
    console.error('Error deleting file from Azure Blob Storage:', err);
    throw err;
  }
};
