# Agents.md - PB²Track

## Purpose Of This File

This document is intentionally detailed. It is meant to give another agent enough implementation context to:
- understand the current app without reverse-engineering every branch in `src/App.jsx`
- critique the product and codebase meaningfully
- suggest improvements that respect the current UX direction instead of resetting it to defaults
- identify where the implementation is intentionally opinionated versus merely incomplete

This is not just a product brief. It is a state-of-the-repo and design-rationale document.

---

## Product Summary

`PB²Track` is a mobile-first, local-first tracking app built for iPhone Safari and static hosting.

The current app tracks:
- Pee
- Typed notes
- Bruises
- BM (bowel movement)
- Weight
- Sleep

There is no backend. All data is stored in IndexedDB on the current device unless explicitly exported.

Branding currently used in the codebase:
- App title: `PB²Track`
- Print title: `PB²Track Summary`

The UX is optimized around:
- explicit save
- local privacy
- large tap targets
- low-friction entry flows
- avoiding system dialogs
- avoiding hover-dependent UI

---

## Current Architectural Shape

### High-Level Architecture

The app is a single-page React application with hash-based routing and a large single-file application component.

Important implementation facts:
- Main application logic lives in `src/App.jsx`
- Persistence helpers live in `src/db.js`
- Styling lives in `src/styles.css`
- The app uses Vite and builds to `dist/`
- Deployment is set up for GitHub Pages via GitHub Actions

This is intentionally lightweight. The current implementation prioritizes shipping a stable local-first tool over early component decomposition.

### Routing Model

Routing is hash-based and implemented locally in `src/App.jsx`.

Current views:
- `home`
- `bruise`
- `log`
- `insights`
- `export`
- `help`
- `print`

Rationale:
- works well on GitHub Pages without extra routing config
- keeps the app static
- avoids introducing a router dependency

Tradeoff:
- view logic is centralized and somewhat monolithic
- route-level code splitting is not in place

### Code Organization

Current structure is pragmatic rather than elegant.

`src/App.jsx` currently owns:
- all top-level state
- data loading
- data mutation handlers
- hash routing
- all screen components
- all modal components
- analytics builders
- CSV/export/import helpers
- most formatting helpers

This is workable at current scale, but it is the main maintainability hotspot.

A reviewer should specifically consider whether to split by:
- screens
- modal forms
- analytics/helpers
- storage adapters
- domain-specific entry types

---

## Persistence Layer

### IndexedDB Stores

Current DB version: `4`

Stores in `src/db.js`:
- `peeEntries`
- `noteEntries`
- `bruiseEntries`
- `bmEntries`
- `weightEntries`
- `sleepEntries`

There is no separate timer store.

### Persistence Helpers

Current helper operations:
- `getAllData()`
- `saveEntry(storeName, entry)`
- `saveEntries(storeName, entries)`
- `deleteEntry(storeName, id)`
- `clearStore(storeName)`

These are intentionally generic and do not enforce schema validation.

Tradeoff:
- simple and flexible
- schema correctness is enforced by UI logic, not by the storage layer

### Legacy Compatibility

There is historical baggage in the repo:
- older note-like pee records may still exist inside `peeEntries` with `entryMode: 'note'`
- current typed notes live in `noteEntries`

The app still supports those old records in:
- log rendering
- editing
- deletion
- note export
- note import merge behavior

This is intentional because the user already has local data and the app should not strand it.

This also means that “notes” are conceptually unified in the UI but not perfectly normalized in storage.

A reviewer should consider whether a one-time migration path is now preferable.

---

## Data Models

The shapes below reflect current practical behavior, not just idealized schema.

### Pee Entries

Store: `peeEntries`

Used for:
- active timer drafts
- saved timer-based pee entries
- legacy note-like pee records

Common fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'pee'`
- `entryMode`
- `status`
- `startTime`
- `endTime`
- `duration`
- `tags`
- `freeTextNote`

Important modes:
- `entryMode: 'timer'`, `status: 'active'`
  - running timer draft
- `entryMode: 'timer'`, `status: 'saved'`
  - normal completed pee entry
- `entryMode: 'note'`, `status: 'saved'`
  - legacy note-like pee record retained for compatibility

Important semantics:
- active timer persistence is implemented as a normal DB record
- stopping a timer updates that existing active record
- canceling a timer deletes that record entirely

### Note Entries

Store: `noteEntries`

Fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'note'`
- `occurredAt`
- `noteType`
- `tags`
- `timeUnknown`
- `freeTextNote`

Supported `noteType` values:
- `symptom`
- `general`
- `pee`

UX-specific semantics:
- `symptom` uses quick selectors like headache, fatigue, anxiety, nausea, dizziness, pain, cramps
- `general` uses quick selectors like water, medication, meal, supplement, caffeine, alcohol, exercise
- `pee` is used as the “forgot to press the timer” path

Pee-note special behavior:
- defaults to `timeUnknown: true`
- can optionally switch to a known datetime
- duration is treated as `N/A`
- these records contribute to pee counts and pee tags in insights
- if time is `N/A`, they do not contribute to date-based pee graphs or duration math

This is a deliberate UX choice to capture useful pee-related data without pretending the timing is accurate.

### BM Entries

Store: `bmEntries`

Fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'bm'`
- `occurredAt`
- `size`
- `tags`
- `freeTextNote`

Supported BM sizes:
- `small`
- `medium`
- `large`

BM tags currently include:
- `hard`
- `normal`
- `loose`
- `watery`
- `pain`
- `straining`
- `blood`
- `urgent`
- `other`

### Bruise Entries

Store: `bruiseEntries`

Fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'bruise'`
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

Bruise regions are selected from a simplified front/back SVG body map.

This is not anatomically granular. It is intentionally simplified for mobile tapping.

### Weight Entries

Store: `weightEntries`

Fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'weight'`
- `occurredAt`
- `weightUnit`
- `weightValue`
- `freeTextNote`

Current unit behavior:
- default entry unit is `lb`
- user can switch to `kg`
- stored unit is preserved with the record
- insight math normalizes to `kg`
- display defaults to `lb`
- weight graph modal can toggle display between `lb` and `kg`

This is a deliberate split between storage math and presentation.

### Sleep Entries

Store: `sleepEntries`

Current preferred fields:
- `id`
- `createdAt`
- `updatedAt`
- `entryType: 'sleep'`
- `startTime`
- `endTime`
- `durationMinutes`
- `quality`
- `freeTextNote`

Legacy compatibility still exists for older sleep fields:
- `sleepStart`
- `sleepEnd`
- `duration`

Current code reads both formats through helper functions.

Sleep quality values:
- `poor`
- `okay`
- `good`

Important UX behavior:
- default inference is 8 hours ending now
- the main sleep form shows a compact summary card rather than exposing two datetime fields immediately
- timing is edited in a dedicated bottom-sheet editor
- sleep entry saving is still explicit, not autosaved

---

## Screen And UX Breakdown

### Home Screen

Main elements:
- top bar with `Local-first log` button leading to Help
- title `PB²Track`
- large timer panel
- quick action grid
- recent activity list
- fixed bottom navigation

Quick actions currently:
- `Add Note`
- `Add Bruise`
- `Add BM`
- `Add Weight`
- `Add Sleep`

The pee timer remains the primary hero action and is not represented as a quick action card.

Timer panel behavior:
- start button when idle
- stop button when active
- elapsed duration shown in monospaced stopwatch format
- cancel button visible only while active
- idle state no longer says “No active timer”

Rationale:
- the idle hero should feel ready, not empty
- timer is visually centered and primary

### Add Note Flow

The note modal is type-driven.

Flow:
1. open note modal
2. choose type: symptom / general / pee
3. the body adapts to the type
4. explicitly save

Type-specific UX:
- `symptom`
  - occurred-at datetime input
  - symptom quick-selector tags
  - free text note
- `general`
  - occurred-at datetime input
  - intake/general quick-selector tags
  - free text note
- `pee`
  - pee tags
  - time toggle: `N/A` or `Known`
  - if `Known`, datetime input appears
  - duration is displayed as `N/A`
  - free text note

This flow exists because the user wanted notes to support broader tracking, not just pee.

### Pee Timer Flow

Flow:
1. tap `Start Timer`
2. active draft is written to IndexedDB immediately
3. timer survives reload because the draft record persists
4. tap `Stop Timer`
5. pee modal opens with computed start/end/duration
6. user explicitly saves or discards

Discard and cancel behavior:
- canceling an active timer uses a custom confirmation modal
- discarding a stopped timer draft also uses confirmation
- no system `alert()` / `confirm()` are used for these flows

Pee entry modal behavior:
- used for stopping timers and editing saved pee entries
- start and end are editable
- duration is derived live
- pee tags are multi-select pills

### Bruise Flow

Bruise editing is handled on its own dedicated page rather than a modal.

Current behavior:
- choose front/back
- tap a simplified SVG region
- save explicit details
- inline validation appears if no region is selected

Design rationale:
- bruise capture is structurally denser than the other flows
- full-screen editing avoids modal overload
- body map interaction is easier with more vertical space

### BM Flow

BM uses a modal and is intentionally lighter than bruise.

Behavior:
- datetime input
- size segmented buttons
- tag pills
- optional note
- explicit save/cancel

### Weight Flow

Weight uses a compact modal.

Behavior:
- datetime input
- top-level unit selector above the numeric field
- default unit is `lb`
- optional switch to `kg`
- note field
- explicit save/cancel

Important implementation choice:
- unit selection is intentionally tappable and visually above the numeric field
- this avoids hidden assumptions about the number the user is entering

### Sleep Flow

This is one of the more intentionally designed flows in the app.

Current main-form behavior:
- timing is represented as a compact card/row
- card shows resolved summary, not a generic placeholder
- default summary is 8h ending now
- tapping the row opens a bottom-sheet timing editor

Bottom-sheet timing editor behavior:
- quick duration chips:
  - `15m`
  - `30m`
  - `45m`
  - `1h`
  - `1.5h`
  - `2h`
  - `4h`
  - `6h`
  - `8h`
  - `10h`
- ended-when chips:
  - `Now`
  - `15m ago`
  - `30m ago`
  - `1h ago`
  - `2h ago`
  - `Custom`
- manual fallback inputs:
  - duration hours
  - duration minutes
  - exact end datetime
- live summary shown at the top of the sheet
- explicit `Save`, `Cancel`, and `Clear`

Important UX decisions:
- the user should not have to edit two full datetimes unless they choose to
- naps and full sleep should both be easy to enter
- timing edits should feel lightweight, not clinical

Current storage decision:
- save `startTime`, `endTime`, `durationMinutes`
- derive everything else from those

### Log / History

Filters currently support:
- `All`
- `Pee only`
- `Notes only`
- `BM only`
- `Weight only`
- `Sleep only`
- `Bruise only`

Range filters:
- `All`
- `Daily`
- `Weekly`
- `Monthly`
- `Custom`

Card behavior:
- explicit `Edit`
- explicit `Delete`
- delete confirmation uses in-app modal

UI decisions:
- entry-type badges were removed because titles already identify type
- tags are shown as pills where relevant
- duplicate text/tag echo is suppressed in some contexts to reduce clutter

### Insights

Insight sections currently exist for:
- Pee
- BM
- Weight
- Sleep
- Bruise

Sparse data policy:
- show `Not enough data yet` instead of forcing meaningless stats

#### Pee Insights

Current pee logic intentionally mixes two data sources:
- timer-based pee entries
- manual pee notes from the note system

However, it does not treat them identically.

Timer-based entries contribute to:
- count
- duration metrics
- entries-by-day
- tag frequency

Manual pee notes contribute to:
- count
- tag frequency
- entries-by-day only if they have a known time

Manual pee notes with `N/A` time are intentionally excluded from:
- duration math
- date-based grouping
- pee graphing

This is deliberate because the app should record uncertainty instead of inventing timing precision.

#### BM Insights

Current metrics:
- total count
- frequency/day
- size frequency
- tag frequency
- entries by day graph

#### Weight Insights

Current metrics:
- total count
- latest
- average
- lowest
- highest
- weight by day graph

Important implementation decision:
- all math normalizes to kilograms internally
- display defaults to pounds in the cards
- graph display can be toggled to pounds or kilograms

This helps avoid mixed-unit math bugs while keeping the UI familiar to the current user.

#### Sleep Insights

Current metrics:
- total count
- average duration
- median duration
- shortest
- longest
- quality frequency
- duration by day graph

Current sleep grouping is based on end date.

That is an implementation choice another reviewer may want to challenge, depending on whether “night of” or “woke up on” is the more useful grouping model.

#### Bruise Insights

Current metrics:
- total count
- unique regions
- improving/stable/worsening counts
- region distribution
- color frequency
- frequency over time

### Graph Modal

The graph modal is reused for Pee, BM, Weight, and Sleep.

Supported range modes:
- all-time
- 30 days
- 7 days
- specific date

Current graph UX:
- modern line/area chart rather than the earlier rough bar-only view
- active date defaults correctly on open
- date chips beneath chart allow direct selection
- detail pill shows the selected date’s value
- weight graph includes a display-unit toggle

Why this matters:
- there was a prior bug where the pee graph rendered strangely until the user tapped
- the current implementation resolves that by deriving an active date immediately

A reviewer should still inspect this modal for:
- accessibility
- chart readability on very dense all-time ranges
- scaling behavior when values vary minimally

### Export / Import

Export supports:
- JSON full backup
- CSV per type:
  - Pee
  - Note
  - BM
  - Weight
  - Sleep
  - Bruise

Import supports:
- JSON file only
- `Merge existing`
- `Replace existing`

Replace uses confirmation modal.

Safety notice on export page:
- `Your data is stored only on this device. Export regularly to avoid data loss.`

Current implementation notes:
- import/merge is store-by-store and generic
- no schema migration/version reconciliation beyond keeping old field compatibility in app code
- import assumes records are structurally usable if present

A reviewer should consider whether stronger schema validation or export versioning is now warranted.

### Print View

Current behavior:
- summary section at top
- full log below
- browser print/PDF flow
- back action returns to Export

Print summary currently includes:
- pee count
- note count
- average pee duration
- BM count
- weight count
- sleep count
- bruise count
- unique bruise regions

---

## Visual System And UI Decisions

### Palette

Current palette:
- Shadow Grey: `#272727`
- Sandy Clay: `#d4aa7d`
- Apricot Cream: `#efd09e`
- Beige: `#d2d8b3`
- Cool Steel: `#90a9b7`

Derived action colors:
- success/primary green family tuned to sit within the palette
- danger/red family tuned to sit within the palette

### Typography

Current typography split:
- headings and UI titles use a modern sans-serif stack
- durations and timer values use a monospaced typewriter-style stack

This is intentional.

Reasoning:
- headings should feel modern and clean
- time values should feel precise, mechanical, and easy to scan

### Layout

Key layout choices:
- single-column mobile-first layout
- large rounded panels
- fixed bottom navigation
- card-based content sections
- glass/paper hybrid surfaces
- no dark mode

### Modals And Sheets

The app avoids browser/system dialogs where possible.

Current overlay types:
- centered modal sheets for standard data-entry/edit flows
- confirmation modal for destructive actions
- dedicated bottom sheet for sleep timing edits

This distinction is intentional:
- normal edit modals are okay for moderate forms
- timing selection for sleep feels better as a sheet emerging from the bottom

### Interaction Rules

Current interaction philosophy:
- avoid requiring hover
- make segmented/toggle controls obvious and tappable
- keep important actions visually prominent
- keep secondary and destructive actions explicit rather than hidden

---

## Analytics And Data Interpretation Rules

These are important because another agent should not accidentally “fix” them without understanding the tradeoff.

### Pee

Current rules:
- total count includes timer-based pees and manual pee notes
- duration metrics only use entries with known duration
- unknown-time pee notes are excluded from date grouping and graphs
- tag frequency includes all pee-relevant records

### Weight

Current rules:
- all calculations normalize to kg internally
- default display is lb
- graph view can switch between lb and kg
- daily weight uses latest value recorded for that date

This “latest value per day” choice is deliberate but debatable.

### Sleep

Current rules:
- duration is persisted in minutes
- insight math converts to ms only for formatting consistency with the rest of the app
- daily sleep totals currently group by end date and sum per day

This is useful but should be reviewed. Some users may expect one sleep record per day rather than summed totals if they log naps.

### Bruise

Current rules:
- region uniqueness is `bodySide + regionKey`
- color tags are simple counts, not weighted by recency or severity

---

## Help / Instructions Page

The in-app Help page is intentionally short and user-facing, not technical.

Current content explains:
- how to use the timer
- how to add notes, bruises, BM, weight, and sleep entries
- that notes have type-specific quick selectors
- that weight supports lb/kg
- that sleep uses a timing card and bottom-sheet editor
- that insights include graphs and local-only storage

This page is not meant to replace `README.md` or this file.

---

## Deployment And Repo State

### Build And Runtime

Commands:
- `npm install`
- `npm run dev`
- `npm run build`

Build output:
- `dist/`

### GitHub Pages

Deployment workflow exists at:
- `.github/workflows/deploy-pages.yml`

Expected repo-side setup:
- GitHub Pages source should be `GitHub Actions`

### Current Ignored Artifacts

Should remain ignored:
- `node_modules/`
- `dist/`

---

## Known Weak Spots / Likely Review Targets

A reviewing agent should pay attention to these areas first.

### 1. `src/App.jsx` Is Too Large

This is the biggest structural issue.

Symptoms:
- many domains in one file
- mutation logic mixed with presentation
- helper functions and screen components tightly colocated
- harder to test incrementally

### 2. Schema Compatibility Is Managed In UI Logic

Examples:
- old pee-note records still handled alongside `noteEntries`
- old sleep shape still handled alongside new `startTime/endTime/durationMinutes`

This is pragmatic but fragile.

### 3. Import Validation Is Soft

The import path accepts shape-compatible arrays but does not deeply validate records.

Risk:
- malformed imported data can leak into UI assumptions

### 4. Insights Semantics Need Product Review

Open questions:
- should pee total count include manual `pee` notes with unknown time?
- should sleep group by start date, end date, or “night bucket”?
- should weight insights use latest-per-day, average-per-day, or every reading?

### 5. Graph UX May Need Further Refinement

The graph modal is much better than the earlier bar view, but review should still check:
- horizontal density on long time ranges
- whether date chips scale well with many points
- whether a scrub interaction would be better than chips

### 6. No Automated Test Coverage

High-value candidates:
- pee stats inclusion/exclusion rules
- weight unit normalization
- sleep summary/time math
- import merge rules
- legacy compatibility helpers

---

## Critique Prompts For Another Agent

If another agent is reviewing this repo, these are the most useful questions to answer:

1. Is the data model now coherent enough, or is it time for a migration step to eliminate legacy record patterns?
2. Which parts of `src/App.jsx` should be split first for maximum maintainability with minimal churn?
3. Are the analytics semantics correct for real-world use, especially for manual pee notes, weight normalization, and sleep grouping?
4. Are there UI/UX inconsistencies between note, BM, weight, and sleep modals that should be standardized?
5. Does the current graph modal scale to large datasets on mobile, or should there be aggregation/downsampling?
6. Is IndexedDB being used safely enough, or should schema validation/version tagging be added to exports/imports?
7. Which interactions are still more cumbersome than they need to be on iPhone Safari?

---

## Non-Goals / Not Yet Implemented

Still absent:
- backend
- authentication
- cloud sync
- account model
- photo uploads
- PWA install flow
- passcode lock
- automated tests
- formal schema validation layer

These are not accidental omissions. Most were explicitly deferred to keep the app local-first and fast.

---

## Bottom Line

PB²Track is not a toy mock anymore. It is a functioning local-first tracker with real UX decisions, compatibility constraints, and domain-specific behavior.

Any critique or improvement proposal should assume:
- local-first is non-negotiable unless explicitly changed
- explicit save is preferred over autosave
- mobile tap ergonomics matter more than desktop optimization
- preserving existing local user data matters
- simplification is welcome, but not if it discards meaningful tracking nuance
