import { type ButtonHTMLAttributes } from "react";

const variants = {
  primary: "bg-ink-900 text-paper-50 hover:bg-ink-800",
  outline: "border border-ink-300 text-ink-900 hover:border-ink-600",
  ghost: "text-ink-900 hover:bg-ink-100",
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
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    />
  );
};
