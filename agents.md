# Agents.md – Pee & Bruise Tracker (Local-First Web App)

## Overview
This project is a mobile-first, local-first web application designed for iPhone Safari usage. It allows a user to:
- Track urination events via a timer
- Log associated notes and symptoms
- Log bruises using a body map
- View logs and analytics
- Export data (CSV, JSON, printable view)

No backend or database is used. All data is stored locally using IndexedDB.

---

## Core Principles
- Local-first (no server, no cloud)
- Privacy-first (no automatic data sharing)
- Extremely fast interaction (2 taps for core flow)
- Explicit save (no autosave)
- Mobile-first UX

---

## Tech Stack
- React (lightweight setup)
- IndexedDB (via wrapper like idb)
- Plain CSS or minimal framework
- Hosted on GitHub Pages

---

## App Structure

### Pages / Views
1. Home (default)
2. Pee Entry Modal
3. Bruise Entry Page
4. Log / History Page
5. Insights Page
6. Export / Import Page
7. Printable Report View

---

## Home Screen

### Primary UI
- Large centered button:
  - Default: "Start Timer"
  - When active: "Stop Timer"

### Timer State
- Show elapsed time while running
- Show subtle status: "Timer running"
- Provide "Cancel" option while active

### Secondary Actions
- Add Note
- Add Bruise
- View Log
- Insights
- Export

---

## Pee Tracking Flow

### Start
- Tap "Start Timer"
- Save start timestamp in IndexedDB

### Running State
- Display elapsed time (live updating)

### Stop
- Tap "Stop Timer"
- Open Pee Entry Modal

### Pee Entry Fields
- startTime
- endTime
- duration
- tags (multi-select):
  - dark
  - cloudy
  - blood
  - burning
  - pain
  - weak stream
  - urgent
  - other
- freeTextNote

### Actions
- Save → persist entry
- Discard → delete temp record

---

## Timer Persistence
- If page reloads while timer is active:
  - timer resumes using stored startTime

---

## Bruise Tracking

### UI
- Vitruvian-style human silhouette (front/back toggle)
- SVG-based clickable regions

### Regions
Simplified structure:
- head (front/back)
- torso (front/back)
- limbs:
  - arm
  - hand
  - leg
  - foot
(each with front/back context)

### Selection
- Tap region to select
- Highlight selected areas

### Fields
- observedAt
- bodySide: front/back
- regionType: head / torso / limb
- limbType (if applicable): arm / hand / leg / foot
- size: small / medium / large
- color tags:
  - red
  - purple
  - blue
  - green
  - yellow
  - brown
  - fading
- pain/tenderness (boolean)
- causeKnown (boolean)
- causeDescription (optional)
- status: improving / stable / worsening
- note (free text)

### Actions
- Save
- Cancel

---

## Data Storage

Use IndexedDB with two stores:
- peeEntries
- bruiseEntries

Each entry includes:
- id
- createdAt
- updatedAt

---

## Log / History

### Views
- All
- Pee only
- Bruise only
- Daily
- Weekly
- Monthly
- Custom range

### Entry Display
- Card-based UI
- Tap to edit

### Editing
- Modify fields
- Explicit Save button
- Overwrite existing entry

---

## Insights / Analytics

### Pee Metrics
- total count
- average duration
- median duration
- shortest / longest
- frequency per day
- tag frequency

### Bruise Metrics
- total count
- frequency over time
- region distribution
- color frequency
- improving vs worsening

### Sparse Data Handling
- Show message instead of stats:
  - "Not enough data yet"

---

## Export / Import

### Export Formats
- CSV:
  - pee entries
  - bruise entries
- JSON:
  - full backup

### Import
- Upload JSON
- Replace or merge existing data

### Print View
- Summary section
- Followed by full logs
- Designed for browser print → PDF

---

## UX Requirements
- Large touch targets
- Single-column layout
- Fast navigation
- No hover interactions
- Minimal typing required

---

## Safety Notice
Display in Export page:

"Your data is stored only on this device. Export regularly to avoid data loss."

---

## Future Enhancements (Not Required)
- Photo upload for bruises
- PWA install support
- Passcode lock
- Cloud sync / backend

---

## Deliverables
- Fully functional static site
- Works in iPhone Safari
- No backend dependencies
- Ready for GitHub Pages deployment

