import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import CustomRadarChart from '../components/UI/RadarChart';
import styles from './Compare.module.css';

const PRESET_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'
];

const Compare = () => {
    const { profile, schools, criteria, activeCriteria } = useApp();
    const [selectedSchoolIds, setSelectedSchoolIds] = useState([]);

    const sortedSchools = useMemo(() => {
        return [...schools].sort((a, b) => {
            const colorIndexA = PRESET_COLORS.indexOf(a.color);
            const colorIndexB = PRESET_COLORS.indexOf(b.color);

            const indexA = colorIndexA !== -1 ? colorIndexA : PRESET_COLORS.length;
            const indexB = colorIndexB !== -1 ? colorIndexB : PRESET_COLORS.length;

            if (indexA !== indexB) {
                return indexA - indexB;
            }

            return a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' });
        });
    }, [schools]);

    const toggleSchool = (id) => {
        setSelectedSchoolIds(prev =>
            prev.includes(id)
                ? prev.filter(sid => sid !== id)
                : [...prev, id]
        );
    };

    // Transform data for Recharts
    const chartData = useMemo(() => {
        const activeCriteriaObjects = criteria.filter(c => (activeCriteria || []).includes(c.id));
        return activeCriteriaObjects.map(c => {
            const entry = { subject: c.label, fullMark: 10 };
            // User score
            entry.user = profile[c.id] || 0;

            // Selected schools scores
            selectedSchoolIds.forEach(sid => {
                const school = schools.find(s => s.id === sid);
                if (school) {
                    entry[sid] = school.scores[c.id] || 0;
                }
            });

            return entry;
        });
    }, [criteria, profile, schools, selectedSchoolIds, activeCriteria]);

    // key objects for the chart component to know which radars to render
    const schoolKeys = sortedSchools
        .filter(s => selectedSchoolIds.includes(s.id))
        .map(s => ({ id: s.id, name: s.name }));

    // Color map
    const colorMap = {};
    schools.forEach(s => colorMap[s.id] = s.color);

    return (
        <div className="container">
            <h1 className="title">Comparer</h1>

            <div className={styles.layout}>
                <div className={styles.sidebar}>
                    <div className="card">
                        <h3 className={styles.sectionTitle}>Écoles à comparer</h3>
                        {sortedSchools.length === 0 ? (
                            <p className={styles.emptyText}>Ajoutez des écoles dans l'onglet "Écoles" pour les voir ici.</p>
                        ) : (
                            <div className={styles.schoolList}>
                                {sortedSchools.map(school => (
                                    <label key={school.id} className={styles.schoolCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={selectedSchoolIds.includes(school.id)}
                                            onChange={() => toggleSchool(school.id)}
                                        />
                                        <span
                                            className={styles.checkboxCustom}
                                            style={{
                                                backgroundColor: selectedSchoolIds.includes(school.id) ? school.color : 'transparent',
                                                borderColor: school.color
                                            }}
                                        ></span>
                                        {school.name}
                                    </label>
                                ))}
                            </div>
                        )}
                        <div className={styles.legend}>
                            <div className={styles.legendItem}>
                                <span className={styles.dot} style={{ background: 'white', border: '2px solid white' }}></span>
                                <span>Mon Profil</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.mainContent}>
                    <div className={`card ${styles.chartCard}`}>
                        <CustomRadarChart
                            data={chartData}
                            keys={schoolKeys}
                            colors={colorMap}
                        />
                    </div>

                    <div className={styles.analysis}>
                        {/* Could add text analysis here later */}
                        {selectedSchoolIds.length > 0 && (
                            <div className="card">
                                <h3>Analyse rapide</h3>
                                <p>
                                    Le graphique superpose vos préférences (en blanc) avec les profils des écoles sélectionnées.
                                    Plus les formes se chevauchent, plus l'adéquation est forte.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Compare;
