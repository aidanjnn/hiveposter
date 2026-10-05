import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The secret word must never reach the browser (plan §03, ADR 0002). Walk the import graph
 * from every client entry and fail if it reaches the word bank or model-calling code.
 * Type-only imports are erased at build time and are ignored.
 */

const SRC = path.resolve(__dirname, "..");
const ENTRIES = ["components/ClientGame.tsx", "components/Game.tsx", "app/page.tsx"];
const FORBIDDEN = ["engine/words.ts", "engine/game.ts", "agents/act.ts", "agents/runner.ts", "agents/memory.ts", "agents/prompts.ts", "lib/store.ts", "lib/game-service.ts"];

function resolve(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && !base.endsWith("/") && /\.(ts|tsx)$/.test(base + ext)) return base + ext;
  }
  return null;
}

function imports(file: string): string[] {
  const text = readFileSync(file, "utf8");
  const out: string[] = [];
  const re = /^\s*(import|export)\s+(?!type\b)(?:[^"';]*?from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/gm;
  for (const m of text.matchAll(re)) out.push(m[2] ?? m[3]);
  return out;
}

function reachable(): Set<string> {
  const seen = new Set<string>();
  const stack = ENTRIES.map((e) => path.join(SRC, e));
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of imports(file)) {
      const next = resolve(file, spec);
      if (next) stack.push(next);
    }
  }
  return seen;
}

describe("client bundle", () => {
  it("never imports the word bank or model-calling code", () => {
    const files = [...reachable()].map((f) => path.relative(SRC, f));
    expect(files).toContain("components/Lobby.tsx");
    for (const bad of FORBIDDEN) expect(files, `client reaches ${bad}`).not.toContain(bad);
  });
});
