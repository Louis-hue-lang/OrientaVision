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

    const login = async (username, password) => {
        try {
            const response = await fetch('http://localhost:3001/api/auth/login', {
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
            const response = await fetch('http://localhost:3001/api/auth/register', {
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

    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('ov_token');
        localStorage.removeItem('ov_username');
        localStorage.removeItem('ov_role');
        // We should probably also clear application data from local storage
        // or keep it if we want "guest" data to persist until overwrite?
        // Let's clear to be safe/clean
        localStorage.removeItem('ov_profile');
        localStorage.removeItem('ov_schools');
        localStorage.removeItem('ov_criteria');
        window.location.reload();
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
