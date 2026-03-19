# PB²Track

PB²Track is a mobile-first, local-first health tracking app built as a static React/Vite site for iPhone Safari.

It tracks:
- Pee events
- Typed notes
- Bruises
- BM entries
- Weight
- Sleep

All data stays in IndexedDB on the current device unless the user explicitly exports it.

## Current Feature Set

- Pee timer with reload persistence and explicit save
- Manual pee notes for missed timer cases, including `N/A` time support
- Typed notes with three modes:
  - `symptom`
  - `general`
  - `pee`
- Quick selectors for symptom, general, pee, BM, and bruise metadata
- Bruise logging with front/back SVG body map
- BM logging with size, tags, and notes
- Weight logging with `lb` default and optional `kg`
- Sleep logging with a compact summary row and bottom-sheet timing editor
- Editable history with type and date-range filters
- Insights for Pee, BM, Weight, Sleep, and Bruise data
- Modern graph modal with all-time, recent-range, and specific-date views
- CSV export per entry type
- JSON full-backup export and merge/replace import
- Printable report view
- In-app confirmation modals for destructive actions

## Stack

- React
- Vite
- IndexedDB via `idb`
- Plain CSS
- GitHub Pages deployment via GitHub Actions

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

## Data Storage

PB²Track has no backend and no cloud sync.

Primary stores:
- `peeEntries`
- `noteEntries`
- `bmEntries`
- `bruiseEntries`
- `weightEntries`
- `sleepEntries`

Some legacy pee-note records may still exist inside `peeEntries`; the app keeps compatibility with those during log/edit/export flows.

## Deployment

The app is static and intended for GitHub Pages.

Deployment workflow:
- `.github/workflows/deploy-pages.yml`

Expected repo configuration:
- GitHub Pages source: `GitHub Actions`

## Notes For Contributors

- The app intentionally prioritizes explicit save over autosave.
- Destructive flows should continue to use in-app confirmation modals, not system alerts.
- UI decisions are documented in detail in `agents.md`.
