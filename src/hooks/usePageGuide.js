"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { pageGuideConfig } from "@/lib/pageGuideConfig";

export function usePageGuide() {
  const pathname = usePathname();
  const { currentAccount, loading: accountLoading } = useAccount();
  const { user } = useAuth();
  const [showGuide, setShowGuide] = useState(false);
  const [pageInfo, setPageInfo] = useState(null);
  const [contentLoaded, setContentLoaded] = useState(false);
  
  // Development helper: expose force show function to window for testing
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      window.__forceShowPageGuide = () => {
        console.log('[PageGuide] Force showing guide for testing');
        // Clear session flags
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('pageGuide_')) {
            sessionStorage.removeItem(key);
          }
        });
        // Force show
        const matchedConfig = pageGuideConfig[pathname];
        if (matchedConfig) {
          setPageInfo(matchedConfig);
          setShowGuide(true);
        } else {
          console.log('[PageGuide] No config for current pathname:', pathname);
        }
      };
    }
  }, [pathname]);

  useEffect(() => {
    // Reset content loaded state when pathname changes
    setContentLoaded(false);
    
    // Wait a bit for content to load, then mark as loaded
    const timer = setTimeout(() => {
      setContentLoaded(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') {
      return;
    }

    // Check for demo mode - either via currentAccount.isDemo or sessionStorage
    const isDemoMode = (() => {
      if (user && currentAccount) {
        // Authenticated user - check if account is demo account
        return currentAccount.isDemo === true;
      } else if (!user) {
        // Not authenticated - check sessionStorage
        return sessionStorage.getItem('demoMode') === 'true';
      }
      return false;
    })();

    // Debug logging
    console.log('[PageGuide] Hook running:', {
      pathname,
      accountLoading,
      currentAccount: currentAccount ? { id: currentAccount.id, isDemo: currentAccount.isDemo } : null,
      user: user ? { email: user.email } : null,
      isDemoMode,
      contentLoaded,
      hasConfig: !!pageGuideConfig[pathname]
    });

    // Wait for account to finish loading (but only if user is authenticated)
    if (accountLoading && user) {
      console.log('[PageGuide] Account still loading, waiting...');
      setShowGuide(false);
      return;
    }

    // Only show for demo mode
    if (!isDemoMode) {
      console.log('[PageGuide] Not in demo mode');
      setShowGuide(false);
      return;
    }

    if (!contentLoaded) {
      console.log('[PageGuide] Content not loaded yet');
      setShowGuide(false);
      return;
    }

    // Find matching page config
    let matchedConfig = null;

    // First check for exact match
    if (pageGuideConfig[pathname]) {
      matchedConfig = pageGuideConfig[pathname];
      console.log('[PageGuide] Found exact match for:', pathname);
    } else {
      // Check for dynamic routes
      for (const [key, config] of Object.entries(pageGuideConfig)) {
        if (config.isDynamic && config.pattern && config.pattern.test(pathname)) {
          matchedConfig = config;
          console.log('[PageGuide] Found dynamic match for:', pathname, 'pattern:', key);
          break;
        }
      }
    }

    if (!matchedConfig) {
      console.log('[PageGuide] No config found for pathname:', pathname);
      setPageInfo(null);
      setShowGuide(false);
      return;
    }

    // Always set pageInfo when we have a match (needed for modal to render)
    setPageInfo(matchedConfig);

    // In demo mode, use demo-specific keys so guides can show on each page visit
    // This allows guides to appear fresh for each demo session
    const keyPrefix = isDemoMode ? 'pageGuide_demo' : 'pageGuide';
    const sessionKey = `${keyPrefix}_shown_${pathname}`;
    const sessionShown = sessionStorage.getItem(sessionKey);
    
    // Check if user opted to not show again for this page
    const dontShowKey = `${keyPrefix}_dontShow_${pathname}`;
    const dontShow = sessionStorage.getItem(dontShowKey);

    console.log('[PageGuide] Session check:', {
      sessionKey,
      sessionShown,
      dontShowKey,
      dontShow,
      isDemoMode
    });

    if (sessionShown) {
      console.log('[PageGuide] Already shown this session');
      console.log('[PageGuide] To test again, run in console:');
      console.log('  sessionStorage.removeItem("' + sessionKey + '")');
      console.log('  Or clear all: Object.keys(sessionStorage).filter(k => k.startsWith("pageGuide_")).forEach(k => sessionStorage.removeItem(k))');
      setShowGuide(false);
      return;
    }

    if (dontShow) {
      console.log('[PageGuide] User opted to not show again');
      console.log('[PageGuide] To test again, run in console:');
      console.log('  sessionStorage.removeItem("' + dontShowKey + '")');
      console.log('  Or clear all: Object.keys(sessionStorage).filter(k => k.startsWith("pageGuide_")).forEach(k => sessionStorage.removeItem(k))');
      setShowGuide(false);
      return;
    }

    console.log('[PageGuide] Showing guide for:', pathname);
    setShowGuide(true);
  }, [pathname, currentAccount, contentLoaded, accountLoading, user]);

  const handleClose = () => {
    if (typeof window !== 'undefined' && pageInfo) {
      // Check if we're in demo mode to use the correct key prefix
      const isDemoMode = (() => {
        if (user && currentAccount) {
          return currentAccount.isDemo === true;
        } else if (!user) {
          return sessionStorage.getItem('demoMode') === 'true';
        }
        return false;
      })();
      const keyPrefix = isDemoMode ? 'pageGuide_demo' : 'pageGuide';
      const sessionKey = `${keyPrefix}_shown_${pathname}`;
      sessionStorage.setItem(sessionKey, 'true');
    }
    setShowGuide(false);
  };

  const handleDontShowAgain = () => {
    if (typeof window !== 'undefined' && pageInfo) {
      // Check if we're in demo mode to use the correct key prefix
      const isDemoMode = (() => {
        if (user && currentAccount) {
          return currentAccount.isDemo === true;
        } else if (!user) {
          return sessionStorage.getItem('demoMode') === 'true';
        }
        return false;
      })();
      const keyPrefix = isDemoMode ? 'pageGuide_demo' : 'pageGuide';
      const dontShowKey = `${keyPrefix}_dontShow_${pathname}`;
      sessionStorage.setItem(dontShowKey, 'true');
    }
  };

  return {
    showGuide,
    pageInfo,
    handleClose,
    handleDontShowAgain
  };
}
