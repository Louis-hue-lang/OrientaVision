import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../database.js';
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from '../validation.js';
import { sendResetPasswordEmail } from '../email.js';
import { generateTokens } from '../utils/tokens.js';

const router = express.Router();
const REFRESH_SECRET_KEY = process.env.REFRESH_SECRET_KEY || 'superrefreshsecretkey_dev';
const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev';

router.post('/register', async (req, res) => {
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { username, password, inviteCode, email } = validation.data;
    const db = await getDb();

    // Check existing user
    const existingUser = await db.get('SELECT username FROM users WHERE username = ? OR email = ?', username, email);
    if (existingUser) {
        return res.status(409).json({ message: 'Utilisateur ou email déjà existant' });
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

router.post('/login', async (req, res) => {
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

    // Hash refresh token before storing
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    // Store refresh token HASH
    await db.run('UPDATE users SET refresh_token = ? WHERE username = ?', refreshTokenHash, user.username);

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

router.post('/forgot-password', async (req, res) => {
    const validation = forgotPasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    const { email } = validation.data;
    const db = await getDb();
    const user = await db.get('SELECT username FROM users WHERE email = ?', email);

    if (!user) {
        // Don't leak exists/not exists
        return res.json({ message: 'Si un compte existe avec cet email, un lien a été envoyé.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + 3600000; // 1 hour

    await db.run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE email = ?', token, expires, email);

    // Send Email
    sendResetPasswordEmail(email, token);

    res.json({ message: 'Si un compte existe avec cet email, un lien a été envoyé.' });
});

router.post('/reset-password', async (req, res) => {
    const validation = resetPasswordSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    const { token, password } = validation.data;
    const db = await getDb();

    const user = await db.get('SELECT username FROM users WHERE reset_token = ? AND reset_token_expires > ?', token, Date.now());

    if (!user) {
        return res.status(400).json({ message: 'Lien invalide ou expiré' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE username = ?', hashedPassword, user.username);

    res.json({ message: 'Mot de passe réinitialisé avec succès' });
});

router.post('/refresh', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    jwt.verify(refreshToken, REFRESH_SECRET_KEY, async (err, decoded) => {
        if (err) return res.sendStatus(403); // Invalid signature or expired

        const db = await getDb();
        // Look up by username from valid token
        const user = await db.get('SELECT * FROM users WHERE username = ?', decoded.username);

        if (!user || !user.refresh_token) return res.sendStatus(403); // No user or no active session

        // Verify the token matches the stored hash
        const isValid = await bcrypt.compare(refreshToken, user.refresh_token);
        if (!isValid) return res.sendStatus(403); // Token reuse or invalid

        // Rotate Refresh Token
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);

        await db.run('UPDATE users SET refresh_token = ? WHERE username = ?', newRefreshTokenHash, user.username);

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ token: accessToken, username: user.username, role: user.role });
    });
});

router.post('/logout', async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        const decoded = jwt.decode(refreshToken);
        if (decoded && decoded.username) {
            const db = await getDb();
            await db.run('UPDATE users SET refresh_token = NULL WHERE username = ?', decoded.username);
        }
    }
    res.clearCookie('refreshToken');
    res.sendStatus(204);
});

router.post('/update-email', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ message: 'Email invalide' });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        const db = await getDb();

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

export default router;
