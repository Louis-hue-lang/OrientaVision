import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('ov_token'));

    useEffect(() => {
        if (token) {
            // Decode user from token or just trust it for now and verify on requests
            // Ideally we would have a /me endpoint but simplicity is key
            const username = localStorage.getItem('ov_username');
            const role = localStorage.getItem('ov_role');
            setUser({ username, role });
        }
    }, [token]);

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

    useEffect(() => {
        // Initial check: if no token or even if token exists, verify/refresh with cookie
        checkSession();

        // Silent refresh every 14 minutes (token lasts 15m)
        const interval = setInterval(() => {
            if (user) {
                checkSession();
            }
        }, 14 * 60 * 1000);

        return () => clearInterval(interval);
    }, [user, token]); // Add dependencies carefully, or just [] and manage internal state

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
        setUser(null);
        setToken(null);
        localStorage.removeItem('ov_token');
        localStorage.removeItem('ov_username');
        localStorage.removeItem('ov_role');
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
