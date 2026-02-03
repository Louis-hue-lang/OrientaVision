import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './Login.module.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Lien de réinitialisation invalide ou manquant.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Les mots de passe ne correspondent pas.');
            return;
        }

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Mot de passe modifié avec succès !');
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setStatus('error');
                setMessage(data.message || 'Erreur lors de la réinitialisation.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Erreur de connexion au serveur.');
        }
    };

    if (!token) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={`${styles.alert} ${styles.error}`}>
                        <AlertCircle size={16} />
                        <span>Lien invalide. Veuillez recommencer la procédure.</span>
                    </div>
                    <Link to="/forgot-password" className={styles.switchButton}>Retour</Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Nouveau mot de passe</h1>

                {message && (
                    <div className={`${styles.alert} ${status === 'success' ? styles.success : styles.error}`}>
                        {status === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{message}</span>
                    </div>
                )}

                {status !== 'success' && (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>Nouveau mot de passe</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className={styles.input}
                            />
                            <div style={{ fontSize: '0.8rem', color: '#fb8c00', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <AlertCircle size={12} />
                                <span>Privilégiez un mot de passe complexe pour votre sécurité.</span>
                            </div>
                        </div>
                        <div className={styles.inputGroup}>
                            <label>Confirmer le mot de passe</label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                className={styles.input}
                            />
                        </div>

                        <button type="submit" disabled={status === 'loading'} className={styles.submitButton}>
                            {status === 'loading' ? 'Modification...' : <><KeyRound size={18} /> Modifier le mot de passe</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ResetPassword;
