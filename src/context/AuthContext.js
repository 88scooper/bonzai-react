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
  isAdmin: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Start with loading false if no token exists (optimize for landing page)
  const [loading, setLoading] = useState(() => {
    if (typeof window === 'undefined') return true;
    return !!localStorage.getItem('auth_token');
  });
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

        // Try to fetch full user data from API (including is_admin)
        // Add timeout to prevent hanging
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 3000)
          );
          
          const response = await Promise.race([
            apiClient.getUserProfile(),
            timeoutPromise
          ]);
          
          if (response.success && response.data) {
            const userData = {
              id: response.data.id,
              email: response.data.email,
              displayName: response.data.name || null,
              isAdmin: response.data.is_admin || false,
            };
            
            setUser(userData);
            
            // Check if new user after setting user state
            setTimeout(async () => {
              await checkIsNewUser();
            }, 100);
          } else {
            // Fallback to JWT decode if API call fails
            throw new Error('API call failed, falling back to JWT decode');
          }
        } catch (apiError) {
          // Fallback to JWT decode if API call fails or times out
          console.warn('Failed to fetch user from API, using JWT decode:', apiError);
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const userData = {
              id: payload.userId,
              email: payload.email,
              displayName: null,
              isAdmin: false, // Default to false if we can't fetch from API
            };
            
            setUser(userData);
            
            // Check if new user after setting user state
            setTimeout(async () => {
              await checkIsNewUser();
            }, 100);
          } catch (e) {
            console.error('Error decoding token:', e);
            localStorage.removeItem('auth_token');
            setUser(null);
          }
        }
      } catch (error) {
        console.error('Error loading user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const signUp = useCallback(async (email, password, name) => {
    try {
      const response = await apiClient.register(email, password, name);
      
      if (response.success && response.data) {
        // Fetch full user data including is_admin
        try {
          const userResponse = await apiClient.getUserProfile();
          if (userResponse.success && userResponse.data) {
            const userData = {
              id: userResponse.data.id,
              email: userResponse.data.email,
              displayName: userResponse.data.name || null,
              isAdmin: userResponse.data.is_admin || false,
            };
            
            setUser(userData);
            setIsNewUser(true); // New signup is always a new user
            
            return userData;
          }
        } catch (e) {
          // Fallback to response data if getUserProfile fails
        }
        
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          displayName: response.data.user.name || null,
          isAdmin: false, // Default to false for new users
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
      console.log('AuthContext: Attempting login for:', email);
      const response = await apiClient.login(email, password);
      
      if (!response) {
        throw new Error('No response received from login API');
      }
      
      if (response.success && response.data) {
        // Fetch full user data including is_admin
        try {
          console.log('AuthContext: Fetching user profile...');
          const userResponse = await apiClient.getUserProfile();
          if (userResponse.success && userResponse.data) {
            const userData = {
              id: userResponse.data.id,
              email: userResponse.data.email,
              displayName: userResponse.data.name || null,
              isAdmin: userResponse.data.is_admin || false,
            };
            
            console.log('AuthContext: User profile loaded successfully:', userData);
            setUser(userData);
            
            // Check if new user
            setTimeout(async () => {
              await checkIsNewUser();
            }, 100);
            
            return userData;
          }
        } catch (e) {
          // Fallback to response data if getUserProfile fails
          console.warn('AuthContext: getUserProfile failed, using login response data:', e.message);
        }
        
        // Ensure response.data.user exists before accessing properties
        if (!response.data.user) {
          throw new Error('Login response missing user data');
        }
        
        const userData = {
          id: response.data.user.id,
          email: response.data.user.email,
          displayName: response.data.user.name || null,
          isAdmin: false, // Default to false if we can't fetch from API
        };
        
        console.log('AuthContext: Using login response data (fallback):', userData);
        setUser(userData);
        
        // Check if new user
        setTimeout(async () => {
          await checkIsNewUser();
        }, 100);
        
        return userData;
      } else {
        const errorMsg = response.error || 'Login failed';
        console.error('AuthContext: Login failed:', errorMsg, response);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      // Re-throw with more context if needed
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(String(error));
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

  const isAdmin = user?.isAdmin || false;

  const value = useMemo(() => ({ 
    user, 
    loading, 
    signUp, 
    logIn, 
    logOut, 
    isNewUser, 
    checkIsNewUser,
    isAdmin
  }), [user, loading, signUp, logIn, logOut, isNewUser, checkIsNewUser, isAdmin]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Check for demo mode on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demo = sessionStorage.getItem('demoMode') === 'true';
      setIsDemoMode(demo);
    }
  }, []);

  useEffect(() => {
    if (!loading && !user && typeof window !== 'undefined' && !isDemoMode) {
      
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
  }, [user, loading, isDemoMode]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Allow demo mode without user
  if (!user && !isDemoMode) {
    return null;
  }

  return children;
}


