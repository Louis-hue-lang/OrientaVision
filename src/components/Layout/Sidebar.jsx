import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { User, School, BarChart2, Settings, Shield, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { to: '/', icon: <User size={24} />, label: 'Mon Profil' },
        { to: '/schools', icon: <School size={24} />, label: 'Écoles' },
        { to: '/compare', icon: <BarChart2 size={24} />, label: 'Comparer' },
        { to: '/settings', icon: <Settings size={24} />, label: 'Paramètres' },
    ];

    // Filter out settings for 'joueur'
    const visibleItems = navItems.filter(item => {
        if (item.to === '/settings' && user?.role === 'joueur') return false;
        return true;
    });

    if (user && (user.role === 'admin' || user.role === 'moderator' || user.role === 'staff')) {
        visibleItems.push({ to: '/admin', icon: <Shield size={24} />, label: 'Admin' });
    }

    const { logout } = useAuth();

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                className={styles.mobileToggle}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Toggle Menu"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Backdrop Overlay */}
            <div
                className={`${styles.overlay} ${isOpen ? styles.show : ''}`}
                onClick={() => setIsOpen(false)}
            />

            <nav className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
                <div className={styles.logo}>
                    <div className={styles.logoIcon}>OV</div>
                    <span className={styles.logoText}>OrientaVision</span>
                </div>
                <ul className={styles.navList}>
                    {visibleItems.map((item) => (
                        <li key={item.to} className={styles.navItem}>
                            <NavLink
                                to={item.to}
                                className={({ isActive }) =>
                                    isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                                }
                                onClick={() => setIsOpen(false)} // Close on navigate
                            >
                                {item.icon}
                                <span className={styles.linkLabel}>{item.label}</span>
                            </NavLink>
                        </li>
                    ))}
                </ul>
                <div className={styles.footer}>
                    <button onClick={logout} className={styles.logoutButton}>
                        Déconnexion
                    </button>
                </div>
            </nav>
        </>
    );
};

export default Sidebar;
