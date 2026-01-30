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

// function to save invites
const INVITES_FILE = path.join(STORAGE_PATH, 'invites.json');
let initialInvites = [];
try {
    if (fs.existsSync(INVITES_FILE)) {
        const fileContent = fs.readFileSync(INVITES_FILE, 'utf8');
        if (fileContent.trim()) {
            initialInvites = JSON.parse(fileContent);
        }
    }
} catch (error) {
    console.error('Error loading invites.json:', error);
}

export const invites = initialInvites;

export const saveInvites = () => {
    try {
        fs.writeFileSync(INVITES_FILE, JSON.stringify(invites, null, 2));
    } catch (error) {
        console.error('Error saving invites.json:', error);
    }
};

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
