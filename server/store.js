import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow configurable storage path (useful for Docker volumes)
const STORAGE_PATH = process.env.STORAGE_PATH || __dirname;
const DATA_FILE = path.join(STORAGE_PATH, 'users.json');

// Ensure data file exists or start empty
let initialUsers = {};
try {
    if (fs.existsSync(DATA_FILE)) {
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');
        if (fileContent.trim()) {
            initialUsers = JSON.parse(fileContent);
        }
    }
} catch (error) {
    console.error('Error loading users.json:', error);
}

// Export mutable users object initialized from file
export const users = initialUsers;

// Export invitation codes (in-memory only for now as they are ephemeral)
export const inviteCodes = new Set();

// Function to save users to disk
export const saveUsers = () => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    } catch (error) {
        console.error('Error saving users.json:', error);
    }
};

const SHARED_DATA_FILE = path.join(STORAGE_PATH, 'shared.json');
let initialSharedData = { schools: [], criteria: [] };
try {
    if (fs.existsSync(SHARED_DATA_FILE)) {
        const fileContent = fs.readFileSync(SHARED_DATA_FILE, 'utf8');
        if (fileContent.trim()) {
            initialSharedData = JSON.parse(fileContent);
        }
    }
} catch (error) {
    console.error('Error loading shared.json:', error);
}

export const sharedData = initialSharedData;

export const saveSharedData = () => {
    try {
        fs.writeFileSync(SHARED_DATA_FILE, JSON.stringify(sharedData, null, 2));
    } catch (error) {
        console.error('Error saving shared.json:', error);
    }
};
