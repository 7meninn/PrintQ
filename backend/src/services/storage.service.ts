import { BlobServiceClient } from "@azure/storage-blob";
import * as dotenv from "dotenv";
dotenv.config();

const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const CONTAINER_NAME = "uploads";

if (!CONNECTION_STRING) {
  throw new Error("Azure Storage Connection String is missing!");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

// Ensure container exists
const initStorage = async () => {
  try {
    const exists = await containerClient.exists();
    if (!exists) {
      await containerClient.create({ access: "blob" });
      console.log("✅ Created Azure Blob Container: uploads");
    }
  } catch (error) {
    console.error("❌ Azure Storage Connection Failed:", error);
  }
};
initStorage();

export const uploadFileToAzure = async (buffer: Buffer, originalName: string): Promise<string> => {
  const filename = `${Date.now()}_${originalName}`;
  const blockBlobClient = containerClient.getBlockBlobClient(filename);

  await blockBlobClient.uploadData(buffer);
  return blockBlobClient.url; 
};

// 🔹 FIXED DELETE FUNCTION
export const deleteFileFromAzure = async (fileUrl: string) => {
  try {
    // 1. Extract filename from URL
    const filenameEncoded = fileUrl.split("/").pop(); 
    if (!filenameEncoded) return;

    // 2. ✅ DECODE the filename (e.g. "%20" -> " ")
    const filename = decodeURIComponent(filenameEncoded);

    // 3. Delete the actual blob
    const blockBlobClient = containerClient.getBlockBlobClient(filename);
    
    // deleteIfExists returns an object with 'succeeded' property
    const response = await blockBlobClient.deleteIfExists();
    
    if (response.succeeded) {
        console.log(`🗑️ Successfully deleted from Azure: ${filename}`);
    } else {
        console.warn(`⚠️ Azure file not found or already deleted: ${filename}`);
    }

  } catch (error) {
    console.error("Azure Delete Error:", error);
  }
};

export const listFilesFromAzure = async () => {
  const files = [];
  for await (const blob of containerClient.listBlobsFlat()) {
    files.push({
      name: blob.name,
      createdOn: blob.properties.createdOn,
      url: containerClient.getBlockBlobClient(blob.name).url
    });
  }
  return files;
};