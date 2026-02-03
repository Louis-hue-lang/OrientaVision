import jwt from 'jsonwebtoken';
import { getDb } from '../database.js';

const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev';

export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

export const requireAdmin = async (req, res, next) => {
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);

    if (user && (user.role === 'admin' || user.role === 'moderator')) {
        req.userRole = user.role; // store for later use
        next();
    } else {
        res.status(403).json({ message: 'Accès administrateur requis' });
    }
};

export const requireInvitePermission = async (req, res, next) => {
    const db = await getDb();
    const user = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);

    if (user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'staff')) {
        req.userRole = user.role; // store for later use
        next();
    } else {
        res.status(403).json({ message: 'Accès non autorisé' });
    }
};
