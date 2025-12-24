"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import apiClient from "@/lib/api-client";

const AuthContext = createContext({
  user: null,
  loading: true,
  signUp: async () => {},
  logIn: async () => {},
  logOut: async () => {},
  isNewUser: false,
  checkIsNewUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  // Check if user has accounts to determine if they're new
  const checkIsNewUser = useCallback(async () => {
    if (!user) {
      setIsNewUser(false);
      return false;
    }

    try {
      const response = await apiClient.getAccounts(1, 1);
      const hasAccounts = response.success && response.data && 
        ((response.data.data && response.data.data.length > 0) || 
         (Array.isArray(response.data) && response.data.length > 0));
      
      setIsNewUser(!hasAccounts);
      return !hasAccounts;
    } catch (error) {
      console.error('Error checking if new user:', error);
      setIsNewUser(false);
      return false;
    }
  }, [user]);

  // Load user from token on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        
        if (!token) {
          setUser(null);
          setLoading(false);
          return;
        }

        // Decode token to get user info (JWT tokens are base64 encoded)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userData = {
            id: payload.userId,
            email: payload.email,
            displayName: null,
          };
          
          setUser(userData);
          
          // Check if new user after setting user state
          // Use setTimeout to ensure user state is set
          setTimeout(async () => {
            await checkIsNewUser();
          }, 100);
        } catch (e) {
          console.error('Error decoding token:', e);
          localStorage.removeItem('auth_token');
          setUser(null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [checkIsNewUser]);

  const signUp = useCallback(async (email, password, name) => {
    try {
      const response = await apiClient.register(email, password, name);
      
      if (response.success && response.data) {
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          displayName: response.data.user.name || null,
        };
        
        setUser(userData);
        setIsNewUser(true); // New signup is always a new user
        
        return userData;
      } else {
        throw new Error(response.error || 'Signup failed');
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, []);

  const logIn = useCallback(async (email, password) => {
    try {
      const response = await apiClient.login(email, password);
      
      if (response.success && response.data) {
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          displayName: response.data.user.name || null,
        };
        
        setUser(userData);
        
        // Check if new user
        setTimeout(async () => {
          await checkIsNewUser();
        }, 100);
        
        return userData;
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, [checkIsNewUser]);

  const logOut = useCallback(async () => {
    // Set flag FIRST - this tells RequireAuth to redirect to '/' instead of '/login'
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('isLoggingOut', 'true');
      localStorage.removeItem('auth_token');
    }
    
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Set user to null - this will trigger RequireAuth
      // RequireAuth will see the isLoggingOut flag and redirect to '/' instead of '/login'
      setUser(null);
      setIsNewUser(false);
    }
  }, []);

  const value = useMemo(() => ({ 
    user, 
    loading, 
    signUp, 
    logIn, 
    logOut, 
    isNewUser, 
    checkIsNewUser 
  }), [user, loading, signUp, logIn, logOut, isNewUser, checkIsNewUser]);

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
      
      // We're on a protected path with no user
      const token = localStorage.getItem('auth_token');
      
      // If no token exists, user might be logging out
      // Wait and check if navigation is happening
      if (!token) {
        // Use a longer delay and check multiple times
        let checkCount = 0;
        const maxChecks = 10; // Check 10 times over 2 seconds
        const checkInterval = setInterval(() => {
          checkCount++;
          const newPath = window.location.pathname;
          
          // Check if logging out flag was set during the wait
          const stillLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
          if (stillLoggingOut) {
            clearInterval(checkInterval);
            sessionStorage.removeItem('isLoggingOut');
            window.location.href = '/';
            return;
          }
          
          // If we're now on a public path, navigation succeeded - stop checking
          if (publicPaths.includes(newPath)) {
            clearInterval(checkInterval);
            return;
          }
          
          // If we've checked enough times and still on protected path, redirect to login
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            // Only redirect if we're still on a protected path
            if (!publicPaths.includes(window.location.pathname)) {
              window.location.href = '/login';
            }
          }
        }, 200); // Check every 200ms
        
        return () => clearInterval(checkInterval);
      }
      
      // Has token but no user - something is wrong, redirect to login immediately
      if (!isPublicPath) {
        window.location.href = '/login';
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}


