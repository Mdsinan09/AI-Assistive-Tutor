import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("tutor_token") || null);
  const [user, setUser] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("tutor_token");
    setToken(null);
    setUser(null);
    setCurrentSessionId(null);

    // Stop speech synthesis if speaking
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await authApi.getProfile();
        setUser(res.user);
        // Start a study session for logging
        try {
          const sessRes = await authApi.startSession();
          if (sessRes && sessRes.session_id) {
            setCurrentSessionId(sessRes.session_id);
          }
        } catch {
          // ignore session start warning
        }
      } catch (err) {
        console.warn("Session check failed:", err.message);
        localStorage.removeItem("tutor_token");
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (username, password) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(username, password);
      localStorage.setItem("tutor_token", res.token);
      setToken(res.token);
      setUser(res.user);

      // Initialize session
      try {
        const sessRes = await authApi.startSession();
        if (sessRes && sessRes.session_id) {
          setCurrentSessionId(sessRes.session_id);
        }
      } catch {
        // ignore
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username, password, fullName) => {
    setIsLoading(true);
    try {
      const res = await authApi.register(username, password, fullName);
      localStorage.setItem("tutor_token", res.token);
      setToken(res.token);
      setUser(res.user);

      try {
        const sessRes = await authApi.startSession();
        if (sessRes && sessRes.session_id) {
          setCurrentSessionId(sessRes.session_id);
        }
      } catch {
        // ignore
      }
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    token,
    user,
    isAuthenticated: !!token && !!user,
    isLoading,
    currentSessionId,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
