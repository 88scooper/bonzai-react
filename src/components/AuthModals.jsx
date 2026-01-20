"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-neutral-950 p-6 shadow-xl" suppressHydrationWarning>
        {children}
      </div>
    </div>
  );
}

export function LoginModal({ onClose, onSwitchToSignup }) {
  const { addToast } = useToast();
  const { logIn } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      
      const userData = await logIn(email, password);
      addToast("Logged in successfully!", { type: "success" });
      onClose();
      // Redirect based on user role - admins go to admin page, others to portfolio summary
      const redirectPath = userData?.isAdmin ? "/admin" : "/portfolio-summary";
      router.push(redirectPath);
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed. Please try again.";
      
      if (error.message) {
        if (error.message.includes("Invalid email or password") || error.message.includes("401")) {
          errorMessage = "Invalid email or password.";
        } else if (error.message.includes("Validation failed")) {
          errorMessage = error.message.replace("Validation failed: ", "");
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      addToast(errorMessage, { type: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">Log in</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Welcome back to Bonzai.</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="mt-6 grid gap-4" suppressHydrationWarning>
        <div className="grid gap-2">
          <label htmlFor="login-email" className="text-sm">Email</label>
          <input 
            id="login-email" 
            name="email" 
            type="email" 
            required 
            suppressHydrationWarning
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="login-password" className="text-sm">Password</label>
          <div className="relative">
            <input 
              id="login-password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required 
              suppressHydrationWarning
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="mt-2 w-full">Continue</Button>
      </form>
      <div className="mt-4 text-sm text-center text-gray-600 dark:text-gray-300">
        Don&apos;t have an account?{" "}
        <button className="underline font-medium" onClick={onSwitchToSignup}>Sign up</button>
      </div>
    </Modal>
  );
}

export function SignupModal({ onClose, onSwitchToLogin }) {
  const { addToast } = useToast();
  const { signUp } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      const name = String(form.get("name") || "");
      
      await signUp(email, password, name || null);
      // Clear demo mode flag immediately after signup to prevent demo data from loading
      // Set onboarding_in_progress flag to prevent redirect to portfolio-summary
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('demoMode');
        sessionStorage.removeItem('readOnlyMode');
        sessionStorage.setItem('onboarding_in_progress', 'true');
      }
      addToast("Account created successfully!", { type: "success" });
      onClose();
      // Redirect to onboarding for new users, otherwise portfolio summary
      router.push("/onboarding");
    } catch (error) {
      console.error("Signup error:", error);
      let errorMessage = "Sign up failed. Please try again.";
      let isRateLimited = false;
      
      if (error.message) {
        if (error.message.includes("Too many registration attempts") || error.message.includes("429")) {
          errorMessage = "Too many registration attempts. Please wait an hour or restart the dev server.";
          isRateLimited = true;
        } else if (error.message.includes("already exists") || error.message.includes("duplicate") || error.message.includes("409")) {
          errorMessage = "An account with this email already exists.";
        } else if (error.message.includes("password") && error.message.includes("short")) {
          errorMessage = "Password should be at least 6 characters long.";
        } else if (error.message.includes("email")) {
          errorMessage = "Please enter a valid email address.";
        } else if (error.message.includes("Validation failed")) {
          errorMessage = error.message.replace("Validation failed: ", "");
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      addToast(errorMessage, { type: "error" });
      
      // In development, offer to reset rate limit
      if (isRateLimited && typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const resetRateLimit = async () => {
          try {
            const response = await fetch('/api/dev/reset-registration-rate-limit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (data.success) {
              addToast("Rate limit reset! You can try signing up again.", { type: "success" });
              setError("");
            }
          } catch (e) {
            console.error('Failed to reset rate limit:', e);
          }
        };
        
        // Show reset button in error message
        setTimeout(() => {
          const errorDiv = document.querySelector('[data-signup-error]');
          if (errorDiv && !errorDiv.querySelector('[data-reset-button]')) {
            const resetBtn = document.createElement('button');
            resetBtn.textContent = 'Reset Rate Limit (Dev Only)';
            resetBtn.onclick = resetRateLimit;
            resetBtn.className = 'mt-2 text-sm underline text-green-600 dark:text-green-400';
            resetBtn.setAttribute('data-reset-button', 'true');
            errorDiv.appendChild(resetBtn);
          }
        }, 100);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">Create your account</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Start managing your portfolio.</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {error && (
        <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" data-signup-error>
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
      
      <form onSubmit={onSubmit} className="mt-6 grid gap-4" suppressHydrationWarning>
        <div className="grid gap-2">
          <label htmlFor="signup-name" className="text-sm">Full name (optional)</label>
          <input 
            id="signup-name" 
            name="name" 
            type="text" 
            suppressHydrationWarning
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-email" className="text-sm">Email</label>
          <input 
            id="signup-email" 
            name="email" 
            type="email" 
            required 
            suppressHydrationWarning
            className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="signup-password" className="text-sm">Password</label>
          <div className="relative">
            <input 
              id="signup-password" 
              name="password" 
              type={showPassword ? "text" : "password"} 
              required 
              suppressHydrationWarning
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 pr-10 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        <Button type="submit" loading={loading} className="mt-2 w-full">Create account</Button>
      </form>
      <div className="mt-4 text-sm text-center text-gray-600 dark:text-gray-300">
        Already have an account?{" "}
        <button className="underline font-medium" onClick={onSwitchToLogin}>Log in</button>
      </div>
    </Modal>
  );
}






