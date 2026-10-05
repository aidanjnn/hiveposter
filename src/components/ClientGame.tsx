"use client";

import dynamic from "next/dynamic";

/**
 * The game depends on localStorage and sessionStorage from its first render (streak,
 * persona memory, the table in progress), so it renders on the client only.
 */
export const ClientGame = dynamic(() => import("./Game").then((m) => m.Game), {
  ssr: false,
  loading: () => <main className="mx-auto w-full max-w-[440px] flex-1 px-5 pt-5 font-mono text-label text-ink-3">Setting the table…</main>,
});
