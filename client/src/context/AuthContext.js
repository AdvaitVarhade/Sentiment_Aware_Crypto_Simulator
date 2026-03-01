import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

// Create the context
export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [token, setToken] = useState(localStorage.getItem('token') || null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Axios configuration to automatically add the token to headers
    const authAxios = axios.create({
        baseURL: 'http://localhost:5000/api',
    });

    authAxios.interceptors.request.use((config) => {
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    // Load user data if a token exists in local storage
    useEffect(() => {
        const loadUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const res = await authAxios.get('/auth/me');
                setUser(res.data.user);
                setPortfolio(res.data.portfolio.assets);
            } catch (err) {
                console.error('Failed to load user', err);
                localStorage.removeItem('token');
                setToken(null);
                setUser(null);
            }
            setLoading(false);
        };
        loadUser();
    }, [token]);

    // Login Function
    const login = async (email, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            setError(null);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed');
            return false;
        }
    };

    // Register Function
    const register = async (name, email, password) => {
        try {
            const res = await axios.post('http://localhost:5000/api/auth/register', { name, email, password });
            localStorage.setItem('token', res.data.token);
            setToken(res.data.token);
            setError(null);
            return true;
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
            return false;
        }
    };

    // Logout Function
    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setPortfolio([]);
    };

    return (
        <AuthContext.Provider value={{ user, portfolio, token, loading, error, login, register, logout, authAxios }}>
            {children}
        </AuthContext.Provider>
    );
};