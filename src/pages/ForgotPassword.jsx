import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './Login.module.css'; // Reuse Login styles

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage(data.message || 'Si un compte existe avec cet email, un lien a été envoyé.');
            } else {
                setStatus('error');
                setMessage(data.message || 'Une erreur est survenue.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Erreur de connexion au serveur.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>Mot de passe oublié</h1>
                <p className={styles.subtitle} style={{ textAlign: 'center', marginBottom: '20px', color: '#666' }}>
                    Entrez votre email pour recevoir un lien de réinitialisation.
                </p>

                {message && (
                    <div className={`${styles.alert} ${status === 'success' ? styles.success : styles.error}`}>
                        {status === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        <span>{message}</span>
                    </div>
                )}

                {status !== 'success' ? (
                    <form onSubmit={handleSubmit} className={styles.form}>
                        <div className={styles.inputGroup}>
                            <label>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className={styles.input}
                                placeholder="exemple@domaine.com"
                            />
                        </div>

                        <button type="submit" disabled={status === 'loading'} className={styles.submitButton}>
                            {status === 'loading' ? 'Envoi...' : <><Mail size={18} /> Envoyer le lien</>}
                        </button>
                    </form>
                ) : (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                        <p>Vérifiez votre boîte mail (et vos courriers indésirables).</p>
                    </div>
                )}

                <div style={{ marginTop: '20px', textAlign: 'center' }}>
                    <Link to="/login" className={styles.switchButton} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <ArrowLeft size={16} /> Retour à la connexion
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
