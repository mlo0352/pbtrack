# Agents.md - P&BT (Pee & Bruise Tracker)

## Overview

This repository now contains a working mobile-first, local-first web app built for iPhone Safari and static hosting.

The app currently supports:
- Pee timer tracking with explicit save
- Quick note-only pee entries
- BM logging with explicit save
- Bruise logging with a front/back SVG body map
- Log filtering, editing, and deletion
- Pee and bruise insights
- Pee entries-by-day chart modal
- CSV export, JSON backup export, JSON import
- Printable report view
- GitHub Pages deployment via GitHub Actions

There is no backend. All user data is stored locally in IndexedDB on the current device.

---

## Current Product State

### App Name / UI Copy
- In-app title: `P&BT`
- Print title: `P&BT Summary`
- The top bar no longer repeats that data is local-only
- The export page still shows the safety notice:
  - `Your data is stored only on this device. Export regularly to avoid data loss.`

### Core Behavior
- Explicit save only
- No autosave for finished entries
- Timer drafts persist across reloads
- Destructive actions use in-app confirmation modals, not system alerts/confirms
- Log cards expose direct `Edit` and `Delete` actions
- Entry-type bubbles were removed from log cards because the entry titles already identify the type

---

## Tech Stack

- React
- Vite
- IndexedDB via `idb`
- Plain CSS
- GitHub Pages deployment through GitHub Actions

---

## Important Files

### App Logic
- `src/App.jsx`
  - Main app shell
  - View routing by hash
  - Timer flow
  - Pee modal
  - Bruise entry page
  - Log page
  - Insights page
  - Export/import page
  - Print view
  - Confirmation modal
  - Entry graph modal for pee/BM daily counts
  - Analytics helpers

### Persistence
- `src/db.js`
  - IndexedDB setup
  - `peeEntries` store
  - `bruiseEntries` store
  - CRUD helpers

### Styling
- `src/styles.css`
  - Mobile-first layout
  - Palette-driven UI
  - Modal styling
  - Chart styling
  - Print styling

### Boot / Build
- `src/main.jsx`
- `index.html`
- `vite.config.js`
- `package.json`

### Deployment
- `.github/workflows/deploy-pages.yml`
  - Builds on push to `main`
  - Uploads `dist/`
  - Deploys to GitHub Pages

---

## IndexedDB Model

Current stores:
- `peeEntries`
- `bmEntries`
- `bruiseEntries`

### Pee Entry Shape
Each pee entry includes:
- `id`
- `createdAt`
- `updatedAt`
- `entryType`
- `entryMode`
  - `timer` or `note`
- `status`
  - `active` or `saved`
- `startTime`
- `endTime`
- `duration`
- `tags`
- `freeTextNote`

### Bruise Entry Shape
Each bruise entry includes:
- `id`
- `createdAt`
- `updatedAt`
- `entryType`
- `observedAt`
- `bodySide`
- `regionKey`
- `regionType`
- `limbType`
- `size`
- `colorTags`
- `tenderness`
- `causeKnown`
- `causeDescription`
- `status`
- `note`

### BM Entry Shape
Each BM entry includes:
- `id`
- `createdAt`
- `updatedAt`
- `entryType`
- `occurredAt`
- `size`
- `tags`
- `freeTextNote`

### Active Timer Persistence
There is no separate timer store.
An active timer is saved as a `peeEntries` record with:
- `entryMode: timer`
- `status: active`

When the timer is stopped and saved, that same record is converted to `status: saved`.
If the timer is canceled, the draft record is deleted.

---

## Views / Screens

### 1. Home
Current behavior:
- Large primary start/stop button
- Live elapsed timer display while active
- `Cancel` available while timer is active
- Quick actions:
  - Add Note
  - Add BM
  - Add Bruise
  - View Log
  - Insights
  - Export
- Recent activity list

### 2. Pee Entry Modal
Used for:
- Saving a stopped timer
- Editing an existing pee entry
- Creating a note-only pee entry

Fields:
- Start time
- End time
- Duration
- Tags
- Note

Actions:
- Save
- Cancel
- Discard only when stopping an active timer draft

### 3. Bruise Entry Page
Current behavior:
- Front/back toggle
- SVG body map with clickable regions
- Selected region highlight
- Inline validation if no region is selected

Fields:
- Observed at
- Body side
- Region
- Size
- Color tags
- Pain/tenderness
- Cause known
- Cause description
- Status
- Note

Actions:
- Save
- Cancel

### 4. BM Entry Modal
Used for:
- Creating a BM entry
- Editing an existing BM entry

Fields:
- Occurred at
- Size
- Tags
- Note

Actions:
- Save
- Cancel

### 5. Log / History
Filters:
- All
- Pee only
- BM only
- Bruise only
- Daily
- Weekly
- Monthly
- Custom range

Entry behavior:
- Card-based display
- Direct `Edit` action
- Direct `Delete` action
- Delete uses confirmation modal

### 6. Insights
#### Pee Metrics
- Total count
- Average duration
- Median duration
- Shortest duration
- Longest duration
- Frequency per day
- Tag frequency
- Entries by day

Notes:
- Pee analytics exclude note-only entries
- `Entries by day` can open the pee chart modal
- Clicking a specific day in the metric list opens the chart focused on that date

#### BM Metrics
- Total count
- Frequency per day
- Tag frequency
- Size frequency
- Entries by day

Notes:
- `Entries by day` can open the BM chart modal
- Clicking a specific day in the metric list opens the chart focused on that date

#### Bruise Metrics
- Total count
- Unique regions
- Improving count
- Stable count
- Worsening count
- Region distribution
- Color frequency
- Frequency over time

Sparse data handling:
- Shows `Not enough data yet`

### 7. Daily Entry Graph Modal
Current behavior:
- Opens from Pee Insights or BM Insights
- Default range: all-time
- Supported ranges:
  - All-time
  - 30 days
  - 7 days
  - Specific date
- Specific date picker available
- Bars can be tapped to select a date
- Secondary action is `Cancel`

### 8. Export / Import
Export supported:
- JSON full backup
- CSV for pee entries
- CSV for BM entries
- CSV for bruise entries

Import supported:
- JSON upload
- Merge existing data
- Replace existing data
- Replace uses confirmation modal

### 9. Print View
Current behavior:
- Summary cards
- Full log output
- Print / Save PDF action
- Separate back action to return to Export page

---

## Confirmation Modal Policy

Use in-app confirmation modals for destructive or high-friction actions.
Current modal-driven confirmations:
- Cancel active timer
- Delete log entry
- Replace local data on import

Do not reintroduce `window.alert` or `window.confirm` for these flows unless there is a strong reason.

---

## Analytics Rules

### Pee Analytics
- Based on saved timer entries only
- Note-only entries do not affect duration statistics
- Duration is computed from `startTime` and `endTime`

### Bruise Analytics
- Built from all saved bruise entries
- Region distribution uses `bodySide + regionKey`
- Frequency over time groups by observed date

### BM Analytics
- Built from all saved BM entries
- Frequency per day uses grouped `occurredAt` dates
- Daily chart can be opened from Insights

---

## Design / Visual Direction

The current UI is not generic default UI.
It uses a warm clinical notebook style built around this palette:
- Shadow Grey: `#272727`
- Sandy Clay: `#d4aa7d`
- Apricot Cream: `#efd09e`
- Beige: `#d2d8b3`
- Cool Steel: `#90a9b7`

Button color rules:
- General primary actions use a green family derived to fit the palette
- Destructive actions use a red family derived to fit the palette
- The main timer button is green when idle and red when active/stoppable

Design characteristics:
- Single-column mobile layout
- Large touch targets
- Soft glass/paper surfaces
- No hover-dependent interactions
- Fixed bottom navigation
- Styled modal sheets instead of system dialogs

When changing the UI, preserve this direction unless intentionally redesigning the whole app.

---

## Routing Model

Routing is hash-based inside `src/App.jsx`.
Current views are:
- `home`
- `bruise`
- `log`
- `insights`
- `export`
- `print`

This is intentional for a lightweight static app and GitHub Pages compatibility.

---

## Deployment State

### Git
- Repository initialized
- `main` branch in use
- Remote expected at:
  - `https://github.com/mlo0352/pbtrack.git`

### GitHub Pages
Deployment workflow exists in:
- `.github/workflows/deploy-pages.yml`

Expected Pages config in GitHub:
- Pages source should be set to `GitHub Actions`

---

## Development Notes

### Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Production build: `npm run build`

### Build Output
- Vite outputs to `dist/`

### Git Ignore
The repo should ignore at least:
- `node_modules/`
- `dist/`

---

## Known Constraints

- No backend
- No authentication
- No cloud sync
- No photos
- No PWA install flow yet
- No passcode lock
- No automated tests yet

---

## Near-Term Enhancement Candidates

These are reasonable next steps if the project continues:
- Add automated tests for analytics and import/merge behavior
- Add stronger edit/delete affordances in the recent activity list
- Add PWA support
- Add photo attachments for bruises
- Add export/import schema versioning
- Split `src/App.jsx` into smaller components if the app grows further

---

## Deliverable Status

Current status:
- Functional static site: yes
- Local-first storage: yes
- iPhone Safari oriented: yes
- No backend dependencies: yes
- GitHub Pages ready: yes
- Deployment workflow present: yes
