"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { getUserFromToken, isTokenExpired } from "@/lib/jwt-utils";

const AuthContext = createContext({
  user: null,
  loading: true,
  signUp: async () => {},
  logIn: async () => {},
  logOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('auth_token');
        
        if (token && !isTokenExpired(token)) {
          // Token exists and is valid, decode it to get user info
          const userInfo = getUserFromToken(token);
          if (userInfo) {
            setUser({
              uid: userInfo.id,
              id: userInfo.id,
              email: userInfo.email,
              displayName: userInfo.email.split('@')[0], // Use email prefix as display name
            });
          } else {
            // Invalid token, remove it
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        } else {
          // No token or expired token
          if (token) {
            localStorage.removeItem('auth_token');
          }
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signUp = useCallback(async (email, password, name) => {
    try {
      const response = await apiClient.register(email, password, name);
      
      if (response.success && response.data) {
        const userData = response.data.user;
        const token = response.data.token;
        
        // Token is already stored by apiClient
        // Decode token to get user info
        const userInfo = getUserFromToken(token);
        
        setUser({
          uid: userData.id || userInfo?.id,
          id: userData.id || userInfo?.id,
          email: userData.email || userInfo?.email,
          displayName: userData.name || name || userInfo?.email?.split('@')[0],
        });
        
        return {
          uid: userData.id,
          email: userData.email,
          displayName: userData.name,
        };
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }, []);

  const logIn = useCallback(async (email, password) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        const userData = response.data.user;
        const token = response.data.token;
        
        // Token is already stored by apiClient
        // Decode token to get user info
        const userInfo = getUserFromToken(token);
        
        setUser({
          uid: userData.id || userInfo?.id,
          id: userData.id || userInfo?.id,
          email: userData.email || userInfo?.email,
          displayName: userData.name || userInfo?.email?.split('@')[0],
        });
        
        return {
          uid: userData.id,
          email: userData.email,
          displayName: userData.name,
        };
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const logOut = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local state
    } finally {
      setUser(null);
      localStorage.removeItem('auth_token');
    }
  }, []);

  const value = useMemo(() => ({ user, loading, signUp, logIn, logOut }), [user, loading, signUp, logIn, logOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined') {
      // Check if user is logging out FIRST - before any other logic
      // This prevents redirecting to /login when user explicitly logs out
      const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
      if (isLoggingOut) {
        // Don't clear the flag here - let the landing page do it
        // Just redirect immediately and return
        window.location.replace('/');
        return;
      }
      
      const currentPath = window.location.pathname;
      
      // CRITICAL: Always allow homepage and other public paths
      const publicPaths = ['/', '/login', '/signup', '/onboarding'];
      const isPublicPath = publicPaths.includes(currentPath);
      
      // If we're on a public path, never redirect
      if (isPublicPath) {
        return;
      }
      
      // We're on a protected path with no user - redirect to login
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#205A3E]"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}


