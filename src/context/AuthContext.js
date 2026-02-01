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

  // Load user from session cookie on mount
  useEffect(() => {
    const loadUser = async () => {
      // Check for demo mode first - if in demo mode, skip authentication check
      if (typeof window !== 'undefined') {
        const demoMode = sessionStorage.getItem('demoMode') === 'true';
        if (demoMode) {
          console.log('[AuthContext] Demo mode detected, skipping authentication check');
          setUser(null);
          setLoading(false);
          return;
        }
      }

      try {
        // Note: We can't check for httpOnly cookies via document.cookie
        // The cookie will be sent automatically with the API request if it exists
        // Just make the API call - it will return 401 if no valid cookie exists
        
        // Try to fetch full user data from API (including is_admin)
        // Add timeout to prevent hanging, but make it longer for slow connections
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 5000)
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
          setUser(null);
        }
      } catch (error) {
        // If error occurs and we're in demo mode, don't treat it as an error
        if (typeof window !== 'undefined' && sessionStorage.getItem('demoMode') === 'true') {
          console.log('[AuthContext] Error loading user but in demo mode, ignoring error');
          setUser(null);
        } else {
          // Only log non-timeout errors to avoid console spam
          const isTimeout = error instanceof Error && error.message === 'Request timeout';
          if (!isTimeout) {
            console.error('Error loading user:', error);
          } else {
            console.log('[AuthContext] User profile request timed out (user may not be logged in)');
          }
          setUser(null);
        }
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
        // Clear demo mode flag immediately after signup to prevent demo data from loading
        // Set onboarding_in_progress flag to prevent redirect to portfolio-summary
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('demoMode');
          sessionStorage.removeItem('readOnlyMode');
          sessionStorage.setItem('onboarding_in_progress', 'true');
        }
        
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
      
      if (!response.success) {
        const errorMsg = response.error || 'Login failed';
        console.error('AuthContext: Login failed:', errorMsg, response);
        throw new Error(errorMsg);
      }
      
      if (!response.data || !response.data.user) {
        throw new Error('Login response missing user data');
      }
      
      // Use user data from login response (now includes is_admin)
      // This avoids the need for an additional API call and cookie timing issues
      const userData = {
        id: response.data.user.id,
        email: response.data.user.email,
        displayName: response.data.user.name || null,
        isAdmin: response.data.user.is_admin || false,
      };
      
      console.log('AuthContext: User data from login response:', userData);
      console.log('AuthContext: isAdmin from response:', response.data.user.is_admin);
      console.log('AuthContext: userData.isAdmin:', userData.isAdmin);
      
      // Set user data immediately from login response
      console.log('AuthContext: Setting user data:', userData);
      setUser(userData);
      
      // Optionally fetch full user profile in the background to ensure we have the latest data
      // This is non-blocking and won't affect the login flow
      // Add a small delay to ensure cookie is available
      setTimeout(() => {
        apiClient.getUserProfile().then((userResponse) => {
          if (userResponse && userResponse.success && userResponse.data) {
            const updatedUserData = {
              id: userResponse.data.id,
              email: userResponse.data.email,
              displayName: userResponse.data.name || null,
              isAdmin: userResponse.data.is_admin || false,
            };
            console.log('AuthContext: User profile updated in background:', updatedUserData);
            setUser(updatedUserData);
          } else {
            console.warn('AuthContext: getUserProfile returned unsuccessful response:', userResponse);
          }
        }).catch((e) => {
          // Silently fail - we already have user data from login response
          console.warn('AuthContext: Background profile fetch failed (non-critical):', e.message);
        });
      }, 100);
      
      // Check if new user
      setTimeout(async () => {
        await checkIsNewUser();
      }, 100);
      
      return userData;
    } catch (error) {
      console.error('AuthContext: Login error:', error);
      console.error('AuthContext: Error details:', {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
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
  const [mounted, setMounted] = useState(false);

  // Track when component has mounted to prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check for demo mode on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const demo = sessionStorage.getItem('demoMode') === 'true';
      setIsDemoMode(demo);
    }
  }, []);

  useEffect(() => {
    // Only run redirect check after component has mounted
    if (!mounted) return;
    
    // Add a longer delay to ensure user state is loaded after page navigation
    // This is especially important after login when cookie might not be immediately available
    const timeoutId = setTimeout(() => {
      if (!loading && !user && typeof window !== 'undefined') {
        // Check demo mode directly from sessionStorage to avoid race condition
        // This MUST be checked FIRST before any redirect logic
        const demoMode = sessionStorage.getItem('demoMode') === 'true';
        
        // If in demo mode, allow access without redirecting
        if (demoMode) {
          console.log('[RequireAuth] Demo mode detected, allowing access');
          return;
        }
        
        // Check if user is logging out FIRST - before any other logic
        // This prevents redirecting to /login when user explicitly logs out
        const isLoggingOut = sessionStorage.getItem('isLoggingOut') === 'true';
        if (isLoggingOut) {
          // Don't clear the flag here - let the landing page do it
          // Just redirect immediately and return
          window.location.replace('/');
          return;
        }
        
        // Check if we have a cookie - if we do, don't redirect
        // This prevents redirecting immediately after login when user state might still be loading
        const hasCookie = document.cookie.split(';').some(c => c.trim().startsWith('bonzai_auth='));
        if (hasCookie) {
          // We have a cookie, so authentication should work
          // Even if user isn't loaded yet, don't redirect - it might still be loading
          console.log('[RequireAuth] Cookie found, allowing access (user may still be loading)');
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
        
        // We're on a protected path with no user and no cookie - redirect to login
        if (!isPublicPath) {
          console.log('[RequireAuth] No user, no cookie, and not in demo mode, redirecting to login');
          window.location.href = '/login';
        }
      }
    }, 2000); // Increased delay to 2 seconds to give more time for user to load after login
    
    return () => clearTimeout(timeoutId);
  }, [user, loading, mounted]);

  // Only show loading state after mounting to prevent hydration mismatch
  if (mounted && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Allow demo mode without user
  // Only check after mounting to prevent hydration mismatch
  // Check sessionStorage directly to avoid race condition with state
  if (mounted && !user) {
    const demoMode = typeof window !== 'undefined' && sessionStorage.getItem('demoMode') === 'true';
    if (!demoMode) {
      return null;
    }
  }

  // During SSR or before mount, always render children to prevent hydration mismatch
  // The useEffect will handle redirects if needed
  return children;
}


