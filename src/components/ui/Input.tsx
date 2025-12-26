import { type InputHTMLAttributes } from "react";

export const Input = ({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <input
      className={`w-full rounded-2xl border border-ink-200 bg-paper-50 px-4 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none ${className}`}
      {...props}
    />
  );
};
