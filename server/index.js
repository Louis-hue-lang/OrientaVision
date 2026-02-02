import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { users, invites, saveUsers, saveInvites, sharedData, saveSharedData } from './store.js';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { registerSchema, loginSchema, roleUpdateSchema } from './validation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev'; // In prod, use env var

app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 login/register requests per windowMs
    message: 'Too many login attempts, please try again after 15 minutes'
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

const requireAdmin = (req, res, next) => {
    // Check if user object exists from authenticateToken
    // And check role. 
    // Note: We encoded role in token, but we should probably verify against store for critical actions
    // For simplicity, rely on token or check store:
    const user = users[req.user.username];
    if (user && (user.role === 'admin' || user.role === 'moderator')) {
        next();
    } else {
        res.status(403).json({ message: 'Admin access required' });
    }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
    // Validate input using Zod
    const validation = registerSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { username, password } = validation.data;


    if (users[username]) {
        return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this is the first user
    const isFirstUser = Object.keys(users).length === 0;

    if (!isFirstUser) {
        const inviteIndex = invites.findIndex(inv => inv.code === req.body.inviteCode);
        if (inviteIndex === -1) {
            return res.status(403).json({ message: 'Invalid or missing invite code' });
        }
        // Consume code
        invites.splice(inviteIndex, 1);
        saveInvites();
    }

    // Initialize with empty data
    users[username] = {
        passwordHash: hashedPassword,
        role: isFirstUser ? 'admin' : 'joueur',
        usedInviteCode: isFirstUser ? 'First Admin' : req.body.inviteCode,
        data: {
            profile: null,
            schools: [],
            criteria: [] // Will fallback to defaults on frontend if empty
        }
    };
    saveUsers();

    res.status(201).json({ message: 'User created' });
});

app.post('/api/auth/login', async (req, res) => {
    // Validate input
    const validation = loginSchema.safeParse(req.body);
    if (!validation.success) {
        return res.status(400).json({ message: validation.error.issues[0].message });
    }

    const { username, password } = validation.data;
    const user = users[username];

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ username, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, username, role: user.role });
});

// Admin Routes
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
    // Return list of users sans passwords
    const userList = Object.keys(users).map(username => ({
        username,
        role: users[username].role,
        usedInviteCode: users[username].usedInviteCode || 'N/A'
    }));
    res.json(userList);
});

app.delete('/api/admin/users/:username', authenticateToken, requireAdmin, (req, res) => {
    const targetUser = req.params.username;
    if (!users[targetUser]) {
        return res.status(404).json({ message: 'User not found' });
    }
    // Prevent deleting self
    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    // Prevent Moderator from deleting Admin OR other Moderators
    const requester = users[req.user.username];
    const target = users[targetUser];
    if (requester.role === 'moderator' && (target.role === 'admin' || target.role === 'moderator')) {
        return res.status(403).json({ message: 'Moderators cannot delete Admins or other Moderators' });
    }

    delete users[targetUser];
    saveUsers();
    res.json({ message: 'User deleted' });
});

app.put('/api/admin/users/:username/role', authenticateToken, requireAdmin, (req, res) => {
    const targetUser = req.params.username;
    const { role } = req.body;

    if (!users[targetUser]) {
        return res.status(404).json({ message: 'User not found' });
    }

    if (!['admin', 'moderator', 'staff', 'joueur'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Cannot change your own role' });
    }

    const requester = users[req.user.username];
    const target = users[targetUser];

    // Moderator restrictions
    if (requester.role === 'moderator') {
        if (target.role === 'admin' || target.role === 'moderator') {
            return res.status(403).json({ message: 'Moderators cannot modify Admins or other Moderators' });
        }
        if (role === 'admin') {
            return res.status(403).json({ message: 'Moderators cannot promote to Admin' });
        }
    }

    users[targetUser].role = role;
    saveUsers();
    res.json({ message: 'Role updated' });
});

// Invitation / Registration Code (Simple Implementation)
// In a real app, generate a unique code and store it.
// here we can just sign a special JWT or just assume "Link copied" means we are done 
// and registration checks for a code if we implemented that constraint. 
// For now, let's just make an endpoint that returns a "invite link" structure
// Generate a secure random code
app.post('/api/admin/invite', authenticateToken, requireAdmin, (req, res) => {
    // Generate a secure random code
    const code = Math.random().toString(36).substring(7);
    invites.push({
        code,
        createdAt: new Date().toISOString()
    });
    saveInvites();
    res.json({ code }); // Frontend handles link construction
});

app.get('/api/admin/invites', authenticateToken, requireAdmin, (req, res) => {
    res.json(invites);
});

app.delete('/api/admin/invites/:code', authenticateToken, requireAdmin, (req, res) => {
    const { code } = req.params;
    const initialLength = invites.length;

    // Filter out the code
    const newInvites = invites.filter(inv => inv.code !== code);

    if (newInvites.length === initialLength) {
        return res.status(404).json({ message: 'Invite not found' });
    }

    // Update the array in place (since we imported a mutable reference? verify store.js)
    // store.js exports `invites` which is `let initialInvites` assigned. Wait, `export const invites = initialInvites` exports a reference to the array. 
    // Mutating the array `invites` works (push/splice). assigning a new array to `newInvites` logic requires clearing and pushing back or splicing.
    invites.length = 0;
    invites.push(...newInvites);

    saveInvites();
    res.json({ message: 'Invite deleted' });
});

// Data Routes
app.get('/api/data', authenticateToken, (req, res) => {
    const username = req.user.username;
    if (!users[username]) {
        return res.sendStatus(404);
    }
    const userData = users[username].data;

    // Merge user profile with shared schools and criteria
    const responseData = {
        profile: userData.profile,
        schools: sharedData.schools,
        criteria: sharedData.criteria
    };

    res.json(responseData);
});

app.post('/api/data', authenticateToken, (req, res) => {
    const username = req.user.username;
    const { profile, schools, criteria } = req.body;
    const userRole = users[username].role;

    // Update User Profile (Allowed for everyone)
    if (profile) users[username].data.profile = profile;

    // Update Shared Data (Allowed only for Admin/Moderator/Staff)
    if (['admin', 'moderator', 'staff'].includes(userRole)) {
        if (schools) sharedData.schools = schools;
        if (criteria) sharedData.criteria = criteria;
        saveSharedData();
    }

    saveUsers();

    res.json({ message: 'Data saved successfully' });
});

// Serve static files from React app
app.use(express.static(path.join(__dirname, '../dist')));

// Handle SPA routing
app.get('*', (req, res) => {
    // Check if request is for API
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ message: 'Not found' });
    }
    // Check if dist exists, otherwise might fail if not built
    try {
        res.sendFile(path.join(__dirname, '../dist', 'index.html'));
    } catch (e) {
        res.status(500).send("Build not found. Please run npm run build.");
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
