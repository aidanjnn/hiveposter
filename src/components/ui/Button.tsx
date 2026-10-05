import type { ButtonHTMLAttributes } from "react";

/** Plan §00. Primary inverts, ghost is a hairline, red is for Deal only. */
const VARIANTS = {
  primary: "bg-ink text-black hover:bg-ink-2 disabled:bg-surface-2 disabled:text-ink-3",
  ghost: "border border-line text-ink hover:border-ink-3 disabled:text-ink-3",
  red: "bg-accent text-white hover:opacity-90 disabled:opacity-50",
  text: "text-ink-2 hover:text-ink disabled:text-ink-3",
} as const;

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  const box = variant === "text" ? "" : "rounded px-3 py-2 text-center";
  return (
    <button
      type="button"
      {...props}
      className={`${box} text-[14px] leading-[18px] tracking-[-0.15px] disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  );
}
