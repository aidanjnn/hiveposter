import { forwardRef, type InputHTMLAttributes } from "react";

/** Plan §00. surface-2 fill, 4px radius; a 1px red border and one grey line on error. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ invalid, className = "", ...props }, ref) {
    return (
      <input
        ref={ref}
        {...props}
        aria-invalid={invalid || undefined}
        className={`min-w-0 rounded border bg-surface-2 px-2.5 py-2 text-body text-ink placeholder:text-ink-3 outline-none focus:border-ink-3 ${invalid ? "border-accent" : "border-transparent"} ${className}`}
      />
    );
  },
);
