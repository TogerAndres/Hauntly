import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_USER = {
  id: 'u-demo',
  email: 'roger@mcdesk.io',
  displayName: 'Roger',
  role: 'ADMIN'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mcdesk_token') || null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function initAuth() {
      if (token) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setIsDemoMode(false);
        } catch (err) {
          console.warn('Sesión no recuperada, activando modo Demo:', err.message);
          setUser(DEMO_USER);
          setIsDemoMode(true);
        }
      } else {
        // Default to Demo user for immediate visual experience
        setUser(DEMO_USER);
        setIsDemoMode(true);
      }
      setLoading(false);
    }
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.login(email, password);
      localStorage.setItem('mcdesk_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsDemoMode(false);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const register = async (email, displayName, password) => {
    try {
      const res = await api.register(email, displayName, password);
      localStorage.setItem('mcdesk_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsDemoMode(false);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('mcdesk_token');
    setToken(null);
    setUser(DEMO_USER);
    setIsDemoMode(true);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, isDemoMode, login, register, logout, setIsDemoMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
