import { type TextareaHTMLAttributes, useEffect, useRef } from "react";

export const Textarea = ({
  className = "",
  onInput,
  style,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const maxHeight = 420;

  const resize = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  };

  useEffect(() => {
    resize();
  }, [props.value]);

  return (
    <textarea
      ref={ref}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
      className={`w-full rounded-2xl border border-ink-200/80 bg-paper-50 px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 shadow-[inset_0_1px_6px_rgba(24,36,38,0.08)] focus:border-accent-500 focus:outline-none ${className}`}
      style={{ ...style, maxHeight: `${maxHeight}px` }}
      {...props}
    />
  );
};
