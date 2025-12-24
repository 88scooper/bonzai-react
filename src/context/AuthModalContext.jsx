"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { LoginModal, SignupModal } from "@/components/AuthModals";

const AuthModalContext = createContext({
  openLogin: () => {},
  openSignup: () => {},
  closeModals: () => {},
});

export function useAuthModal() {
  return useContext(AuthModalContext);
}

export function AuthModalProvider({ children }) {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const openLogin = useCallback(() => {
    setIsSignupOpen(false);
    setIsLoginOpen(true);
  }, []);

  const openSignup = useCallback(() => {
    setIsLoginOpen(false);
    setIsSignupOpen(true);
  }, []);

  const closeModals = useCallback(() => {
    setIsLoginOpen(false);
    setIsSignupOpen(false);
  }, []);

  return (
    <AuthModalContext.Provider value={{ openLogin, openSignup, closeModals }}>
      {children}
      {isLoginOpen && (
        <LoginModal onClose={closeModals} onSwitchToSignup={openSignup} />
      )}
      {isSignupOpen && (
        <SignupModal onClose={closeModals} onSwitchToLogin={openLogin} />
      )}
    </AuthModalContext.Provider>
  );
}

