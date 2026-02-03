import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { initializeDatabase } from './database.js';

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import dataRoutes from './routes/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Check for secrets in production
if (process.env.NODE_ENV === 'production') {
    if (!process.env.SECRET_KEY || !process.env.REFRESH_SECRET_KEY) {
        console.error('FATAL: SECRET_KEY and REFRESH_SECRET_KEY must be set in production.');
        process.exit(1);
    }
}

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
    // Only log in dev or if explicitly requested, otherwise it spams
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_IP) {
        console.log(`[${new Date().toISOString()}] Request from IP: ${req.ip} | X-Forwarded-For: ${req.headers['x-forwarded-for']}`);
    }
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
    message: { message: "Trop de requêtes, réessayez dans 15 minutes" }
});

app.use('/api', limiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 20, // Increased limit for debugging/usage
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Trop de tentatives de connexion, réessayez dans 15 minutes" }
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data', dataRoutes);

// Serve static files
app.use(express.static(path.join(__dirname, '../dist')));

// SPA handling
app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Route API introuvable' });
    }
    try {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    } catch (e) {
        res.status(500).send("Application non construite (Build not found).");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
