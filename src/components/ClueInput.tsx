"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

/**
 * Plan §09. One-word input. Shape errors are caught locally; the server's answer
 * ("Too close to the word.") shows as the one grey line under a red border.
 */
export function WordInput({
  onSubmit,
  placeholder,
  action,
  disabled,
}: {
  onSubmit: (word: string) => Promise<string | null>;
  placeholder: string;
  action: string;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const word = value.trim();
    if (!word) return setError("Give a clue.");
    if (/\s/.test(word)) return setError("One word only.");
    setSending(true);
    const refused = await onSubmit(word);
    setSending(false);
    if (refused) setError(refused);
    else setValue("");
  }

  return (
    <form onSubmit={submit} className="grid gap-1.5">
      <div className="flex gap-2">
        <Input
          ref={ref}
          id="word-input"
          value={value}
          invalid={Boolean(error)}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={24}
          disabled={disabled || sending}
          className="flex-1"
        />
        <Button type="submit" disabled={disabled || sending}>
          {action}
        </Button>
      </div>
      <span className="min-h-5 text-ink-3" aria-live="polite">
        {error}
      </span>
    </form>
  );
}
