import { type TextareaHTMLAttributes } from "react";

export const Textarea = ({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={`w-full rounded-2xl border border-ink-200/80 bg-paper-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 shadow-[inset_0_1px_6px_rgba(24,36,38,0.08)] focus:border-accent-500 focus:outline-none ${className}`}
      {...props}
    />
  );
};
