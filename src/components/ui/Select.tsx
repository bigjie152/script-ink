import { type SelectHTMLAttributes } from "react";

export const Select = ({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) => {
  return (
    <select
      className={`w-full rounded-2xl border border-ink-200 bg-paper-50 px-4 py-2 text-sm text-ink-900 focus:border-ink-600 focus:outline-none ${className}`}
      {...props}
    />
  );
};
