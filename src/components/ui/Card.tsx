import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = ({ className = "", ...props }: CardProps) => {
  return (
    <div
      className={`rounded-[28px] border border-ink-200/70 bg-paper-50/90 p-6 shadow-[0_24px_60px_-50px_rgba(18,28,30,0.55)] backdrop-blur ${className}`}
      {...props}
    />
  );
};
