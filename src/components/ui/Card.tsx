import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-3xl border border-ink-100 bg-white/70 p-6 shadow-[0_24px_60px_-50px_rgba(16,24,40,0.45)] backdrop-blur ${className}`}
      {...props}
    />
  );
};
