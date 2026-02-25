import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Slider from '../components/UI/Slider';
import { ChevronDown, Check } from 'lucide-react';
import styles from './MyProfile.module.css';

const MyProfile = () => {
    const { profile, updateProfile, criteria, activeCriteria, toggleCriterionActive } = useApp();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const activeCriteriaObjects = criteria.filter(c => activeCriteria.includes(c.id));

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

                    <div className={styles.dropdownContainer} ref={dropdownRef}>
                        <button
                            className={styles.dropdownButton}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span>
                                Filtrer les critères ({activeCriteria.length}/{criteria.length})
                            </span>
                            <ChevronDown
                                size={20}
                                style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                            />
                        </button>

                        {isDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                {criteria.map(criterion => (
                                    <label key={criterion.id} className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={activeCriteria.includes(criterion.id)}
                                            onChange={() => toggleCriterionActive(criterion.id)}
                                        />
                                        <div
                                            className={styles.checkboxCustom}
                                            style={{
                                                backgroundColor: activeCriteria.includes(criterion.id) ? criterion.color : 'transparent',
                                                borderColor: activeCriteria.includes(criterion.id) ? criterion.color : 'rgba(255,255,255,0.4)'
                                            }}
                                        >
                                            {activeCriteria.includes(criterion.id) && <Check size={14} color="#1e1e2e" strokeWidth={3} />}
                                        </div>
                                        <span>{criterion.label}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    {activeCriteriaObjects.length === 0 ? (
                        <p style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic', textAlign: 'center', margin: '2rem 0' }}>
                            Veuillez sélectionner au moins un critère.
                        </p>
                    ) : (
                        activeCriteriaObjects.map((criterion) => (
                            <Slider
                                key={criterion.id}
                                label={criterion.label}
                                value={profile[criterion.id] || 0}
                                onChange={(val) => updateProfile(criterion.id, val)}
                                color={criterion.color}
                            />
                        ))
                    )}
                </div>

                <div className={styles.instructionCard}>
                    <div className="card">
                        <h3 className={styles.instructionTitle}>Comment ça marche ?</h3>
                        <ul className={styles.instructionList}>
                            <li>
                                <span className={styles.bullet}>1</span>
                                <span>Sélectionnez les critères qui vous importent grâce au menu déroulant.</span>
                            </li>
                            <li>
                                <span className={styles.bullet}>2</span>
                                <span>Ajustez les curseurs correspondants selon vos priorités.</span>
                            </li>
                            <li>
                                <span className={styles.bullet}>3</span>
                                <span>Ajoutez des écoles dans l'onglet "Écoles".</span>
                            </li>
                            <li>
                                <span className={styles.bullet}>4</span>
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
