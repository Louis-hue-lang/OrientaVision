import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('ov_token'));

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            // Check if we can refresh the session
            const success = await checkSession();
            if (!success) {
                // If we couldn't refresh, and we supposedly had a token, it might be stale.
                // However, strictly adhering to "if refresh fails -> logout" ensures security.
                // But we should verify if we simply have no token to begin with.
                if (localStorage.getItem('ov_token')) {
                    // We had a token but refresh failed -> invalid session
                    doLogout(false); // clear state without reload
                }
            }
            setLoading(false);
        };
        initAuth();
    }, []);

    useEffect(() => {
        if (loading) return; // Don't start interval if loading

        // Silent refresh every 14 minutes (token lasts 15m)
        const interval = setInterval(() => {
            if (user) {
                checkSession();
            }
        }, 14 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user, loading]);

    const doLogout = (reload = true) => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('ov_token');
        localStorage.removeItem('ov_username');
        localStorage.removeItem('ov_role');
        if (reload) window.location.reload();
    }

    const checkSession = async () => {
        try {
            // Try to refresh token using cookie
            const response = await fetch('/api/auth/refresh', { method: 'POST' });
            if (response.ok) {
                const data = await response.json();
                setToken(data.token);
                setUser({ username: data.username, role: data.role });
                localStorage.setItem('ov_token', data.token);
                localStorage.setItem('ov_username', data.username);
                localStorage.setItem('ov_role', data.role);
                return true;
            }
        } catch (e) {
            // No session or valid cookie
        }
        return false;
    };

    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }

            const data = await response.json();
            setToken(data.token);
            setUser({ username: data.username, role: data.role });
            localStorage.setItem('ov_token', data.token);
            localStorage.setItem('ov_username', data.username);
            localStorage.setItem('ov_role', data.role);
            return true;
        } catch (err) {
            throw err;
        }
    };

    const register = async (username, password, inviteCode) => {
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, inviteCode }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message);
            }
            return true;
        } catch (err) {
            throw err;
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error('Logout error', e);
        }
        doLogout(true);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
