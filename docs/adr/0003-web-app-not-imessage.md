# 0003. Mobile-first web app on Next.js and Vercel, not iMessage

Date: 2026-10-03 · Status: Accepted

## Context

The brief allows any medium: browser, iMessage, app. Reviewers must be able to play from a link or clear instructions. An iMessage game feels homey but cannot be played by reviewers without the author's phone number and an Apple device.

## Decision

Ship a mobile-first web app. Next.js 16 App Router on Vercel, one page route driven by game phase, route handlers under `/api`. Model calls run in route handlers so the API key and the secret word stay off the client.

## Consequences

- A reviewer plays from a URL with no setup; the Loom is recorded in a phone-width browser window.
- Phone-first layout drives the design system (ADR 0008): one column, three type sizes, big tap targets.
- `next/font` fetches Geist at build time, so builds need network access to Google Fonts (or a self-hosted font).
- iMessage, voice, and a native shell are "next steps" in the write-up, not v1.
