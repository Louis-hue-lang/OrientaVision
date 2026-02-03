import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';
import styles from './Login.module.css';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Migration State
    const [migrationMode, setMigrationMode] = useState(false);
    const [migrationEmail, setMigrationEmail] = useState('');

    const { login, register, token } = useAuth();
    const navigate = useNavigate();

    // Check unique URL param on mount
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const invite = params.get('invite');
        if (invite) {
            setInviteCode(invite);
            setIsLogin(false); // Switch to register mode
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                const data = await login(username, password);
                if (data.migrationRequired) {
                    setMigrationMode(true);
                    setLoading(false);
                    return; // Don't navigate yet
                }
                navigate('/');
            } else {
                await register(username, email, password, inviteCode);
                setIsLogin(true);
                setError('Compte créé avec succès ! Connectez-vous.');
                setLoading(false);
                return;
            }
        } catch (err) {
            setError(err.message);
        } finally {
            if (!migrationMode) setLoading(false);
        }
    };

    const handleMigrationSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('/api/auth/update-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ email: migrationEmail })
            });

            if (response.ok) {
                // Success: Alert user and navigate
                alert("Email enregistré ! Utilisez désormais cet email pour vous connecter.");
                navigate('/');
            } else {
                const data = await response.json();
                setError(data.message || "Erreur lors de la mise à jour");
                setLoading(false);
            }
        } catch (e) {
            setError("Erreur serveur");
            setLoading(false);
        }
    };

    if (migrationMode) {
        return (
            <div className={styles.container}>
                <div className={styles.card}>
                    <h1 className={styles.title}>Mise à jour requise</h1>
                    <div className={`${styles.alert} ${styles.info}`} style={{ backgroundColor: '#e3f2fd', color: '#0d47a1', border: '1px solid #90caf9' }}>
                        <AlertCircle size={16} />
                        <span>Veuillez renseigner votre email. Il remplacera votre identifiant pour vos prochaines connexions.</span>
                    </div>

                    {error && (
                        <div className={`${styles.alert} ${styles.error}`}>
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleMigrationSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>Votre Adresse Email</label>
                            <input
                                type="email"
                                value={migrationEmail}
                                onChange={(e) => setMigrationEmail(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="exemple@email.com"
                            />
                        </div>
                        <button type="submit" disabled={loading} className={styles.submitButton}>
                            {loading ? 'Enregistrement...' : 'Valider et continuer'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

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
                        <label>{isLogin ? 'Email ou Identifiant' : 'Identifiant (Affichage)'}</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            className={styles.input}
                            placeholder={isLogin ? "Entrez votre email ou identifiant" : "Choisissez un pseudo"}
                        />
                    </div>

                    {!isLogin && (
                        <div className={styles.inputGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="exemple@email.com"
                            />
                        </div>
                    )}

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

                    {!isLogin && (
                        <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: '15px' }}>
                            L'email est requis pour récupérer votre mot de passe si vous l'oubliez.
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
