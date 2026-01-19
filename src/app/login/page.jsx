"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import Footer from "@/components/Footer";

export default function LoginPage() {
  const { addToast } = useToast();
  const { logIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "").trim();
      const password = String(form.get("password") || "");
      
      // Basic email validation feedback
      if (email && !email.includes("@")) {
        setError("Please enter a valid email address.");
        setLoading(false);
        return;
      }
      
      console.log("LoginPage: Attempting login with email:", email);
      const userData = await logIn(email, password);
      console.log("LoginPage: Login successful, userData:", userData);
      
      // Verify token was saved
      const token = localStorage.getItem('auth_token');
      if (!token) {
        console.error("LoginPage: Token not found in localStorage after login!");
        throw new Error("Login failed: Authentication token not saved");
      }
      console.log("LoginPage: Token saved successfully");
      
      if (!userData || !userData.id) {
        console.error("LoginPage: Invalid userData returned:", userData);
        throw new Error("Login failed: Invalid user data received");
      }
      
      addToast("Logged in successfully!", { type: "success" });
      
      // Wait a bit for state to propagate, then redirect
      // Redirect based on user role - admins go to admin page, others to portfolio summary
      const redirectPath = userData?.isAdmin ? "/admin" : "/portfolio-summary";
      console.log("LoginPage: Redirecting to:", redirectPath);
      
      // Use window.location.replace to avoid back button issues
      setTimeout(() => {
        window.location.replace(redirectPath);
      }, 200);
    } catch (error) {
      console.error("Login error:", error);
      console.error("Error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack
      });
      
      let errorMessage = "Login failed. Please try again.";
      
      if (error?.message) {
        if (error.message.includes("Invalid email or password") || error.message.includes("401")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message.includes("Validation failed")) {
          errorMessage = error.message.replace("Validation failed: ", "");
        } else if (error.message.includes("Network error") || error.message.includes("Failed to fetch")) {
          errorMessage = "Network error: Unable to connect to the server. Please check your internet connection and try again.";
        } else if (error.message.includes("Too many login attempts")) {
          errorMessage = "Too many login attempts. Please wait a few minutes before trying again.";
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
    <div className="min-h-screen flex flex-col bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100">
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 backdrop-blur p-6" suppressHydrationWarning>
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Welcome back to Bonzai.</p>
          
          {error && (
            <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
          
          <form onSubmit={onSubmit} className="mt-6 grid gap-4" suppressHydrationWarning>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm">Email</label>
              <input 
                id="email" 
                name="email" 
                type="email" 
                required 
                suppressHydrationWarning
                className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm">Password</label>
              <div className="relative">
                <input 
                  id="password" 
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
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
            Don&apos;t have an account? <a href="/signup" className="underline">Sign up</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}


