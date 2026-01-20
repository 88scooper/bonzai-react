"use client";

export default function SelectInput({ label, id, className = "", children, ...props }) {
  return (
    <div className="grid gap-2">
      {label && (
        <label htmlFor={id} className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </label>
      )}
      <select
        id={id}
        className={`w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-[#205A3E]/20 dark:focus:ring-[#205A3E]/30 focus:border-[#205A3E] dark:focus:border-[#66B894] ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
