# Architecture decision records

Decisions made while planning and scaffolding Imposter: The Table, in the order they were made. Each record states the context, the decision, and what it costs. Supersede a record with a new one; do not edit history.

| # | Decision | Status |
| --- | --- | --- |
| [0001](0001-imposter-over-other-concepts.md) | Build Imposter: The Table; fold "Imposter TV" in as Watch mode | Accepted |
| [0002](0002-code-referees-model-plays.md) | The code is the referee; the model only ever gets a seat | Accepted |
| [0003](0003-web-app-not-imessage.md) | Mobile-first web app on Next.js and Vercel, not iMessage | Accepted |
| [0004](0004-claude-via-ai-gateway.md) | Claude through the Vercel AI Gateway, Haiku/Sonnet split measured by simulation | Superseded by 0010 |
| [0005](0005-personas-change-decisions.md) | Persona knobs enter the decision in code, not just the prompt | Accepted |
| [0006](0006-brain-replay-after-reveal.md) | Agent reasoning is recorded every turn and shown only after reveal | Accepted |
| [0007](0007-sse-and-in-memory-store.md) | Streamed POST responses over WebSockets; in-memory game store for v1 | Accepted |
| [0008](0008-design-system-from-jasonyuan-design.md) | Single dark theme and three type sizes, adapted from jasonyuan.design | Accepted |
| [0009](0009-delivery-skills-from-teachar.md) | Adopt teachAR's delivery skills and CI gate, adapted | Accepted |
| [0010](0010-gemini-flash-split.md) | Gemini Flash-Lite civilians and a Flash imposter, called directly | Accepted |

Format: [MADR](https://adr.github.io/madr/)-lite. Dates are when the decision was made in conversation, not when the file was written.
