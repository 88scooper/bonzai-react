"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthModal } from "@/context/AuthModalContext";

export default function LoginPage() {
  const router = useRouter();
  const { openLogin } = useAuthModal();

  useEffect(() => {
    // Redirect to landing page and open login modal
    router.replace("/");
    // Small delay to ensure page loads before opening modal
    setTimeout(() => {
      openLogin();
    }, 100);
  }, [router, openLogin]);

  return null;
}


