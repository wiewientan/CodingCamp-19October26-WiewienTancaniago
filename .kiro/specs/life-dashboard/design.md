# Design – To-Do List Life Dashboard

## Overview
A single static page (`index.html`) with one stylesheet (`css/style.css`) and one script (`js/app.js`). No build step and no backend: open `index.html` in a browser or publish the folder with GitHub Pages.

## File Structure
```
index.html        page structure (4 cards)
css/style.css     all styling, light/dark theme tokens, responsive grid
js/app.js         all behaviour, grouped by feature
.kiro/            steering rules and this spec
```

## Layout
- Top bar: app name and theme toggle.
- Responsive grid: 3 columns on desktop (≥ 900px), 1 column on mobile.
  - Greeting card (2 columns wide) – date, large clock, greeting with editable name, task summary.
  - Focus timer card – circular progress ring, Start / Stop / Reset, session length stepper.
  - To-do card (2 columns wide) – progress bar, add form, sort menu, task list.
  - Quick links card – tiles with site icon, add form, remove button.

## Visual Design
- Glass-style cards on a soft animated gradient background.
- Colors are CSS variables; dark mode swaps the variables via `data-theme="dark"` on `<html>` (falls back to the system setting).
- Typography: Plus Jakarta Sans for text, JetBrains Mono for the timer digits.
- Respects `prefers-reduced-motion`.

## Data Model (Local Storage)
| Key | Value |
| --- | --- |
| `lifeDashboard.theme` | `"light"` or `"dark"` |
| `lifeDashboard.name` | user name string |
| `lifeDashboard.tasks` | `[{ id, text, done, createdAt }]` |
| `lifeDashboard.sort` | `"newest" \| "oldest" \| "az" \| "pending"` |
| `lifeDashboard.links` | `[{ id, name, url }]` |
| `lifeDashboard.focusMinutes` | number, 1–120 |

All reads/writes go through a small `storage` helper wrapped in `try/catch`, so the app still works if Local Storage is blocked.

## Key Decisions
- The timer counts down from a stored end time (`Date.now()` based) instead of decrementing a counter, so it stays accurate even if the tab is in the background.
- Task text is rendered with `textContent` (never `innerHTML`) to avoid HTML injection.
- Duplicate check normalizes case and whitespace.
- URLs without `http(s)://` get `https://` added; invalid URLs show an error.
- Link icons come from the site favicon; if it fails to load, a colored letter is shown.
- The completion sound is generated with the Web Audio API, so no audio file is needed.
