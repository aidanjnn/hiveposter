---
name: hiveposter-manual-flows
description: Produce a focused hiveposter manual QA or demo checklist for real rounds on a phone, agent behavior, streaming, and recovery that unit tests and the simulator cannot prove. Use for manual test plan, playtest checklist, or Loom rehearsal.
---

# hiveposter manual flows

Generate a runnable checklist for the current change or requested release tier.
This is read-only checklist generation unless execution or recording results is
also requested. Use [AGENTS.md](../../../../AGENTS.md), the diff,
[plan §01](../../../../docs/plan.md#01-scope-and-definition-of-done) and
[plan §13](../../../../docs/plan.md#13-deliverables).

First inspect actual tests and [validation routes](../../../references/validation.md)
so each item covers a remaining observation, not a duplicate assertion. Keep
only relevant flows for a small change; use the complete set when the user asks
for submission readiness.

Useful scenario groups:

- **Entry:** deployed URL on a phone, cold load, fonts rendered, no console
  errors, lobby shows streak and lobby lines (or defaults on first play).
- **Role card:** play until you draw the imposter; confirm the card shows the
  category only and the red label; confirm a civilian card never shows red.
- **Clues:** type the secret word, its stem, a repeat, two words; each is
  refused inline. Agents' clues land one at a time; a pending seat shows the
  dashed state; no agent clue equals the word.
- **Discussion:** @mention each agent and get a reply in their voice; "I'm
  sure" ends the phase early; the cap of 2 messages per agent holds.
- **Vote and reveal:** votes reveal one at a time with reasons; a tie shows
  "No one leaves"; a caught imposter gets a last guess; the verdict and
  Brain Replay show real notes and a climbing sparkline for whoever got it.
- **Daily loop:** two devices on the same date get the same word; "Play again"
  changes the word and keeps the streak; the share card copies as text.
- **Memory and grudge:** vote an innocent Marlowe out, finish, re-open the
  lobby, and read the new line; confirm the grudge count moved.
- **Watch mode:** four agents play without input; your call locks and scores;
  the live meter moves after each clue; Take a seat hands you the role and notes.
- **Recovery:** refresh mid-round and resume; kill the server and confirm
  "Table reset. Deal again."; set a bad model ID and confirm fallback clues
  with the fallback badge, not a stall.
- **Loom rehearsal:** the §13 beats fit under 3:00 at normal speed.

Write each item as `- [ ] Setup — action → observable expected result`, ordered
so early steps prepare later ones. Name the exact remaining manual aspect when
a test partially covers it. Include needed device/browser/key upfront.

No run is not a pass. If results are requested, write actual observations to
`docs/validation.md` with commit, device/browser, model config, and remaining
issue; otherwise return the checklist without creating an evidence log.
