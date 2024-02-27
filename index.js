const express = require('express');
const { BlobServiceClient } = require('@azure/storage-blob');
require('dotenv').config(); // Load environment variables from .env file

const app = express();
const port = 3000;

// Retrieve Azure Blob Storage connection string and container name from environment variables
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

// Initialize the BlobServiceClient
const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
const containerClient = blobServiceClient.getContainerClient(containerName);

// Define route to fetch blob content
app.get('/', async (req, res) => {
    try {
        // List blobs in the container
        const blobItems = [];
        for await (const blob of containerClient.listBlobsFlat()) {
            blobItems.push(blob);
        }

        // Fetch content of each blob
        const blobContent = await Promise.all(blobItems.map(async (blob) => {
            const blobClient = containerClient.getBlobClient(blob.name);
            const downloadBlockBlobResponse = await blobClient.download();
            return {
                name: blob.name,
                content: (await streamToBuffer(downloadBlockBlobResponse.readableStreamBody)).toString()
            };
        }));

        // Send blob content as JSON response
        res.json(blobContent);
    } catch (error) {
        console.error('Error fetching blob content:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Helper function to convert readable stream to buffer
async function streamToBuffer(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data));
        });
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on('error', reject);
    });
}

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
