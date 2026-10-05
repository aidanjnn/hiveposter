# 0008. Single dark theme and three type sizes, adapted from jasonyuan.design

Date: 2026-10-04 · Status: Accepted

## Context

The user asked for the game interface to match the aesthetic of https://jasonyuan.design/, the personal site of Hivemind's founder. Measured from the live site: body `#1A1A1B`, cards `#070708`, white and `#AAAAAA` text, NB Akademie Std at 16px with −0.15px tracking, 18.5px/500 headings, 4px radii, 20px grid gaps, a three-column header, captions bottom-left.

## Decision

Adopt that system as the game's design system (plan §00, tokens in `src/app/globals.css`): one dark surface, no light mode, three type sizes (15 body, 18.5 heading, 28 display for the role-card word only), 4px radius, 20px gap, players as 8px colored dots instead of avatars, no shadows/gradients/icons. Red (`#E84A3C`) appears only on the imposter role card, the Watch-mode live dot, an invalid clue border, and the Deal button. Geist stands in for NB Akademie, which is not on Google Fonts.

## Consequences

- The UI feels native to the reviewer's own visual language and forces good copy, since nothing else carries the screen.
- A single theme means `color-scheme: dark` on `:root` and no theme toggling code.
- If an NB Akademie license is available, it drops in as a self-hosted `@font-face`.
- The felt-table and avatar mockups from the first concept plan are superseded.
