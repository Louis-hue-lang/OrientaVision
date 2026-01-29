import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trash2, UserPlus, Copy, Shield, ShieldAlert } from 'lucide-react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const { token, user } = useAuth();
    const [users, setUsers] = useState([]);
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(await res.json());
            } else {
                setError('Impossible de récupérer les utilisateurs');
            }
        } catch (e) {
            setError('Erreur réseau');
        }
    };

    const handleDelete = async (username) => {
        if (!confirm(`Supprimer l'utilisateur ${username} ?`)) return;

        try {
            const res = await fetch(`http://localhost:3001/api/admin/users/${username}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                setUsers(users.filter(u => u.username !== username));
                setMessage(`Utilisateur ${username} supprimé`);
            } else {
                const data = await res.json();
                setError(data.message || 'Erreur lors de la suppression');
            }
        } catch (e) {
            setError('Erreur réseau');
        }
    };

    const handleRoleChange = async (username, newRole) => {
        try {
            const res = await fetch(`http://localhost:3001/api/admin/users/${username}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: newRole })
            });
            if (res.ok) {
                setUsers(users.map(u => u.username === username ? { ...u, role: newRole } : u));
                setMessage(`Rôle de ${username} mis à jour en ${newRole}`);
            } else {
                const data = await res.json();
                setError(data.message || 'Erreur lors de la mise à jour');
            }
        } catch (e) {
            setError('Erreur réseau');
        }
    };

    const handleInvite = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/admin/invite', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            setInviteLink(data.link);
            setMessage('Lien d\'invitation généré');
        } catch (e) {
            setError('Erreur lors de la génération de l\'invitation');
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(inviteLink);
        setMessage('Lien copié dans le presse-papier');
    };

    return (
        <div className="container">
            <header className={styles.header}>
                <div className={styles.titleGroup}>
                    <Shield className={styles.icon} size={32} />
                    <div>
                        <h1 className="title">Administration</h1>
                        <p>Gérez les utilisateurs et les accès.</p>
                    </div>
                </div>
                <button onClick={handleInvite} className={styles.inviteButton}>
                    <UserPlus size={18} />
                    Générer une invitation
                </button>
            </header>

            {message && <div className={styles.successMessage}>{message}</div>}
            {error && <div className={styles.errorMessage}>{error}</div>}

            {inviteLink && (
                <div className={`card ${styles.inviteCard}`}>
                    <h3>Lien d'invitation</h3>
                    <div className={styles.linkBox}>
                        <code>{inviteLink}</code>
                        <button onClick={copyLink} title="Copier">
                            <Copy size={18} />
                        </button>
                    </div>
                    <p className={styles.note}>Partagez ce lien pour permettre l'inscription.</p>
                </div>
            )}

            <div className={`card ${styles.tableCard}`}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Utilisateur</th>
                            <th>Rôle</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(u => (
                            <tr key={u.username}>
                                <td>{u.username}</td>
                                <td>
                                    {/* Prevent self-edit OR Moderator modifying Admin OR Moderator modifying other Moderators */}
                                    {u.username === user.username || (user.role === 'moderator' && (u.role === 'admin' || u.role === 'moderator')) ? (
                                        <span className={`${styles.badge} ${styles.adminBadge}`}>
                                            {u.role === 'admin' ? 'Admin' : u.role}
                                        </span>
                                    ) : (
                                        <select
                                            value={u.role}
                                            onChange={(e) => handleRoleChange(u.username, e.target.value)}
                                            className={styles.roleSelect}
                                        >
                                            {/* Moderator cannot promote to Admin */}
                                            {user.role === 'admin' && <option value="admin">Admin</option>}
                                            {/* Moderator allow set to moderator? Assuming yes, they can promote others, just not demote peers */}
                                            <option value="moderator">Modérateur</option>
                                            <option value="staff">Staff</option>
                                            <option value="joueur">Joueur</option>
                                        </select>
                                    )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    {/* Prevent deleting self OR Moderator deleting Admin OR Moderator deleting other Moderators */}
                                    {u.username !== user.username && !(user.role === 'moderator' && (u.role === 'admin' || u.role === 'moderator')) && (
                                        <button
                                            onClick={() => handleDelete(u.username)}
                                            className={styles.deleteButton}
                                            title="Supprimer"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
