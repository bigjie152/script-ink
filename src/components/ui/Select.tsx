import { type SelectHTMLAttributes } from "react";

export const Select = ({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      className={`w-full rounded-2xl border border-ink-200/80 bg-paper-50 px-4 py-2 text-sm text-ink-900 shadow-[inset_0_1px_6px_rgba(24,36,38,0.08)] focus:border-accent-500 focus:outline-none ${className}`}
      {...props}
    />
  );
};
