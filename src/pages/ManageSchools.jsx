import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import Slider from '../components/UI/Slider';
import { Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import styles from './ManageSchools.module.css';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const ManageSchools = () => {
    const { schools, addSchool, updateSchool, removeSchool, criteria } = useApp();
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        color: PRESET_COLORS[0],
        scores: {}
    });

    const isReadOnly = user?.role === 'joueur';

    const resetForm = () => {
        const defaultScores = {};
        criteria.forEach(c => defaultScores[c.id] = 5);
        setFormData({
            name: '',
            color: PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)],
            scores: defaultScores
        });
        setEditingId(null);
        setIsEditing(false);
    };

    const startAdd = () => {
        resetForm();
        setIsEditing(true);
    };

    const startEdit = (school) => {
        setFormData({
            name: school.name,
            color: school.color,
            scores: { ...school.scores } // ensure we have all current scores
        });
        setEditingId(school.id);
        setIsEditing(true);
    };

    const handleSave = () => {
        if (!formData.name.trim()) return;

        // Ensure all criteria have a score (default 5 if missing)
        const completeScores = { ...formData.scores };
        criteria.forEach(c => {
            if (completeScores[c.id] === undefined) {
                completeScores[c.id] = 5;
            }
        });

        const schoolData = {
            name: formData.name,
            color: formData.color,
            scores: completeScores
        };

        if (editingId) {
            updateSchool(editingId, schoolData);
        } else {
            addSchool(schoolData);
        }
        resetForm();
    };

    return (
        <div className="container">
            <header className={styles.header}>
                <div>
                    <h1 className="title">Gérer les Écoles</h1>
                    <p className={styles.subtitle}>Ajoutez et personnalisez les écoles que vous visez.</p>
                </div>
                {!isEditing && !isReadOnly && (
                    <button onClick={startAdd} className={styles.addButton}>
                        <Plus size={20} />
                        Ajouter une école
                    </button>
                )}
            </header>

            {isEditing && !isReadOnly ? (
                <div className={`card ${styles.formCard}`}>
                    <div className={styles.formHeader}>
                        <h2>{editingId ? 'Modifier l\'école' : 'Nouvelle école'}</h2>
                        <button onClick={resetForm} className={styles.closeButton}>
                            <X size={24} />
                        </button>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Nom de l'école</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ex: École 42, HEC, ..."
                            className={styles.input}
                            autoFocus
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Couleur</label>
                        <div className={styles.colorGrid}>
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    className={`${styles.colorSwatch} ${formData.color === c ? styles.activeSwatch : ''}`}
                                    style={{ backgroundColor: c }}
                                    onClick={() => setFormData({ ...formData, color: c })}
                                />
                            ))}
                        </div>
                    </div>

                    <div className={styles.slidersGrid}>
                        <h3 className={styles.subTitle}>Profil de l'école</h3>
                        {criteria.map(criterion => (
                            <Slider
                                key={criterion.id}
                                label={criterion.label}
                                value={formData.scores[criterion.id] !== undefined ? formData.scores[criterion.id] : 5}
                                onChange={(val) => setFormData({
                                    ...formData,
                                    scores: { ...formData.scores, [criterion.id]: val }
                                })}
                                color={criterion.color}
                            />
                        ))}
                    </div>

                    <div className={styles.formActions}>
                        <button onClick={resetForm} className={styles.cancelButton}>Annuler</button>
                        <button onClick={handleSave} className={styles.saveButton} disabled={!formData.name.trim()}>
                            <Check size={20} />
                            Enregistrer
                        </button>
                    </div>
                </div>
            ) : (
                <div className={styles.schoolsGrid}>
                    {schools.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>Aucune école ajoutée pour le moment.</p>
                            {!isReadOnly && <button onClick={startAdd}>Commencer</button>}
                        </div>
                    ) : (
                        schools.map(school => (
                            <div
                                key={school.id}
                                className={styles.schoolCard}
                                style={{ borderTop: `4px solid ${school.color}` }}
                            >
                                <div className={styles.schoolHeader}>
                                    <h3>{school.name}</h3>
                                    <div className={styles.schoolActions}>
                                        {!isReadOnly && (
                                            <>
                                                <button onClick={() => startEdit(school)} aria-label="Edit">
                                                    <Edit2 size={16} />
                                                </button>
                                                <button onClick={() => removeSchool(school.id)} aria-label="Delete" className={styles.deleteButton}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.miniStats}>
                                    {criteria.slice(0, 3).map(c => ( // Show top 3 stats as preview
                                        <div key={c.id} className={styles.statRow}>
                                            <span className={styles.statLabel}>{c.label}</span>
                                            <div className={styles.statBar}>
                                                <div
                                                    style={{
                                                        width: `${(school.scores[c.id] || 0) * 10}%`,
                                                        backgroundColor: school.color
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {criteria.length > 3 && <span className={styles.moreStats}>+{criteria.length - 3} critères...</span>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ManageSchools;
