import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    // Check unique URL param on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invite = params.get('invite');
        if (invite) {
            setInviteCode(invite);
            setIsLogin(false); // Switch to register mode
            // Clear param to clean URL? Optional.
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await login(username, password);
                navigate('/');
            } else {
                await register(username, password, inviteCode);
                // Auto login after register? or ask to login?
                // Let's ask to login for simplicity or just switch mode
                setIsLogin(true);
                setError('Compte créé avec succès ! Connectez-vous.');
                setLoading(false); // Stop loading to show message
                return;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>{isLogin ? 'Connexion' : 'Inscription'}</h1>

                {error && (
                    <div className={`${styles.alert} ${error.includes('succès') ? styles.success : styles.error}`}>
                        <AlertCircle size={16} />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label>Identifiant</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label>Mot de passe</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className={styles.input}
                        />
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: '15px' }}>
                        <button
                            type="button"
                            onClick={() => navigate('/forgot-password')}
                            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '0.9rem', padding: 0 }}
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label>Code d'invitation (Optionnel pour le 1er admin, requis ensuite)</label>
                            <input
                                type="text"
                                value={inviteCode}
                                onChange={(e) => setInviteCode(e.target.value)}
                                className={styles.input}
                                placeholder="Requis sauf pour le premier compte"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className={styles.submitButton}>
                        {loading ? 'Chargement...' : (isLogin ? <><LogIn size={18} /> Se connecter</> : <><UserPlus size={18} /> Créer un compte</>)}
                    </button>
                </form>

                <p className={styles.switchText}>
                    {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}
                    <button
                        type="button"
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className={styles.switchButton}
                    >
                        {isLogin ? "S'inscrire" : "Se connecter"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Login;
