"use client";

export default function Button({ children, variant = "primary", loading = false, disabled = false, className = "", ...props }) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "secondary"
      ? "border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      : "bg-[#205A3E] text-white hover:bg-[#1a4932] dark:bg-[#2F7E57] dark:hover:bg-[#205A3E]";
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled || loading} {...props}>
      {loading ? "Saving..." : children}
    </button>
  );
}


