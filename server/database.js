import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STORAGE_PATH = process.env.STORAGE_PATH || __dirname;
const DB_FILE = path.join(STORAGE_PATH, 'database.sqlite');
// Old JSON files for migration
const USERS_FILE = path.join(STORAGE_PATH, 'users.json');
const INVITES_FILE = path.join(STORAGE_PATH, 'invites.json');
const SHARED_FILE = path.join(STORAGE_PATH, 'shared.json');

let db;

export const getDb = async () => {
    if (db) return db;
    db = await open({
        filename: DB_FILE,
        driver: sqlite3.Database
    });
    return db;
};

export const initializeDatabase = async () => {
    const db = await getDb();

    // Enable WAL mode for better concurrency
    await db.exec('PRAGMA journal_mode = WAL;');

    // Create Tables
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            username TEXT PRIMARY KEY,
            email TEXT,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            data_json TEXT NOT NULL,
            refresh_token TEXT,
            used_invite_code TEXT,
            reset_token TEXT,
            reset_token_expires INTEGER
        );
    `);

    // ... (keep other tables same) ...
    await db.exec(`
        CREATE TABLE IF NOT EXISTS invites (
            code TEXT PRIMARY KEY,
            email TEXT,
            created_at TEXT NOT NULL
        );
    `);

    await db.exec(`
        CREATE TABLE IF NOT EXISTS shared_data (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
        );
    `);

    // Migration for existing tables (ensure new columns exist)
    try {
        await db.exec('ALTER TABLE users ADD COLUMN email TEXT');
    } catch (e) { /* Column likely exists */ }
    try {
        await db.exec('ALTER TABLE users ADD COLUMN reset_token TEXT');
    } catch (e) { /* Column likely exists */ }
    try {
        await db.exec('ALTER TABLE users ADD COLUMN reset_token_expires INTEGER');
    } catch (e) { /* Column likely exists */ }
    try {
        await db.exec('ALTER TABLE invites ADD COLUMN email TEXT');
    } catch (e) { /* Column likely exists */ }


    // Check if migration is needed (if users table is empty but users.json exists)
    const userCount = await db.get('SELECT count(*) as count FROM users');
    if (userCount.count === 0 && fs.existsSync(USERS_FILE)) {
        console.log('Migrating data from JSON to SQLite...');
        try {
            // Migrate Users
            const usersData = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
            for (const [username, user] of Object.entries(usersData)) {
                await db.run(
                    'INSERT OR IGNORE INTO users (username, password_hash, role, data_json, used_invite_code) VALUES (?, ?, ?, ?, ?)',
                    username,
                    user.passwordHash,
                    user.role,
                    JSON.stringify(user.data || {}),
                    user.usedInviteCode || null
                );
            }
            console.log('Users migrated.');

            // Migrate Invites
            if (fs.existsSync(INVITES_FILE)) {
                const invitesData = JSON.parse(fs.readFileSync(INVITES_FILE, 'utf8'));
                for (const invite of invitesData) {
                    await db.run(
                        'INSERT OR IGNORE INTO invites (code, created_at) VALUES (?, ?)',
                        invite.code,
                        invite.created_at
                    );
                }
                console.log('Invites migrated.');
            }

            // Migrate Shared Data
            if (fs.existsSync(SHARED_FILE)) {
                const sharedData = JSON.parse(fs.readFileSync(SHARED_FILE, 'utf8'));
                // Split shared data into rows if needed, or store as monolithic 'all_shared'
                // Our plan: store 'schools' and 'criteria' separately or together?
                // Plan said "shared_data (key PK, value_json)".
                // let's store granularly
                if (sharedData.schools) {
                    await db.run('INSERT OR IGNORE INTO shared_data (key, value_json) VALUES (?, ?)', 'schools', JSON.stringify(sharedData.schools));
                }
                if (sharedData.criteria) {
                    await db.run('INSERT OR IGNORE INTO shared_data (key, value_json) VALUES (?, ?)', 'criteria', JSON.stringify(sharedData.criteria));
                }
                console.log('Shared data migrated.');
            }

            console.log('Migration complete. Renaming old files to .bak');
            fs.renameSync(USERS_FILE, USERS_FILE + '.bak');
            if (fs.existsSync(INVITES_FILE)) fs.renameSync(INVITES_FILE, INVITES_FILE + '.bak');
            if (fs.existsSync(SHARED_FILE)) fs.renameSync(SHARED_FILE, SHARED_FILE + '.bak');

        } catch (error) {
            console.error('Migration failed:', error);
        }
    } else {
        // Ensure shared data keys exist if not present (default empty)
        const schools = await db.get('SELECT key FROM shared_data WHERE key = ?', 'schools');
        if (!schools) {
            await db.run('INSERT INTO shared_data (key, value_json) VALUES (?, ?)', 'schools', '[]');
        }
        const criteria = await db.get('SELECT key FROM shared_data WHERE key = ?', 'criteria');
        if (!criteria) {
            await db.run('INSERT INTO shared_data (key, value_json) VALUES (?, ?)', 'criteria', '[]');
        }
    }
};
