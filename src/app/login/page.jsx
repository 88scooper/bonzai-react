"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const { addToast } = useToast();
  const { logIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const form = new FormData(e.currentTarget);
      const email = String(form.get("email") || "");
      const password = String(form.get("password") || "");
      
      await logIn(email, password);
      addToast("Logged in successfully!", { type: "success" });
      // Redirect to portfolio summary
      setTimeout(() => {
        window.location.href = "/portfolio-summary";
      }, 100);
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
    <main className="min-h-screen flex items-center justify-center bg-white text-gray-900 dark:bg-neutral-950 dark:text-gray-100 px-6">
      <div className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 backdrop-blur p-6">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Welcome back to Proplytics.</p>
        
        {error && (
          <div className="mt-4 p-3 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <form onSubmit={onSubmit} className="mt-6 grid gap-4">
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm">Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="password" className="text-sm">Password</label>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              className="w-full rounded-md border border-black/15 dark:border-white/15 bg-transparent px-3 py-2 outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" 
            />
          </div>
          <Button type="submit" loading={loading} className="mt-2 w-full">Continue</Button>
        </form>
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          Don&apos;t have an account? <a href="/signup" className="underline">Sign up</a>
        </p>
      </div>
    </main>
  );
}


