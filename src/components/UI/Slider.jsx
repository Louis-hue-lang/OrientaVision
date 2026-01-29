import React from 'react';
import styles from './Slider.module.css';

const Slider = ({ label, value, onChange, color, min = 0, max = 10 }) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
        <div className={styles.sliderContainer}>
            <div className={styles.header}>
                <label className={styles.label}>{label}</label>
                <span className={styles.value} style={{ color }}>{value}</span>
            </div>
            <div
                className={styles.trackContainer}
                style={{ '--track-color': color }}
            >
                <div className={styles.trackBackground} />
                <div
                    className={styles.trackFill}
                    style={{ width: `${percentage}%` }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className={styles.input}
                />
                <div
                    className={styles.thumb}
                    style={{ left: `${percentage}%` }}
                />
            </div>
        </div>
    );
};

export default Slider;
