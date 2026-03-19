import { useEffect, useMemo, useState } from 'react';
import { clearStore, deleteEntry, getAllData, saveEntries, saveEntry } from './db';

const NAV_ITEMS = [
  { id: 'home', label: 'Home' },
  { id: 'log', label: 'Log' },
  { id: 'insights', label: 'Insights' },
  { id: 'export', label: 'Export' },
];

const PEE_TAGS = ['dark', 'cloudy', 'blood', 'burning', 'pain', 'weak stream', 'urgent', 'other'];
const NOTE_TYPES = ['symptom', 'general', 'pee'];
const SYMPTOM_TAGS = ['headache', 'fatigue', 'anxiety', 'nausea', 'dizziness', 'pain', 'cramps', 'other'];
const GENERAL_NOTE_TAGS = ['water', 'medication', 'meal', 'supplement', 'caffeine', 'alcohol', 'exercise', 'other'];
const BM_TAGS = ['hard', 'normal', 'loose', 'watery', 'pain', 'straining', 'blood', 'urgent', 'other'];
const BRUISE_COLORS = ['red', 'purple', 'blue', 'green', 'yellow', 'brown', 'fading'];
const BM_SIZES = ['small', 'medium', 'large'];
const BRUISE_SIZES = ['small', 'medium', 'large'];
const BRUISE_STATUS = ['improving', 'stable', 'worsening'];
const SLEEP_QUALITY_OPTIONS = ['poor', 'okay', 'good'];

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

const EMPTY_BM_FORM = {
  id: '',
  createdAt: '',
  occurredAt: '',
  size: 'medium',
  tags: [],
  freeTextNote: '',
};

const EMPTY_NOTE_FORM = {
  id: '',
  createdAt: '',
  occurredAt: '',
  noteType: 'symptom',
  tags: [],
  timeUnknown: false,
  freeTextNote: '',
};

const EMPTY_WEIGHT_FORM = {
  id: '',
  createdAt: '',
  occurredAt: '',
  weightUnit: 'lb',
  weightValue: '',
  freeTextNote: '',
};

const EMPTY_SLEEP_FORM = {
  id: '',
  createdAt: '',
  startTime: '',
  endTime: '',
  durationMinutes: 480,
  quality: 'okay',
  freeTextNote: '',
};

function App() {
  const [view, setView] = useState(getHashView());
  const [peeEntries, setPeeEntries] = useState([]);
  const [noteEntries, setNoteEntries] = useState([]);
  const [bruiseEntries, setBruiseEntries] = useState([]);
  const [bmEntries, setBmEntries] = useState([]);
  const [weightEntries, setWeightEntries] = useState([]);
  const [sleepEntries, setSleepEntries] = useState([]);
  const [activeTimer, setActiveTimer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [historyFilters, setHistoryFilters] = useState({
    type: 'all',
    range: 'all',
    start: '',
    end: '',
  });
  const [peeModal, setPeeModal] = useState({ open: false, mode: 'edit', entry: null });
  const [noteModal, setNoteModal] = useState({ open: false, mode: 'create', entry: null });
  const [bmModal, setBmModal] = useState({ open: false, mode: 'create', entry: null });
  const [weightModal, setWeightModal] = useState({ open: false, mode: 'create', entry: null });
  const [sleepModal, setSleepModal] = useState({ open: false, mode: 'create', entry: null });
  const [bruiseForm, setBruiseForm] = useState(EMPTY_BRUISE_FORM);
  const [bruiseMode, setBruiseMode] = useState('create');
  const [importPayload, setImportPayload] = useState(null);
  const [importFeedback, setImportFeedback] = useState('');
  const [bruiseError, setBruiseError] = useState('');
  const [confirmModal, setConfirmModal] = useState(null);
  const [graphModal, setGraphModal] = useState({
    open: false,
    kind: 'pee',
    range: 'all',
    selectedDate: '',
    weightUnit: 'lb',
  });

  useEffect(() => {
    async function load() {
      const data = await getAllData();
      setPeeEntries(sortByUpdatedAt(data.peeEntries));
      setNoteEntries(sortByUpdatedAt(data.noteEntries));
      setBruiseEntries(sortByUpdatedAt(data.bruiseEntries));
      setBmEntries(sortByUpdatedAt(data.bmEntries));
      setWeightEntries(sortByUpdatedAt(data.weightEntries));
      setSleepEntries(sortByUpdatedAt(data.sleepEntries));
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
    () =>
      sortByUpdatedAt(
        peeEntries.filter((entry) => entry.status === 'saved' && entry.entryMode !== 'note')
      ),
    [peeEntries]
  );

  const timerPeeEntries = useMemo(() => savedPeeEntries, [savedPeeEntries]);

  const savedNoteEntries = useMemo(() => sortByUpdatedAt(noteEntries), [noteEntries]);
  const legacyNoteEntries = useMemo(
    () =>
      sortByUpdatedAt(
        peeEntries.filter((entry) => entry.status === 'saved' && entry.entryMode === 'note')
      ),
    [peeEntries]
  );
  const exportableNoteEntries = useMemo(
    () =>
      sortByUpdatedAt([
        ...savedNoteEntries,
        ...legacyNoteEntries.map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          occurredAt: entry.startTime || entry.createdAt,
          entryType: 'note',
          noteType: entry.noteType || 'pee',
          tags: entry.tags || [],
          timeUnknown: !entry.startTime,
          freeTextNote: entry.freeTextNote || '',
        })),
      ]),
    [savedNoteEntries, legacyNoteEntries]
  );

  const savedBmEntries = useMemo(() => sortByUpdatedAt(bmEntries), [bmEntries]);
  const savedWeightEntries = useMemo(() => sortByUpdatedAt(weightEntries), [weightEntries]);
  const savedSleepEntries = useMemo(() => sortByUpdatedAt(sleepEntries), [sleepEntries]);
  const manualPeeEntries = useMemo(
    () =>
      sortByUpdatedAt(
        [...savedNoteEntries, ...legacyNoteEntries]
          .filter((entry) => entry.noteType === 'pee')
          .map((entry) => ({
            id: entry.id,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            entryType: 'pee',
            entryMode: 'manual-note',
            startTime: entry.timeUnknown ? '' : entry.occurredAt || entry.startTime || '',
            endTime: entry.timeUnknown ? '' : entry.occurredAt || entry.endTime || entry.startTime || '',
            duration: null,
            tags: entry.tags || [],
            freeTextNote: entry.freeTextNote || '',
            timeUnknown: entry.timeUnknown ?? !(entry.occurredAt || entry.startTime || entry.endTime),
          })),
      ),
    [savedNoteEntries, legacyNoteEntries]
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

    const bmLog = savedBmEntries.map((entry) => ({
      ...entry,
      logType: 'bm',
      logTimestamp: entry.occurredAt || entry.createdAt,
    }));

    const weightLog = savedWeightEntries.map((entry) => ({
      ...entry,
      logType: 'weight',
      logTimestamp: entry.occurredAt || entry.createdAt,
    }));

    const sleepLog = savedSleepEntries.map((entry) => ({
      ...entry,
      logType: 'sleep',
      logTimestamp: getSleepEnd(entry) || getSleepStart(entry) || entry.createdAt,
    }));

    const noteLog = savedNoteEntries.map((entry) => ({
      ...entry,
      logType: 'note',
      sourceStore: 'noteEntries',
      logTimestamp: entry.occurredAt || entry.createdAt,
    }));

    const legacyNoteLog = legacyNoteEntries.map((entry) => ({
      ...entry,
      logType: 'note',
      sourceStore: 'peeEntries',
      noteType: entry.noteType || 'pee',
      tags: entry.tags || [],
      timeUnknown: !entry.startTime,
      occurredAt: entry.startTime || entry.createdAt,
      logTimestamp: entry.startTime || entry.createdAt,
    }));

    return [...peeLog, ...noteLog, ...legacyNoteLog, ...bmLog, ...weightLog, ...sleepLog, ...bruiseLog].sort(
      (a, b) => new Date(b.logTimestamp).getTime() - new Date(a.logTimestamp).getTime()
    );
  }, [savedPeeEntries, savedNoteEntries, legacyNoteEntries, savedBmEntries, savedWeightEntries, savedSleepEntries, bruiseEntries]);

  const filteredLogEntries = useMemo(
    () => filterLogEntries(combinedLogEntries, historyFilters),
    [combinedLogEntries, historyFilters]
  );

  const peeStats = useMemo(() => buildPeeStats([...timerPeeEntries, ...manualPeeEntries]), [timerPeeEntries, manualPeeEntries]);
  const bmStats = useMemo(() => buildBmStats(savedBmEntries), [savedBmEntries]);
  const weightStats = useMemo(() => buildWeightStats(savedWeightEntries), [savedWeightEntries]);
  const sleepStats = useMemo(() => buildSleepStats(savedSleepEntries), [savedSleepEntries]);
  const bruiseStats = useMemo(() => buildBruiseStats(bruiseEntries), [bruiseEntries]);
  const graphConfig = {
    pee: {
      title: 'Pee entries by day',
      entriesByDay: peeStats.entriesByDay,
      barValueFormatter: (value) => String(Math.round(value || 0)),
      detailFormatter: (value) => `${Math.round(value || 0)} entries`,
    },
    bm: {
      title: 'BM entries by day',
      entriesByDay: bmStats.entriesByDay,
      barValueFormatter: (value) => String(Math.round(value || 0)),
      detailFormatter: (value) => `${Math.round(value || 0)} entries`,
    },
    weight: {
      title: 'Weight by day',
      entriesByDay: weightStats.entriesByDay,
      barValueFormatter: (value) => formatWeightShort(convertWeightFromKg(value, graphModal.weightUnit), graphModal.weightUnit),
      detailFormatter: (value) => formatWeightValue(convertWeightFromKg(value, graphModal.weightUnit), graphModal.weightUnit),
    },
    sleep: {
      title: 'Sleep duration by day',
      entriesByDay: sleepStats.durationByDay,
      barValueFormatter: (value) => formatSleepHours(value),
      detailFormatter: (value) => formatDuration(value),
    },
  }[graphModal.kind] || {
    title: 'Pee entries by day',
    entriesByDay: peeStats.entriesByDay,
    barValueFormatter: (value) => String(Math.round(value || 0)),
    detailFormatter: (value) => `${Math.round(value || 0)} entries`,
  };

  async function syncPeeEntries(nextEntries) {
    const sortedEntries = sortByUpdatedAt(nextEntries);
    setPeeEntries(sortedEntries);
    setActiveTimer(sortedEntries.find((entry) => entry.status === 'active') || null);
  }

  function syncNoteEntries(nextEntries) {
    setNoteEntries(sortByUpdatedAt(nextEntries));
  }

  function syncBmEntries(nextEntries) {
    setBmEntries(sortByUpdatedAt(nextEntries));
  }

  function syncWeightEntries(nextEntries) {
    setWeightEntries(sortByUpdatedAt(nextEntries));
  }

  function syncSleepEntries(nextEntries) {
    setSleepEntries(sortByUpdatedAt(nextEntries));
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
      cancelLabel: 'Cancel',
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
    setNoteModal({
      open: true,
      mode: 'create',
      entry: {
        ...EMPTY_NOTE_FORM,
        createdAt: timestamp,
        occurredAt: timestamp,
      },
    });
  }

  function closePeeModal() {
    setPeeModal({ open: false, mode: 'edit', entry: null });
  }

  function closeNoteModal() {
    setNoteModal({ open: false, mode: 'create', entry: null });
  }

  function openBmModal(entry = null) {
    const timestamp = new Date().toISOString();
    setBmModal({
      open: true,
      mode: entry ? 'edit' : 'create',
      entry:
        entry || {
          ...EMPTY_BM_FORM,
          createdAt: timestamp,
          occurredAt: timestamp,
        },
    });
  }

  function closeBmModal() {
    setBmModal({ open: false, mode: 'create', entry: null });
  }

  function openWeightModal(entry = null) {
    const timestamp = new Date().toISOString();
    setWeightModal({
      open: true,
      mode: entry ? 'edit' : 'create',
      entry:
        entry || {
          ...EMPTY_WEIGHT_FORM,
          createdAt: timestamp,
          occurredAt: timestamp,
        },
    });
  }

  function closeWeightModal() {
    setWeightModal({ open: false, mode: 'create', entry: null });
  }

  function openSleepModal(entry = null) {
    const defaults = createDefaultSleepTiming();
    setSleepModal({
      open: true,
      mode: entry ? 'edit' : 'create',
      entry:
        entry
          ? {
              ...EMPTY_SLEEP_FORM,
              ...entry,
              startTime: getSleepStart(entry),
              endTime: getSleepEnd(entry),
              durationMinutes: getSleepDurationMinutes(entry),
            }
          : {
          ...EMPTY_SLEEP_FORM,
          createdAt: defaults.endTime,
          startTime: defaults.startTime,
          endTime: defaults.endTime,
          durationMinutes: defaults.durationMinutes,
        },
    });
  }

  function closeSleepModal() {
    setSleepModal({ open: false, mode: 'create', entry: null });
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
        entryMode: normalized.entryMode || 'timer',
      };
      nextEntries = [...peeEntries, entryToPersist];
    }

    await saveEntry('peeEntries', entryToPersist);
    await syncPeeEntries(nextEntries);
    closePeeModal();
  }

  function handleDiscardPeeDraft(id) {
    openConfirmModal({
      title: 'Discard pee draft?',
      message: 'This stopped timer entry will be removed and cannot be recovered.',
      cancelLabel: 'Cancel',
      confirmLabel: 'Discard draft',
      tone: 'danger',
      action: { type: 'discard-pee-draft', id },
    });
  }

  async function handleSaveNoteEntry(formEntry) {
    const timestamp = new Date().toISOString();

    if (noteModal.mode === 'legacy-edit') {
      const updatedLegacyEntry = {
        ...formEntry,
        updatedAt: timestamp,
        noteType: formEntry.noteType || 'pee',
        tags: formEntry.tags || [],
        timeUnknown: Boolean(formEntry.timeUnknown),
        entryMode: 'note',
        status: 'saved',
        startTime: formEntry.timeUnknown ? '' : formEntry.occurredAt || formEntry.startTime || timestamp,
        endTime: formEntry.timeUnknown ? '' : formEntry.occurredAt || formEntry.endTime || timestamp,
        duration: 0,
      };

      const nextEntries = peeEntries.map((entry) =>
        entry.id === updatedLegacyEntry.id ? { ...entry, ...updatedLegacyEntry } : entry
      );

      await saveEntry('peeEntries', nextEntries.find((entry) => entry.id === updatedLegacyEntry.id));
      await syncPeeEntries(nextEntries);
      closeNoteModal();
      return;
    }

    const entry = {
      ...formEntry,
      id: noteModal.mode === 'edit' ? formEntry.id : makeId('note'),
      createdAt: noteModal.mode === 'edit' ? formEntry.createdAt : timestamp,
      updatedAt: timestamp,
      occurredAt: formEntry.timeUnknown ? '' : formEntry.occurredAt || timestamp,
      entryType: 'note',
      noteType: formEntry.noteType || 'symptom',
      tags: formEntry.tags || [],
      timeUnknown: Boolean(formEntry.timeUnknown),
    };

    await saveEntry('noteEntries', entry);

    const nextEntries =
      noteModal.mode === 'edit'
        ? noteEntries.map((current) => (current.id === entry.id ? entry : current))
        : [...noteEntries, entry];

    syncNoteEntries(nextEntries);
    closeNoteModal();
  }

  async function handleSaveBmEntry(formEntry) {
    const timestamp = new Date().toISOString();
    const entry = {
      ...formEntry,
      id: bmModal.mode === 'edit' ? formEntry.id : makeId('bm'),
      createdAt: bmModal.mode === 'edit' ? formEntry.createdAt : timestamp,
      updatedAt: timestamp,
      occurredAt: formEntry.occurredAt || timestamp,
      entryType: 'bm',
    };

    await saveEntry('bmEntries', entry);

    const nextEntries =
      bmModal.mode === 'edit'
        ? bmEntries.map((current) => (current.id === entry.id ? entry : current))
        : [...bmEntries, entry];

    syncBmEntries(nextEntries);
    closeBmModal();
  }

  async function handleSaveWeightEntry(formEntry) {
    const timestamp = new Date().toISOString();
    const numericWeight = Number(formEntry.weightValue);
    const entry = {
      ...formEntry,
      id: weightModal.mode === 'edit' ? formEntry.id : makeId('weight'),
      createdAt: weightModal.mode === 'edit' ? formEntry.createdAt : timestamp,
      updatedAt: timestamp,
      occurredAt: formEntry.occurredAt || timestamp,
      entryType: 'weight',
      weightUnit: formEntry.weightUnit || 'lb',
      weightValue: Number.isFinite(numericWeight) ? numericWeight : 0,
    };

    await saveEntry('weightEntries', entry);

    const nextEntries =
      weightModal.mode === 'edit'
        ? weightEntries.map((current) => (current.id === entry.id ? entry : current))
        : [...weightEntries, entry];

    syncWeightEntries(nextEntries);
    closeWeightModal();
  }

  async function handleSaveSleepEntry(formEntry) {
    const timestamp = new Date().toISOString();
    const endTime = formEntry.endTime || timestamp;
    const durationMinutes = clampDurationMinutes(formEntry.durationMinutes);
    const startTime = formEntry.startTime || subtractMinutes(endTime, durationMinutes);
    const entry = {
      ...formEntry,
      id: sleepModal.mode === 'edit' ? formEntry.id : makeId('sleep'),
      createdAt: sleepModal.mode === 'edit' ? formEntry.createdAt : timestamp,
      updatedAt: timestamp,
      startTime,
      endTime,
      durationMinutes,
      quality: formEntry.quality || 'okay',
      entryType: 'sleep',
    };

    await saveEntry('sleepEntries', entry);

    const nextEntries =
      sleepModal.mode === 'edit'
        ? sleepEntries.map((current) => (current.id === entry.id ? entry : current))
        : [...sleepEntries, entry];

    syncSleepEntries(nextEntries);
    closeSleepModal();
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

    if (item.logType === 'note') {
      setNoteModal({
        open: true,
        mode: item.sourceStore === 'peeEntries' ? 'legacy-edit' : 'edit',
        entry: {
          ...EMPTY_NOTE_FORM,
          ...item,
          occurredAt: item.occurredAt || item.logTimestamp || item.createdAt,
          noteType: item.noteType || 'symptom',
          tags: item.tags || [],
          timeUnknown: item.timeUnknown ?? !(item.occurredAt || item.startTime || item.endTime),
        },
      });
      return;
    }

    if (item.logType === 'bm') {
      openBmModal(item);
      return;
    }

    if (item.logType === 'weight') {
      openWeightModal(item);
      return;
    }

    if (item.logType === 'sleep') {
      openSleepModal(item);
      return;
    }

    openBruiseEdit(item);
  }

  function handleDeleteLogItem(item) {
    openConfirmModal({
      title: `Delete ${item.logType} entry?`,
      message: 'This removes the saved entry from local storage on this device.',
      cancelLabel: 'Cancel',
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
      noteEntries,
      bmEntries,
      weightEntries,
      sleepEntries,
      bruiseEntries,
    };

    downloadFile(
      `pb2track-backup-${dateStamp()}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  }

  function handleDownloadCsv(storeName) {
    const rows =
      storeName === 'peeEntries'
        ? savedPeeEntries
        : storeName === 'noteEntries'
          ? exportableNoteEntries
        : storeName === 'bmEntries'
          ? savedBmEntries
        : storeName === 'weightEntries'
          ? savedWeightEntries
        : storeName === 'sleepEntries'
          ? savedSleepEntries
          : bruiseEntries;
    const csv = convertToCsv(rows, storeName);
    const fileName =
      storeName === 'peeEntries'
        ? `pee-entries-${dateStamp()}.csv`
        : storeName === 'noteEntries'
          ? `note-entries-${dateStamp()}.csv`
        : storeName === 'bmEntries'
          ? `bm-entries-${dateStamp()}.csv`
        : storeName === 'weightEntries'
          ? `weight-entries-${dateStamp()}.csv`
        : storeName === 'sleepEntries'
          ? `sleep-entries-${dateStamp()}.csv`
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
      const nextNoteEntries = Array.isArray(parsed.noteEntries) ? parsed.noteEntries : [];
      const nextBmEntries = Array.isArray(parsed.bmEntries) ? parsed.bmEntries : [];
      const nextWeightEntries = Array.isArray(parsed.weightEntries) ? parsed.weightEntries : [];
      const nextSleepEntries = Array.isArray(parsed.sleepEntries) ? parsed.sleepEntries : [];
      const nextBruiseEntries = Array.isArray(parsed.bruiseEntries) ? parsed.bruiseEntries : [];
      setImportPayload({
        peeEntries: nextPeeEntries,
        noteEntries: nextNoteEntries,
        bmEntries: nextBmEntries,
        weightEntries: nextWeightEntries,
        sleepEntries: nextSleepEntries,
        bruiseEntries: nextBruiseEntries,
      });
      setImportFeedback(
        `Loaded ${nextPeeEntries.length} Pee entries, ${nextNoteEntries.length} Note entries, ${nextBmEntries.length} BM entries, ${nextWeightEntries.length} Weight entries, ${nextSleepEntries.length} Sleep entries, and ${nextBruiseEntries.length} Bruise entries.`
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
        message: 'All current Pee, Note, BM, Weight, Sleep, and Bruise entries on this device will be replaced by the imported backup.',
        cancelLabel: 'Cancel',
        confirmLabel: 'Replace data',
        tone: 'danger',
        action: { type: 'replace-import' },
      });
      return;
    }

    let nextPeeEntries = [];
    let nextNoteEntries = [];
    let nextBmEntries = [];
    let nextWeightEntries = [];
    let nextSleepEntries = [];
    let nextBruiseEntries = [];

    if (mode === 'replace-confirmed') {
      await clearStore('peeEntries');
      await clearStore('noteEntries');
      await clearStore('bmEntries');
      await clearStore('weightEntries');
      await clearStore('sleepEntries');
      await clearStore('bruiseEntries');
      nextPeeEntries = sortByUpdatedAt(importPayload.peeEntries);
      nextNoteEntries = sortByUpdatedAt(importPayload.noteEntries);
      nextBmEntries = sortByUpdatedAt(importPayload.bmEntries);
      nextWeightEntries = sortByUpdatedAt(importPayload.weightEntries);
      nextSleepEntries = sortByUpdatedAt(importPayload.sleepEntries);
      nextBruiseEntries = sortByUpdatedAt(importPayload.bruiseEntries);
    } else {
      nextPeeEntries = mergeEntries(peeEntries, importPayload.peeEntries);
      nextNoteEntries = mergeEntries(noteEntries, importPayload.noteEntries);
      nextBmEntries = mergeEntries(bmEntries, importPayload.bmEntries);
      nextWeightEntries = mergeEntries(weightEntries, importPayload.weightEntries);
      nextSleepEntries = mergeEntries(sleepEntries, importPayload.sleepEntries);
      nextBruiseEntries = mergeEntries(bruiseEntries, importPayload.bruiseEntries);
    }

    if (nextPeeEntries.length > 0) {
      await saveEntries('peeEntries', nextPeeEntries);
    }

    if (nextBmEntries.length > 0) {
      await saveEntries('bmEntries', nextBmEntries);
    }

    if (nextWeightEntries.length > 0) {
      await saveEntries('weightEntries', nextWeightEntries);
    }

    if (nextSleepEntries.length > 0) {
      await saveEntries('sleepEntries', nextSleepEntries);
    }

    if (nextNoteEntries.length > 0) {
      await saveEntries('noteEntries', nextNoteEntries);
    }

    if (nextBruiseEntries.length > 0) {
      await saveEntries('bruiseEntries', nextBruiseEntries);
    }

    await syncPeeEntries(nextPeeEntries);
    syncNoteEntries(nextNoteEntries);
    syncBmEntries(nextBmEntries);
    syncWeightEntries(nextWeightEntries);
    syncSleepEntries(nextSleepEntries);
    setBruiseEntries(sortByUpdatedAt(nextBruiseEntries));
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

    if (action.type === 'discard-pee-draft') {
      await deleteEntry('peeEntries', action.id);
      await syncPeeEntries(peeEntries.filter((entry) => entry.id !== action.id));
      closePeeModal();
      return;
    }

    if (action.type === 'delete-log-entry') {
      const storeName =
        action.entry.logType === 'pee'
          ? 'peeEntries'
          : action.entry.logType === 'note'
            ? action.entry.sourceStore || 'noteEntries'
          : action.entry.logType === 'bm'
            ? 'bmEntries'
          : action.entry.logType === 'weight'
            ? 'weightEntries'
          : action.entry.logType === 'sleep'
            ? 'sleepEntries'
            : 'bruiseEntries';
      await deleteEntry(storeName, action.entry.id);

      if (storeName === 'peeEntries') {
        await syncPeeEntries(peeEntries.filter((entry) => entry.id !== action.entry.id));
      } else if (storeName === 'noteEntries') {
        syncNoteEntries(noteEntries.filter((entry) => entry.id !== action.entry.id));
      } else if (storeName === 'bmEntries') {
        syncBmEntries(bmEntries.filter((entry) => entry.id !== action.entry.id));
      } else if (storeName === 'weightEntries') {
        syncWeightEntries(weightEntries.filter((entry) => entry.id !== action.entry.id));
      } else if (storeName === 'sleepEntries') {
        syncSleepEntries(sleepEntries.filter((entry) => entry.id !== action.entry.id));
      } else {
        setBruiseEntries(sortByUpdatedAt(bruiseEntries.filter((entry) => entry.id !== action.entry.id)));
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
            <button type="button" className="eyebrow eyebrow-button" onClick={() => navigate('help')}>
              Local-first log
            </button>
            <h1>PB²Track</h1>
          </div>
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
            onOpenBm={() => openBmModal()}
            onOpenWeight={() => openWeightModal()}
            onOpenSleep={() => openSleepModal()}
            onOpenBruise={openBruiseCreate}
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
            bmStats={bmStats}
            weightStats={weightStats}
            sleepStats={sleepStats}
            bruiseStats={bruiseStats}
            onOpenPeeGraph={(selectedDate = '') =>
              setGraphModal({ open: true, kind: 'pee', range: 'all', selectedDate, weightUnit: 'lb' })
            }
            onOpenBmGraph={(selectedDate = '') =>
              setGraphModal({ open: true, kind: 'bm', range: 'all', selectedDate, weightUnit: 'lb' })
            }
            onOpenWeightGraph={(selectedDate = '') =>
              setGraphModal({ open: true, kind: 'weight', range: 'all', selectedDate, weightUnit: 'lb' })
            }
            onOpenSleepGraph={(selectedDate = '') =>
              setGraphModal({ open: true, kind: 'sleep', range: 'all', selectedDate, weightUnit: 'lb' })
            }
          />
        )}
        {view === 'export' && (
          <ExportView
            peeCount={savedPeeEntries.length}
            noteCount={exportableNoteEntries.length}
            bmCount={savedBmEntries.length}
            weightCount={savedWeightEntries.length}
            sleepCount={savedSleepEntries.length}
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
        {view === 'help' && <HelpView onBack={() => navigate('home')} />}
        {view === 'print' && (
          <PrintView
            peeStats={peeStats}
            bmStats={bmStats}
            weightStats={weightStats}
            sleepStats={sleepStats}
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

      {noteModal.open && (
        <NoteEntryModal
          modal={noteModal}
          onClose={closeNoteModal}
          onSave={handleSaveNoteEntry}
        />
      )}

      {bmModal.open && (
        <BMEntryModal
          modal={bmModal}
          onClose={closeBmModal}
          onSave={handleSaveBmEntry}
        />
      )}

      {weightModal.open && (
        <WeightEntryModal
          modal={weightModal}
          onClose={closeWeightModal}
          onSave={handleSaveWeightEntry}
        />
      )}

      {sleepModal.open && (
        <SleepEntryModal
          modal={sleepModal}
          onClose={closeSleepModal}
          onSave={handleSaveSleepEntry}
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
          title={graphConfig.title}
          entriesByDay={graphConfig.entriesByDay}
          barValueFormatter={graphConfig.barValueFormatter}
          detailFormatter={graphConfig.detailFormatter}
          modal={graphModal}
          onClose={() => setGraphModal({ open: false, kind: 'pee', range: 'all', selectedDate: '', weightUnit: 'lb' })}
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
  onOpenBm,
  onOpenWeight,
  onOpenSleep,
  onOpenBruise,
  recentEntries,
}) {
  const elapsed = activeTimer ? now - new Date(activeTimer.startTime).getTime() : 0;

  return (
    <section className="content-stack">
      <section className="hero-panel">
        <h2>{activeTimer ? 'Timer running' : 'Ready for the next entry'}</h2>
        <button
          type="button"
          className={activeTimer ? 'timer-button timer-button-stop' : 'timer-button'}
          onClick={activeTimer ? onStopTimer : onStartTimer}
        >
          {activeTimer ? 'Stop Timer' : 'Start Timer'}
        </button>
        <div className="timer-readout">
          <strong className="time-code">{formatDuration(elapsed)}</strong>
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
            <span className="action-copy">Track a symptom, intake, or pee-related note.</span>
          </button>
          <button type="button" className="action-card" onClick={onOpenBruise}>
            <span className="action-title">Add Bruise</span>
            <span className="action-copy">Mark a body region and details.</span>
          </button>
          <button type="button" className="action-card" onClick={onOpenBm}>
            <span className="action-title">Add BM</span>
            <span className="action-copy">Log a bowel movement.</span>
          </button>
          <button type="button" className="action-card" onClick={onOpenWeight}>
            <span className="action-title">Add Weight</span>
            <span className="action-copy">Record a weight data point.</span>
          </button>
          <button type="button" className="action-card" onClick={onOpenSleep}>
            <span className="action-title">Add Sleep</span>
            <span className="action-copy">Track duration, quality, and notes.</span>
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
                ['note', 'Notes only'],
                ['bm', 'BM only'],
                ['weight', 'Weight only'],
                ['sleep', 'Sleep only'],
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
              </div>
              {entrySummary(entry, { suppressTagEcho: true }) && (
                <p className="entry-summary">{entrySummary(entry, { suppressTagEcho: true })}</p>
              )}
              {entry.logType === 'pee' && entry.tags?.length > 0 && (
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.logType === 'bm' && entry.tags?.length > 0 && (
                <div className="tag-row">
                  {entry.tags.map((tag) => (
                    <span key={tag} className="tag-pill">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {entry.logType === 'note' && entry.tags?.length > 0 && (
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

function InsightsView({
  peeStats,
  bmStats,
  weightStats,
  sleepStats,
  bruiseStats,
  onOpenPeeGraph,
  onOpenBmGraph,
  onOpenWeightGraph,
  onOpenSleepGraph,
}) {
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
              <StatCard label="Average duration" value={<span className="time-code">{formatDuration(peeStats.averageDuration)}</span>} />
              <StatCard label="Median duration" value={<span className="time-code">{formatDuration(peeStats.medianDuration)}</span>} />
              <StatCard label="Shortest" value={<span className="time-code">{formatDuration(peeStats.shortest)}</span>} />
              <StatCard label="Longest" value={<span className="time-code">{formatDuration(peeStats.longest)}</span>} />
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
              sortMode="key-desc"
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>BM insights</h2>
          <p>Track bowel-movement frequency, size, tags, and daily patterns.</p>
        </div>
        {bmStats.totalCount < 1 ? (
          <p className="empty-state">Not enough data yet</p>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard label="Total count" value={String(bmStats.totalCount)} />
              <StatCard label="Frequency/day" value={bmStats.frequencyPerDay.toFixed(1)} />
              <StatCard label="Small" value={String(bmStats.sizeFrequency.small || 0)} />
              <StatCard label="Medium" value={String(bmStats.sizeFrequency.medium || 0)} />
              <StatCard label="Large" value={String(bmStats.sizeFrequency.large || 0)} />
            </div>
            <MetricList title="Tag frequency" data={bmStats.tagFrequency} emptyLabel="No BM tags yet." />
            <MetricList title="Size frequency" data={bmStats.sizeFrequency} emptyLabel="No BM size data yet." />
            <MetricList
              title="Entries by day"
              data={bmStats.entriesByDay}
              emptyLabel="No BM daily counts yet."
              actionLabel="Open graph"
              onAction={() => onOpenBmGraph('')}
              onItemClick={(date) => onOpenBmGraph(date)}
              sortMode="key-desc"
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Weight insights</h2>
          <p>Track recorded weight over time with daily values and summary stats.</p>
        </div>
        {weightStats.totalCount < 1 ? (
          <p className="empty-state">Not enough data yet</p>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard label="Total count" value={String(weightStats.totalCount)} />
              <StatCard label="Latest" value={formatWeightValue(convertWeightFromKg(weightStats.latestValueKg, 'lb'), 'lb')} />
              <StatCard label="Average" value={formatWeightValue(convertWeightFromKg(weightStats.averageValueKg, 'lb'), 'lb')} />
              <StatCard label="Lowest" value={formatWeightValue(convertWeightFromKg(weightStats.lowestValueKg, 'lb'), 'lb')} />
              <StatCard label="Highest" value={formatWeightValue(convertWeightFromKg(weightStats.highestValueKg, 'lb'), 'lb')} />
            </div>
            <MetricList
              title="Weight by day"
              data={weightStats.entriesByDay}
              emptyLabel="No daily weight values yet."
              actionLabel="Open graph"
              onAction={() => onOpenWeightGraph('')}
              onItemClick={(date) => onOpenWeightGraph(date)}
              sortMode="key-desc"
              valueFormatter={(value) => formatWeightValue(convertWeightFromKg(value, 'lb'), 'lb')}
            />
          </>
        )}
      </section>

      <section className="panel">
        <div className="section-heading">
          <h2>Sleep insights</h2>
          <p>Track sleep duration, quality, and daily patterns.</p>
        </div>
        {sleepStats.totalCount < 1 ? (
          <p className="empty-state">Not enough data yet</p>
        ) : (
          <>
            <div className="stats-grid">
              <StatCard label="Total count" value={String(sleepStats.totalCount)} />
              <StatCard label="Average duration" value={<span className="time-code">{formatDuration(sleepStats.averageDuration)}</span>} />
              <StatCard label="Median duration" value={<span className="time-code">{formatDuration(sleepStats.medianDuration)}</span>} />
              <StatCard label="Shortest" value={<span className="time-code">{formatDuration(sleepStats.shortest)}</span>} />
              <StatCard label="Longest" value={<span className="time-code">{formatDuration(sleepStats.longest)}</span>} />
            </div>
            <MetricList title="Quality frequency" data={sleepStats.qualityFrequency} emptyLabel="No sleep quality data yet." />
            <MetricList
              title="Sleep duration by day"
              data={sleepStats.durationByDay}
              emptyLabel="No daily sleep durations yet."
              actionLabel="Open graph"
              onAction={() => onOpenSleepGraph('')}
              onItemClick={(date) => onOpenSleepGraph(date)}
              sortMode="key-desc"
              valueFormatter={(value) => formatDuration(value)}
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
            <MetricList title="Frequency over time" data={bruiseStats.frequencyOverTime} emptyLabel="No time distribution yet." sortMode="key-desc" />
          </>
        )}
      </section>
    </section>
  );
}

function ExportView({
  peeCount,
  noteCount,
  bmCount,
  weightCount,
  sleepCount,
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
          <StatCard label="Saved Pee entries" value={String(peeCount)} />
          <StatCard label="Saved Note entries" value={String(noteCount)} />
          <StatCard label="Saved BM entries" value={String(bmCount)} />
          <StatCard label="Saved Weight entries" value={String(weightCount)} />
          <StatCard label="Saved Sleep entries" value={String(sleepCount)} />
          <StatCard label="Saved Bruise entries" value={String(bruiseCount)} />
        </div>

        <div className="button-stack">
          <button type="button" className="primary-button" onClick={onDownloadJson}>
            Export JSON backup
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('peeEntries')}>
            Export Pee CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('noteEntries')}>
            Export Note CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('bmEntries')}>
            Export BM CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('weightEntries')}>
            Export Weight CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('sleepEntries')}>
            Export Sleep CSV
          </button>
          <button type="button" className="secondary-button" onClick={() => onDownloadCsv('bruiseEntries')}>
            Export Bruise CSV
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

function HelpView({ onBack }) {
  return (
    <section className="content-stack">
      <section className="panel">
        <div className="section-heading">
          <h2>How to use PB²Track</h2>
          <p>Use the home screen to add timers, notes, bruises, BM entries, weight entries, or sleep entries, then review them in Log, Insights, or Export.</p>
        </div>

        <div className="help-stack">
          <article className="help-card">
            <h3>Start and stop the pee timer</h3>
            <p>Tap `Start Timer`, then tap `Stop Timer` when finished. Review the entry in the pee modal and save it explicitly.</p>
          </article>

          <article className="help-card">
            <h3>Add note, bruise, BM, weight, or sleep entries</h3>
            <p>Use `Add Note`, `Add Bruise`, `Add BM`, `Add Weight`, or `Add Sleep` from Home. Notes support symptom, general, and pee-specific quick selectors. Weight defaults to lb with optional kg. Sleep uses a compact timing card with a tap-to-edit bottom sheet.</p>
          </article>

          <article className="help-card">
            <h3>Edit and delete from Log</h3>
            <p>Open `Log` to filter entries, edit saved records, or delete them with confirmation.</p>
          </article>

          <article className="help-card">
            <h3>View patterns in Insights</h3>
            <p>Insights shows counts, durations, tag frequency, weight trends, sleep quality patterns, and daily graphs for Pee, BM, Weight, and Sleep entries, plus Bruise trends. Weight math is normalized internally and the graph can switch between lb and kg display.</p>
          </article>

          <article className="help-card">
            <h3>Export regularly</h3>
            <p>Use `Export` to create CSV or JSON backups. JSON import can merge with or replace current local data.</p>
          </article>

          <article className="help-card">
            <h3>Your data is local only</h3>
            <p>PB²Track has no backend and no cloud sync. Entries live in IndexedDB on this device unless you export them yourself.</p>
          </article>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onBack}>
            Back to Home
          </button>
        </div>
      </section>
    </section>
  );
}

function PrintView({ peeStats, bmStats, weightStats, sleepStats, bruiseStats, entries, onBack }) {
  const noteCount = entries.filter((entry) => entry.logType === 'note').length;

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
        <h1>PB²Track Summary</h1>
        <p>{formatDateTime(new Date().toISOString())}</p>
      </header>

      <section className="print-section">
        <h2>Summary</h2>
        <div className="stats-grid">
          <StatCard label="Pee entries" value={String(peeStats.totalCount)} />
          <StatCard label="Note entries" value={String(noteCount)} />
          <StatCard label="Avg pee duration" value={<span className="time-code">{formatDuration(peeStats.averageDuration || 0)}</span>} />
          <StatCard label="BM entries" value={String(bmStats.totalCount)} />
          <StatCard label="Weight entries" value={String(weightStats.totalCount)} />
          <StatCard label="Sleep entries" value={String(sleepStats.totalCount)} />
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
  const heading = modal.mode === 'edit' ? 'Edit pee entry' : 'Save pee entry';

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
          <p className="selection-pill"><span className="time-code">{formatDuration(form.duration)}</span></p>
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

function NoteEntryModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.entry);

  useEffect(() => {
    setForm(modal.entry);
  }, [modal.entry]);

  if (!form) {
    return null;
  }

  const isEdit = modal.mode === 'edit' || modal.mode === 'legacy-edit';
  const quickTags =
    form.noteType === 'pee'
      ? PEE_TAGS
      : form.noteType === 'general'
        ? GENERAL_NOTE_TAGS
        : SYMPTOM_TAGS;
  const canSave = form.noteType === 'pee' ? form.timeUnknown || Boolean(form.occurredAt) : true;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="section-heading">
          <h2>{isEdit ? 'Edit note' : 'Add note'}</h2>
          <p>Track a symptom, a general note like water or medication, or a pee-related note.</p>
        </div>

        <div className="field">
          <span>Type</span>
          <div className="segmented wrap">
            {NOTE_TYPES.map((noteType) => (
              <button
                key={noteType}
                type="button"
                className={form.noteType === noteType ? 'segment active' : 'segment'}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    noteType,
                    tags:
                      current.noteType === noteType
                        ? current.tags
                        : [],
                    timeUnknown:
                      current.noteType === noteType ? current.timeUnknown : noteType === 'pee',
                    occurredAt:
                      noteType === 'pee' && current.noteType !== 'pee' ? '' : current.occurredAt,
                  }))
                }
              >
                {capitalize(noteType)}
              </button>
            ))}
          </div>
        </div>

        {form.noteType === 'pee' ? (
          <>
            <div className="field">
              <span>Pee time</span>
              <div className="segmented wrap">
                {[
                  ['na', 'N/A'],
                  ['known', 'Known'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className={
                      (value === 'na' ? form.timeUnknown : !form.timeUnknown) ? 'segment active' : 'segment'
                    }
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        timeUnknown: value === 'na',
                        occurredAt: value === 'na' ? '' : current.occurredAt || new Date().toISOString(),
                      }))
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {!form.timeUnknown && (
              <label className="field">
                <span>Occurred at</span>
                <input
                  type="datetime-local"
                  value={toInputDateTime(form.occurredAt)}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      occurredAt: fromInputDateTime(event.target.value),
                    }))
                  }
                />
              </label>
            )}

            <div className="field">
              <span>Duration</span>
              <p className="selection-pill">N/A</p>
            </div>
          </>
        ) : (
          <label className="field">
            <span>Occurred at</span>
            <input
              type="datetime-local"
              value={toInputDateTime(form.occurredAt)}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  occurredAt: fromInputDateTime(event.target.value),
                }))
              }
            />
          </label>
        )}

        <TagSelector
          label={
            form.noteType === 'pee'
              ? 'Pee tags'
              : form.noteType === 'general'
                ? 'Quick selectors'
                : 'Symptom quick selectors'
          }
          options={quickTags}
          selected={form.tags || []}
          onToggle={(tag) =>
            setForm((current) => ({
              ...current,
              tags: toggleTag(current.tags || [], tag),
            }))
          }
        />

        <label className="field">
          <span>Note</span>
          <textarea
            rows="4"
            value={form.freeTextNote}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                freeTextNote: event.target.value,
              }))
            }
          />
        </label>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => onSave(form)}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function BMEntryModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.entry);

  useEffect(() => {
    setForm(modal.entry);
  }, [modal.entry]);

  if (!form) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="section-heading">
          <h2>{modal.mode === 'edit' ? 'Edit BM entry' : 'Add BM'}</h2>
          <p>Save a bowel movement entry with size, tags, and an optional note.</p>
        </div>

        <label className="field">
          <span>Occurred at</span>
          <input
            type="datetime-local"
            value={toInputDateTime(form.occurredAt)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                occurredAt: fromInputDateTime(event.target.value),
              }))
            }
          />
        </label>

        <div className="field">
          <span>Size</span>
          <div className="segmented wrap">
            {BM_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                className={form.size === size ? 'segment active' : 'segment'}
                onClick={() => setForm((current) => ({ ...current, size }))}
              >
                {capitalize(size)}
              </button>
            ))}
          </div>
        </div>

        <TagSelector
          label="Tags"
          options={BM_TAGS}
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
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={() => onSave(form)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function WeightEntryModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.entry);

  useEffect(() => {
    setForm({ ...EMPTY_WEIGHT_FORM, ...modal.entry });
  }, [modal.entry]);

  if (!form) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="section-heading">
          <h2>{modal.mode === 'edit' ? 'Edit Weight entry' : 'Add Weight'}</h2>
          <p>Record a weight data point with an optional note.</p>
        </div>

        <label className="field">
          <span>Recorded at</span>
          <input
            type="datetime-local"
            value={toInputDateTime(form.occurredAt)}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                occurredAt: fromInputDateTime(event.target.value),
              }))
            }
          />
        </label>

        <label className="field">
          <span>Unit</span>
          <div className="segmented wrap">
            {['lb', 'kg'].map((unit) => (
              <button
                key={unit}
                type="button"
                className={form.weightUnit === unit ? 'segment active' : 'segment'}
                onClick={() => setForm((current) => ({ ...current, weightUnit: unit }))}
              >
                {unit}
              </button>
            ))}
          </div>
        </label>

        <label className="field">
          <span>{`Weight (${form.weightUnit || 'lb'})`}</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={form.weightValue}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                weightValue: event.target.value,
              }))
            }
          />
        </label>

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
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={() => onSave(form)}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepEntryModal({ modal, onClose, onSave }) {
  const [form, setForm] = useState(modal.entry);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    setForm({
      ...EMPTY_SLEEP_FORM,
      ...modal.entry,
      startTime: getSleepStart(modal.entry),
      endTime: getSleepEnd(modal.entry),
      durationMinutes: getSleepDurationMinutes(modal.entry),
    });
    setEditorOpen(false);
  }, [modal.entry]);

  if (!form) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet">
        <div className="section-heading">
          <h2>{modal.mode === 'edit' ? 'Edit Sleep entry' : 'Add Sleep'}</h2>
          <p>Track sleep or naps without having to edit two full date fields unless you want to.</p>
        </div>

        <button type="button" className="sleep-summary-card" onClick={() => setEditorOpen(true)}>
          <span className="sleep-summary-label">Sleep timing</span>
          <strong>{formatSleepSummary(form)}</strong>
          <span className="sleep-summary-meta">Tap to adjust duration or when it ended.</span>
        </button>

        <div className="field">
          <span>Quality</span>
          <div className="segmented wrap">
            {SLEEP_QUALITY_OPTIONS.map((quality) => (
              <button
                key={quality}
                type="button"
                className={form.quality === quality ? 'segment active' : 'segment'}
                onClick={() => setForm((current) => ({ ...current, quality }))}
              >
                {capitalize(quality)}
              </button>
            ))}
          </div>
        </div>

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
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={() => onSave(form)}>
            Save
          </button>
        </div>
      </div>

      {editorOpen && (
        <SleepTimingEditor
          value={form}
          onCancel={() => setEditorOpen(false)}
          onClear={() =>
            setForm((current) => ({
              ...current,
              ...createDefaultSleepTiming(),
            }))
          }
          onSave={(nextTiming) => {
            setForm((current) => ({
              ...current,
              ...nextTiming,
            }));
            setEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SleepTimingEditor({ value, onCancel, onClear, onSave }) {
  const [draft, setDraft] = useState(() => createSleepDraft(value));

  useEffect(() => {
    setDraft(createSleepDraft(value));
  }, [value]);

  const summary = formatSleepSummary(draft);

  function updateDurationMinutes(durationMinutes) {
    const nextDurationMinutes = clampDurationMinutes(durationMinutes);
    setDraft((current) => ({
      ...current,
      durationMinutes: nextDurationMinutes,
      startTime: subtractMinutes(current.endTime, nextDurationMinutes),
    }));
  }

  function updateEndTime(endTime, endedWhen = 'custom') {
    setDraft((current) => ({
      ...current,
      endedWhen,
      endTime,
      startTime: subtractMinutes(endTime, current.durationMinutes),
    }));
  }

  return (
    <div className="sheet-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet sheet-panel">
        <div className="section-heading">
          <h3>Edit sleep timing</h3>
          <p>{summary}</p>
        </div>

        <div className="field">
          <span>Quick duration</span>
          <div className="segmented wrap">
            {[
              [15, '15m'],
              [30, '30m'],
              [45, '45m'],
              [60, '1h'],
              [90, '1.5h'],
              [120, '2h'],
              [240, '4h'],
              [360, '6h'],
              [480, '8h'],
              [600, '10h'],
            ].map(([minutes, label]) => (
              <button
                key={label}
                type="button"
                className={draft.durationMinutes === minutes ? 'segment active' : 'segment'}
                onClick={() => updateDurationMinutes(minutes)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Ended when</span>
          <div className="segmented wrap">
            {[
              ['now', 0, 'Now'],
              ['15m', 15, '15m ago'],
              ['30m', 30, '30m ago'],
              ['1h', 60, '1h ago'],
              ['2h', 120, '2h ago'],
              ['custom', null, 'Custom'],
            ].map(([key, offsetMinutes, label]) => (
              <button
                key={key}
                type="button"
                className={draft.endedWhen === key ? 'segment active' : 'segment'}
                onClick={() =>
                  key === 'custom'
                    ? setDraft((current) => ({ ...current, endedWhen: 'custom' }))
                    : updateEndTime(new Date(Date.now() - offsetMinutes * 60 * 1000).toISOString(), key)
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <span>Exact input</span>
          <div className="duration-inputs">
            <label className="field compact-field">
              <span>Hours</span>
              <input
                type="number"
                min="0"
                value={Math.floor(draft.durationMinutes / 60)}
                onChange={(event) => {
                  const hours = Math.max(0, Number(event.target.value) || 0);
                  const minutes = draft.durationMinutes % 60;
                  updateDurationMinutes(hours * 60 + minutes);
                }}
              />
            </label>
            <label className="field compact-field">
              <span>Minutes</span>
              <input
                type="number"
                min="0"
                max="59"
                value={draft.durationMinutes % 60}
                onChange={(event) => {
                  const hours = Math.floor(draft.durationMinutes / 60);
                  const minutes = Math.min(59, Math.max(0, Number(event.target.value) || 0));
                  updateDurationMinutes(hours * 60 + minutes);
                }}
              />
            </label>
          </div>

          <label className="field">
            <span>Exact end date/time</span>
            <input
              type="datetime-local"
              value={toInputDateTime(draft.endTime)}
              onChange={(event) => updateEndTime(fromInputDateTime(event.target.value), 'custom')}
            />
          </label>
        </div>

        <div className="button-row">
          <button type="button" className="ghost-button" onClick={onClear}>
            Clear
          </button>
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() =>
              onSave({
                startTime: draft.startTime,
                endTime: draft.endTime,
                durationMinutes: clampDurationMinutes(draft.durationMinutes),
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ modal, onClose, onConfirm }) {
  const cancelLabel = modal.cancelLabel || 'Cancel';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet modal-sheet-sm">
        <div className="section-heading">
          <h2>{modal.title}</h2>
          <p>{modal.message}</p>
        </div>

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>
            {cancelLabel}
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

function PeeGraphModal({
  title,
  entriesByDay,
  barValueFormatter = (value) => String(value),
  detailFormatter = (value) => String(value),
  modal,
  onClose,
  onChange,
}) {
  const sortedDates = Object.keys(entriesByDay).sort((a, b) => new Date(a) - new Date(b));
  const latestDate = sortedDates[sortedDates.length - 1] || '';
  const activeDate = modal.selectedDate || latestDate;
  const filterDate = activeDate;
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

  const chartWidth = 720;
  const chartHeight = 260;
  const paddingX = 22;
  const paddingY = 20;
  const plotWidth = chartWidth - paddingX * 2;
  const plotHeight = chartHeight - paddingY * 2;
  const minCount = filteredEntries.length > 0 ? Math.min(...filteredEntries.map((item) => item.count)) : 0;
  const maxCount = filteredEntries.length > 0 ? Math.max(...filteredEntries.map((item) => item.count)) : 1;
  const chartMin = minCount > 0 && maxCount !== minCount ? minCount : 0;
  const chartRange = Math.max(maxCount - chartMin, 1);
  const chartPoints = filteredEntries.map((item, index) => {
    const x =
      filteredEntries.length === 1
        ? chartWidth / 2
        : paddingX + (index / (filteredEntries.length - 1)) * plotWidth;
    const y = chartHeight - paddingY - ((item.count - chartMin) / chartRange) * plotHeight;
    return { ...item, x, y };
  });
  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = chartPoints.length
    ? `${paddingX},${chartHeight - paddingY} ${linePoints} ${chartPoints[chartPoints.length - 1].x},${chartHeight - paddingY}`
    : '';

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-sheet chart-modal">
        <div className="section-heading">
          <h2>{title}</h2>
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

        {modal.kind === 'weight' && (
          <div className="field">
            <span>Display unit</span>
            <div className="segmented wrap">
              {['lb', 'kg'].map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={modal.weightUnit === unit ? 'segment active' : 'segment'}
                  onClick={() => onChange({ weightUnit: unit })}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        )}

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
            <p className="empty-state">No entries are available for the selected range.</p>
          ) : (
            <div className="chart-surface" aria-label={`${title} chart`}>
              <svg className="chart-svg" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-hidden="true">
                <defs>
                  <linearGradient id="chart-area-fill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="rgba(144, 169, 183, 0.28)" />
                    <stop offset="100%" stopColor="rgba(144, 169, 183, 0.03)" />
                  </linearGradient>
                </defs>
                <line
                  x1={paddingX}
                  y1={chartHeight - paddingY}
                  x2={chartWidth - paddingX}
                  y2={chartHeight - paddingY}
                  className="chart-axis-line"
                />
                {areaPoints && <polygon points={areaPoints} className="chart-area" />}
                {linePoints && <polyline points={linePoints} className="chart-line" />}
                {chartPoints.map((point) => (
                  <circle
                    key={point.date}
                    cx={point.x}
                    cy={point.y}
                    r={point.date === activeDate ? 8 : 5}
                    className={point.date === activeDate ? 'chart-point active' : 'chart-point'}
                  />
                ))}
              </svg>

              <div className="chart-chip-row">
                {chartPoints.map((point) => (
                  <button
                    key={point.date}
                    type="button"
                    className={point.date === activeDate ? 'chart-chip active' : 'chart-chip'}
                    onClick={() => onChange({ selectedDate: point.date })}
                  >
                    <span>{shortDate(point.date)}</span>
                    <strong>{barValueFormatter(point.count)}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeDate && (
          <div className="selection-pill detail-pill">
            {formatGraphDate(activeDate)}: {detailFormatter(entriesByDay[activeDate] || 0)}
          </div>
        )}

        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
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

function MetricList({ title, data, emptyLabel, actionLabel, onAction, onItemClick, sortMode = 'value-desc', valueFormatter }) {
  const entries = Object.entries(data || {}).sort((a, b) => {
    if (sortMode === 'key-desc') {
      return String(b[0]).localeCompare(String(a[0]));
    }

    return Number(b[1]) - Number(a[1]);
  });

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
                  <strong>{valueFormatter ? valueFormatter(value) : value}</strong>
                </button>
              ) : (
                <>
                  <span>{label}</span>
                  <strong>{valueFormatter ? valueFormatter(value) : value}</strong>
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

  const durationEntries = entries
    .filter((entry) => entry.duration !== null && entry.duration !== undefined && Number.isFinite(Number(entry.duration)))
    .map((entry) => Number(entry.duration))
    .sort((a, b) => a - b);
  const datedEntries = entries.filter((entry) => Boolean(entry.endTime || entry.startTime || entry.occurredAt));
  const totalDuration = durationEntries.reduce((sum, value) => sum + value, 0);
  const entriesByDay = groupCounts(datedEntries, (entry) =>
    formatDateOnly(entry.endTime || entry.startTime || entry.occurredAt)
  );
  const tagFrequency = {};

  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  return {
    totalCount: entries.length,
    averageDuration: durationEntries.length ? Math.round(totalDuration / durationEntries.length) : 0,
    medianDuration: median(durationEntries),
    shortest: durationEntries[0] || 0,
    longest: durationEntries[durationEntries.length - 1] || 0,
    frequencyPerDay: datedEntries.length / Math.max(1, Object.keys(entriesByDay).length),
    tagFrequency,
    entriesByDay,
  };
}

function buildBmStats(entries) {
  if (entries.length === 0) {
    return {
      totalCount: 0,
      frequencyPerDay: 0,
      tagFrequency: {},
      sizeFrequency: {},
      entriesByDay: {},
    };
  }

  const entriesByDay = groupCounts(entries, (entry) => formatDateOnly(entry.occurredAt || entry.createdAt));
  const tagFrequency = {};
  const sizeFrequency = groupCounts(entries, (entry) => entry.size || 'medium');

  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1;
    });
  });

  return {
    totalCount: entries.length,
    frequencyPerDay: entries.length / Math.max(1, Object.keys(entriesByDay).length),
    tagFrequency,
    sizeFrequency,
    entriesByDay,
  };
}

function buildWeightStats(entries) {
  if (entries.length === 0) {
    return {
      totalCount: 0,
      latestValueKg: 0,
      averageValueKg: 0,
      lowestValueKg: 0,
      highestValueKg: 0,
      entriesByDay: {},
    };
  }

  const values = entries
    .map((entry) => convertWeightToKg(entry.weightValue, entry.weightUnit || 'lb'))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const latestEntry = [...entries].sort(
    (a, b) =>
      new Date(b.occurredAt || b.createdAt || 0).getTime() - new Date(a.occurredAt || a.createdAt || 0).getTime()
  )[0];

  return {
    totalCount: entries.length,
    latestValueKg: convertWeightToKg(latestEntry?.weightValue, latestEntry?.weightUnit || 'lb'),
    averageValueKg: average(values),
    lowestValueKg: values[0] || 0,
    highestValueKg: values[values.length - 1] || 0,
    entriesByDay: buildLatestValueByDay(
      entries,
      (entry) => entry.occurredAt || entry.createdAt,
      (entry) => convertWeightToKg(entry.weightValue, entry.weightUnit || 'lb')
    ),
  };
}

function buildSleepStats(entries) {
  if (entries.length === 0) {
    return {
      totalCount: 0,
      averageDuration: 0,
      medianDuration: 0,
      shortest: 0,
      longest: 0,
      qualityFrequency: {},
      durationByDay: {},
    };
  }

  const durations = entries.map((entry) => getSleepDurationMs(entry)).sort((a, b) => a - b);
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);

  return {
    totalCount: entries.length,
    averageDuration: Math.round(totalDuration / entries.length),
    medianDuration: median(durations),
    shortest: durations[0] || 0,
    longest: durations[durations.length - 1] || 0,
    qualityFrequency: groupCounts(entries, (entry) => capitalize(entry.quality || 'okay')),
    durationByDay: sumValuesByDay(
      entries,
      (entry) => getSleepEnd(entry) || getSleepStart(entry) || entry.createdAt,
      (entry) => getSleepDurationMs(entry)
    ),
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
      : storeName === 'noteEntries'
        ? ['id', 'createdAt', 'updatedAt', 'occurredAt', 'noteType', 'tags', 'timeUnknown', 'freeTextNote']
      : storeName === 'bmEntries'
        ? ['id', 'createdAt', 'updatedAt', 'occurredAt', 'size', 'tags', 'freeTextNote']
        : storeName === 'weightEntries'
          ? ['id', 'createdAt', 'updatedAt', 'occurredAt', 'weightUnit', 'weightValue', 'freeTextNote']
        : storeName === 'sleepEntries'
          ? ['id', 'createdAt', 'updatedAt', 'startTime', 'endTime', 'durationMinutes', 'quality', 'freeTextNote']
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

function buildLatestValueByDay(items, getDate, getValue) {
  const values = {};

  items.forEach((item) => {
    const timestamp = getDate(item) || item.createdAt;
    const dateKey = formatDateOnly(timestamp);
    const value = Number(getValue(item)) || 0;
    const time = new Date(timestamp || 0).getTime();
    const current = values[dateKey];

    if (!current || time >= current.time) {
      values[dateKey] = { time, value };
    }
  });

  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.value]));
}

function sumValuesByDay(items, getDate, getValue) {
  return items.reduce((values, item) => {
    const dateKey = formatDateOnly(getDate(item) || item.createdAt);
    values[dateKey] = (values[dateKey] || 0) + (Number(getValue(item)) || 0);
    return values;
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

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function entryTitle(entry) {
  if (entry.logType === 'bruise') {
    return `Bruise · ${capitalize(entry.bodySide)} ${displayRegion(entry)}`;
  }

  if (entry.logType === 'note') {
    return entry.noteType === 'pee' && entry.timeUnknown
      ? 'Pee note · N/A time'
      : `${capitalize(entry.noteType || 'symptom')} note`;
  }

  if (entry.logType === 'bm') {
    return `BM entry · ${capitalize(entry.size)}`;
  }

  if (entry.logType === 'weight') {
    return `Weight · ${formatWeightValue(entry.weightValue, entry.weightUnit || 'lb')}`;
  }

  if (entry.logType === 'sleep') {
    return (
      <>
        Sleep · <span className="time-code inline-time">{formatDuration(getSleepDurationMs(entry))}</span>
      </>
    );
  }

  if (entry.entryMode === 'note') {
    return 'Quick note';
  }

  return (
    <>
      Pee entry · <span className="time-code inline-time">{formatDuration(entry.duration)}</span>
    </>
  );
}

function entrySummary(entry, options = {}) {
  const { suppressTagEcho = false } = options;

  if (entry.logType === 'bruise') {
    const parts = [capitalize(entry.size), entry.status];
    if (entry.note) {
      parts.push(entry.note);
    } else if (entry.causeDescription) {
      parts.push(entry.causeDescription);
    }
    return parts.join(' · ');
  }

  if (entry.logType === 'bm') {
    if (entry.freeTextNote) {
      return entry.freeTextNote;
    }

    if (suppressTagEcho) {
      return '';
    }

    return entry.tags?.length ? entry.tags.join(', ') : 'No tags';
  }

  if (entry.logType === 'note') {
    if (entry.freeTextNote) {
      return entry.freeTextNote;
    }

    if (entry.noteType === 'pee' && entry.timeUnknown) {
      return 'Manual pee note with no recorded time.';
    }

    return `${capitalize(entry.noteType || 'symptom')} note.`;
  }

  if (entry.logType === 'weight') {
    return entry.freeTextNote || 'Recorded weight entry.';
  }

  if (entry.logType === 'sleep') {
    const parts = [capitalize(entry.quality || 'okay')];
    parts.unshift(formatSleepSummary(entry));
    if (entry.freeTextNote) {
      parts.push(entry.freeTextNote);
    }
    return parts.join(' · ');
  }

  if (entry.entryMode === 'note') {
    return entry.freeTextNote || 'Note-only entry.';
  }

  if (entry.freeTextNote) {
    return entry.freeTextNote;
  }

  if (suppressTagEcho) {
    return '';
  }

  return entry.tags?.length ? entry.tags.join(', ') : 'No tags';
}

function displayRegion(entry) {
  const region = BODY_REGIONS.find((item) => item.key === entry.regionKey);
  return region ? region.label : 'Unknown region';
}

function getSleepStart(entry) {
  return entry?.startTime || entry?.sleepStart || '';
}

function getSleepEnd(entry) {
  return entry?.endTime || entry?.sleepEnd || '';
}

function getSleepDurationMinutes(entry) {
  if (entry?.durationMinutes !== undefined && entry?.durationMinutes !== null) {
    return clampDurationMinutes(entry.durationMinutes);
  }

  if (entry?.duration !== undefined && entry?.duration !== null) {
    return clampDurationMinutes(Math.round(Number(entry.duration || 0) / (60 * 1000)));
  }

  const startTime = getSleepStart(entry);
  const endTime = getSleepEnd(entry);
  if (!startTime || !endTime) {
    return 0;
  }

  return clampDurationMinutes((new Date(endTime).getTime() - new Date(startTime).getTime()) / (60 * 1000));
}

function getSleepDurationMs(entry) {
  return getSleepDurationMinutes(entry) * 60 * 1000;
}

function clampDurationMinutes(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function subtractMinutes(value, minutes) {
  return new Date(new Date(value).getTime() - clampDurationMinutes(minutes) * 60 * 1000).toISOString();
}

function createDefaultSleepTiming() {
  const endTime = new Date().toISOString();
  const durationMinutes = 8 * 60;
  return {
    startTime: subtractMinutes(endTime, durationMinutes),
    endTime,
    durationMinutes,
  };
}

function createSleepDraft(entry) {
  const defaults = createDefaultSleepTiming();

  return {
    ...defaults,
    ...entry,
    startTime: getSleepStart(entry) || defaults.startTime,
    endTime: getSleepEnd(entry) || defaults.endTime,
    durationMinutes: getSleepDurationMinutes(entry) || defaults.durationMinutes,
    endedWhen: 'custom',
  };
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
    return `${String(hours).padStart(2, '0')}h:${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
  }

  return `${String(minutes).padStart(2, '0')}m:${String(seconds).padStart(2, '0')}s`;
}

function formatMinutesLabel(totalMinutes) {
  const minutes = clampDurationMinutes(totalMinutes);
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours > 0 && remainder > 0) {
    return `${hours}h ${remainder}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${remainder}m`;
}

function formatSleepSummary(entry) {
  const startTime = getSleepStart(entry);
  const endTime = getSleepEnd(entry);
  const durationMinutes = getSleepDurationMinutes(entry);

  if (!startTime || !endTime) {
    return `Sleep: duration ${formatMinutesLabel(durationMinutes)}`;
  }

  return `Sleep: ${formatClockTime(startTime)} -> ${formatClockTime(endTime)} (${formatMinutesLabel(durationMinutes)})`;
}

function convertWeightToKg(value, unit = 'lb') {
  const numericValue = Number(value) || 0;
  return unit === 'kg' ? numericValue : numericValue * 0.45359237;
}

function convertWeightFromKg(valueKg, unit = 'lb') {
  const numericValue = Number(valueKg) || 0;
  return unit === 'kg' ? numericValue : numericValue / 0.45359237;
}

function formatWeightValue(value, unit = 'lb') {
  return `${formatWeightShort(value, unit)} ${unit}`;
}

function formatWeightShort(value, unit = 'lb') {
  const numericValue = Number(value) || 0;
  const precision = unit === 'kg' ? 1 : 1;
  return numericValue % 1 === 0 ? numericValue.toFixed(0) : numericValue.toFixed(precision);
}

function formatSleepHours(durationMs) {
  const hours = (Number(durationMs) || 0) / (60 * 60 * 1000);
  return `${hours.toFixed(hours >= 10 ? 0 : 1)}h`;
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

function formatClockTime(value) {
  if (!value) {
    return '--';
  }

  return new Intl.DateTimeFormat(undefined, {
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
  const allowed = new Set(['home', 'bruise', 'log', 'insights', 'export', 'help', 'print']);
  return allowed.has(hash) ? hash : 'home';
}

export default App;
