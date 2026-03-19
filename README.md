# PB²Track

Local-first pee and bruise tracker built for mobile Safari.

## Features

- Pee timer with explicit save flow
- Quick note-only pee entries
- Bruise logging with a front/back body map
- Log filtering and editing
- Delete and confirmation modals
- Pee and bruise insights
- Pee entries-by-day graph with all-time and specific-date views
- CSV export, JSON backup export, JSON import
- Printable report view

## Stack

- React
- Vite
- IndexedDB via `idb`
- Plain CSS

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The app is static and suitable for GitHub Pages deployment.

## Data Storage

All data is stored locally in IndexedDB on the current device. There is no backend.
