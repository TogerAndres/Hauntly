import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export const DEMO_ADMIN = {
  id: 'u-admin',
  email: 'admin@mcdesk.io',
  displayName: 'Roger (Admin)',
  role: 'ADMIN',
  minecraftUsername: null,
  avatarUrl: 'https://mc-heads.net/avatar/Steve'
};

export const DEMO_PLAYER = {
  id: 'u-steve',
  email: 'steve@mcdesk.io',
  displayName: 'Steve',
  role: 'USER',
  minecraftUsername: 'Steve',
  avatarUrl: 'https://mc-heads.net/avatar/Steve'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('mcdesk_token') || null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    async function initAuth() {
      if (token && token !== 'demo-token') {
        try {
          const res = await api.getMe();
          if (res?.user) {
            setUser(res.user);
            setIsDemoMode(false);
          } else {
            throw new Error('Respuesta de usuario vacía');
          }
        } catch (err) {
          console.warn('[AuthContext] Sesión expirada o no recuperada:', err.message);
          localStorage.removeItem('mcdesk_token');
          setToken(null);
          setUser(null);
          setIsDemoMode(false);
        }
      } else {
        // Si no hay token guardado, mostrar pantalla de Login
        setUser(null);
        setIsDemoMode(false);
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

  const register = async (email, displayName, password, role = 'USER', minecraftUsername = '') => {
    try {
      const res = await api.register(email, displayName, password, role, minecraftUsername);
      localStorage.setItem('mcdesk_token', res.token);
      setToken(res.token);
      setUser(res.user);
      setIsDemoMode(false);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const linkMinecraft = async (minecraftUsername) => {
    try {
      const res = await api.linkMinecraft(minecraftUsername);
      setUser(prev => prev ? {
        ...prev,
        minecraftUsername: res.minecraftUsername,
        avatarUrl: res.avatarUrl
      } : prev);
      return res;
    } catch (err) {
      throw err;
    }
  };

  const switchToDemoRole = (role = 'ADMIN') => {
    localStorage.removeItem('mcdesk_token');
    setToken(null);
    setIsDemoMode(true);
    if (role === 'USER' || role === 'PLAYER') {
      setUser(DEMO_PLAYER);
    } else {
      setUser(DEMO_ADMIN);
    }
  };

  const logout = () => {
    localStorage.removeItem('mcdesk_token');
    setToken(null);
    setUser(null);
    setIsDemoMode(false);
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'OWNER';
  const isPlayer = user?.role === 'USER';
  const linkedPlayer = user?.minecraftUsername || null;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isDemoMode,
      isAdmin,
      isPlayer,
      linkedPlayer,
      login,
      register,
      linkMinecraft,
      switchToDemoRole,
      logout,
      setIsDemoMode
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
