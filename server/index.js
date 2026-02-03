import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { getDb, initializeDatabase } from './database.js';
import { registerSchema, loginSchema, roleUpdateSchema, forgotPasswordSchema, resetPasswordSchema } from './validation.js';
import { sendInviteEmail, sendResetPasswordEmail } from './email.js';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev';
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'superrefreshsecretkey_dev';

app.set('trust proxy', 'loopback, linklocal, uniquelocal'); // Securely trust local proxies
app.use(helmet());
app.use(cors({
    origin: true, // Allow all origins for dev, or specify frontend URL
    credentials: true // Important for cookies
}));
app.use(express.json());
app.use(cookieParser());

// Debug Middleware to see what IP is detected
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] Request from IP: ${req.ip} | X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    next();
});

// Initialize Database
initializeDatabase();

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});

app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // Increased limit for debugging
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many login attempts, please try again after 15 minutes" }
});
app.use('/api/auth', authLimiter);

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const requireAdmin = async (req, res, next) => {
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);

    if (user && (user.role === 'admin' || user.role === 'moderator')) {
        req.userRole = user.role; // store for later use
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};

// Auth Routes

// Helper to generate tokens
const generateTokens = (user) => {
    const accessToken = jwt.sign({ username: user.username, role: user.role }, SECRET_KEY, { expiresIn: '15m' });
    const refreshToken = jwt.sign({ username: user.username }, REFRESH_SECRET_KEY, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};

app.post('/api/auth/register', async (req, res) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { username, password, inviteCode, email } = validation.data;
    const db = await getDb();

    // Check existing user
    const existingUser = await db.get('SELECT username FROM users WHERE username = ? OR email = ?', username, email);
    if (existingUser) {
        return res.status(409).json({ message: 'User or email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userCount = (await db.get('SELECT count(*) as count FROM users')).count;
    const isFirstUser = userCount === 0;

    let usedCode = isFirstUser ? 'First Admin' : inviteCode;
    let role = isFirstUser ? 'admin' : 'joueur';

    if (!isFirstUser) {
        const invite = await db.get('SELECT * FROM invites WHERE code = ?', inviteCode);
        if (!invite) {
            return res.status(403).json({ message: 'Code d\'invitation invalide ou manquant' });
        }
        // Use the role defined in the invite, default to 'joueur' if missing (legacy)
        if (invite.role) {
            role = invite.role;
        }
        await db.run('DELETE FROM invites WHERE code = ?', inviteCode);
    }

    const initialData = JSON.stringify({
        profile: null,
        schools: [],
        criteria: []
    });

    await db.run(
        'INSERT INTO users (username, email, password_hash, role, data_json, used_invite_code) VALUES (?, ?, ?, ?, ?, ?)',
        username, email, hashedPassword, role, initialData, usedCode
    );

    res.status(201).json({ message: 'Compte créé avec succès' });
});

app.post('/api/auth/forgot-password', async (req, res) => {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    const { email } = validation.data;
    const db = await getDb();
    const user = await db.get('SELECT username FROM users WHERE email = ?', email);

    if (!user) {
        // Don't leak exists/not exists
        return res.json({ message: 'If account exists, email sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    await db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', token, expires, email);

    // Send Email
    sendResetPasswordEmail(email, token);

    res.json({ message: 'Si un compte existe avec cet email, un lien a été envoyé.' });
});

app.post('/api/auth/reset-password', async (req, res) => {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    const { token, password } = validation.data;
    const db = await getDb();

    const user = await db.get('SELECT username FROM users WHERE reset_token = ? AND reset_token_expires > ?', token, Date.now());

    if (!user) {
        return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE username = ?', hashedPassword, user.username);

    res.json({ message: 'Password reset successful' });
});

app.post('/api/auth/login', async (req, res) => {
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { username, password } = validation.data;
    const db = await getDb();

    // Allow login with username OR email
    const user = await db.get('SELECT * FROM users WHERE username = ? OR email = ?', username, username);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ message: 'Identifiant ou mot de passe incorrect' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    await db.run('UPDATE users SET refresh_token = ? WHERE username = ?', refreshToken, user.username);

    // Send HTTP-Only Cookie
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Check if migration to email is required (if user has no email)
    const migrationRequired = !user.email;

    res.json({
        token: accessToken,
        username: user.username,
        role: user.role,
        migrationRequired
    });
});

// Endpoint to update email (for migration)
app.post('/api/auth/update-email', async (req, res) => {
    // Basic validation manually or use schema
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Email invalide' });
    }

    // Verify token (middleware logic simplified here, usually this route is protected)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const db = await getDb();

        // Check if email already taken
        const existing = await db.get('SELECT username FROM users WHERE email = ?', email);
        if (existing) {
            return res.status(409).json({ message: 'Cet email est déjà utilisé' });
        }

        await db.run('UPDATE users SET email = ? WHERE username = ?', email, decoded.username);
        res.json({ message: 'Email mis à jour avec succès' });

    } catch (err) {
        return res.sendStatus(403);
    }
});

app.post('/api/auth/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE refresh_token = ?', refreshToken);

    if (!user) return res.sendStatus(403);

    jwt.verify(refreshToken, REFRESH_SECRET_KEY, (err, decoded) => {
        if (err || user.username !== decoded.username) return res.sendStatus(403);

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

        // Rotate Refresh Token
        db.run('UPDATE users SET refresh_token = ? WHERE username = ?', newRefreshToken, user.username);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ token: accessToken, username: user.username, role: user.role });
    });
});

app.post('/api/auth/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        const db = await getDb();
        await db.run('UPDATE users SET refresh_token = NULL WHERE refresh_token = ?', refreshToken);
    }
    res.clearCookie('refreshToken');
    res.sendStatus(204);
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const db = await getDb();
    const users = await db.all('SELECT username, email, role, used_invite_code as usedInviteCode FROM users');
    res.json(users);
});

app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, async (req, res) => {
    const targetUser = req.params.username;
    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const db = await getDb();

    // Check roles
    const requester = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);
    const target = await db.get('SELECT role FROM users WHERE username = ?', targetUser);

    if (!target) return res.status(404).json({ message: 'User not found' });

    // Moderator logic
    if (requester.role === 'moderator' && (target.role === 'admin' || target.role === 'moderator')) {
        return res.status(403).json({ message: 'Moderators cannot delete Admins or other Moderators' });
    }

    await db.run('DELETE FROM users WHERE username = ?', targetUser);
    res.json({ message: 'User deleted' });
});

app.put('/api/admin/users/:username/role', authenticateToken, requireAdmin, async (req, res) => {
    const targetUser = req.params.username;
    const { role } = req.body;

    const validation = roleUpdateSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const db = await getDb();
    const requester = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);
    const target = await db.get('SELECT role FROM users WHERE username = ?', targetUser);

    if (!target) return res.status(404).json({ message: 'User not found' });

    if (requester.role === 'moderator') {
        if (target.role === 'admin' || target.role === 'moderator') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        if (role === 'admin') {
            return res.status(403).json({ message: 'Moderators cannot promote to Admin' });
        }
    }

    await db.run('UPDATE users SET role = ? WHERE username = ?', role, targetUser);
    res.json({ message: 'Role updated' });
});

app.post('/api/admin/invite', authenticateToken, requireAdmin, async (req, res) => {
    const { email, role } = req.body; // Optional email and role
    const code = Math.random().toString(36).substring(7);
    const targetRole = role || 'joueur'; // Default role

    const db = await getDb();
    await db.run('INSERT INTO invites (code, email, role, created_at) VALUES (?, ?, ?, ?)',
        code, email || null, targetRole, new Date().toISOString()
    );

    if (email) {
        // Send email (async, don't block response)
        sendInviteEmail(email, code).catch(err => console.error("Failed to send invite email", err));
    }

    res.json({ code, role: targetRole, email });
});

app.get('/api/admin/invites', authenticateToken, requireAdmin, async (req, res) => {
    const db = await getDb();
    const invites = await db.all('SELECT * FROM invites');
    res.json(invites);
});

app.delete('/api/admin/invites/:code', authenticateToken, requireAdmin, async (req, res) => {
    const { code } = req.params;
    const db = await getDb();
    const result = await db.run('DELETE FROM invites WHERE code = ?', code);

    if (result.changes === 0) {
        return res.status(404).json({ message: 'Invite not found' });
    }
    res.json({ message: 'Invite deleted' });
});

// Data Routes
app.get('/api/data', authenticateToken, async (req, res) => {
    const username = req.user.username;
    const db = await getDb();
    const user = await db.get('SELECT data_json FROM users WHERE username = ?', username);

    if (!user) return res.sendStatus(404);

    const userData = JSON.parse(user.data_json);

    // Get Shared
    const schoolsRow = await db.get('SELECT value_json FROM shared_data WHERE key = ?', 'schools');
    const criteriaRow = await db.get('SELECT value_json FROM shared_data WHERE key = ?', 'criteria');

    const responseData = {
        profile: userData.profile,
        schools: schoolsRow ? JSON.parse(schoolsRow.value_json) : [],
        criteria: criteriaRow ? JSON.parse(criteriaRow.value_json) : []
    };

    res.json(responseData);
});

app.post('/api/data', authenticateToken, async (req, res) => {
    const username = req.user.username;
    const { profile, schools, criteria } = req.body;

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);

    // Update Profile
    if (profile) {
        let currentData = JSON.parse(user.data_json);
        currentData.profile = profile;
        await db.run('UPDATE users SET data_json = ? WHERE username = ?', JSON.stringify(currentData), username);
    }

    // Update Shared (Role check)
    if (['admin', 'moderator', 'staff'].includes(user.role)) {
        if (schools) {
            await db.run('INSERT OR REPLACE INTO shared_data (key, value_json) VALUES (?, ?)', 'schools', JSON.stringify(schools));
        }
        if (criteria) {
            await db.run('INSERT OR REPLACE INTO shared_data (key, value_json) VALUES (?, ?)', 'criteria', JSON.stringify(criteria));
        }
    }

    res.json({ message: 'Data saved successfully' });
});

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA handling
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Not found' });
    }
    try {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    } catch (e) {
        res.status(500).send("Build not found.");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
