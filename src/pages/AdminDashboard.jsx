import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trash2, UserPlus, Copy, Shield, ShieldAlert } from 'lucide-react';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const { token, user } = useAuth();
    const [users, setUsers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [inviteLink, setInviteLink] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        useEffect(() => {
            fetchUsers();
            fetchInvites();
        }, []);

        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/admin/users', {
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

        const fetchInvites = async () => {
            try {
                const res = await fetch('/api/admin/invites', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setInvites(await res.json());
                }
            } catch (e) {
                console.error('Failed to fetch invites');
            }
        };

        const handleDelete = async (username) => {
            if (!confirm(`Supprimer l'utilisateur ${username} ?`)) return;

            try {
                const res = await fetch(`/api/admin/users/${username}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                // ... (skipping unchanged lines in thought, but tool needs exact context or full block. I will use ReplaceFileContent with larger block if needed or multiple calls.
                // Since AdminDashboard has multiple fetches, I will use MultiReplaceFileContent for AdminDashboard to be cleaner.)
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
                const res = await fetch(`/api/admin/users/${username}/role`, {
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
                const res = await fetch('/api/admin/invite', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();
                // Construct full link client-side to ensure correct domain
                const fullLink = `${window.location.origin}/login?invite=${data.code}`;
                setInviteLink(fullLink);
                fetchInvites(); // Refresh list
                setMessage('Lien d\'invitation généré');
            } catch (e) {
                setError('Erreur lors de la génération de l\'invitation');
            }
        };

        const handleDeleteInvite = async (code) => {
            if (!confirm('Supprimer cette invitation ?')) return;
            try {
                const res = await fetch(`/api/admin/invites/${code}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setInvites(invites.filter(i => i.code !== code));
                    setMessage('Invitation supprimée');
                }
            } catch (e) {
                setError('Erreur réseau');
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

                <div className={`card ${styles.inviteCard}`}>
                    <h3>Invitations en attente ({invites.length})</h3>
                    {inviteLink && (
                        <div className={styles.linkBox}>
                            <code>{inviteLink}</code>
                            <button onClick={copyLink} title="Copier">
                                <Copy size={18} />
                            </button>
                        </div>
                    )}

                    {invites.length > 0 && (
                        <ul className={styles.inviteList} style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
                            {invites.map(inv => (
                                <li key={inv.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #ffffff10' }}>
                                    <span>
                                        Code: <strong>{inv.code}</strong> <small style={{ opacity: 0.6 }}>({new Date(inv.createdAt).toLocaleDateString()})</small>
                                    </span>
                                    <button onClick={() => handleDeleteInvite(inv.code)} className={styles.deleteButton} title="Révoquer">
                                        <Trash2 size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={`card ${styles.tableCard}`}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Utilisateur</th>
                                <th>Rôle</th>
                                <th>Invitation</th>
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
                                    <td>
                                        <small style={{ opacity: 0.7 }}>{u.usedInviteCode}</small>
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
