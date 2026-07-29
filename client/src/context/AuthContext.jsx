import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // In development, call API host directly
  const API_HOST = 'http://localhost:5000';

  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_HOST}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          setUser(data.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Failed to fetch current user', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch(`${API_HOST}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server is currently unreachable' };
    }
  };

  const signup = async (name, email, password, dob, gender) => {
    try {
      const response = await fetch(`${API_HOST}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, dob, gender })
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
        return { success: true };
      } else {
        return { success: false, message: data.message || 'Signup failed' };
      }
    } catch (err) {
      return { success: false, message: 'Server is currently unreachable' };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_HOST}/api/auth/logout`, { method: 'POST' });
    } catch (err) {
      console.warn('Logout server request failed');
    }
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    signup,
    logout,
    API_HOST
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
