import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-ink-900 text-paper-50 shadow-[0_14px_30px_-18px_rgba(18,28,30,0.7)] hover:bg-ink-800",
  outline: "border border-ink-300/80 text-ink-900 hover:border-ink-700 hover:text-ink-900",
  ghost: "text-ink-700 hover:bg-paper-100",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export const Button = ({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) => {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
