import React from 'react';
import { useApp } from '../context/AppContext';
import Slider from '../components/UI/Slider';
import styles from './MyProfile.module.css';

const MyProfile = () => {
    const { profile, updateProfile, criteria } = useApp();

    return (
        <div className="container">
            <header className={styles.header}>
                <h1 className="title">Mon Profil</h1>
                <p className={styles.subtitle}>
                    Évaluez vos besoins et préférences pour trouver l'école qui vous correspond le mieux.
                </p>
            </header>

            <div className={styles.grid}>
                <div className={`card ${styles.evaluationCard}`}>
                    <h2 className={styles.sectionTitle}>Mes Critères</h2>
                    {criteria.map((criterion) => (
                        <Slider
                            key={criterion.id}
                            label={criterion.label}
                            value={profile[criterion.id] || 0} // Fallback to 0 if key missing
                            onChange={(val) => updateProfile(criterion.id, val)}
                            color={criterion.color}
                        />
                    ))}
                </div>

                <div className={styles.instructionCard}>
                    <div className="card">
                        <h3 className={styles.instructionTitle}>Comment ça marche ?</h3>
                        <ul className={styles.instructionList}>
                            <li>
                                <span className={styles.bullet}>1</span>
                                <span>Ajustez les curseurs selon vos priorités.</span>
                            </li>
                            <li>
                                <span className={styles.bullet}>2</span>
                                <span>Ajoutez des écoles dans l'onglet "Écoles".</span>
                            </li>
                            <li>
                                <span className={styles.bullet}>3</span>
                                <span>Comparez vos profils dans l'onglet "Comparer".</span>
                            </li>
                        </ul>
                        <div className={styles.tips}>
                            <p>💡 <b>Conseil :</b> Soyez honnête avec vous-même pour obtenir les résultats les plus pertinents.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MyProfile;
