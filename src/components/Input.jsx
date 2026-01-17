"use client";

export default function Input({ label, id, type = "text", className = "", ...props }) {
  return (
    <div className="grid gap-2">
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        className={`w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] ${className}`}
        {...props}
      />
    </div>
  );
}


