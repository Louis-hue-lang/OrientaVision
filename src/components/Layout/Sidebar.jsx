import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, School, BarChart2, Settings, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import styles from './Sidebar.module.css';

const Sidebar = () => {
    const { user } = useAuth();

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

    if (user && (user.role === 'admin' || user.role === 'moderator')) {
        visibleItems.push({ to: '/admin', icon: <Shield size={24} />, label: 'Admin' });
    }

    const { logout } = useAuth();

    return (
        <nav className={styles.sidebar}>
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
    );
};

export default Sidebar;
