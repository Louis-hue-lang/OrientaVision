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

    // Invite generation state
    const [newInviteRole, setNewInviteRole] = useState('joueur');
    const [newInviteEmail, setNewInviteEmail] = useState('');

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    role: newInviteRole,
                    email: newInviteEmail
                })
            });
            const data = await res.json();
            // Construct full link
            const fullLink = `${window.location.origin}/login?invite=${data.code}`;
            setInviteLink(fullLink);
            fetchInvites(); // Refresh list

            if (newInviteEmail) {
                setMessage(`Invitation envoyée par email à ${newInviteEmail}`);
            } else {
                setMessage('Lien d\'invitation généré');
            }
            // Reset email but maybe keep role
            setNewInviteEmail('');

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
            </header>

            <div className={`card ${styles.inviteCard}`} style={{ marginBottom: '2rem' }}>
                <h3>Générer une invitation</h3>
                <div className={styles.inviteControls} style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                    <select
                        value={newInviteRole}
                        onChange={(e) => setNewInviteRole(e.target.value)}
                        className={styles.roleSelect}
                        style={{ padding: '8px' }}
                    >
                        <option value="joueur">Joueur</option>
                        <option value="staff">Staff</option>
                        <option value="moderator">Modérateur</option>
                        <option value="admin">Admin</option>
                    </select>

                    <input
                        type="email"
                        placeholder="Email (optionnel pour envoi auto)"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        className={styles.input}
                        style={{ padding: '8px', flex: 1, minWidth: '200px' }}
                    />

                    <button onClick={handleInvite} className={styles.inviteButton}>
                        <UserPlus size={18} />
                        Générer & Envoyer
                    </button>
                </div>

                {inviteLink && (
                    <div className={styles.linkBox} style={{ marginTop: '15px' }}>
                        <code>{inviteLink}</code>
                        <button onClick={copyLink} title="Copier">
                            <Copy size={18} />
                        </button>
                    </div>
                )}
            </div>

            {message && <div className={styles.successMessage}>{message}</div>}
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={`card ${styles.inviteCard}`}>
                <h3>Invitations en attente ({invites.length})</h3>
                {invites.length > 0 ? (
                    <ul className={styles.inviteList} style={{ marginTop: '1rem', listStyle: 'none', padding: 0 }}>
                        {invites.map(inv => (
                            <li key={inv.code} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #ffffff10' }}>
                                <span>
                                    <span className={styles.badge} style={{ marginRight: '10px', fontSize: '0.8rem' }}>{inv.role || 'joueur'}</span>
                                    <strong>{inv.code}</strong>
                                    {inv.email && <span style={{ marginLeft: '10px', color: '#aaa' }}>({inv.email})</span>}
                                    <small style={{ opacity: 0.6, marginLeft: '10px' }}> - {new Date(inv.created_at).toLocaleDateString()}</small>
                                </span>
                                <button onClick={() => handleDeleteInvite(inv.code)} className={styles.deleteButton} title="Révoquer">
                                    <Trash2 size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={{ opacity: 0.6, marginTop: '1rem' }}>Aucune invitation en attente.</p>
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
