import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import styles from './Settings.module.css';

const Settings = () => {
    const { criteria, addCriterion, removeCriterion } = useApp();
    const [newLabel, setNewLabel] = useState('');
    const [newColor, setNewColor] = useState('#8b5cf6');

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newLabel.trim()) return;

        // Check for duplicates
        const id = newLabel.toLowerCase().replace(/\s+/g, '');
        if (criteria.some(c => c.id === id)) {
            alert('Ce critère existe déjà !');
            return;
        }

        addCriterion({
            label: newLabel,
            color: newColor
        });
        setNewLabel('');
        setNewColor('#8b5cf6');
    };

    return (
        <div className="container">
            <h1 className="title">Paramètres</h1>

            <div className={styles.grid}>
                <div className={`card ${styles.manageCard}`}>
                    <div className={styles.cardHeader}>
                        <Sparkles className={styles.icon} />
                        <h2>Critères d'évaluation</h2>
                    </div>
                    <p className={styles.description}>
                        Personnalisez les axes sur lesquels vous évaluez les écoles.
                        Ces critères apparaîtront sur vos graphiques et dans l'évaluation de votre profil.
                    </p>

                    <div className={styles.criteriaList}>
                        {criteria.map((item) => (
                            <div key={item.id} className={styles.criterionItem}>
                                <div className={styles.adjuster}>
                                    <div
                                        className={styles.colorDot}
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className={styles.label}>{item.label}</span>
                                </div>
                                {/* Prevent deleting if it's the last few criteria? or allow all empty? user requirement says flexible */}
                                <button
                                    onClick={() => removeCriterion(item.id)}
                                    className={styles.deleteButton}
                                    title="Supprimer ce critère"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleAdd} className={styles.addForm}>
                        <div className={styles.inputGroup}>
                            <input
                                type="text"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                placeholder="Nouveau critère (ex: Vie associative)"
                                className={styles.input}
                            />
                            <input
                                type="color"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                                className={styles.colorInput}
                                title="Choisir une couleur"
                            />
                        </div>
                        <button type="submit" disabled={!newLabel.trim()} className={styles.addButton}>
                            <Plus size={20} />
                            Ajouter
                        </button>
                    </form>
                </div>

                <div className={`card ${styles.dangerZone}`}>
                    <div className={styles.cardHeader}>
                        <AlertTriangle className={styles.dangerIcon} />
                        <h2>Zone de danger</h2>
                    </div>
                    <p className={styles.description}>
                        Vos données sont synchronisées avec le serveur.
                        Ce bouton permet de nettoyer le cache local de votre navigateur en cas de problème d'affichage.
                        Cela vous déconnectera.
                    </p>
                    <button
                        className={styles.resetButton}
                        onClick={() => {
                            if (confirm('Voulez-vous vider le cache local et vous déconnecter ?')) {
                                localStorage.clear();
                                window.location.reload();
                            }
                        }}
                    >
                        Vider le cache et se déconnecter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Settings;
