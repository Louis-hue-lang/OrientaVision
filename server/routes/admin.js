import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken, requireAdmin, requireInvitePermission } from '../middleware/auth.js';
import { roleUpdateSchema } from '../validation.js';
import { sendInviteEmail } from '../email.js';

const router = express.Router();

// User Management Routes (Admin/Moderator only)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    const db = await getDb();
    const users = await db.all('SELECT username, email, role, used_invite_code as usedInviteCode FROM users');
    res.json(users);
});

router.delete('/users/:username', authenticateToken, requireAdmin, async (req, res) => {
    const targetUser = req.params.username;
    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Impossible de supprimer votre propre compte' });
    }

    const db = await getDb();

    // Check roles
    const requester = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);
    const target = await db.get('SELECT role FROM users WHERE username = ?', targetUser);

    if (!target) return res.status(404).json({ message: 'Utilisateur introuvable' });

    // Moderator logic
    if (requester.role === 'moderator' && (target.role === 'admin' || target.role === 'moderator')) {
        return res.status(403).json({ message: 'Les modérateurs ne peuvent pas supprimer les Admins ou d\'autres Modérateurs' });
    }

    await db.run('DELETE FROM users WHERE username = ?', targetUser);
    await db.run('DELETE FROM users WHERE username = ?', targetUser);
    res.json({ message: 'Utilisateur supprimé' });
});

router.put('/users/:username/role', authenticateToken, requireAdmin, async (req, res) => {
    const targetUser = req.params.username;
    const { role } = req.body;

    const validation = roleUpdateSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ message: validation.error.issues[0].message });

    if (targetUser === req.user.username) {
        return res.status(400).json({ message: 'Impossible de modifier votre propre rôle' });
    }

    const db = await getDb();
    const requester = await db.get('SELECT role FROM users WHERE username = ?', req.user.username);
    const target = await db.get('SELECT role FROM users WHERE username = ?', targetUser);

    if (!target) return res.status(404).json({ message: 'Utilisateur introuvable' });

    if (requester.role === 'moderator') {
        if (target.role === 'admin' || target.role === 'moderator') {
            return res.status(403).json({ message: 'Interdit' });
        }
        if (role === 'admin') {
            return res.status(403).json({ message: 'Les modérateurs ne peuvent pas promouvoir en Admin' });
        }
    }

    await db.run('UPDATE users SET role = ? WHERE username = ?', role, targetUser);
    res.json({ message: 'Rôle mis à jour' });
});

// Invite Management Routes (Admin, Moderator, Staff)
router.post('/invite', authenticateToken, requireInvitePermission, async (req, res) => {
    let { email, role } = req.body;

    // Staff can only invite 'joueur'
    if (req.userRole === 'staff') {
        role = 'joueur';
    }

    const code = Math.random().toString(36).substring(7);
    const targetRole = role || 'joueur';

    const db = await getDb();
    await db.run('INSERT INTO invites (code, email, role, created_at) VALUES (?, ?, ?, ?)',
        code, email || null, targetRole, new Date().toISOString()
    );

    if (email) {
        sendInviteEmail(email, code).catch(err => console.error("Échec de l'envoi de l'invitation", err));
    }

    res.json({ code, role: targetRole, email });
});

router.get('/invites', authenticateToken, requireInvitePermission, async (req, res) => {
    const db = await getDb();
    const invites = await db.all('SELECT * FROM invites');
    res.json(invites);
});

router.delete('/invites/:code', authenticateToken, requireInvitePermission, async (req, res) => {
    const { code } = req.params;
    const db = await getDb();
    const result = await db.run('DELETE FROM invites WHERE code = ?', code);

    if (result.changes === 0) {
        return res.status(404).json({ message: 'Invitation introuvable' });
    }
    res.json({ message: 'Invitation supprimée' });
});

export default router;
