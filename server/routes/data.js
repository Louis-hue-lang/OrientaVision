import express from 'express';
import { getDb } from '../database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
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
        activeCriteria: userData.activeCriteria || [],
        schools: schoolsRow ? JSON.parse(schoolsRow.value_json) : [],
        criteria: criteriaRow ? JSON.parse(criteriaRow.value_json) : []
    };

    res.json(responseData);
});

router.post('/', async (req, res) => {
    const username = req.user.username;
    const { profile, activeCriteria, schools, criteria } = req.body;

    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', username);

    // Update Profile and Active Criteria
    let changed = false;
    let currentData = JSON.parse(user.data_json);

    if (profile !== undefined) {
        currentData.profile = profile;
        changed = true;
    }

    if (activeCriteria !== undefined) {
        currentData.activeCriteria = activeCriteria;
        changed = true;
    }

    if (changed) {
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

    res.json({ message: 'Données sauvegardées avec succès' });
});

export default router;
