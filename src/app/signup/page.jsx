"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/context/AuthModalContext";

export default function SignupPage() {
  const router = useRouter();
  const { openSignup } = useAuthModal();

  useEffect(() => {
    // Redirect to landing page and open signup modal
    router.replace("/");
    // Small delay to ensure page loads before opening modal
    setTimeout(() => {
      openSignup();
    }, 100);
  }, [router, openSignup]);

  return null;
}


