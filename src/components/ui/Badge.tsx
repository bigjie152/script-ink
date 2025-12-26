import { type HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement>;

export const Badge = ({ className = "", ...props }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-ink-200 bg-paper-50 px-3 py-1 text-xs font-semibold text-ink-700 ${className}`}
      {...props}
    />
  );
};
