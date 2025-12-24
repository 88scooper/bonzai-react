"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import AccountSwitcher from "@/components/AccountSwitcher";
import Button from "@/components/Button";
import { LogOut, UserCircle, Settings, User } from "lucide-react";

export default function Layout({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logOut } = useAuth();
  const userMenuRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const shouldDark = saved ? saved === "dark" : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDark(shouldDark);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  const toggleDarkMode = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <div className="flex min-h-screen">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 border-b border-black/10 dark:border-white/10 bg-white/80 dark:bg-neutral-950/80 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Hamburger Menu Button - Mobile Only */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Open menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <Link href="/" className="font-semibold tracking-tight">
                  Proplytics
                </Link>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Account Switcher */}
                <AccountSwitcher />
                
                {/* User Profile Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    aria-label="User menu"
                  >
                    <UserCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-black/10 dark:border-white/10 py-2 z-50">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.email || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            // TODO: Navigate to My Account page
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          My Account
                        </button>
                        
                        <Link
                          href="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </div>

                      {/* Light/Dark Mode Toggle */}
                      <div className="px-4 py-3 border-t border-black/10 dark:border-white/10">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                          <button
                            onClick={toggleDarkMode}
                            className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            style={{
                              backgroundColor: isDark ? '#3b82f6' : '#d1d5db'
                            }}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isDark ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Logout Button */}
                      {user && (
                        <div className="px-4 py-2 border-t border-black/10 dark:border-white/10">
                          <button
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              // Set flag FIRST before clearing token - this prevents RequireAuth from redirecting to /login
                              sessionStorage.setItem('isLoggingOut', 'true');
                              // Clear auth data
                              localStorage.removeItem('auth_token');
                              // Immediately redirect to landing page - use replace to avoid history entry
                              window.location.replace('/');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors rounded-md"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-7xl px-4 py-6">{children}</main>
        </div>
      </div>
    </div>
  );
}


