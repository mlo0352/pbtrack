import { useEffect, useMemo, useState } from 'react';
import { clearStore, deleteEntry, getAllData, saveEntries, saveEntry } from './db';

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'log', label: 'Log' },
  { id: 'insights', label: 'Insights' },
  { id: 'export', label: 'Export' },
];

const PEE_TAGS = ['dark', 'cloudy', 'blood', 'burning', 'pain', 'weak stream', 'urgent', 'other'];
const BRUISE_COLORS = ['red', 'purple', 'blue', 'green', 'yellow', 'brown', 'fading'];
const BRUISE_SIZES = ['small', 'medium', 'large'];
const BRUISE_STATUS = ['improving', 'stable', 'worsening'];

const BODY_REGIONS = [
  {
    key: 'head',
    label: 'Head',
    regionType: 'head',
    limbType: '',
    render: () => <circle cx="100" cy="28" r="18" />,
  },
  {
    key: 'torso',
    label: 'Torso',
    regionType: 'torso',
    limbType: '',
    render: () => <rect x="76" y="52" width="48" height="62" rx="20" />,
  },
  {
    key: 'left-arm',
    label: 'Left arm',
    regionType: 'limb',
    limbType: 'arm',
    render: () => <rect x="42" y="58" width="20" height="54" rx="10" />,
  },
  {
    key: 'right-arm',
    label: 'Right arm',
    regionType: 'limb',
    limbType: 'arm',
    render: () => <rect x="138" y="58" width="20" height="54" rx="10" />,
  },
  {
    key: 'left-hand',
    label: 'Left hand',
    regionType: 'limb',
    limbType: 'hand',
    render: () => <rect x="34" y="112" width="18" height="22" rx="9" />,
  },
  {
    key: 'right-hand',
    label: 'Right hand',
    regionType: 'limb',
    limbType: 'hand',
    render: () => <rect x="148" y="112" width="18" height="22" rx="9" />,
  },
  {
    key: 'left-leg',
    label: 'Left leg',
    regionType: 'limb',
    limbType: 'leg',
    render: () => <rect x="78" y="118" width="18" height="72" rx="10" />,
  },
  {
    key: 'right-leg',
    label: 'Right leg',
    regionType: 'limb',
    limbType: 'leg',
    render: () => <rect x="104" y="118" width="18" height="72" rx="10" />,
  },
  {
    key: 'left-foot',
    label: 'Left foot',
    regionType: 'limb',
    limbType: 'foot',
    render: () => <rect x="68" y="188" width="28" height="12" rx="6" />,
  },
  {
    key: 'right-foot',
    label: 'Right foot',
    regionType: 'limb',
    limbType: 'foot',
    render: () => <rect x="104" y="188" width="28" height="12" rx="6" />,
  },
];

const EMPTY_BRUISE_FORM = {
  id: '',
  createdAt: '',
  observedAt: '',
  bodySide: 'front',
  regionKey: '',
  regionType: '',
  limbType: '',
  size: 'small',
  colorTags: [],
  tenderness: false,
  causeKnown: false,
  causeDescription: '',
  status: 'stable',
  note: '',
};

function App() {
  const [view, setView] = useState(getHashView());
  const [peeEntries, setPeeEntries] = useState([]);
  const [bruiseEntries, setBruiseEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [historyFilters, setHistoryFilters] = useState({
    type: 'all',
    range: 'all',
    start: '',
    end: '',
  });
  const [peeModal, setPeeModal] = useState({ open: false, mode: 'note-create', entry: null });
  const [bruiseForm, setBruiseForm] = useState(EMPTY_BRUISE_FORM);
  const [bruiseMode, setBruiseMode] = useState('create');
  const [importPayload, setImportPayload] = useState(null);
  const [importFeedback, setImportFeedback] = useState('');
  const [bruiseError, setBruiseError] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [graphModal, setGraphModal] = useState({ open: false, range: 'all', selectedDate: '' });

  useEffect(() => {
    async function load() {
      const data = await getAllData();
      setPeeEntries(sortByUpdatedAt(data.peeEntries));
      setBruiseEntries(sortByUpdatedAt(data.bruiseEntries));
      setActiveTimer(data.peeEntries.find((entry) => entry.status === 'active') || null);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    const handleHashChange = () => setView(getHashView());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const savedPeeEntries = useMemo(
    () => sortByUpdatedAt(peeEntries.filter((entry) => entry.status === 'saved')),
    [peeEntries]
  );

  const timerPeeEntries = useMemo(
    () => savedPeeEntries.filter((entry) => entry.entryMode !== 'note'),
    [savedPeeEntries]
  );

  const combinedLogEntries = useMemo(() => {
    const peeLog = savedPeeEntries.map((entry) => ({
      ...entry,
      logType: 'pee',
      logTimestamp: entry.endTime || entry.startTime || entry.createdAt,
    }));

    const bruiseLog = bruiseEntries.map((entry) => ({
      ...entry,
      logType: 'bruise',
      logTimestamp: entry.observedAt || entry.createdAt,
    }));

    return [...peeLog, ...bruiseLog].sort(
      (a, b) => new Date(b.logTimestamp).getTime() - new Date(a.logTimestamp).getTime()
    );
  }, [savedPeeEntries, bruiseEntries]);

  const filteredLogEntries = useMemo(
    () => filterLogEntries(combinedLogEntries, historyFilters),
    [combinedLogEntries, historyFilters]
  );

  const peeStats = useMemo(() => buildPeeStats(timerPeeEntries), [timerPeeEntries]);
  const bruiseStats = useMemo(() => buildBruiseStats(bruiseEntries), [bruiseEntries]);

  async function syncPeeEntries(nextEntries) {
    const sortedEntries = sortByUpdatedAt(nextEntries);
    setPeeEntries(sortedEntries);
    setActiveTimer(sortedEntries.find((entry) => entry.status === 'active') || null);
  }

  function navigate(nextView) {
    window.location.hash = nextView === 'home' ? '' : nextView;
  }

  async function handleStartTimer() {
    if (activeTimer) {
      return;
    }

    const timestamp = new Date().toISOString();
    const draft = {
      id: makeId('pee'),
      createdAt: timestamp,
      updatedAt: timestamp,
      entryType: 'pee',
      entryMode: 'timer',
      status: 'active',
      startTime: timestamp,
      endTime: '',
      duration: 0,
      tags: [],
      freeTextNote: '',
    };

    await saveEntry('peeEntries', draft);
    await syncPeeEntries([...peeEntries, draft]);
  }

  function openConfirmModal(config) {
    setConfirmModal(config);
  }

  function closeConfirmModal() {
    setConfirmModal(null);
  }

  function handleCancelTimer() {
    if (!activeTimer) {
      return;
    }

    openConfirmModal({
      title: 'Cancel active timer?',
      message: 'The running timer draft will be removed and cannot be recovered.',
      confirmLabel: 'Cancel timer',
      tone: 'danger',
      action: { type: 'cancel-timer', id: activeTimer.id },
    });
  }

  function handleStopTimer() {
    if (!activeTimer) {
      return;
    }

    const endTime = new Date().toISOString();
    setPeeModal({
      open: true,
      mode: 'timer-stop',
      entry: {
        ...activeTimer,
        endTime,
        duration: Math.max(0, new Date(endTime).getTime() - new Date(activeTimer.startTime).getTime()),
      },
    });
  }

  function openNoteModal() {
    const timestamp = new Date().toISOString();
    setPeeModal({
      open: true,
      mode: 'note-create',
      entry: {
        id: '',
        createdAt: timestamp,
        updatedAt: timestamp,
        entryType: 'pee',
        entryMode: 'note',
        status: 'saved',
        startTime: timestamp,
        endTime: timestamp,
        duration: 0,
        tags: [],
        freeTextNote: '',
      },
    });
  }

  function closePeeModal() {
    setPeeModal({ open: false, mode: 'note-create', entry: null });
  }

  async function handleSavePeeEntry(formEntry) {
    const timestamp = new Date().toISOString();
    const startTime = formEntry.startTime || timestamp;
    const endTime = formEntry.endTime || startTime;
    const duration = Math.max(0, new Date(endTime).getTime() - new Date(startTime).getTime());

    const normalized = {
      ...formEntry,
      startTime,
      endTime,
      duration,
      updatedAt: timestamp,
      entryType: 'pee',
      status: 'saved',
    };

    let nextEntries;
    let entryToPersist;

    if (peeModal.mode === 'timer-stop') {
      nextEntries = peeEntries.map((entry) =>
        entry.id === normalized.id
          ? { ...normalized, createdAt: entry.createdAt, entryMode: 'timer' }
          : entry
      );
      entryToPersist = nextEntries.find((entry) => entry.id === normalized.id);
    } else if (peeModal.mode === 'edit') {
      nextEntries = peeEntries.map((entry) => (entry.id === normalized.id ? { ...entry, ...normalized } : entry));
      entryToPersist = nextEntries.find((entry) => entry.id === normalized.id);
    } else {
      entryToPersist = {
        ...normalized,
        id: makeId('pee'),
        createdAt: timestamp,
        entryMode: normalized.entryMode || 'note',
      };
      nextEntries = [...peeEntries, entryToPersist];
    }

    await saveEntry('peeEntries', entryToPersist);
    await syncPeeEntries(nextEntries);
    closePeeModal();
  }

  async function handleDiscardPeeDraft(id) {
    await deleteEntry('peeEntries', id);
    await syncPeeEntries(peeEntries.filter((entry) => entry.id !== id));
    closePeeModal();
  }

  function openBruiseCreate() {
    setBruiseMode('create');
    setBruiseForm({ ...EMPTY_BRUISE_FORM, observedAt: new Date().toISOString() });
    navigate('bruise');
  }

  function openBruiseEdit(entry) {
    setBruiseMode('edit');
    setBruiseForm({ ...EMPTY_BRUISE_FORM, ...entry });
    navigate('bruise');
  }

  async function handleSaveBruise() {
    if (!bruiseForm.regionKey) {
      setBruiseError('Select a body region before saving.');
      return;
    }

    setBruiseError('');
    const timestamp = new Date().toISOString();
    const entry = {
      ...bruiseForm,
      id: bruiseMode === 'edit' ? bruiseForm.id : makeId('bruise'),
      createdAt: bruiseMode === 'edit' ? bruiseForm.createdAt : timestamp,
      updatedAt: timestamp,
      observedAt: bruiseForm.observedAt || timestamp,
      entryType: 'bruise',
    };

    await saveEntry('bruiseEntries', entry);
    const nextEntries =
      bruiseMode === 'edit'
        ? bruiseEntries.map((current) => (current.id === entry.id ? entry : current))
        : [...bruiseEntries, entry];

    setBruiseEntries(sortByUpdatedAt(nextEntries));
    setBruiseForm(EMPTY_BRUISE_FORM);
    setBruiseMode('create');
    navigate('log');
  }

  function handleCancelBruise() {
    setBruiseError('');
    setBruiseForm(EMPTY_BRUISE_FORM);
    setBruiseMode('create');
    navigate('home');
  }

  function handleEditLogItem(item) {
    if (item.logType === 'pee') {
      setPeeModal({ open: true, mode: 'edit', entry: item });
      return;
    }

    openBruiseEdit(item);
  }

  function handleDeleteLogItem(item) {
    openConfirmModal({
      title: `Delete ${item.logType} entry?`,
      message: 'This removes the saved entry from local storage on this device.',
      confirmLabel: 'Delete entry',
      tone: 'danger',
      action: { type: 'delete-log-entry', entry: item },
    });
  }

  function handleBodyRegionSelect(region) {
    setBruiseError('');
    setBruiseForm((current) => ({
      ...current,
      regionKey: region.key,
      regionType: region.regionType,
      limbType: region.limbType,
    }));
  }

  async function handleDownloadJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      peeEntries,
      bruiseEntries,
    };

    downloadFile(
      `pee-bruise-backup-${dateStamp()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }

  function handleDownloadCsv(storeName) {
    const rows = storeName === 'peeEntries' ? savedPeeEntries : bruiseEntries;
    const csv = convertToCsv(rows, storeName);
    const fileName =
      storeName === 'peeEntries'
        ? `pee-entries-${dateStamp()}.csv`
        : `bruise-entries-${dateStamp()}.csv`;
    downloadFile(fileName, csv, 'text/csv;charset=utf-8;');
  }

  async function handleImportFile(event) {
    const [file] = event.target.files || [];
    if (!file) {
      return;
    }

    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText);
      const nextPeeEntries = Array.isArray(parsed.peeEntries) ? parsed.peeEntries : [];
      const nextBruiseEntries = Array.isArray(parsed.bruiseEntries) ? parsed.bruiseEntries : [];
      setImportPayload({ peeEntries: nextPeeEntries, bruiseEntries: nextBruiseEntries });
      setImportFeedback(
        `Loaded ${nextPeeEntries.length} pee entries and ${nextBruiseEntries.length} bruise entries.`
      );
    } catch {
      setImportPayload(null);
      setImportFeedback('Import failed. Choose a valid backup JSON file.');
    }
  }

  async function handleImport(mode) {
    if (!importPayload) {
      return;
    }

    if (mode === 'replace') {
      openConfirmModal({
        title: 'Replace existing local data?',
        message: 'All current pee and bruise entries on this device will be replaced by the imported backup.',
        confirmLabel: 'Replace data',
        tone: 'danger',
        action: { type: 'replace-import' },
      });
      return;
    }

    let nextPeeEntries = [];
    let nextBruiseEntries = [];

    if (mode === 'replace-confirmed') {
      await clearStore('peeEntries');
      await clearStore('bruiseEntries');
      nextPeeEntries = sortByUpdatedAt(importPayload.peeEntries);
      nextBruiseEntries = sortByUpdatedAt(importPayload.bruiseEntries);
    } else {
      nextPeeEntries = mergeEntries(peeEntries, importPayload.peeEntries);
      nextBruiseEntries = mergeEntries(bruiseEntries, importPayload.bruiseEntries);
    }

    if (nextPeeEntries.length > 0) {
      await saveEntries('peeEntries', nextPeeEntries);
    }

    if (nextBruiseEntries.length > 0) {
      await saveEntries('bruiseEntries', nextBruiseEntries);
    }

    await syncPeeEntries(nextPeeEntries);
    setBruiseEntries(nextBruiseEntries);
    setImportFeedback(mode === 'replace-confirmed' ? 'Local data replaced.' : 'Imported backup merged.');
  }

  async function handleConfirmAction() {
    if (!confirmModal?.action) {
      return;
    }

    const { action } = confirmModal;
    closeConfirmModal();

    if (action.type === 'cancel-timer') {
      await deleteEntry('peeEntries', action.id);
      await syncPeeEntries(peeEntries.filter((entry) => entry.id !== action.id));
      return;
    }

    if (action.type === 'delete-log-entry') {
      const storeName = action.entry.logType === 'pee' ? 'peeEntries' : 'bruiseEntries';
      await deleteEntry(storeName, action.entry.id);

      if (storeName === 'peeEntries') {
        await syncPeeEntries(peeEntries.filter((entry) => entry.id !== action.entry.id));
      } else {
        setBruiseEntries(bruiseEntries.filter((entry) => entry.id !== action.entry.id));
      }

      return;
    }

    if (action.type === 'replace-import') {
      await handleImport('replace-confirmed');
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="loading-card">
          <p>Loading local data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${view === 'print' ? 'print-shell' : ''}`}>
      {view !== 'print' && (
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first log</p>
            <h1>Pee & Bruise Tracker</h1>
          </div>
          <p className="topbar-note">Stored only on this device.</p>
        </header>
      )}

      <main className={view === 'print' ? 'print-layout' : 'content-stack'}>
        {view === 'home' && (
          <HomeView
            activeTimer={activeTimer}
            now={now}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onCancelTimer={handleCancelTimer}
            onOpenNote={openNoteModal}
            onOpenBruise={openBruiseCreate}
            onNavigate={navigate}
            recentEntries={combinedLogEntries.slice(0, 4)}
          />
        )}
        {view === 'bruise' && (
          <BruiseView
            form={bruiseForm}
            error={bruiseError}
            mode={bruiseMode}
            onChange={setBruiseForm}
            onBodyRegionSelect={handleBodyRegionSelect}
            onSave={handleSaveBruise}
            onCancel={handleCancelBruise}
          />
        )}
        {view === 'log' && (
          <LogView
            filters={historyFilters}
            entries={filteredLogEntries}
            onChangeFilters={setHistoryFilters}
            onEdit={handleEditLogItem}
            onDelete={handleDeleteLogItem}
          />
        )}
        {view === 'insights' && (
          <InsightsView
            peeStats={peeStats}
            bruiseStats={bruiseStats}
            onOpenPeeGraph={(selectedDate = '') =>
              setGraphModal({ open: true, range: 'all', selectedDate })
            }
          />
        )}
        {view === 'export' && (
          <ExportView
            peeCount={savedPeeEntries.length}
            bruiseCount={bruiseEntries.length}
            importFeedback={importFeedback}
            importPayload={importPayload}
            onDownloadJson={handleDownloadJson}
            onDownloadCsv={handleDownloadCsv}
            onImportFile={handleImportFile}
            onImport={handleImport}
            onOpenPrint={() => navigate('print')}
          />
        )}
        {view === 'print' && (
          <PrintView
            peeStats={peeStats}
            bruiseStats={bruiseStats}
            entries={combinedLogEntries}
            onBack={() => navigate('export')}
          />
        )}
      </main>

      {view !== 'print' && (
        <nav className="bottom-nav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={view === item.id ? 'nav-button active' : 'nav-button'}
              onClick={() => navigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      )}

      {peeModal.open && (
        <PeeEntryModal
          modal={peeModal}
          onClose={closePeeModal}
          onSave={handleSavePeeEntry}
          onDiscard={handleDiscardPeeDraft}
        />
      )}

      {confirmModal && (
        <ConfirmModal
          modal={confirmModal}
          onClose={closeConfirmModal}
          onConfirm={handleConfirmAction}
        />
      )}

      {graphModal.open && (
        <PeeGraphModal
          entriesByDay={peeStats.entriesByDay}
          modal={graphModal}
          onClose={() => setGraphModal({ open: false, range: 'all', selectedDate: '' })}
          onChange={(nextModal) => setGraphModal((current) => ({ ...current, ...nextModal }))}
        />
      )}
    </div>
  );
}

function HomeView({
  activeTimer,
  now,
  onStartTimer,
  onStopTimer,
  onCancelTimer,
  onOpenNote,
  onOpenBruise,
  onNavigate,
  recentEntries,
}) {
  const elapsed = activeTimer ? now - new Date(activeTimer.startTime).getTime() : 0;

  return (
    <section className="content-stack">
      <section className="hero-panel">
        <p className="eyebrow">Fast entry flow</p>
        <h2>{activeTimer ? 'Timer running' : 'Ready for the next entry'}</h2>
        <p className="hero-copy">
          {activeTimer
            ? 'Stop the timer to review symptoms and save the entry explicitly.'
            : 'Two taps covers the main flow. Everything stays local to this phone.'}
        </p>
        <button
          type="button"
          className={activeTimer ? 'timer-button timer-button-stop' : 'timer-button'}
          onClick={activeTimer ? onStopTimer : onStartTimer}
        >
          {activeTimer ? 'Stop Timer' : 'Start Timer'}
        </button>
        <div className="timer-readout">
          <strong>{formatDuration(elapsed)}</strong>
          <span>{activeTimer ? 'Timer running' : 'No active timer'}</span>
        </div>
        {activeTimer && (
          <button type="button" className="ghost-button" onClick={onCancelTimer}>
            Cancel
          </button>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Quick actions</h3>
          <p>Large tap targets for the most common paths.</p>
        </div>
        <div className="action-grid">
          <button type="button" className="action-card" onClick={onOpenNote}>
            <span className="action-title">Add Note</span>
            <span className="action-copy">Save a note-only entry.</span>
          </button>
          <button type="button" className="action-card" onClick={onOpenBruise}>
            <span className="action-title">Add Bruise</span>
            <span className="action-copy">Mark a body region and details.</span>
          </button>
          <button type="button" className="action-card" onClick={() => onNavigate('log')}>
            <span className="action-title">View Log</span>
            <span className="action-copy">Review, filter, and edit entries.</span>
          </button>
          <button type="button" className="action-card" onClick={() => onNavigate('insights')}>
            <span className="action-title">Insights</span>
            <span className="action-copy">See counts, patterns, and trends.</span>
          </button>
          <button type="button" className="action-card" onClick={() => onNavigate('export')}>
            <span className="action-title">Export</span>
            <span className="action-copy">Back up the device data now.</span>
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Recent activity</h3>
          <p>Use the log view for edit and delete actions.</p>
        </div>
        {recentEntries.length === 0 ? (
          <p className="empty-state">No entries yet.</p>
        ) : (
          <div className="entry-list">
            {recentEntries.map((entry) => (
              <article className="entry-card compact" key={`${entry.logType}-${entry.id}`}>
                <div>
                  <p className="entry-title">{entryTitle(entry)}</p>
                  <p className="entry-meta">{formatDateTime(entry.logTimestamp)}</p>
                </div>
                <p className="entry-summary">{entrySummary(entry)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function BruiseView({ form, error, mode, onChange, onBodyRegionSelect, onSave, onCancel }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="section-heading">
          <h2>{mode === 'edit' ? 'Edit bruise entry' : 'New bruise entry'}</h2>
          <p>Choose a body side, tap a region, then save explicitly.</p>
        </div>

        <label className="field">
          <span>Observed at</span>
          <input
            type="datetime-local"
            value={toInputDateTime(form.observedAt)}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                observedAt: fromInputDateTime(event.target.value),
              }))
            }
          />
        </label>

        <div className="field">
          <span>Body side</span>
          <div className="segmented">
            {['front', 'back'].map((side) => (
              <button
                key={side}
                type="button"
                className={form.bodySide === side ? 'segment active' : 'segment'}
                onClick={() => onChange((current) => ({ ...current, bodySide: side }))}
              >
                {capitalize(side)}
              </button>
            ))}
          </div>
        </div>

        <BodyMap
          bodySide={form.bodySide}
          selectedKey={form.regionKey}
          onSelect={onBodyRegionSelect}
        />

        <div className="field">
          <span>Selected region</span>
          <p className="selection-pill">
            {form.regionKey ? `${capitalize(form.bodySide)} ${displayRegion(form)}` : 'No region selected'}
          </p>
          {error && <p className="form-error">{error}</p>}
        </div>

        <div className="field">
          <span>Size</span>
          <div className="segmented wrap">
            {BRUISE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={form.size === size ? 'segment active' : 'segment'}
                onClick={() => onChange((current) => ({ ...current, size }))}
              >
                {capitalize(size)}
              </button>
            ))}
          </div>
        </div>

        <TagSelector
          label="Color tags"
          options={BRUISE_COLORS}
          selected={form.colorTags}
          onToggle={(color) =>
            onChange((current) => ({
              ...current,
              colorTags: toggleTag(current.colorTags, color),
            }))
          }
        />

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.tenderness}
            onChange={(event) =>
              onChange((current) => ({ ...current, tenderness: event.target.checked }))
            }
          />
          <span>Pain or tenderness</span>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.causeKnown}
            onChange={(event) =>
              onChange((current) => ({
                ...current,
                causeKnown: event.target.checked,
                causeDescription: event.target.checked ? current.causeDescription : '',
              }))
            }
          />
          <span>Cause known</span>
        </label>

        {form.causeKnown && (
          <label className="field">
            <span>Cause description</span>
            <textarea
              rows="3"
              value={form.causeDescription}
              onChange={(event) =>
                onChange((current) => ({ ...current, causeDescription: event.target.value }))
              }
            />
          </label>
        )}

        <div className="field">
          <span>Status</span>
          <div className="segmented wrap">
            {BRUISE_STATUS.map((status) => (
              <button
                key={status}
                type="button"
                className={form.status === status ? 'segment active' : 'segment'}
                onClick={() => onChange((current) => ({ ...current, status }))}
              >
                {capitalize(status)}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>Note</span>
          <textarea
            rows="4"
            value={form.note}
            onChange={(event) => onChange((current) => ({ ...current, note: event.target.value }))}
          />
        </label>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            Save
          </button>
        </div>
      </section>
    </section>
  );
}

function BodyMap({ bodySide, selectedKey, onSelect }) {
  return (
    <div className="body-map">
      <div className="body-map-header">
        <strong>{capitalize(bodySide)} view</strong>
        <span>Tap a highlighted zone.</span>
      </div>
      <svg viewBox="0 0 200 210" role="img" aria-label={`${bodySide} body map`}>
        <defs>
          <linearGradient id="body-map-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={bodySide === 'front' ? '#efd09e' : '#d2d8b3'} />
            <stop offset="100%" stopColor={bodySide === 'front' ? '#d4aa7d' : '#90a9b7'} />
          </linearGradient>
        </defs>
        <g className="body-map-shapes">
          {BODY_REGIONS.map((region) => (
            <g
              key={`${bodySide}-${region.key}`}
              className={selectedKey === region.key ? 'body-region selected' : 'body-region'}
              onClick={() => onSelect(region)}
            >
              {region.render()}
            </g>
          ))}
        </g>
      </svg>
      <div className="region-list">
        {BODY_REGIONS.map((region) => (
          <button
            key={region.key}
            type="button"
            className={selectedKey === region.key ? 'region-chip active' : 'region-chip'}
            onClick={() => onSelect(region)}
          >
            {region.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LogView({ filters, entries, onChangeFilters, onEdit, onDelete }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="section-heading">
          <h2>History</h2>
          <p>Filter by entry type or time range, then edit or delete from each card.</p>
        </div>

        <div className="filter-stack">
          <div className="field">
            <span>View</span>
            <div className="segmented wrap">
              {[
                ['all', 'All'],
                ['pee', 'Pee only'],
                ['bruise', 'Bruise only'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filters.type === value ? 'segment active' : 'segment'}
                  onClick={() => onChangeFilters((current) => ({ ...current, type: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Range</span>
            <div className="segmented wrap">
              {[
                ['all', 'All'],
                ['daily', 'Daily'],
                ['weekly', 'Weekly'],
                ['monthly', 'Monthly'],
                ['custom', 'Custom'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={filters.range === value ? 'segment active' : 'segment'}
                  onClick={() => onChangeFilters((current) => ({ ...current, range: value }))}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filters.range === 'custom' && (
            <div className="date-range">
              <label className="field">
                <span>Start date</span>
                <input
                  type="date"
                  value={filters.start}
                  onChange={(event) =>
                    onChangeFilters((current) => ({ ...current, start: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>End date</span>
                <input
                  type="date"
                  value={filters.end}
                  onChange={(event) =>
                    onChangeFilters((current) => ({ ...current, end: event.target.value }))
                  }
                />
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="entry-list">
        {entries.length === 0 ? (
          <div className="panel">
            <p className="empty-state">No entries match the current filters.</p>
          </div>
        ) : (
          entries.map((entry) => (
            <article key={`${entry.logType}-${entry.id}`} className="entry-card interactive">
              <div className="entry-card-header">
                <div>
                  <p className="entry-title">{entryTitle(entry)}</p>
                  <p className="entry-meta">{formatDateTime(entry.logTimestamp)}</p>
                </div>
                <span className="entry-badge">{entry.logType === 'pee' ? 'Pee' : 'Bruise'}</span>
              </div>
              <p className="entry-summary">{entrySummary(entry)}</p>
              {entry.logType === 'pee' && entry.tags?.length > 0 && (
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.logType === 'bruise' && entry.colorTags?.length > 0 && (
                <div className="tag-row">
                  {entry.colorTags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="entry-actions">
                <button type="button" className="inline-action" onClick={() => onEdit(entry)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="inline-action danger"
                  onClick={() => onDelete(entry)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}

function InsightsView({ peeStats, bruiseStats, onOpenPeeGraph }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="section-heading">
          <h2>Pee insights</h2>
          <p>Saved timer entries only. Open the day graph for all-time or specific-date views.</p>
        </div>
        {peeStats.totalCount < 1 ? (
          <p className="empty-state">Not enough data yet</p>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard label="Total count" value={String(peeStats.totalCount)} />
              <StatCard label="Average duration" value={formatDuration(peeStats.averageDuration)} />
              <StatCard label="Median duration" value={formatDuration(peeStats.medianDuration)} />
              <StatCard label="Shortest" value={formatDuration(peeStats.shortest)} />
              <StatCard label="Longest" value={formatDuration(peeStats.longest)} />
              <StatCard label="Frequency/day" value={peeStats.frequencyPerDay.toFixed(1)} />
            </div>
            <MetricList title="Tag frequency" data={peeStats.tagFrequency} emptyLabel="No pee tags yet." />
            <MetricList
              title="Entries by day"
              data={peeStats.entriesByDay}
              emptyLabel="No daily counts yet."
              actionLabel="Open graph"
              onAction={() => onOpenPeeGraph('')}
              onItemClick={(date) => onOpenPeeGraph(date)}
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Bruise insights</h2>
          <p>Counts by region, color, and current status.</p>
        </div>
        {bruiseStats.totalCount < 1 ? (
          <p className="empty-state">Not enough data yet</p>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard label="Total count" value={String(bruiseStats.totalCount)} />
              <StatCard label="Unique regions" value={String(bruiseStats.uniqueRegions)} />
              <StatCard label="Improving" value={String(bruiseStats.statusCounts.improving || 0)} />
              <StatCard label="Stable" value={String(bruiseStats.statusCounts.stable || 0)} />
              <StatCard label="Worsening" value={String(bruiseStats.statusCounts.worsening || 0)} />
            </div>
            <MetricList title="Region distribution" data={bruiseStats.regionDistribution} emptyLabel="No region data yet." />
            <MetricList title="Color frequency" data={bruiseStats.colorFrequency} emptyLabel="No bruise color tags yet." />
            <MetricList title="Frequency over time" data={bruiseStats.frequencyOverTime} emptyLabel="No time distribution yet." />
          </>
        )}
      </section>
    </section>
  );
}

function ExportView({
  peeCount,
  bruiseCount,
  importFeedback,
  importPayload,
  onDownloadJson,
  onDownloadCsv,
  onImportFile,
  onImport,
  onOpenPrint,
}) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="section-heading">
          <h2>Export & import</h2>
          <p>Your data is stored only on this device. Export regularly to avoid data loss.</p>
        </div>

        <div className="stats-grid">
          <StatCard label="Saved pee entries" value={String(peeCount)} />
          <StatCard label="Bruise entries" value={String(bruiseCount)} />
        </div>

        <div className="button-stack">
          <button type="button" className="primary-button" onClick={onDownloadJson}>
            Export JSON backup
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('peeEntries')}>
            Export pee CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('bruiseEntries')}>
            Export bruise CSV
          </button>
          <button type="button" className="ghost-button strong" onClick={onOpenPrint}>
            Open printable report
          </button>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <h3>Import backup</h3>
          <p>Upload a previously exported JSON backup, then merge or replace.</p>
        </div>

        <label className="field">
          <span>Backup file</span>
          <input type="file" accept="application/json,.json" onChange={onImportFile} />
        </label>

        {importFeedback && <p className="import-feedback">{importFeedback}</p>}

        <div className="button-row">
          <button
            type="button"
            className="secondary-button"
            onClick={() => onImport('merge')}
            disabled={!importPayload}
          >
            Merge existing
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onImport('replace')}
            disabled={!importPayload}
          >
            Replace existing
          </button>
        </div>
      </section>
    </section>
  );
}

function PrintView({ peeStats, bruiseStats, entries, onBack }) {
  return (
    <section className="print-report">
      <div className="print-toolbar">
        <button type="button" className="secondary-button" onClick={onBack}>
          Back
        </button>
        <button type="button" className="primary-button" onClick={() => window.print()}>
          Print or Save PDF
        </button>
      </div>

      <header className="print-header panel">
        <p className="eyebrow">Printable report</p>
        <h1>Pee & Bruise Tracker Summary</h1>
        <p>{formatDateTime(new Date().toISOString())}</p>
      </header>

      <section className="print-section">
        <h2>Summary</h2>
        <div className="stats-grid">
          <StatCard label="Pee entries" value={String(peeStats.totalCount)} />
          <StatCard label="Avg pee duration" value={formatDuration(peeStats.averageDuration || 0)} />
          <StatCard label="Bruise entries" value={String(bruiseStats.totalCount)} />
          <StatCard label="Unique bruise regions" value={String(bruiseStats.uniqueRegions || 0)} />
        </div>
      </section>

      <section className="print-section">
        <h2>Full log</h2>
        <div className="entry-list">
          {entries.length === 0 ? (
            <p className="empty-state">No entries available.</p>
          ) : (
            entries.map((entry) => (
              <article className="entry-card" key={`${entry.logType}-${entry.id}`}>
                <div className="entry-card-header">
                  <div>
                    <p className="entry-title">{entryTitle(entry)}</p>
                    <p className="entry-meta">{formatDateTime(entry.logTimestamp)}</p>
                  </div>
                  <span className="entry-badge">{entry.logType === 'pee' ? 'Pee' : 'Bruise'}</span>
                </div>
                <p className="entry-summary">{entrySummary(entry)}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </section>
  );
}

function PeeEntryModal({ modal, onClose, onSave, onDiscard }) {
  const [form, setForm] = useState(modal.entry);

  useEffect(() => {
    setForm(modal.entry);
  }, [modal.entry]);

  useEffect(() => {
    if (!form?.startTime || !form?.endTime) {
      return;
    }

    const duration = Math.max(0, new Date(form.endTime).getTime() - new Date(form.startTime).getTime());
    if (duration !== form.duration) {
      setForm((current) => ({ ...current, duration }));
    }
  }, [form?.startTime, form?.endTime, form?.duration]);

  if (!form) {
    return null;
  }

  const isTimerStop = modal.mode === 'timer-stop';
  const heading = modal.mode === 'edit' ? 'Edit entry' : isTimerStop ? 'Save pee entry' : 'Add note';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="section-heading">
          <h2>{heading}</h2>
          <p>{isTimerStop ? 'Review the timer details before saving.' : 'Changes are stored only after Save.'}</p>
        </div>

        <label className="field">
          <span>Start time</span>
          <input
            type="datetime-local"
            value={toInputDateTime(form.startTime)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                startTime: fromInputDateTime(event.target.value),
              }))
            }
          />
        </label>

        <label className="field">
          <span>End time</span>
          <input
            type="datetime-local"
            value={toInputDateTime(form.endTime)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                endTime: fromInputDateTime(event.target.value),
              }))
            }
          />
        </label>

        <div className="field">
          <span>Duration</span>
          <p className="selection-pill">{formatDuration(form.duration)}</p>
        </div>

        <TagSelector
          label="Tags"
          options={PEE_TAGS}
          selected={form.tags}
          onToggle={(tag) =>
            setForm((current) => ({
              ...current,
              tags: toggleTag(current.tags, tag),
            }))
          }
        />

        <label className="field">
          <span>Note</span>
          <textarea
            rows="4"
            value={form.freeTextNote}
            onChange={(event) =>
              setForm((current) => ({ ...current, freeTextNote: event.target.value }))
            }
          />
        </label>

        <div className="button-row">
          {isTimerStop ? (
            <button type="button" className="secondary-button" onClick={() => onDiscard(form.id)}>
              Discard
            </button>
          ) : (
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
          )}
          <button type="button" className="primary-button" onClick={() => onSave(form)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ modal, onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet modal-sheet-sm">
        <div className="section-heading">
          <h2>{modal.title}</h2>
          <p>{modal.message}</p>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>
            Back
          </button>
          <button
            type="button"
            className={modal.tone === 'danger' ? 'danger-button' : 'primary-button'}
            onClick={onConfirm}
          >
            {modal.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function PeeGraphModal({ entriesByDay, modal, onClose, onChange }) {
  const sortedDates = Object.keys(entriesByDay).sort((a, b) => new Date(a) - new Date(b));
  const latestDate = sortedDates[sortedDates.length - 1] || '';
  const filterDate = modal.selectedDate || latestDate;
  const filteredEntries = sortedDates
    .filter((date) => {
      if (modal.range === '7') {
        return date >= shiftDate(latestDate, -6);
      }

      if (modal.range === '30') {
        return date >= shiftDate(latestDate, -29);
      }

      if (modal.range === 'specific') {
        return date === filterDate;
      }

      return true;
    })
    .map((date) => ({ date, count: entriesByDay[date] }));

  const maxCount = Math.max(...filteredEntries.map((item) => item.count), 1);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet chart-modal">
        <div className="section-heading">
          <h2>Pee entries by day</h2>
          <p>Default view is all-time. Switch range or jump to a specific date.</p>
        </div>

        <div className="segmented wrap">
          {[
            ['all', 'All-time'],
            ['30', '30 days'],
            ['7', '7 days'],
            ['specific', 'Specific date'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={modal.range === value ? 'segment active' : 'segment'}
              onClick={() =>
                onChange(
                  value === 'specific'
                    ? { range: value, selectedDate: modal.selectedDate || latestDate }
                    : { range: value }
                )
              }
            >
              {label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Specific date</span>
          <input
            type="date"
            value={modal.selectedDate}
            onChange={(event) =>
              onChange({
                selectedDate: event.target.value,
                range: event.target.value ? 'specific' : modal.range,
              })
            }
          />
        </label>

        <div className="chart-panel">
          {filteredEntries.length === 0 ? (
            <p className="empty-state">No pee entries are available for the selected range.</p>
          ) : (
            <div className="chart-bars" aria-label="Pee entries by day chart">
              {filteredEntries.map((item) => (
                <button
                  key={item.date}
                  type="button"
                  className={item.date === modal.selectedDate ? 'chart-bar active' : 'chart-bar'}
                  style={{ '--bar-height': `${Math.max(16, (item.count / maxCount) * 100)}%` }}
                  onClick={() => onChange({ selectedDate: item.date })}
                >
                  <span className="chart-bar-fill" />
                  <span className="chart-bar-value">{item.count}</span>
                  <span className="chart-bar-label">{shortDate(item.date)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {modal.selectedDate && (
          <div className="selection-pill detail-pill">
            {formatGraphDate(modal.selectedDate)}: {entriesByDay[modal.selectedDate] || 0} entries
          </div>
        )}

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TagSelector({ label, options, selected, onToggle }) {
  return (
    <div className="field">
      <span>{label}</span>
      <div className="tag-row">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={selected.includes(option) ? 'tag-button active' : 'tag-button'}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function MetricList({ title, data, emptyLabel, actionLabel, onAction, onItemClick }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]);

  return (
    <section className="metric-list">
      <div className="metric-list-header">
        <h3>{title}</h3>
        {actionLabel && onAction && (
          <button type="button" className="text-action" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="empty-state">{emptyLabel}</p>
      ) : (
        <ul>
          {entries.map(([label, value]) => (
            <li key={label}>
              {onItemClick ? (
                <button type="button" className="metric-item-button" onClick={() => onItemClick(label, value)}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </button>
              ) : (
                <>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function buildPeeStats(entries) {
  if (entries.length === 0) {
    return {
      totalCount: 0,
      averageDuration: 0,
      medianDuration: 0,
      shortest: 0,
      longest: 0,
      frequencyPerDay: 0,
      tagFrequency: {},
      entriesByDay: {},
    };
  }

  const durations = entries.map((entry) => Number(entry.duration) || 0).sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  const entriesByDay = groupCounts(entries, (entry) => formatDateOnly(entry.endTime || entry.startTime));
  const tagFrequency = {};

  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  return {
    totalCount: entries.length,
    averageDuration: Math.round(totalDuration / entries.length),
    medianDuration: median(durations),
    shortest: durations[0],
    longest: durations[durations.length - 1],
    frequencyPerDay: entries.length / Math.max(1, Object.keys(entriesByDay).length),
    tagFrequency,
    entriesByDay,
  };
}

function buildBruiseStats(entries) {
  const statusCounts = groupCounts(entries, (entry) => entry.status || 'stable');
  const regionDistribution = groupCounts(entries, (entry) => `${capitalize(entry.bodySide)} ${displayRegion(entry)}`);
  const frequencyOverTime = groupCounts(entries, (entry) => formatDateOnly(entry.observedAt || entry.createdAt));
  const colorFrequency = {};

  entries.forEach((entry) => {
    (entry.colorTags || []).forEach((tag) => {
      colorFrequency[tag] = (colorFrequency[tag] || 0) + 1;
    });
  });

  return {
    totalCount: entries.length,
    uniqueRegions: new Set(entries.map((entry) => `${entry.bodySide}-${entry.regionKey}`)).size,
    statusCounts,
    regionDistribution,
    frequencyOverTime,
    colorFrequency,
  };
}

function filterLogEntries(entries, filters) {
  return entries.filter((entry) => {
    const matchesType = filters.type === 'all' || entry.logType === filters.type;
    if (!matchesType) {
      return false;
    }

    const timestamp = new Date(entry.logTimestamp).getTime();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    if (filters.range === 'daily') {
      return timestamp >= todayStart;
    }

    if (filters.range === 'weekly') {
      return timestamp >= todayStart - 6 * 24 * 60 * 60 * 1000;
    }

    if (filters.range === 'monthly') {
      return timestamp >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    }

    if (filters.range === 'custom') {
      const start = filters.start ? new Date(`${filters.start}T00:00:00`).getTime() : -Infinity;
      const end = filters.end ? new Date(`${filters.end}T23:59:59`).getTime() : Infinity;
      return timestamp >= start && timestamp <= end;
    }

    return true;
  });
}

function sortByUpdatedAt(entries) {
  return [...entries].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });
}

function mergeEntries(currentEntries, importedEntries) {
  const map = new Map();
  [...currentEntries, ...importedEntries].forEach((entry) => {
    const existing = map.get(entry.id);
    if (!existing) {
      map.set(entry.id, entry);
      return;
    }

    const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
    const incomingTime = new Date(entry.updatedAt || entry.createdAt || 0).getTime();
    if (incomingTime >= existingTime) {
      map.set(entry.id, entry);
    }
  });
  return sortByUpdatedAt([...map.values()]);
}

function convertToCsv(entries, storeName) {
  if (entries.length === 0) {
    return '';
  }

  const fields =
    storeName === 'peeEntries'
      ? ['id', 'createdAt', 'updatedAt', 'entryMode', 'startTime', 'endTime', 'duration', 'tags', 'freeTextNote']
      : ['id', 'createdAt', 'updatedAt', 'observedAt', 'bodySide', 'regionKey', 'regionType', 'limbType', 'size', 'colorTags', 'tenderness', 'causeKnown', 'causeDescription', 'status', 'note'];

  return [
    fields.join(','),
    ...entries.map((entry) =>
      fields
        .map((field) => csvCell(Array.isArray(entry[field]) ? entry[field].join('|') : entry[field] ?? ''))
        .join(',')
    ),
  ].join('\n');
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function groupCounts(items, getKey) {
  return items.reduce((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }

  const middle = Math.floor(values.length / 2);
  return values.length % 2 === 0
    ? Math.round((values[middle - 1] + values[middle]) / 2)
    : values[middle];
}

function entryTitle(entry) {
  if (entry.logType === 'bruise') {
    return `Bruise · ${capitalize(entry.bodySide)} ${displayRegion(entry)}`;
  }

  if (entry.entryMode === 'note') {
    return 'Quick note';
  }

  return `Pee entry · ${formatDuration(entry.duration)}`;
}

function entrySummary(entry) {
  if (entry.logType === 'bruise') {
    const parts = [capitalize(entry.size), entry.status];
    if (entry.note) {
      parts.push(entry.note);
    } else if (entry.causeDescription) {
      parts.push(entry.causeDescription);
    }
    return parts.join(' · ');
  }

  if (entry.entryMode === 'note') {
    return entry.freeTextNote || 'Note-only entry.';
  }

  const base = entry.tags?.length ? entry.tags.join(', ') : 'No tags';
  return entry.freeTextNote ? `${base} · ${entry.freeTextNote}` : base;
}

function displayRegion(entry) {
  const region = BODY_REGIONS.find((item) => item.key === entry.regionKey);
  return region ? region.label : 'Unknown region';
}

function toggleTag(tags, tag) {
  return tags.includes(tag) ? tags.filter((item) => item !== tag) : [...tags, tag];
}

function formatDuration(durationMs) {
  const totalSeconds = Math.max(0, Math.floor((durationMs || 0) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }

  return `${seconds}s`;
}

function formatDateTime(value) {
  if (!value) {
    return 'Unknown time';
  }

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatDateOnly(value) {
  const date = new Date(value);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function formatGraphDate(value) {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function shortDate(value) {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat(undefined, {
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function shiftDate(value, days) {
  if (!value) {
    return '';
  }

  const date = parseDateOnly(value);
  date.setDate(date.getDate() + days);
  return formatDateParts(date);
}

function parseDateOnly(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDateParts(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toInputDateTime(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
}

function fromInputDateTime(value) {
  return value ? new Date(value).toISOString() : '';
}

function capitalize(value) {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function downloadFile(fileName, contents, type) {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function dateStamp() {
  return formatDateOnly(new Date().toISOString());
}

function getHashView() {
  const hash = window.location.hash.replace('#', '');
  const allowed = new Set(['home', 'bruise', 'log', 'insights', 'export', 'print']);
  return allowed.has(hash) ? hash : 'home';
}

export default App;
