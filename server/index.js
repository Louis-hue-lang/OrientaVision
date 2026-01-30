import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import { users, inviteCodes, saveUsers, sharedData, saveSharedData } from './store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const SECRET_KEY = process.env.SECRET_KEY || 'supersecretkey_dev'; // In prod, use env var

app.use(cors());
app.use(express.json());

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
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
    }

    if (users[username]) {
        return res.status(409).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if this is the first user
    const isFirstUser = Object.keys(users).length === 0;

    if (!isFirstUser) {
        if (!req.body.inviteCode || !inviteCodes.has(req.body.inviteCode)) {
            return res.status(403).json({ message: 'Invalid or missing invite code' });
        }
        // Consume code (optional, but good practice for security)
        // Let's consume it to match typical "invite link" behavior
        inviteCodes.delete(req.body.inviteCode);
    }

    // Initialize with empty data
    users[username] = {
        passwordHash: hashedPassword,
        role: isFirstUser ? 'admin' : 'joueur',
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
    const { username, password } = req.body;
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
        role: users[username].role
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
app.post('/api/admin/invite', authenticateToken, requireAdmin, (req, res) => {
    // Generate a random code
    const code = Math.random().toString(36).substring(7);
    inviteCodes.add(code);
    res.json({ code }); // Frontend handles link construction
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
