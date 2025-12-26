import { type TextareaHTMLAttributes } from "react";

export const Textarea = ({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  return (
    <textarea
      className={`w-full rounded-2xl border border-ink-200 bg-paper-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-ink-600 focus:outline-none ${className}`}
      {...props}
    />
  );
};
