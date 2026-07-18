'use strict';

/* =====================================================
   Stemma · Training & Fortschritt
   Trainingsplan-App mit Auto-Progression.
   Speichert alles lokal im Browser (localStorage).
   Hinweis: Der Speicher-Schlüssel bleibt aus
   Kompatibilitätsgründen "mein-training-v1".
   ===================================================== */

const STORAGE_KEY = 'mein-training-v1';
const CURRENT_DATA_VERSION = 9;   /* Version des gespeicherten Datenformats (v8: + weights, v9: + rot/Rest-Days) */
const BACKUP_FORMAT_VERSION = 1;  /* Version der Backup-Datei-Hülle */
const PREIMPORT_KEY = STORAGE_KEY + '-vor-import';
const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const MONTHS_LONG = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/* Ruhige Tipps für Ruhetage (rotieren nach Datum) */
const REST_TIPS = [
  '💤 Muskeln wachsen im Schlaf: heute lohnt sich Früh-ins-Bett besonders.',
  '🥚 Eiweiß hilft beim Erholen: am besten über den Tag verteilt eine Portion pro Mahlzeit.',
  '🚶 Ein lockerer Spaziergang fördert die Durchblutung und nimmt dem Muskelkater die Spitze.',
  '💧 Viel trinken: auch Regeneration braucht Wasser.',
  '🧘 5 Minuten lockeres Dehnen zählen heute mehr als jedes schwere Gewicht.',
  '😌 Ruhetage sind Teil des Trainings: wer pausiert, wird stärker.'
];

/* ===== Kleine Helfer ===== */

function uid() {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function todayISO() {
  return isoOf(new Date());
}

/* JS-Wochentag (0=So) auf unseren Index (0=Mo) umrechnen */
function dayIdx(d) {
  return (d.getDay() + 6) % 7;
}

function mondayOfCurrentWeek() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayIdx(d));
  return d;
}

function fmtDate(iso) {
  const parts = iso.split('-').map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return WEEKDAYS_SHORT[dayIdx(d)] + '., ' + String(parts[2]).padStart(2, '0') + '.' + String(parts[1]).padStart(2, '0') + '.' + parts[0];
}

function num(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return parseFloat(String(v).replace(',', '.'));
}

/* ===== Standard-Pläne ===== */

function ex(name, sets, reps) {
  return { id: uid(), name: name, sets: sets, reps: reps };
}

function defaultPlans() {
  return {
    '3x': {
      label: '3× pro Woche',
      days: [
        {
          id: 'A', short: 'Tag A', name: 'Brust & Druck', weekday: 0,
          exercises: [
            ex('Bankdrücken (Langhantel)', 3, '8-10'),
            ex('Schrägbankdrücken (Kurzhanteln)', 3, '8-10'),
            ex('Butterfly', 2, '12-15'),
            ex('Schulterdrücken (Kurzhanteln)', 3, '8-10'),
            ex('Seitheben', 4, '12-15'),
            ex('Trizepsdrücken am Kabel', 3, '10-12')
          ]
        },
        {
          id: 'B', short: 'Tag B', name: 'Rücken & Zug', weekday: 2,
          exercises: [
            ex('Latzug zur Brust', 3, '8-10'),
            ex('Rudern am Kabel', 3, '8-10'),
            ex('Einarmiges Kurzhantel-Rudern', 3, '10-12'),
            ex('Face Pulls', 3, '12-15'),
            ex('Bizeps-Curls (Kurzhanteln)', 3, '10-12'),
            ex('Kabel-Crunch', 3, '12-15')
          ]
        },
        {
          id: 'C', short: 'Tag C', name: 'Beine & Core', weekday: 4,
          exercises: [
            ex('Beinpresse', 3, '10-12'),
            ex('Hip Thrust (Langhantel)', 3, '10-12'),
            ex('Beinstrecker', 3, '12-15'),
            ex('Beinbeuger sitzend', 3, '12-15'),
            ex('Adduktoren-Maschine', 2, '12-15'),
            ex('Abduktoren-Maschine', 2, '12-15'),
            ex('Wadenheben', 3, '15-20')
          ]
        }
      ]
    },
    '5x': {
      label: '5× pro Woche',
      days: [
        {
          id: 'P1', short: 'Push', name: 'Brust, Schultern, Trizeps', weekday: 0,
          exercises: [
            ex('Bankdrücken (Langhantel)', 3, '8-10'),
            ex('Schulterdrücken (Kurzhanteln)', 3, '8-10'),
            ex('Schrägbankdrücken (Kurzhanteln)', 3, '10-12'),
            ex('Seitheben', 3, '12-15'),
            ex('Trizepsdrücken am Kabel', 3, '10-12')
          ]
        },
        {
          id: 'P2', short: 'Pull', name: 'Rücken & Bizeps', weekday: 1,
          exercises: [
            ex('Latzug zur Brust', 3, '8-10'),
            ex('Rudern am Kabel', 3, '8-10'),
            ex('Einarmiges Kurzhantel-Rudern', 3, '10-12'),
            ex('Face Pulls', 3, '12-15'),
            ex('Bizeps-Curls (Kurzhanteln)', 3, '10-12')
          ]
        },
        {
          id: 'P3', short: 'Beine', name: 'Beine & Waden', weekday: 2,
          exercises: [
            ex('Beinpresse', 3, '10-12'),
            ex('Beinstrecker', 3, '12-15'),
            ex('Beinbeuger sitzend', 3, '12-15'),
            ex('Adduktoren-Maschine', 2, '12-15'),
            ex('Wadenheben', 3, '15-20')
          ]
        },
        {
          id: 'P4', short: 'Oberkörper', name: 'Ganzer Oberkörper', weekday: 3,
          exercises: [
            ex('Bankdrücken (Kurzhanteln)', 3, '8-10'),
            ex('Latzug (enger Griff)', 3, '8-10'),
            ex('Schulterdrücken (Maschine)', 3, '10-12'),
            ex('Butterfly', 3, '12-15'),
            ex('Seitheben', 2, '12-15'),
            ex('Hammer-Curls', 3, '10-12')
          ]
        },
        {
          id: 'P5', short: 'Unterkörper', name: 'Beine & Core', weekday: 4,
          exercises: [
            ex('Goblet Squats', 3, '10-12'),
            ex('Ausfallschritte', 3, '10-12'),
            ex('Hip Thrust (Langhantel)', 3, '10-12'),
            ex('Beinbeuger sitzend', 3, '12-15'),
            ex('Abduktoren-Maschine', 2, '12-15'),
            ex('Wadenheben sitzend', 3, '15-20'),
            ex('Kabel-Crunch', 3, '12-15')
          ]
        }
      ]
    }
  };
}

/* ===== Zustand laden / speichern ===== */

let state = null;

function defaultState() {
  return { mode: '3x', plans: defaultPlans(), logs: [], draft: null };
}

let corruptBackupMade = false;

function loadState() {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
    /* Beschädigte Daten NICHT wegwerfen: Rohdaten sichern, dann frisch starten */
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        localStorage.setItem(STORAGE_KEY + '-defekt-' + Date.now(), raw);
        corruptBackupMade = true;
      }
    } catch (e2) { /* Speicher voll: mehr geht nicht */ }
    s = null;
  }
  if (!s || typeof s !== 'object') s = defaultState();

  const def = defaultState();
  if (s.mode !== '3x' && s.mode !== '5x') s.mode = '3x';
  if (!s.plans || typeof s.plans !== 'object') s.plans = {};
  ['3x', '5x'].forEach(function (k) {
    if (!s.plans[k] || !Array.isArray(s.plans[k].days)) s.plans[k] = def.plans[k];
  });
  if (!Array.isArray(s.logs)) s.logs = [];

  /* Migration v8 (16.07.2026): wöchentliches Gewichts-Tracking.
     Rückwärtskompatibel: fehlt das Feld, wird es leer angelegt;
     ungültige Einträge werden defensiv verworfen. */
  if (!Array.isArray(s.weights)) s.weights = [];
  s.weights = s.weights.filter(function (w) {
    return w && typeof w === 'object' &&
      typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date) &&
      typeof w.kg === 'number' && !isNaN(w.kg) && w.kg >= 30 && w.kg <= 300;
  });
  s.weights.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

  /* Migration v9 (16.07.2026): rotierender Plan + zusätzliche Rest Days.
     Rückwärtskompatibel: fehlt das Feld, wird es leer angelegt. */
  if (!s.rot || typeof s.rot !== 'object' || Array.isArray(s.rot)) s.rot = {};
  if (!Array.isArray(s.rot.rests)) s.rot.rests = [];
  s.rot.rests = s.rot.rests.filter(function (r) {
    return r && typeof r === 'object' &&
      typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
      typeof r.dayId === 'string';
  }).slice(-400);
  s.rot.rests.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

  /* Angefangenes Training nur am selben Tag fortsetzen */
  if (s.draft && s.draft.date !== todayISO()) s.draft = null;

  /* Migration v1 → v2: neue Felder ergänzen, nichts löschen */
  if (typeof s.version !== 'number') s.version = 1;
  if (!s.settings || typeof s.settings !== 'object') s.settings = {};
  if (typeof s.settings.autoTimer !== 'boolean') s.settings.autoTimer = true;
  if (typeof s.settings.timerSound !== 'boolean') s.settings.timerSound = true;
  if (typeof s.settings.rirHintSeen !== 'boolean') s.settings.rirHintSeen = false;
  if (typeof s.settings.targetWeightKg !== 'number' || isNaN(s.settings.targetWeightKg) || s.settings.targetWeightKg < 30 || s.settings.targetWeightKg > 300) s.settings.targetWeightKg = null;
  if (typeof s.settings.rotationMode !== 'boolean') s.settings.rotationMode = false;
  if (typeof s.settings.bodyWeight !== 'number' || isNaN(s.settings.bodyWeight)) s.settings.bodyWeight = 80;
  if (typeof s.settings.onboarded !== 'boolean') s.settings.onboarded = false;
  ['3x', '5x'].forEach(function (k) {
    s.plans[k].days.forEach(function (d) {
      d.exercises.forEach(function (e) {
        if (typeof e.workWeight !== 'number' || isNaN(e.workWeight)) e.workWeight = null;
        if (typeof e.failStreak !== 'number') e.failStreak = 0;
        if (typeof e.lastResult !== 'string') e.lastResult = '';
      });
    });
  });
  if (s.draft && Array.isArray(s.draft.entries)) {
    if (typeof s.draft.startedAt !== 'number') s.draft.startedAt = Date.now();
    if (!s.draft.cardio || typeof s.draft.cardio !== 'object') s.draft.cardio = { type: '', minutes: '' };
    s.draft.entries.forEach(function (en) {
      (en.sets || []).forEach(function (st) { st.warmup = !!st.warmup; });
      if (!en.banner || typeof en.banner.text !== 'string') en.banner = { cls: 'hold', text: '🎯 Weiter geht’s: nah ans Limit (1-2 Wdh. Reserve).' };
      if (typeof en.rest !== 'number') en.rest = 90;
    });
  }

  /* Migration v3 (08.07.2026): Isolation für Po/Adduktoren/Brust in
     bestehende Pläne ergänzen. Nur wenn die Übung im Modus noch fehlt. */
  if (s.version < 3) {
    const addEx = function (mode, dayId, name, sets, reps) {
      const plan = s.plans[mode];
      if (!plan || !Array.isArray(plan.days)) return;
      const exists = plan.days.some(function (d) {
        return d.exercises.some(function (e) { return e.name === name; });
      });
      if (exists) return;
      const day = plan.days.find(function (d) { return d.id === dayId; });
      if (!day) return;
      const ne = ex(name, sets, reps);
      ne.workWeight = null;
      ne.failStreak = 0;
      ne.lastResult = '';
      day.exercises.push(ne);
    };
    addEx('3x', 'A', 'Butterfly', 2, '12-15');
    addEx('3x', 'C', 'Hip Thrust (Langhantel)', 3, '10-12');
    addEx('3x', 'C', 'Adduktoren-Maschine', 2, '12-15');
    addEx('3x', 'C', 'Abduktoren-Maschine', 2, '12-15');
    addEx('5x', 'P3', 'Adduktoren-Maschine', 2, '12-15');
    addEx('5x', 'P5', 'Hip Thrust (Langhantel)', 3, '10-12');
    addEx('5x', 'P5', 'Abduktoren-Maschine', 2, '12-15');
  }

  /* Migration v7 (12.07.2026): Produkt-Verallgemeinerung.
     Bestehende Nutzer behalten ihr Verhalten: Wochenziel wird aus dem
     vorhandenen Plan abgeleitet, nichts wird überschrieben. */
  if (typeof s.settings.weeklyTarget !== 'number' || s.settings.weeklyTarget < 1) {
    s.settings.weeklyTarget = Math.min(6, Math.max(2, s.plans[s.mode].days.length));
  }
  if (!Array.isArray(s.settings.pausedWeeks)) s.settings.pausedWeeks = [];
  if (typeof s.settings.showStreak !== 'boolean') s.settings.showStreak = true;
  if (typeof s.settings.goal !== 'string') s.settings.goal = 'fitness';
  if (typeof s.settings.experience !== 'string') s.settings.experience = 'wiedereinstieg';
  if (typeof s.settings.location !== 'string') s.settings.location = 'gym';

  s.version = CURRENT_DATA_VERSION;
  return s;
}

/* Heim-Preset: Ganzkörper-Split nur mit Kurzhanteln und Körpergewicht */
function homePlanDays() {
  const days = [
    {
      id: 'A', short: 'Tag A', name: 'Brust & Druck', weekday: 0,
      exercises: [
        ex('Bankdrücken (Kurzhanteln)', 3, '8-10'),
        ex('Fliegende (Kurzhanteln)', 2, '12-15'),
        ex('Schulterdrücken (Kurzhanteln)', 3, '8-10'),
        ex('Seitheben', 3, '12-15'),
        ex('Liegestütze', 3, '8-15')
      ]
    },
    {
      id: 'B', short: 'Tag B', name: 'Rücken & Zug', weekday: 2,
      exercises: [
        ex('Einarmiges Kurzhantel-Rudern', 3, '10-12'),
        ex('Vorgebeugtes Seitheben (Kurzhanteln)', 3, '12-15'),
        ex('Bizeps-Curls (Kurzhanteln)', 3, '10-12'),
        ex('Hammer-Curls', 3, '10-12')
      ]
    },
    {
      id: 'C', short: 'Tag C', name: 'Beine, Po & Core', weekday: 4,
      exercises: [
        ex('Goblet Squats', 3, '10-12'),
        ex('Ausfallschritte', 3, '10-12'),
        ex('Glute Bridge', 3, '12-15'),
        ex('Wadenheben', 3, '15-20'),
        ex('Crunches', 3, '12-20')
      ]
    }
  ];
  days.forEach(function (d) {
    d.exercises.forEach(function (e) {
      e.workWeight = null;
      e.failStreak = 0;
      e.lastResult = '';
    });
  });
  return days;
}

function getWeeklyTarget() {
  return state.settings.weeklyTarget || currentPlan().days.length || 3;
}

let saveWarned = false;

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
    if (!saveWarned) {
      saveWarned = true;
      try { toast('⚠️ Speichern fehlgeschlagen! Speicher voll oder privater Modus?'); } catch (e2) { /* Toast noch nicht bereit */ }
    }
  }
}

/* ===== Abfragen ===== */

function currentPlan() {
  return state.plans[state.mode];
}

function dayTitle(day) {
  return day.short + ' · ' + day.name;
}

function findDay(dayId) {
  return currentPlan().days.find(function (d) { return d.id === dayId; });
}

/* Letzten Log-Eintrag zu einer Übung suchen (neuester zuerst) */
function lastEntryForExercise(exercise) {
  for (let i = state.logs.length - 1; i >= 0; i--) {
    const log = state.logs[i];
    const entry = log.entries.find(function (en) {
      return en.exId === exercise.id || en.name === exercise.name;
    });
    if (entry) return { entry: entry, date: log.date };
  }
  return null;
}

function formatLastInfo(last) {
  const parts = last.entry.sets
    .filter(function (s) { return !s.warmup && (s.weight !== '' || s.reps !== ''); })
    .map(function (s) { return (s.weight !== '' ? s.weight : '–') + ' kg × ' + (s.reps !== '' ? s.reps : '–'); });
  if (parts.length === 0) return null;
  return 'Letztes Mal (' + fmtDate(last.date) + '): ' + parts.join('  |  ');
}

function distinctLogDates(fromIso, toIso) {
  const dates = {};
  state.logs.forEach(function (l) {
    if (l.date >= fromIso && l.date <= toIso) dates[l.date] = true;
  });
  return Object.keys(dates);
}

function trainingDaysInWeek(mondayDate) {
  const sun = new Date(mondayDate);
  sun.setDate(mondayDate.getDate() + 6);
  return distinctLogDates(isoOf(mondayDate), isoOf(sun)).length;
}

/* ===== Rotierender Plan + zusätzliche Rest Days ===== */

/* Nächste offene Einheit: die Einheit NACH der zuletzt absolvierten,
   in der Reihenfolge des Plans, unabhängig vom Wochentag. Nichts wird
   kopiert oder übersprungen: ein Rest Day lässt dieselbe Einheit einfach
   auf den nächsten Tag rücken. */
function rotDue() {
  const plan = currentPlan();
  if (!plan.days.length) return null;
  let idx = -1;
  for (let i = state.logs.length - 1; i >= 0; i--) {
    const l = state.logs[i];
    if (l.mode && l.mode !== state.mode) continue;
    for (let j = 0; j < plan.days.length; j++) {
      if (plan.days[j].id === l.dayId) { idx = j; break; }
    }
    if (idx !== -1) break;
  }
  const nextIdx = idx === -1 ? 0 : (idx + 1) % plan.days.length;
  return plan.days[nextIdx];
}

function restForDate(iso) {
  for (let i = state.rot.rests.length - 1; i >= 0; i--) {
    if (state.rot.rests[i].date === iso) return state.rot.rests[i];
  }
  return null;
}

function restReasonLabel(id) {
  const r = REST_REASONS.find(function (x) { return x.id === id; });
  return r ? r.label : '';
}

/* Zusätzliche Rest Days einer Kalenderwoche (für die faire Serien-Wertung) */
function extraRestsInWeek(mondayDate) {
  const sun = new Date(mondayDate);
  sun.setDate(mondayDate.getDate() + 6);
  const mi = isoOf(mondayDate), si = isoOf(sun);
  return state.rot.rests.filter(function (r) { return r.date >= mi && r.date <= si; }).length;
}

/* Wochenziel einer konkreten Woche: bewusste Rest Days senken das Ziel,
   statt als versäumtes Training zu zählen (nie unter 1). */
function effTargetForWeek(mondayDate) {
  return Math.max(1, getWeeklyTarget() - extraRestsInWeek(mondayDate));
}

/* Wochen-Serie: wie viele Wochen in Folge wurde das Wochenziel erreicht?
   Die laufende Woche zählt mit, sobald sie erfüllt ist, bricht die Serie
   aber nicht ab, solange sie noch läuft. Bewusste Rest Days senken das
   Ziel der jeweiligen Woche (siehe effTargetForWeek). */
function weekStreak() {
  const paused = state.settings.pausedWeeks || [];
  const mon = mondayOfCurrentWeek();
  let streak = 0;
  if (paused.indexOf(isoOf(mon)) === -1 && trainingDaysInWeek(mon) >= effTargetForWeek(mon)) streak++;
  for (let w = 1; w < 520; w++) {
    const m = new Date(mon);
    m.setDate(mon.getDate() - 7 * w);
    if (paused.indexOf(isoOf(m)) !== -1) continue; /* Pausenwoche zählt neutral */
    if (trainingDaysInWeek(m) >= effTargetForWeek(m)) streak++;
    else break;
  }
  return streak;
}

function totalVolume() {
  let v = 0;
  state.logs.forEach(function (l) { v += logStats(l).volume; });
  return v;
}

function totalPRs() {
  let n = 0;
  state.logs.forEach(function (l) {
    if (Array.isArray(l.results)) l.results.forEach(function (r) { if (r.isPR) n++; });
  });
  return n;
}

function fmtVolume(kg) {
  if (kg >= 10000) return (Math.round(kg / 100) / 10).toLocaleString('de-DE') + ' t';
  return kg.toLocaleString('de-DE') + ' kg';
}

/* ===== Ansichten-Steuerung ===== */

let currentView = 'heute';
let editingDayId = null;
let editingCopy = null;
let expandedLogId = null;
let chartExName = null;
let chartSelIdx = null;
let planOpenDayId = null;            /* null = automatisch (heutiger/nächster Tag), 'none' = alle zu */
let weekChartMode = 'freq';          /* Wochen-Chart: 'freq' oder 'vol' */
const mehrOpen = { rir: false, wissen: false, schutz: false, gefahr: false }; /* eingeklappte Bereiche in „Mehr" */
let wtSelIdx = null;                 /* ausgewählter Punkt im Gewichts-Chart */
let wtListOpen = false;              /* Einträge-Liste im Gewichts-Bereich auf/zu */
let weightModalFlags = [];           /* gewählte Umstände im Gewichts-Dialog */

let restModalReason = '';            /* gewählter Grund im Rest-Day-Dialog */

/* Gründe für einen zusätzlichen Rest Day (optional, KEINE Diagnose) */
const REST_REASONS = [
  { id: 'kater', label: '💪 Muskelkater' },
  { id: 'erschoepft', label: '🥱 Erschöpfung' },
  { id: 'schlaf', label: '😴 Schlafmangel' },
  { id: 'schmerz', label: '⚠️ Schmerzen / Beschwerden' },
  { id: 'zeit', label: '⏰ Zeitmangel' },
  { id: 'sonst', label: '📝 Sonstiger Grund' }
];

/* Besondere Umstände beim Wiegen (rein optional, erklären Ausreißer) */
const WEIGHT_FLAGS = [
  { id: 'salz', label: '🧂 Salzreich gegessen' },
  { id: 'schlaf', label: '😴 Schlechte Nacht' },
  { id: 'krank', label: '🤒 Krank' },
  { id: 'reise', label: '🧳 Reise' },
  { id: 'kater', label: '💪 Starker Muskelkater' },
  { id: 'zeit', label: '⏰ Andere Uhrzeit' }
];

/* Bildschirm während des Trainings anlassen (Wake Lock) */
let wakeLock = null;

function acquireWakeLock() {
  if (!('wakeLock' in navigator)) return;
  navigator.wakeLock.request('screen').then(function (lock) {
    wakeLock = lock;
  }).catch(function () { /* nicht unterstützt oder abgelehnt: kein Problem */ });
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release().catch(function () {});
    wakeLock = null;
  }
}

function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(function (v) {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
  document.querySelectorAll('.tabbar button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.view === name);
  });
  document.body.classList.toggle('workout-open', name === 'workout');

  /* Einblend-Animation nur beim Ansichtswechsel, nicht bei jedem Neuzeichnen */
  const view = document.getElementById('view-' + name);
  if (view && name !== 'workout') {
    view.classList.add('anim');
    setTimeout(function () { view.classList.remove('anim'); }, 700);
  }

  if (name === 'workout') acquireWakeLock();
  else releaseWakeLock();

  render(name);
  window.scrollTo(0, 0);
}

function render(name) {
  if (name === 'heute') renderHeute();
  else if (name === 'plan') renderPlan();
  else if (name === 'verlauf') renderVerlauf();
  else if (name === 'mehr') renderMehr();
  else if (name === 'workout') renderWorkout();
}

function rerender() {
  render(currentView);
}

/* ===== Ansicht: Heute ===== */

function renderHeute() {
  const plan = currentPlan();
  const tIdx = dayIdx(new Date());
  const todayIso = todayISO();
  const monday = mondayOfCurrentWeek();

  /* Wochen-Strip */
  let strip = '<div class="week-strip">';
  const weekIsos = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = isoOf(d);
    weekIsos.push(iso);
    const trained = state.logs.some(function (l) { return l.date === iso; });
    const isTrainDay = state.settings.rotationMode
      ? (iso === todayIso && !trained && !restForDate(todayIso)) /* Rotation: nur „heute fällig" markieren */
      : plan.days.some(function (x) { return x.weekday === i; });
    const cls = 'wday' + (iso === todayIso ? ' today' : '') + (trained ? ' done' : '');
    strip += '<div class="' + cls + '"><span class="wl">' + WEEKDAYS_SHORT[i] + '</span><span class="wd">' + d.getDate() + '</span>' +
      (trained ? '<span class="wcheck">✓</span>' : (isTrainDay ? '<span class="wdot"></span>' : '')) + '</div>';
  }
  strip += '</div>';

  /* Wochenfortschritt (bewusste Rest Days senken das Ziel dieser Woche) */
  const target = getWeeklyTarget();
  const restsWeek = extraRestsInWeek(monday);
  const effTarget = Math.max(1, target - restsWeek);
  const doneCount = weekIsos.filter(function (iso) {
    return state.logs.some(function (l) { return l.date === iso; });
  }).length;
  const pct = Math.min(100, Math.round((doneCount / effTarget) * 100));
  const streak = weekStreak();
  const isPausedWeek = (state.settings.pausedWeeks || []).indexOf(isoOf(monday)) !== -1;
  const progress =
    '<div class="progress-wrap">' +
    '<div class="progress-label"><span>Diese Woche</span><span>' + doneCount + ' von ' + effTarget + ' Trainings</span></div>' +
    '<div class="progress-bar"><div class="progress-fill' + (doneCount >= effTarget ? ' full' : '') + '" style="width:' + pct + '%"></div></div>' +
    (restsWeek > 0 ? '<p class="streak-line">🛌 ' + restsWeek + (restsWeek === 1 ? ' Rest Day' : ' Rest Days') + ' diese Woche eingeplant: dein Ziel ist entsprechend angepasst.</p>' : '') +
    (isPausedWeek ? '<p class="streak-line">⏸ Diese Woche ist als Pause markiert: deine Serie bleibt erhalten.</p>' : '') +
    (state.settings.showStreak && streak > 0 && !isPausedWeek ? '<p class="streak-line">🔥 Serie: ' + streak + (streak === 1 ? ' Woche' : ' Wochen') + ' in Folge das Wochenziel erreicht</p>' : '') +
    '</div>';

  /* Hauptkarte */
  let mainCard = '';
  const todayDay = plan.days.find(function (d) { return d.weekday === tIdx; });
  const logsToday = state.logs.filter(function (l) { return l.date === todayIso; });

  /* Kleine Wochenbilanz (für Ruhetag- und Erledigt-Karte) */
  const wk = weekQuickStats();
  const wkStats =
    '<div class="mini-stats">' +
    '<div><span class="ms-num">' + wk.trainings + '</span><span class="ms-lbl">' + (wk.trainings === 1 ? 'Training' : 'Trainings') + '</span></div>' +
    '<div><span class="ms-num">' + (wk.volume > 0 ? fmtVolume(wk.volume) : '0 kg') + '</span><span class="ms-lbl">bewegt</span></div>' +
    '<div><span class="ms-num">' + (wk.kcal > 0 ? '~' + wk.kcal.toLocaleString('de-DE') : '0') + '</span><span class="ms-lbl">kcal</span></div>' +
    '</div>';

  if (state.draft) {
    mainCard =
      '<div class="card highlight">' +
      '<span class="badge">Training läuft</span>' +
      '<h2>' + esc(state.draft.dayName) + '</h2>' +
      '<p class="sub">Du hast ein angefangenes Training. Mach weiter, deine Eingaben sind gespeichert.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-action="resume">Weiter trainieren</button></div>' +
      '</div>';
  } else if (logsToday.length > 0) {
    const names = logsToday.map(function (l) { return esc(l.dayName); }).join(', ');
    let nextLine = '';
    if (state.settings.rotationMode) {
      const due = rotDue();
      if (due) nextLine = '<p class="sub" style="margin-top:8px">Als Nächstes: <b>' + esc(dayTitle(due)) + '</b> · morgen</p>';
    }
    mainCard =
      '<div class="card success-card">' +
      '<span class="badge green">✓ Erledigt</span>' +
      '<h2>Heute schon trainiert!</h2>' +
      '<p class="sub">' + names + ' ist im Verlauf gespeichert. Stark, dranbleiben!</p>' +
      nextLine +
      wkStats +
      '</div>';
  } else if (state.settings.rotationMode) {
    /* Rotierender Plan: die nächste offene Einheit ist heute fällig,
       ein zusätzlicher Rest Day lässt sie einfach auf morgen rücken. */
    const due = rotDue();
    const restToday = restForDate(todayIso);
    if (restToday) {
      const rl = restReasonLabel(restToday.reason);
      const gentle = (restToday.reason === 'kater' || restToday.reason === 'erschoepft' || restToday.reason === 'schlaf')
        ? '<p class="rest-tip">Regenerationstag eingeplant. Die nächste offene Einheit wurde auf morgen verschoben: prüfe morgen erneut, ob du dich ausreichend erholt fühlst.</p>'
        : (restToday.reason === 'schmerz'
          ? '<p class="rest-tip">⚕️ Bei starken, ungewöhnlichen oder anhaltenden Schmerzen: nicht weitertrainieren und die Ursache professionell prüfen lassen.</p>'
          : '');
      mainCard =
        '<div class="card rest-card">' +
        '<span class="badge">🛌 Rest Day · heute</span>' +
        '<h2>Heute ist Erholung dran</h2>' +
        (rl ? '<p class="sub">Grund: ' + esc(rl) + '</p>' : '') +
        (due ? '<p class="sub" style="margin-top:6px">Nächste Einheit: <b>' + esc(dayTitle(due)) + '</b><br>Geplant für: morgen</p>' : '') +
        gentle +
        '<div class="btn-row"><button class="btn btn-ghost" data-action="rest-undo">Rest Day rückgängig machen</button></div>' +
        '</div>';
    } else if (due) {
      const preview = due.exercises.map(function (e) {
        return '<li><span>' + esc(e.name) + '</span><span class="reps">' + e.sets + ' × ' + esc(e.reps) + '</span></li>';
      }).join('');
      mainCard =
        '<div class="card highlight">' +
        '<span class="badge">Als Nächstes · heute</span>' +
        '<h2>' + esc(dayTitle(due)) + '</h2>' +
        '<p class="sub">' + due.exercises.length + ' Übungen warten auf dich. Die Reihenfolge deines Splits bleibt immer erhalten.</p>' +
        '<ul class="ex-preview">' + preview + '</ul>' +
        '<div class="btn-row"><button class="btn btn-primary pulse" data-action="start-day" data-day="' + due.id + '">Training starten 🔥</button></div>' +
        '<button class="btn btn-ghost" data-action="rest-open" style="margin-top:10px">🛌 Heute Rest Day machen</button>' +
        '</div>';
    } else {
      mainCard = '<div class="card"><p class="sub">Kein Plan gefunden. Lege im Plan-Editor Übungen an.</p></div>';
    }
  } else if (todayDay) {
    const preview = todayDay.exercises.map(function (e) {
      return '<li><span>' + esc(e.name) + '</span><span class="reps">' + e.sets + ' × ' + esc(e.reps) + '</span></li>';
    }).join('');
    mainCard =
      '<div class="card highlight">' +
      '<span class="badge">Heute · ' + WEEKDAYS_LONG[tIdx] + '</span>' +
      '<h2>' + esc(dayTitle(todayDay)) + '</h2>' +
      '<p class="sub">' + todayDay.exercises.length + ' Übungen warten auf dich.</p>' +
      '<ul class="ex-preview">' + preview + '</ul>' +
      '<div class="btn-row"><button class="btn btn-primary pulse" data-action="start-day" data-day="' + todayDay.id + '">Training starten 🔥</button></div>' +
      '</div>';
  } else {
    let next = null;
    for (let j = 1; j <= 7 && !next; j++) {
      const idx = (tIdx + j) % 7;
      const day = plan.days.find(function (d) { return d.weekday === idx; });
      if (day) next = { day: day, idx: idx, offset: j };
    }
    const nextTxt = next
      ? 'Nächstes Training: <b>' + esc(dayTitle(next.day)) + '</b> am ' + WEEKDAYS_LONG[next.idx] + (next.offset === 1 ? ' (morgen)' : '') + '.'
      : 'Kein Trainingstag im Plan gefunden.';

    /* Ruhetag sinnvoll füllen: Wochenbilanz, Blick aufs nächste Training, Erholungs-Tipp */
    let nextPrev = '';
    if (next) {
      const firstThree = next.day.exercises.slice(0, 3).map(function (e) {
        return '<li><span>' + esc(e.name) + '</span><span class="reps">' + e.sets + ' × ' + esc(e.reps) + '</span></li>';
      }).join('');
      const moreCount = next.day.exercises.length - 3;
      const more = moreCount > 0 ? '<li class="more-line">+ ' + moreCount + ' weitere ' + (moreCount === 1 ? 'Übung' : 'Übungen') + '</li>' : '';
      nextPrev =
        '<ul class="ex-preview next-preview">' + firstThree + more + '</ul>' +
        '<div class="btn-row"><button class="btn btn-ghost" data-action="goto-view" data-v="plan">Ganzen Plan ansehen</button></div>';
    }
    const tip = REST_TIPS[(parseInt(todayIso.slice(8, 10), 10) + parseInt(todayIso.slice(5, 7), 10)) % REST_TIPS.length];
    mainCard =
      '<div class="card">' +
      '<span class="badge">Ruhetag</span>' +
      '<h2>Heute ist Erholung dran 😌</h2>' +
      '<p class="sub">' + nextTxt + ' Erholung ist Teil des Plans: da wachsen die Muskeln.</p>' +
      wkStats +
      nextPrev +
      '<p class="rest-tip">' + tip + '</p>' +
      '</div>';
  }

  /* Montags-Erinnerung: sichtbar, bis für DIESE Woche ein Gewicht
     eingetragen ist (bleibt auch nach einem verpassten Montag stehen) */
  let weighCard = '';
  if (!weightEntryForWeek(isoOf(monday))) {
    weighCard =
      '<div class="card weigh-card">' +
      '<span class="badge">⚖️ Wöchentlicher Gewichts-Check-in</span>' +
      '<p class="sub" style="margin-top:8px">Trage dein aktuelles Gewicht unter vergleichbaren Bedingungen ein: morgens, nach dem Toilettengang, vor dem Essen und Trinken, immer mit derselben Waage.</p>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="weight-open">Gewicht eintragen</button></div>' +
      '</div>';
  }

  /* Schnellstart-Chips */
  const chips = plan.days.map(function (d) {
    return '<button class="chip" data-action="start-day" data-day="' + d.id + '">' + esc(d.short) + '</button>';
  }).join('');
  const chipBlock =
    '<div class="section-title">Anderes Training starten</div>' +
    '<div class="chip-row">' + chips + '</div>';

  document.getElementById('view-heute').innerHTML = strip + progress + mainCard + weighCard + chipBlock;
}

/* ===== Ansicht: Plan ===== */

function renderPlan() {
  const plan = currentPlan();
  const tIdx = dayIdx(new Date());

  /* Standardmäßig ist der heutige Trainingstag offen, sonst der nächste */
  let autoOpen = null;
  const todayD = plan.days.find(function (d) { return d.weekday === tIdx; });
  if (todayD) autoOpen = todayD.id;
  for (let j = 1; j <= 7 && !autoOpen; j++) {
    const idx = (tIdx + j) % 7;
    const day = plan.days.find(function (d) { return d.weekday === idx; });
    if (day) autoOpen = day.id;
  }
  const openId = planOpenDayId === null ? autoOpen : planOpenDayId;

  let html = '<div class="section-title">Dein Plan · ' + esc(plan.label) + '</div>';

  plan.days.forEach(function (day) {
    if (editingDayId === day.id && editingCopy) {
      html += renderDayEditor(editingCopy);
      return;
    }
    const open = day.id === openId;
    let totalSets = 0;
    day.exercises.forEach(function (e) { totalSets += e.sets; });
    const rows = day.exercises.map(function (e) {
      const thumb = exImagesHtml(e.name, 'ex-thumb');
      const kg = (typeof e.workWeight === 'number' && e.workWeight > 0) ? ' <span class="kg">' + fmtKg(e.workWeight) + '</span>' : '';
      const swapBtn = exMuscle(e.name)
        ? '<button class="swap-btn" data-action="swap-ex" data-day="' + day.id + '" data-ex-id="' + e.id + '" data-name="' + esc(e.name) + '" title="Übung tauschen">⇄</button>'
        : '';
      return '<li class="plan-ex" data-action="ex-info" data-name="' + esc(e.name) + '" data-reps="' + esc(e.reps) + '">' +
        thumb +
        '<span class="grow">' + esc(e.name) + '</span>' +
        '<span class="reps">' + e.sets + ' × ' + esc(e.reps) + kg + '</span>' +
        swapBtn + '</li>';
    }).join('');
    html +=
      '<div class="card plan-day' + (open ? ' open' : '') + '">' +
      '<button class="collapse-head" data-action="toggle-plan-day" data-day="' + day.id + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<span class="badge">' + WEEKDAYS_LONG[day.weekday] + '</span>' +
      '<span class="head-text"><span class="day-title">' + esc(dayTitle(day)) + '</span>' +
      '<span class="day-sum">' + day.exercises.length + ' ' + (day.exercises.length === 1 ? 'Übung' : 'Übungen') + ' · ' + setsWord(totalSets) + '</span></span>' +
      '<span class="chev">▾</span>' +
      '</button>' +
      '<div class="collapse-body' + (open ? '' : ' closed') + '">' +
      '<ul class="ex-preview plan-compact">' + rows + '</ul>' +
      '<div class="btn-row">' +
      '<button class="btn btn-ghost small" data-action="edit-day" data-day="' + day.id + '">✏️ Bearbeiten</button>' +
      '<button class="btn btn-ghost" data-action="start-day" data-day="' + day.id + '">Starten</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  });

  html += '<p class="sub" style="margin:6px 4px 0">Tipp: Tag antippen klappt ihn auf. Übung antippen zeigt die Ausführung mit Bild. Über „Bearbeiten" kannst du Übungen, Sätze, Wiederholungen, Arbeitsgewicht und den Wochentag anpassen.</p>';
  document.getElementById('view-plan').innerHTML = html;
}

function renderDayEditor(day) {
  const wdOptions = WEEKDAYS_LONG.map(function (w, i) {
    return '<option value="' + i + '"' + (i === day.weekday ? ' selected' : '') + '>' + w + '</option>';
  }).join('');

  const rows = day.exercises.map(function (e, i) {
    const ww = (e.workWeight === null || e.workWeight === undefined || e.workWeight === '') ? '' : e.workWeight;
    return '<div class="edit-row">' +
      '<input type="text" value="' + esc(e.name) + '" data-edit-field="name" data-i="' + i + '" placeholder="Übung">' +
      '<input type="number" min="1" max="8" value="' + e.sets + '" data-edit-field="sets" data-i="' + i + '">' +
      '<input type="text" value="' + esc(e.reps) + '" data-edit-field="reps" data-i="' + i + '" placeholder="8-10">' +
      '<input type="number" step="2.5" min="0" value="' + esc(ww) + '" data-edit-field="workWeight" data-i="' + i + '" placeholder="kg">' +
      '<button class="rm-ex" data-action="rm-ex" data-i="' + i + '" title="Übung entfernen">✕</button>' +
      '</div>';
  }).join('');

  return '<div class="card highlight" id="day-editor">' +
    '<div class="card-top"><span class="badge">' + esc(day.short) + ' bearbeiten</span></div>' +
    '<div class="edit-head">' +
    '<input type="text" value="' + esc(day.name) + '" data-edit-field="dayname" placeholder="Name des Tages">' +
    '<select data-edit-field="weekday">' + wdOptions + '</select>' +
    '</div>' +
    '<div class="edit-cols"><span>Übung</span><span>Sätze</span><span>Wdh.</span><span>kg</span><span></span></div>' +
    rows +
    '<button class="btn btn-ghost" data-action="add-ex" style="margin-top:4px">+ Übung hinzufügen</button>' +
    '<div class="btn-row">' +
    '<button class="btn btn-ghost" data-action="cancel-edit">Abbrechen</button>' +
    '<button class="btn btn-primary" data-action="save-day">Speichern</button>' +
    '</div>' +
    '</div>';
}

function startEditDay(dayId) {
  const day = findDay(dayId);
  if (!day) return;
  editingDayId = dayId;
  editingCopy = clone(day);
  renderPlan();
}

function saveEditDay() {
  if (!editingCopy) return;
  const day = findDay(editingDayId);
  if (!day) { editingDayId = null; editingCopy = null; renderPlan(); return; }

  editingCopy.name = String(editingCopy.name || '').trim() || day.name;
  editingCopy.weekday = Math.min(6, Math.max(0, parseInt(editingCopy.weekday, 10) || 0));
  editingCopy.exercises = editingCopy.exercises
    .filter(function (e) { return String(e.name || '').trim() !== ''; })
    .map(function (e) {
      const w = num(e.workWeight);
      return {
        id: e.id || uid(),
        name: String(e.name).trim(),
        sets: Math.min(8, Math.max(1, parseInt(e.sets, 10) || 3)),
        reps: String(e.reps || '').trim() || '8-10',
        workWeight: (!isNaN(w) && w > 0) ? w : null,
        failStreak: typeof e.failStreak === 'number' ? e.failStreak : 0,
        lastResult: typeof e.lastResult === 'string' ? e.lastResult : ''
      };
    });

  if (editingCopy.exercises.length === 0) {
    alert('Der Tag braucht mindestens eine Übung.');
    return;
  }

  Object.assign(day, editingCopy);
  editingDayId = null;
  editingCopy = null;
  saveState();
  renderPlan();
  toast('Plan gespeichert ✓');
}

/* ===== Ansicht: Workout ===== */

function buildWorkoutEntry(exercise) {
  const last = lastEntryForExercise(exercise);
  const range = parseRange(exercise.reps);

  /* Arbeitsgewicht: gespeichert im Plan, sonst aus dem letzten Log abgeleitet */
  let baseW = (typeof exercise.workWeight === 'number' && exercise.workWeight > 0) ? exercise.workWeight : null;
  if (baseW === null && last) {
    const nums = last.entry.sets
      .filter(function (s) { return !s.warmup; })
      .map(function (s) { return num(s.weight); })
      .filter(function (v) { return !isNaN(v) && v > 0; });
    if (nums.length) baseW = Math.max.apply(null, nums);
  }

  /* Bestes rechnerisches Maximum aus dem letzten Training (Epley) */
  let lastBestE = null;
  if (last) {
    last.entry.sets.forEach(function (s) {
      if (s.warmup || !s.done) return;
      const e = epley(num(s.weight), num(s.reps));
      if (!isNaN(e) && (lastBestE === null || e > lastBestE)) lastBestE = e;
    });
  }

  const warmups = buildWarmupSets(exercise.name, baseW);
  const workSets = [];
  for (let i = 0; i < exercise.sets; i++) {
    workSets.push({ weight: baseW ? String(baseW) : '', reps: '', done: false, warmup: false });
  }

  return {
    exId: exercise.id,
    name: exercise.name,
    repsTarget: exercise.reps,
    lastInfo: last ? formatLastInfo(last) : null,
    banner: bannerFor(exercise, range),
    rest: exRest(exercise.name),
    workWeight: baseW,
    e1rm: lastBestE,
    sets: warmups.concat(workSets)
  };
}

function startWorkout(dayId) {
  if (state.draft) {
    if (state.draft.dayId === dayId && state.draft.mode === state.mode) {
      showView('workout');
      return;
    }
    if (!confirm('Es läuft schon ein Training (' + state.draft.dayName + '). Verwerfen und neu starten?')) return;
  }
  const day = findDay(dayId);
  if (!day) return;

  const entries = day.exercises.map(buildWorkoutEntry);

  state.draft = {
    mode: state.mode,
    dayId: dayId,
    dayName: dayTitle(day),
    date: todayISO(),
    startedAt: Date.now(),
    cardio: { type: '', minutes: '' },
    entries: entries
  };
  resetTimer();
  saveState();
  showView('workout');
}

function openSwapChooser(ds) {
  const day = findDay(ds.day);
  if (!day) return;
  const taken = day.exercises.map(function (e) { return e.name; });
  const alts = alternativesFor(ds.name, taken);
  if (!alts.length) {
    toast('Keine Alternativen hinterlegt');
    return;
  }
  showSwapModal(ds.name, alts, { day: ds.day, exId: ds.exId, from: ds.from || '' }, state.logs);
}

function swapExercise(dayId, exId, newName) {
  const day = findDay(dayId);
  if (!day) return;
  const idx = day.exercises.findIndex(function (e) { return e.id === exId; });
  if (idx === -1) return;
  const old = day.exercises[idx];
  const ne = {
    id: uid(),
    name: newName,
    sets: old.sets,
    reps: old.reps,
    workWeight: null,
    failStreak: 0,
    lastResult: ''
  };
  day.exercises[idx] = ne;

  /* Läuft gerade ein Training mit dieser Übung? Dann dort auch tauschen. */
  if (state.draft && state.draft.dayId === dayId && state.draft.mode === state.mode) {
    const di = state.draft.entries.findIndex(function (en) { return en.exId === exId; });
    if (di !== -1) state.draft.entries[di] = buildWorkoutEntry(ne);
  }

  saveState();
  closeModal();
  render(currentView);
  toast('Getauscht: ' + newName + ' ✓');
}

function renderWorkout() {
  const draft = state.draft;
  const view = document.getElementById('view-workout');
  if (!draft) {
    view.innerHTML = '<div class="card"><p class="sub">Kein Training aktiv.</p></div>';
    return;
  }

  /* Satz-Fortschritt (nur Arbeitssätze) */
  let workTotal = 0;
  let workDone = 0;
  draft.entries.forEach(function (e) {
    e.sets.forEach(function (s) {
      if (s.warmup) return;
      workTotal++;
      if (s.done) workDone++;
    });
  });
  const workPct = workTotal > 0 ? Math.round((workDone / workTotal) * 100) : 0;

  let html =
    '<div class="workout-head">' +
    '<div class="workout-head-text"><span class="badge">' + fmtDate(draft.date) + '</span><h2 style="margin-top:6px">' + esc(draft.dayName) + '</h2>' +
    '<div class="wo-progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + workTotal + '" aria-valuenow="' + workDone + '">' +
    '<div class="wo-fill' + (workDone >= workTotal && workTotal > 0 ? ' full' : '') + '" style="width:' + workPct + '%"></div></div>' +
    '<span class="wo-txt">' + workDone + ' von ' + workTotal + ' Sätzen</span></div>' +
    '<button class="close-btn" data-action="cancel-workout" title="Training abbrechen" aria-label="Training abbrechen">✕</button>' +
    '</div>';

  html +=
    '<div class="timer-bar">' +
    '<button class="timer-display" id="timer-display" data-action="timer-stop" title="Antippen stoppt den Timer" aria-label="Pause-Timer stoppen">Pause-Timer bereit</button>' +
    '<button class="chip" data-action="timer" data-sec="60" aria-label="60 Sekunden Pause starten">60 s</button>' +
    '<button class="chip" data-action="timer" data-sec="90" aria-label="90 Sekunden Pause starten">90 s</button>' +
    '<button class="chip" data-action="timer" data-sec="120" aria-label="120 Sekunden Pause starten">120 s</button>' +
    '<div class="timer-fill" id="timer-progress"></div>' +
    '</div>';

  /* Sanfter Hinweis nach einem Regenerations-Rest-Day: nur Text,
     ändert NICHTS an Plan, Gewichten oder Vorgaben */
  const yesterdayIso = (function () {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return isoOf(d);
  })();
  const yRest = restForDate(yesterdayIso);
  if (yRest && (yRest.reason === 'kater' || yRest.reason === 'erschoepft' || yRest.reason === 'schlaf' || yRest.reason === 'schmerz')) {
    html +=
      '<p class="hint" style="margin-bottom:12px">🛌 Gestern war ein Rest Day. Fühlst du dich noch nicht ganz erholt: heute gern 1-2 Wiederholungen mehr Reserve lassen, kein Muskelversagen bei schweren Übungen, notfalls einen Satz weglassen oder einen weiteren Rest Day einlegen. Bei anhaltenden Schmerzen: nicht weitertrainieren und professionell abklären lassen.</p>';
  }

  /* Einmaliger Ersthinweis zur neuen Belastungs-Zeile */
  if (!state.settings.rirHintSeen) {
    html +=
      '<div class="card rir-hint">' +
      '<p class="sub">💡 <b>Neu: die farbige Zeile unter jeder Übung.</b> „Im Tank" heißt: so viele saubere Wiederholungen wären am Satzende noch gegangen (Fachwort: RIR). Die Zeile sagt dir, wie nah du ans Limit gehen sollst. Antippen zeigt Details.</p>' +
      '<button class="btn btn-ghost small" data-action="rir-hint-ok" style="margin-top:8px">Verstanden</button>' +
      '</div>';
  }

  draft.entries.forEach(function (entry, ei) {
    let rows = '';
    let workNum = 0;
    entry.sets.forEach(function (set, si) {
      const label = set.warmup ? '🔥' : String(++workNum);
      rows +=
        '<div class="set-row' + (set.done ? ' done' : '') + (set.warmup ? ' warmup' : '') + '">' +
        '<span class="set-num" title="' + (set.warmup ? 'Aufwärmsatz' : 'Arbeitssatz') + '">' + label + '</span>' +
        '<input type="number" step="0.5" min="0" inputmode="decimal" placeholder="kg" value="' + esc(set.weight) + '" data-field="weight" data-ex="' + ei + '" data-set="' + si + '">' +
        '<span class="x">×</span>' +
        '<input type="number" step="1" min="0" inputmode="numeric" placeholder="Wdh." value="' + esc(set.reps) + '" data-field="reps" data-ex="' + ei + '" data-set="' + si + '">' +
        '<button class="set-done" data-action="toggle-set" data-ex="' + ei + '" data-set="' + si + '" aria-label="' + (set.warmup ? 'Aufwärmsatz' : 'Satz') + ' abhaken">✓</button>' +
        '</div>';
    });

    const info = exInfo(entry.name);
    const workSetsAll = entry.sets.filter(function (s) { return !s.warmup; });
    const workCount = workSetsAll.length;
    const thumb = exImagesHtml(entry.name, 'ex-thumb');
    const metaParts = ['Ziel: ' + workCount + ' × ' + esc(entry.repsTarget), restLabel(entry.rest)];
    if (entry.e1rm) metaParts.push('Max ~' + fmtKg(round25(entry.e1rm)));
    const infoAttrs = 'data-action="ex-info" data-name="' + esc(entry.name) + '" data-reps="' + esc(entry.repsTarget) + '"';

    /* RIR-Rückfrage, sobald der letzte Arbeitssatz abgehakt ist: steuert die
       Progression (kein Auto-Steigern bei RIR 0 oder leidender Technik). */
    let rirAsk = '';
    if (workCount > 0 && workSetsAll[workCount - 1].done) {
      rirAsk =
        '<div class="rir-ask">' +
        '<span class="rir-q">Letzter Satz: wie viele saubere Wdh. waren noch drin?</span>' +
        '<div class="chip-row rir-chips">' +
        [['0', '0 (gerade so)'], ['1', '1'], ['2', '2 oder mehr']].map(function (o) {
          return '<button class="chip' + (entry.lastRir === o[0] ? ' active' : '') + '" data-action="set-lastrir" data-ex="' + ei + '" data-v="' + o[0] + '">' + o[1] + '</button>';
        }).join('') +
        '<button class="chip tech-chip' + (entry.techFail ? ' active' : '') + '" data-action="toggle-techfail" data-ex="' + ei + '">Technik wurde unsauber</button>' +
        '</div></div>';
    }

    html +=
      '<div class="card ex-card">' +
      '<div class="ex-head">' +
      (thumb ? '<button class="thumb-btn" ' + infoAttrs + ' title="Ausführung ansehen">' + thumb + '</button>' : '') +
      '<div class="ex-head-text">' +
      '<div class="ex-title"><h3>' + esc(entry.name) + '</h3><span class="ex-actions">' +
      (exMuscle(entry.name) ? '<button class="swap-btn" data-action="swap-ex" data-day="' + esc(draft.dayId) + '" data-ex-id="' + esc(entry.exId) + '" data-name="' + esc(entry.name) + '" data-from="workout" title="Übung tauschen">⇄</button>' : '') +
      (info ? '<button class="info-btn" ' + infoAttrs + ' title="Ausführung ansehen">ℹ️</button>' : '') +
      '</span></div>' +
      '<p class="ex-meta">' + metaParts.join(' · ') + '</p>' +
      '</div></div>' +
      loadLineHtml(entry.name, entry.repsTarget) +
      '<p class="banner banner-' + entry.banner.cls + '">' + esc(entry.banner.text) + '</p>' +
      (entry.lastInfo ? '<p class="last-info">' + esc(entry.lastInfo) + '</p>' : '') +
      '<div class="set-rows">' + rows + '</div>' +
      rirAsk +
      '</div>';
  });

  /* Cardio zum Abschluss (optional) */
  const cardio = draft.cardio || { type: '', minutes: '' };
  const cardioOptions = CARDIO_TYPES.map(function (t) {
    return '<option value="' + t.id + '"' + (cardio.type === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>';
  }).join('');
  html +=
    '<div class="card cardio-card">' +
    '<h3>🏃 Cardio zum Abschluss</h3>' +
    '<p class="sub">Optional: Nach dem Krafttraining hier eintragen, zählt mit in Kalorien und Dauer.</p>' +
    '<div class="cardio-row">' +
    '<select data-cardio-field="type"><option value=""' + (cardio.type === '' ? ' selected' : '') + '>Kein Cardio</option>' + cardioOptions + '</select>' +
    '<input type="number" min="0" max="180" step="1" inputmode="numeric" placeholder="Min." value="' + esc(cardio.minutes) + '" data-cardio-field="minutes">' +
    '</div>' +
    '</div>';

  html +=
    '<div class="workout-footer">' +
    '<button class="btn btn-success" data-action="finish-workout">Training abschließen ✓</button>' +
    '<button class="btn btn-danger-ghost" data-action="cancel-workout" style="margin-top:10px">Abbrechen (nichts speichern)</button>' +
    '</div>';

  view.innerHTML = html;
  updateTimerUI();
}

function countDoneSets(draft) {
  let n = 0;
  draft.entries.forEach(function (e) {
    e.sets.forEach(function (s) { if (s.done && !s.warmup) n++; });
  });
  return n;
}

function finishWorkout() {
  const draft = state.draft;
  if (!draft) return;
  const done = countDoneSets(draft);
  if (done === 0 && !confirm('Du hast noch keinen Arbeitssatz abgehakt (✓). Training trotzdem speichern?')) return;

  /* Progression rechnen: schreibt neue Arbeitsgewichte in den Plan */
  const results = applyProgression(draft, state.plans, state.logs);

  const log = {
    id: uid(),
    date: draft.date,
    mode: draft.mode,
    dayId: draft.dayId,
    dayName: draft.dayName,
    entries: clone(draft.entries).map(function (e) {
      delete e.lastInfo;
      delete e.banner;
      delete e.rest;
      delete e.workWeight;
      delete e.e1rm;
      return e;
    }),
    results: results.map(function (r) {
      return { name: r.name, verdict: r.verdict, text: r.text, isPR: r.isPR };
    })
  };
  /* Dauer (Start bis Ende) + grobe Kalorien-Schätzung */
  const durationMin = draft.startedAt
    ? Math.max(1, Math.round((Date.now() - draft.startedAt) / 60000))
    : null;
  const bw = state.settings.bodyWeight || 134;

  let cardio = null;
  if (draft.cardio && draft.cardio.type) {
    const ct = cardioType(draft.cardio.type);
    const mins = Math.round(num(draft.cardio.minutes));
    if (ct && !isNaN(mins) && mins > 0) {
      cardio = { type: ct.id, name: ct.name, minutes: mins, kcal: kcalFor(ct.met, bw, mins) };
    }
  }

  let kcalTotal = 0;
  if (durationMin !== null) {
    let strengthMin = durationMin - (cardio ? cardio.minutes : 0);
    strengthMin = Math.min(Math.max(strengthMin, 5), 180); /* gegen Ausreißer (App offen gelassen) */
    kcalTotal = kcalFor(STRENGTH_MET, bw, strengthMin) + (cardio ? cardio.kcal : 0);
  }

  log.durationMin = durationMin;
  log.kcal = kcalTotal;
  log.cardio = cardio;

  state.logs.push(log);
  const stats = logStats(log);
  stats.durationMin = durationMin;
  stats.kcal = kcalTotal;
  stats.cardio = cardio;

  /* Wochenziel und Meilensteine für die Feier im Overlay */
  const target = getWeeklyTarget();
  stats.weekGoal = trainingDaysInWeek(mondayOfCurrentWeek()) === target
    ? '🎯 Wochenziel geschafft: ' + target + ' von ' + target + ' Trainings!'
    : null;
  const MILESTONES = [1, 5, 10, 25, 50, 75, 100, 150, 200, 365];
  stats.milestone = MILESTONES.indexOf(state.logs.length) !== -1
    ? (state.logs.length === 1
      ? '🏅 Dein 1. Training ist im Kasten: der Anfang ist gemacht!'
      : '🏅 Meilenstein: dein ' + state.logs.length + '. Training!')
    : null;

  state.draft = null;
  resetTimer();
  saveState();
  showView('heute');
  showFinishOverlay(stats, results);
}

function cancelWorkout() {
  if (!state.draft) { showView('heute'); return; }
  if (!confirm('Training abbrechen? Die Eingaben von heute gehen verloren.')) return;
  state.draft = null;
  resetTimer();
  saveState();
  showView('heute');
}

/* ===== Pause-Timer ===== */

let timerInterval = null;
let timerLeft = 0;
let timerTotal = 0;
let timerEndAt = 0;
let timerFinished = false;

/* Signalton am Pausen-Ende (Web Audio, ohne Sound-Datei).
   iOS erlaubt Ton erst nach einer Nutzer-Interaktion: unlockAudio()
   wird deshalb bei Klicks aufgerufen und weckt den Audio-Kontext. */
let audioCtx = null;

function unlockAudio() {
  if (!state || !state.settings || !state.settings.timerSound) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
  } catch (e) { /* Ton ist nie kritisch */ }
}

function playTimerSound() {
  if (!state.settings.timerSound || !audioCtx || audioCtx.state !== 'running') return;
  try {
    const now = audioCtx.currentTime;
    [0, 0.22, 0.44].forEach(function (t, i) {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.value = i === 2 ? 1175 : 880; /* zweimal A5, dann D6: freundliches „fertig!" */
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.4, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.18);
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start(now + t);
      o.stop(now + t + 0.2);
    });
  } catch (e) { /* Ton ist nie kritisch */ }
}

function flashTimerBar() {
  const bar = document.querySelector('.timer-bar');
  if (!bar) return;
  bar.classList.add('done-flash');
  setTimeout(function () { bar.classList.remove('done-flash'); }, 2000);
}

/* Zeitstempel-basiert: läuft auch korrekt weiter, wenn der Browser
   den Tab drosselt (App-Wechsel, gesperrter Bildschirm). */
function tickTimer() {
  timerLeft = Math.max(0, Math.round((timerEndAt - Date.now()) / 1000));
  if (timerLeft <= 0) {
    stopTimer();
    if (!timerFinished) {
      timerFinished = true;
      if (navigator.vibrate && !prefersReducedMotion()) navigator.vibrate(300);
      playTimerSound();
      flashTimerBar();
    }
  }
  updateTimerUI();
}

function startTimer(sec) {
  stopTimer();
  timerFinished = false;
  timerTotal = sec;
  timerEndAt = Date.now() + sec * 1000;
  timerLeft = sec;
  updateTimerUI();
  timerInterval = setInterval(tickTimer, 250);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  timerLeft = 0;
  timerTotal = 0;
  timerEndAt = 0;
  timerFinished = false;
}

function updateTimerUI() {
  const el = document.getElementById('timer-display');
  const fill = document.getElementById('timer-progress');
  if (fill) {
    fill.style.width = (timerTotal > 0 && timerLeft > 0) ? Math.round((timerLeft / timerTotal) * 100) + '%' : '0%';
  }
  if (!el) return;
  if (timerLeft > 0) {
    el.textContent = 'Pause: noch ' + timerLeft + ' s';
    el.classList.add('running');
  } else {
    el.classList.remove('running');
    el.textContent = timerFinished ? 'Weiter geht’s! 💪' : 'Pause-Timer bereit';
  }
}

/* ===== Ansicht: Verlauf ===== */

function logStats(log) {
  let sets = 0;
  let volume = 0;
  log.entries.forEach(function (e) {
    e.sets.forEach(function (s) {
      if (s.warmup || !s.done) return;
      sets++;
      const w = num(s.weight);
      const r = num(s.reps);
      if (!isNaN(w) && !isNaN(r)) volume += w * r;
    });
  });
  return { sets: sets, volume: Math.round(volume) };
}

function setsWord(n) {
  return n + (n === 1 ? ' Satz' : ' Sätze');
}

/* Kleine Bilanz der laufenden Woche (für die Heute-Karten) */
function weekQuickStats() {
  const mon = mondayOfCurrentWeek();
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const mi = isoOf(mon), si = isoOf(sun);
  let volume = 0, kcal = 0;
  const dates = {};
  state.logs.forEach(function (l) {
    if (l.date < mi || l.date > si) return;
    volume += logStats(l).volume;
    if (l.kcal) kcal += l.kcal;
    dates[l.date] = true;
  });
  return { trainings: Object.keys(dates).length, volume: volume, kcal: Math.round(kcal) };
}

/* „vor 3 Tagen" statt nacktem Datum */
function relDate(iso) {
  const p = iso.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const diff = Math.round((t - d) / 86400000);
  if (diff <= 0) return 'heute';
  if (diff === 1) return 'gestern';
  if (diff < 7) return 'vor ' + diff + ' Tagen';
  if (diff < 30) {
    const w = Math.round(diff / 7);
    return 'vor ' + w + (w === 1 ? ' Woche' : ' Wochen');
  }
  const mo = Math.round(diff / 30);
  return 'vor ' + mo + (mo === 1 ? ' Monat' : ' Monaten');
}

/* Stabile Farbe je Trainingstag (für den Punkt im Verlauf) */
function dayColorIdx(log) {
  const key = String(log.dayId || log.dayName || '?');
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h + key.charCodeAt(i)) % 997;
  return h % 5;
}

/* Wochen-Daten der letzten n Wochen (für das Wochen-Chart) */
function weekAgg(n) {
  const mon0 = mondayOfCurrentWeek();
  const paused = state.settings.pausedWeeks || [];
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(mon0);
    m.setDate(mon0.getDate() - 7 * i);
    const s = new Date(m);
    s.setDate(m.getDate() + 6);
    const mi = isoOf(m), si = isoOf(s);
    let vol = 0;
    const dates = {};
    state.logs.forEach(function (l) {
      if (l.date < mi || l.date > si) return;
      vol += logStats(l).volume;
      dates[l.date] = true;
    });
    out.push({
      label: String(m.getDate()).padStart(2, '0') + '.' + String(m.getMonth() + 1).padStart(2, '0') + '.',
      days: Object.keys(dates).length,
      vol: vol,
      paused: paused.indexOf(mi) !== -1,
      current: i === 0
    });
  }
  return out;
}

/* Balken-Chart: Trainings pro Woche bzw. Wochenvolumen */
function weekBarsSVG(weeks, mode, target) {
  const W = 340, H = 150, padL = 8, padR = 8, padT = 18, padB = 22;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = weeks.length;
  const slot = iw / n;
  const bw = Math.min(26, slot * 0.62);
  let maxV = 0;
  weeks.forEach(function (w) { maxV = Math.max(maxV, mode === 'freq' ? w.days : w.vol); });
  if (mode === 'freq') maxV = Math.max(maxV, target);
  if (maxV <= 0) maxV = 1;

  function bx(i) { return padL + slot * i + (slot - bw) / 2; }

  let goal = '';
  if (mode === 'freq' && target > 0) {
    const gy = padT + ih - (target / maxV) * ih;
    goal = '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" class="goal-dash"/>';
  }

  let bars = '', tops = '', labels = '';
  weeks.forEach(function (w, i) {
    const v = mode === 'freq' ? w.days : w.vol;
    const h = v <= 0 ? 0 : Math.max(3, (v / maxV) * ih);
    const y = padT + ih - h;
    let cls = 'wbar';
    if (w.paused) cls += ' paused';
    else if (mode === 'freq' && w.days >= target) cls += ' full';
    if (w.current) cls += ' now';
    if (v > 0) {
      bars += '<rect x="' + bx(i).toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="4" class="' + cls + '"/>';
    } else {
      bars += '<rect x="' + bx(i).toFixed(1) + '" y="' + (padT + ih - 2) + '" width="' + bw.toFixed(1) + '" height="2" rx="1" class="wbar empty"/>';
    }
    /* Wert über dem Balken: bei Volumen nur höchste und aktuelle Woche (sonst zu eng) */
    const showTop = v > 0 && (mode === 'freq' || w.current || v === maxV);
    if (showTop) {
      const txt = mode === 'freq' ? String(w.days) : fmtVolume(w.vol);
      tops += '<text x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" class="chart-label' + (w.current ? ' strong' : '') + '" text-anchor="middle">' + txt + '</text>';
    }
    if (w.paused) {
      tops += '<text x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (padT + ih - 6).toFixed(1) + '" class="chart-tick" text-anchor="middle">⏸</text>';
    }
    /* Datum unter jedem 2. Balken, die aktuelle Woche immer */
    if (i % 2 === (n - 1) % 2) {
      labels += '<text x="' + (bx(i) + bw / 2).toFixed(1) + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="middle">' + w.label + '</text>';
    }
  });

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="week-chart" role="img" aria-label="' +
    (mode === 'freq' ? 'Trainings pro Woche' : 'Bewegtes Gewicht pro Woche') + '">' +
    goal + bars + tops + labels + '</svg>';
}

/* ===== Körpergewicht: wöchentlicher Check-in mit geglättetem Trend ===== */

/* Montag der Kalenderwoche eines beliebigen Datums (lokale Zeit) */
function mondayIsoOf(iso) {
  const p = iso.split('-').map(Number);
  const d = new Date(p[0], p[1] - 1, p[2]);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoOf(d);
}

function weightEntryForWeek(mondayIso) {
  for (let i = 0; i < state.weights.length; i++) {
    if (mondayIsoOf(state.weights[i].date) === mondayIso) return state.weights[i];
  }
  return null;
}

function fmtW(kg) {
  return (Math.round(kg * 10) / 10).toLocaleString('de-DE') + ' kg';
}

function daysBetweenIso(a, b) {
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

/* Geglätteter Trend: gleitender Durchschnitt über bis zu 3 Messungen.
   Glättet Wasser-/Speicher-Schwankungen, ohne echte Entwicklungen zu
   verstecken. Bei 1-2 Einträgen entspricht der Trend den Rohwerten. */
function weightTrendSeries() {
  return state.weights.map(function (w, i) {
    let sum = 0, n = 0;
    for (let j = Math.max(0, i - 2); j <= i; j++) { sum += state.weights[j].kg; n++; }
    return Math.round((sum / n) * 100) / 100;
  });
}

/* Alle Kennzahlen werden aus den gespeicherten Messwerten abgeleitet,
   nichts davon wird doppelt gespeichert. */
function weightKpis() {
  const ws = state.weights;
  if (ws.length === 0) return null;
  const trend = weightTrendSeries();
  const first = ws[0], last = ws[ws.length - 1];
  const tLast = trend[trend.length - 1];
  const spanDays = daysBetweenIso(first.date, last.date);
  const spanWeeks = Math.max(1, spanDays / 7);
  /* Trend der letzten ~4 Wochen: Trendwert heute vs. Trendwert des
     Eintrags, der mindestens 28 Tage zurückliegt */
  let slope4 = null;
  for (let i = ws.length - 1; i >= 0; i--) {
    const back = daysBetweenIso(ws[i].date, last.date);
    if (back >= 28) {
      slope4 = Math.round(((tLast - trend[i]) / (back / 7)) * 100) / 100;
      break;
    }
  }
  if (slope4 === null && ws.length >= 3 && spanDays >= 14) {
    slope4 = Math.round(((tLast - trend[0]) / spanWeeks) * 100) / 100;
  }
  return {
    count: ws.length,
    first: first, last: last, trend: trend, tLast: tLast,
    diffTotal: Math.round((last.kg - first.kg) * 10) / 10,
    diffPct: first.kg > 0 ? Math.round(((last.kg - first.kg) / first.kg) * 1000) / 10 : 0,
    diffLast: ws.length >= 2 ? Math.round((last.kg - ws[ws.length - 2].kg) * 10) / 10 : null,
    perWeek: ws.length >= 2 ? Math.round(((last.kg - first.kg) / spanWeeks) * 100) / 100 : null,
    slope4: slope4,
    target: state.settings.targetWeightKg,
    fluct: Math.abs(last.kg - tLast) >= 1.5
  };
}

/* Neutrale Einordnung: basiert auf dem geglätteten Trend, nie auf einem
   Einzelwert. Schwellen (±0,15 / -0,5 kg pro Woche) sind Praxis-Konvention. */
function weightStatus(k) {
  if (!k || k.count < 3 || k.slope4 === null) {
    return { cls: 'neutral', label: 'Noch nicht genügend Daten', sub: 'Ab etwa 3 Wochen-Einträgen zeigt dir Stemma den geglätteten Trend.' };
  }
  if (k.fluct) {
    return { cls: 'neutral', label: 'Starke kurzfristige Schwankung', sub: 'Der letzte Wert weicht deutlich vom Trend ab: meist Wasser, Salz oder Speicher. Entscheidend ist die Trendlinie.' };
  }
  if (k.slope4 <= -0.5) return { cls: 'down', label: 'Deutlicher Abwärtstrend', sub: 'Etwa ' + fmtW(Math.abs(k.slope4)) + ' pro Woche. Stark! Achte weiter auf Eiweiß und dein Training, damit Muskeln bleiben.' };
  if (k.slope4 <= -0.15) return { cls: 'down', label: 'Langsamer Abwärtstrend', sub: 'Etwa ' + fmtW(Math.abs(k.slope4)) + ' pro Woche: nachhaltig und gut durchzuhalten.' };
  if (k.slope4 < 0.15) {
    if (k.target && k.target < k.tLast && k.count >= 5) {
      return { cls: 'neutral', label: 'Mehrere Wochen ohne erkennbaren Abwärtstrend', sub: 'Kein Grund zur Sorge, aber ein guter Zeitpunkt, Portionen und Alltagbewegung ehrlich anzuschauen.' };
    }
    return { cls: 'neutral', label: 'Gewicht weitgehend stabil', sub: 'Der Trend bewegt sich kaum: für Halten genau richtig.' };
  }
  return { cls: 'up', label: 'Gewicht steigt aktuell', sub: 'Ein Anstieg über wenige Wochen ist oft Wasser oder volle Speicher: beobachte den Trend, bevor du etwas änderst.' };
}

/* Liniendiagramm: Rohwerte (dünn, mit Punkten) + geglätteter Trend (kräftig)
   + optional Ziellinie. Zeitachse proportional zu den echten Daten. */
function weightChartSVG(k, selIdx) {
  const ws = state.weights;
  const W = 340, H = 180, padL = 42, padR = 14, padT = 16, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const t0 = ws[0].date, t1 = ws[ws.length - 1].date;
  const span = Math.max(1, daysBetweenIso(t0, t1));
  function x(i) { return padL + (ws.length === 1 ? iw / 2 : (daysBetweenIso(t0, ws[i].date) / span) * iw); }

  let rawMin = Infinity, rawMax = -Infinity;
  ws.forEach(function (w) { rawMin = Math.min(rawMin, w.kg); rawMax = Math.max(rawMax, w.kg); });
  if (k.target) { rawMin = Math.min(rawMin, k.target); rawMax = Math.max(rawMax, k.target); }
  if (rawMax - rawMin < 2) { rawMin -= 1; rawMax += 1; }
  const stepsTry = [0.5, 1, 2, 2.5, 5, 10, 20];
  let step = stepsTry[stepsTry.length - 1];
  for (let si = 0; si < stepsTry.length; si++) {
    if ((rawMax - rawMin) / stepsTry[si] <= 4) { step = stepsTry[si]; break; }
  }
  let min = Math.floor(rawMin / step) * step;
  let max = Math.ceil(rawMax / step) * step;
  if (max === rawMax) max += step / 2;
  function y(v) { return padT + ih - ((v - min) / (max - min)) * ih; }

  let grid = '';
  for (let v = min; v <= max + 0.001; v += step) {
    const gy = y(v);
    if (gy < padT - 1) continue;
    grid += '<line x1="' + padL + '" y1="' + gy.toFixed(1) + '" x2="' + (W - padR) + '" y2="' + gy.toFixed(1) + '" class="chart-grid"/>' +
      '<text x="' + (padL - 6) + '" y="' + (gy + 3).toFixed(1) + '" class="chart-tick" text-anchor="end">' + v.toLocaleString('de-DE') + '</text>';
  }

  let goal = '';
  if (k.target && k.target >= min && k.target <= max) {
    const gy = y(k.target).toFixed(1);
    goal = '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" class="wt-goal"/>' +
      '<text x="' + (W - padR) + '" y="' + (y(k.target) - 5).toFixed(1) + '" class="chart-tick" text-anchor="end">Ziel ' + k.target.toLocaleString('de-DE') + '</text>';
  }

  const rawPath = ws.map(function (w, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(w.kg).toFixed(1); }).join(' ');
  const trendPath = k.trend.map(function (v, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');

  let dots = '';
  ws.forEach(function (w, i) {
    const sel = i === selIdx;
    dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(w.kg).toFixed(1) + '" r="' + (sel ? 5.5 : 3.5) + '" class="wt-dot' + (sel ? ' sel' : '') + (w.flags && w.flags.length ? ' flagged' : '') + '"/>' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(w.kg).toFixed(1) + '" r="14" class="chart-hit" data-action="weight-dot" data-i="' + i + '"/>';
  });

  function shortD(iso) { return iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.'; }
  let xlab = '<text x="' + padL + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="start">' + shortD(t0) + '</text>';
  if (ws.length >= 5) {
    const mid = Math.floor((ws.length - 1) / 2);
    xlab += '<text x="' + x(mid).toFixed(1) + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="middle">' + shortD(ws[mid].date) + '</text>';
  }
  if (ws.length > 1) xlab += '<text x="' + (W - padR) + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="end">' + shortD(t1) + '</text>';

  const labels =
    '<text x="' + x(0).toFixed(1) + '" y="' + (y(ws[0].kg) - 9).toFixed(1) + '" class="chart-label" text-anchor="start">' + fmtW(ws[0].kg) + '</text>' +
    (ws.length > 1 ? '<text x="' + x(ws.length - 1).toFixed(1) + '" y="' + (y(ws[ws.length - 1].kg) - 9).toFixed(1) + '" class="chart-label strong" text-anchor="end">' + fmtW(ws[ws.length - 1].kg) + '</text>' : '');

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="wt-chart" role="img" aria-label="Gewichtsverlauf: Messwerte, geglätteter Trend' + (k.target ? ' und Zielgewicht' : '') + '">' +
    grid + goal +
    '<path d="' + rawPath + '" class="wt-raw"/>' +
    '<path d="' + trendPath + '" class="wt-trend"/>' +
    dots + labels + xlab +
    '</svg>';
}

/* Kompletter Gewichts-Bereich für die Verlauf-Ansicht */
function renderWeightSection() {
  const monIso = isoOf(mondayOfCurrentWeek());
  const thisWeek = weightEntryForWeek(monIso);
  let html = '<div class="section-title">Körpergewicht</div>';

  if (state.weights.length === 0) {
    return html +
      '<div class="card">' +
      '<h3>Noch kein Gewichtsverlauf vorhanden</h3>' +
      '<p class="sub" style="margin-top:6px">Trage dein Gewicht ein, um deine langfristige Entwicklung zu sehen. Am besten jeden Montag: morgens, nach dem Toilettengang, vor dem Essen, immer mit derselben Waage.</p>' +
      '<div class="btn-row"><button class="btn btn-primary" data-action="weight-open">⚖️ Gewicht eintragen</button></div>' +
      '</div>';
  }

  const k = weightKpis();
  const st = weightStatus(k);

  const kpis =
    '<div class="mini-stats">' +
    '<div><span class="ms-num">' + (k.diffTotal > 0 ? '+' : '') + k.diffTotal.toLocaleString('de-DE') + ' kg</span><span class="ms-lbl">seit Beginn (' + (k.diffPct > 0 ? '+' : '') + k.diffPct.toLocaleString('de-DE') + ' %)</span></div>' +
    '<div><span class="ms-num">' + (k.diffLast === null ? '–' : (k.diffLast > 0 ? '+' : '') + k.diffLast.toLocaleString('de-DE') + ' kg') + '</span><span class="ms-lbl">seit letztem Eintrag</span></div>' +
    '<div><span class="ms-num">' + (k.perWeek === null ? '–' : (k.perWeek > 0 ? '+' : '') + k.perWeek.toLocaleString('de-DE') + ' kg') + '</span><span class="ms-lbl">Ø pro Woche</span></div>' +
    '<div><span class="ms-num">' + k.count + '</span><span class="ms-lbl">' + (k.count === 1 ? 'Woche erfasst' : 'Wochen erfasst') + '</span></div>' +
    '<div><span class="ms-num">' + (k.slope4 === null ? '–' : (k.slope4 > 0 ? '+' : '') + k.slope4.toLocaleString('de-DE') + ' kg') + '</span><span class="ms-lbl">Trend/Woche (4 Wo)</span></div>' +
    '<div><span class="ms-num">' + (k.target ? ((k.tLast - k.target > 0 ? '+' : '') + (Math.round((k.tLast - k.target) * 10) / 10).toLocaleString('de-DE') + ' kg') : '–') + '</span><span class="ms-lbl">bis zum Ziel</span></div>' +
    '</div>';

  const chart = state.weights.length >= 2
    ? weightChartSVG(k, wtSelIdx)
    : '<p class="sub" style="margin:10px 0">Erster Eintrag gespeichert (' + fmtW(k.first.kg) + '). Ab dem zweiten Eintrag siehst du hier deine Kurve. 📈</p>';

  let selInfo = '';
  if (wtSelIdx !== null && state.weights[wtSelIdx]) {
    const sw = state.weights[wtSelIdx];
    const flagTxt = (sw.flags || []).map(function (f) {
      const def = WEIGHT_FLAGS.find(function (x) { return x.id === f; });
      return def ? def.label : '';
    }).filter(Boolean).join(', ');
    selInfo = '<p class="chart-info">' + fmtDate(sw.date) + ': ' + fmtW(sw.kg) +
      (flagTxt ? ' · ' + esc(flagTxt) : '') + (sw.note ? ' · „' + esc(sw.note) + '"' : '') + '</p>';
  }

  let targetLine = '';
  if (k.target) {
    const done = Math.round((k.first.kg - k.tLast) * 10) / 10;
    const total = Math.round((k.first.kg - k.target) * 10) / 10;
    if (total > 0) {
      const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
      targetLine = '<p class="sub" style="margin-top:8px">🎯 Start ' + fmtW(k.first.kg) + ' → Trend ' + fmtW(k.tLast) + ' → Ziel ' + fmtW(k.target) + ': <b>' + pct + ' % geschafft</b>. Ohne Termindruck: der Trend zählt, nicht das Datum.</p>';
    }
  }

  /* Vorsichtiger Trainings-Hinweis NUR bei längerem Trend + Leistungssignal */
  let energyHint = '';
  if (k.slope4 !== null && k.slope4 <= -0.5 && state.logs.length) {
    const lastLog = state.logs[state.logs.length - 1];
    const weak = Array.isArray(lastLog.results) ? lastLog.results.filter(function (r) { return r.verdict === 'down' || r.verdict === 'hold-low'; }).length : 0;
    if (weak >= 2) {
      energyHint = '<p class="fatigue-line">Dein Gewicht sinkt zügig, während deine Trainingsleistung zuletzt nachließ. Prüfe Schlaf, Regeneration und Energiezufuhr.</p>';
    }
  }

  const listRows = state.weights.slice().reverse().map(function (w) {
    const flagIcons = (w.flags || []).map(function (f) {
      const def = WEIGHT_FLAGS.find(function (x) { return x.id === f; });
      return def ? def.label.split(' ')[0] : '';
    }).join(' ');
    return '<div class="wt-row">' +
      '<div class="wt-row-main"><b>' + fmtW(w.kg) + '</b><span class="sub"> · ' + fmtDate(w.date) + (flagIcons ? ' ' + flagIcons : '') + '</span>' +
      (w.note ? '<div class="sub wt-note">„' + esc(w.note) + '"</div>' : '') + '</div>' +
      '<button class="swap-btn" data-action="weight-edit" data-id="' + esc(w.id) + '" title="Eintrag bearbeiten" aria-label="Eintrag vom ' + fmtDate(w.date) + ' bearbeiten">✏️</button>' +
      '<button class="swap-btn wt-del" data-action="weight-del" data-id="' + esc(w.id) + '" title="Eintrag löschen" aria-label="Eintrag vom ' + fmtDate(w.date) + ' löschen">🗑</button>' +
      '</div>';
  }).join('');

  html +=
    '<div class="card">' +
    '<p class="sub">' + (thisWeek
      ? '✓ Diese Woche eingetragen: <b>' + fmtW(thisWeek.kg) + '</b>'
      : 'Diese Woche noch kein Eintrag: am besten montags wiegen.') + '</p>' +
    kpis +
    '<p class="wt-status wt-' + st.cls + '"><b>' + st.label + '</b><br><span class="sub">' + st.sub + '</span></p>' +
    chart +
    selInfo +
    (state.weights.length >= 2 ? '<p class="chart-info">Dünne Linie = Messwerte · kräftige Linie = Trend (Durchschnitt der letzten 3 Messungen) · Punkt antippen für Details</p>' : '') +
    targetLine +
    energyHint +
    '<div class="btn-row" style="margin-top:12px">' +
    '<button class="btn ' + (thisWeek ? 'btn-ghost' : 'btn-primary') + '" data-action="weight-open">⚖️ Gewicht eintragen</button>' +
    '</div>' +
    '<div class="wt-target-row">' +
    '<span class="sub">Zielgewicht (optional):</span>' +
    '<span class="bw-wrap"><input type="number" class="bw-input" id="wt-target" min="30" max="300" step="0.5" value="' + (k.target || '') + '" placeholder="–" aria-label="Zielgewicht in Kilogramm"> kg</span>' +
    '<button class="btn btn-ghost small" data-action="weight-target-save">Speichern</button>' +
    '</div>' +
    '<button class="collapse-head" data-action="toggle-wt-list" aria-expanded="' + (wtListOpen ? 'true' : 'false') + '" style="margin-top:12px">' +
    '<span class="head-text"><span class="col-title">Alle Einträge (' + k.count + ')</span></span><span class="chev">▾</span></button>' +
    '<div class="collapse-body' + (wtListOpen ? '' : ' closed') + '">' + listRows +
    '<p class="sub" style="margin-top:10px">Normal sind Schwankungen von 1-2 kg von Tag zu Tag (Wasser, Salz, Speicher, Verdauung). Deshalb zählt die Trendlinie, nicht der einzelne Wert.</p>' +
    '</div>' +
    '</div>';
  return html;
}

function renderVerlauf() {
  const view = document.getElementById('view-verlauf');
  const todayIso = todayISO();
  const monday = mondayOfCurrentWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekCount = distinctLogDates(isoOf(monday), isoOf(sunday)).length;
  const monthPrefix = todayIso.slice(0, 7);
  const monthCount = state.logs.filter(function (l) { return l.date.slice(0, 7) === monthPrefix; }).length;

  const streak = weekStreak();
  const volume = totalVolume();
  const prs = totalPRs();

  let html =
    '<div class="section-title">Deine Bilanz</div>' +
    '<div class="stat-grid">' +
    '<div class="stat"><div class="num" data-count="' + state.logs.length + '">0</div><div class="lbl">Trainings gesamt</div></div>' +
    '<div class="stat"><div class="num">' + weekCount + '/' + getWeeklyTarget() + '</div><div class="lbl">Diese Woche</div></div>' +
    '<div class="stat"><div class="num" data-count="' + monthCount + '">0</div><div class="lbl">Diesen Monat</div></div>' +
    (state.settings.showStreak ? '<div class="stat"><div class="num">' + (streak > 0 ? '🔥 ' + streak : '–') + '</div><div class="lbl">' + (streak === 1 ? 'Woche Serie' : 'Wochen Serie') + '</div></div>' : '<div class="stat"><div class="num">' + state.logs.filter(function (l) { return l.date.slice(0, 4) === todayIso.slice(0, 4); }).length + '</div><div class="lbl">Dieses Jahr</div></div>') +
    '<div class="stat"><div class="num">' + (volume > 0 ? fmtVolume(volume) : '0 kg') + '</div><div class="lbl">Gesamt gestemmt</div></div>' +
    '<div class="stat"><div class="num" data-count="' + prs + '">0</div><div class="lbl">Rekorde</div></div>' +
    '</div>';

  /* Körpergewicht: wöchentlicher Check-in mit Trend */
  html += renderWeightSection();

  /* Wochen-Chart: Trainingshäufigkeit bzw. Volumen pro Woche */
  if (state.logs.length > 0) {
    const weeks = weekAgg(8);
    const target = getWeeklyTarget();
    html +=
      '<div class="section-title">Woche für Woche</div>' +
      '<div class="card chart-card">' +
      '<div class="chip-row">' +
      '<button class="chip' + (weekChartMode === 'freq' ? ' active' : '') + '" data-action="week-chart-mode" data-m="freq">Häufigkeit</button>' +
      '<button class="chip' + (weekChartMode === 'vol' ? ' active' : '') + '" data-action="week-chart-mode" data-m="vol">Volumen</button>' +
      '</div>' +
      weekBarsSVG(weeks, weekChartMode, target) +
      '<p class="chart-info">' + (weekChartMode === 'freq'
        ? 'Balken = Trainingstage pro Woche · gestrichelte Linie = dein Wochenziel (' + target + '×)'
        : 'Balken = bewegtes Gesamtgewicht pro Woche (Gewicht × Wiederholungen)') + '</p>' +
      '</div>';
  }

  /* Fortschritts-Chart pro Übung */
  const namesInPlan = [];
  currentPlan().days.forEach(function (d) {
    d.exercises.forEach(function (e) { if (namesInPlan.indexOf(e.name) === -1) namesInPlan.push(e.name); });
  });
  state.logs.forEach(function (l) {
    l.entries.forEach(function (en) { if (namesInPlan.indexOf(en.name) === -1) namesInPlan.push(en.name); });
  });
  const chartNames = namesInPlan.filter(function (n) { return chartDataFor(state.logs, n).length > 0; });

  if (chartNames.length) {
    if (!chartExName || chartNames.indexOf(chartExName) === -1) chartExName = chartNames[0];
    const pts = chartDataFor(state.logs, chartExName);
    if (chartSelIdx === null || chartSelIdx >= pts.length || chartSelIdx < 0) chartSelIdx = pts.length - 1;
    const chips = chartNames.map(function (n) {
      return '<button class="chip' + (n === chartExName ? ' active' : '') + '" data-action="chart-ex" data-name="' + esc(n) + '">' + esc(n) + '</button>';
    }).join('');
    const sel = pts[chartSelIdx];
    let infoLine = '';
    if (sel) {
      infoLine = fmtDate(sel.date) + ': ' + fmtKg(sel.w) + (sel.e ? ' · Max (rechnerisch) ~' + fmtKg(round25(sel.e)) : '');
    }
    const chart = pts.length >= 2
      ? chartSVG(pts, chartSelIdx)
      : '<p class="sub" style="margin:8px 0">Noch zu wenig Daten: ab dem 2. Training siehst du hier deine Kurve. 📈</p>';

    /* Trend seit dem ersten Datenpunkt */
    let trend = '';
    if (pts.length >= 2) {
      const diff = Math.round((pts[pts.length - 1].w - pts[0].w) * 100) / 100;
      const startD = pts[0].date.slice(8, 10) + '.' + pts[0].date.slice(5, 7) + '.';
      if (diff > 0) trend = '<p class="chart-trend up">▲ +' + fmtKg(diff) + ' seit ' + startD + '</p>';
      else if (diff < 0) trend = '<p class="chart-trend down">▼ ' + fmtKg(diff) + ' seit ' + startD + '</p>';
      else trend = '<p class="chart-trend">► gehalten seit ' + startD + '</p>';
    }
    html +=
      '<div class="section-title">Fortschritt pro Übung</div>' +
      '<div class="card chart-card">' +
      '<div class="chip-row chart-chips">' + chips + '</div>' +
      trend +
      chart +
      (infoLine ? '<p class="chart-info">' + infoLine + ' · Punkt antippen für Details</p>' : '') +
      '</div>';
  }

  html += '<div class="section-title">Vergangene Trainings</div>';

  if (state.logs.length === 0 && state.rot.rests.length === 0) {
    html += '<div class="card"><p class="sub">Noch keine Trainings gespeichert. Dein erstes Training wartet auf dem „Heute"-Tab! 🔥</p></div>';
  } else {
    /* Trainings und zusätzlich eingelegte Rest Days gemeinsam, neueste zuerst.
       Geplante (implizite) Ruhetage erscheinen bewusst nicht als Einträge. */
    const items = state.logs.map(function (l) { return { t: 'log', date: l.date, log: l }; })
      .concat(state.rot.rests.map(function (r) { return { t: 'rest', date: r.date, rest: r }; }));
    items.sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : (a.t === 'log' ? -1 : 1)); });
    let lastMonth = '';
    items.forEach(function (it) {
      const mKey = it.date.slice(0, 7);
      if (mKey !== lastMonth) {
        lastMonth = mKey;
        html += '<div class="section-title month-title">' + MONTHS_LONG[parseInt(it.date.slice(5, 7), 10) - 1] + ' ' + it.date.slice(0, 4) + '</div>';
      }
      if (it.t === 'rest') {
        const rl = restReasonLabel(it.rest.reason);
        html +=
          '<div class="card rest-item">' +
          '<div class="log-summary"><div class="log-left"><span class="rest-ico">🛌</span>' +
          '<div><h3>Zusätzlicher Rest Day</h3><p class="sub">' + fmtDate(it.date) + ' · ' + relDate(it.date) + (rl ? ' · ' + esc(rl) : '') + '</p></div>' +
          '</div></div></div>';
        return;
      }
      const log = it.log;
      const st = logStats(log);
      const open = expandedLogId === log.id;
      const hasPR = Array.isArray(log.results) && log.results.some(function (r) { return r.isPR; });
      let details = '';
      if (open) {
        const lines = log.entries.map(function (e) {
          const setTxt = e.sets
            .filter(function (s) { return !s.warmup && (s.done || s.weight !== '' || s.reps !== ''); })
            .map(function (s) { return (s.weight !== '' ? s.weight : '–') + '×' + (s.reps !== '' ? s.reps : '–') + (s.done ? '✓' : ''); })
            .join('  ');
          return '<div><b>' + esc(e.name) + ':</b> ' + (setTxt || 'nichts eingetragen') + '</div>';
        }).join('');
        let cardioLine = '';
        if (log.cardio) {
          cardioLine = '<div><b>Cardio:</b> ' + esc(log.cardio.name) + ' · ' + log.cardio.minutes + ' Min (~' + log.cardio.kcal.toLocaleString('de-DE') + ' kcal)</div>';
        }
        let resLines = '';
        if (Array.isArray(log.results) && log.results.length) {
          resLines = '<div class="res-note" style="margin-top:8px"><b>Empfehlung danach:</b></div>' +
            log.results.map(function (r) {
              return '<div class="res-note">' + (r.isPR ? '🏆 ' : '→ ') + esc(r.name) + ': ' + esc(r.text) + '</div>';
            }).join('');
        }
        details =
          '<div class="log-details">' + lines + cardioLine + resLines +
          '<div class="log-actions"><button class="btn btn-danger-ghost small" data-action="del-log" data-log="' + log.id + '">Eintrag löschen</button></div>' +
          '</div>';
      }
      const statBits = [];
      if (log.durationMin) statBits.push('⏱ ' + fmtDuration(log.durationMin));
      if (st.volume > 0) statBits.push(fmtVolume(st.volume) + ' bewegt');
      if (log.kcal > 0) statBits.push('~' + log.kcal.toLocaleString('de-DE') + ' kcal');
      statBits.push(setsWord(st.sets));
      html +=
        '<div class="card log-item" data-action="toggle-log" data-log="' + log.id + '">' +
        '<div class="log-summary">' +
        '<div class="log-left"><span class="day-dot d' + dayColorIdx(log) + '"></span>' +
        '<div><h3>' + esc(log.dayName) + '</h3><p class="sub">' + fmtDate(log.date) + ' · ' + relDate(log.date) + '</p></div></div>' +
        '<div class="log-right">' + (hasPR ? '<span class="pr-flag" title="Mit Rekord">🏆</span>' : '') +
        '<span class="chev' + (open ? ' open' : '') + '">▾</span></div>' +
        '</div>' +
        '<p class="log-stats">' + statBits.join(' · ') + '</p>' +
        details +
        '</div>';
    });
  }

  view.innerHTML = html;
  view.querySelectorAll('.stat .num[data-count]').forEach(animateCount);

  /* Aktives Übungs-Chip in den Sichtbereich holen (bei vielen Übungen) */
  const activeChip = view.querySelector('.chart-chips .chip.active');
  if (activeChip && activeChip.scrollIntoView) {
    activeChip.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}

/* ===== Ansicht: Mehr ===== */

function renderMehr() {
  const view = document.getElementById('view-mehr');
  const isPaused = (state.settings.pausedWeeks || []).indexOf(isoOf(mondayOfCurrentWeek())) !== -1;

  const modeRow = function (mode, title, desc) {
    const active = state.mode === mode;
    return '<div class="mode-card mode-row' + (active ? ' active' : '') + '" data-action="set-mode" data-mode="' + mode + '" role="button" tabindex="0">' +
      '<div class="mode-text"><h3>' + title + '</h3><p class="sub">' + desc + '</p></div>' +
      (active ? '<span class="check">✓ Aktiv</span>' : '<span class="check muted">wählen</span>') +
      '</div>';
  };

  /* Einklappbarer Bereich: Inhalt bleibt im DOM, wird nur ausgeblendet */
  const collapse = function (key, title, body, danger) {
    const open = !!mehrOpen[key];
    return '<div class="card' + (danger ? ' danger-zone' : '') + '">' +
      '<button class="collapse-head" data-action="toggle-more-sec" data-sec="' + key + '" aria-expanded="' + (open ? 'true' : 'false') + '">' +
      '<span class="head-text"><span class="col-title">' + title + '</span></span>' +
      '<span class="chev">▾</span>' +
      '</button>' +
      '<div class="collapse-body' + (open ? '' : ' closed') + '">' + body + '</div>' +
      '</div>';
  };

  const wissenBody =
    '<p class="sub">Die Empfehlungen kommen nicht aus dem Bauch, sondern aus Studien:</p>' +
    '<ul class="science-list">' +
    '<li><b>Nah ans Limit:</b> Muskeln wachsen am besten, wenn die letzten 1-2 Wiederholungen wirklich schwer sind. Ganz bis zum Versagen musst du dafür nicht (Meta-Analysen von Robinson und Kollegen 2024 sowie Refalo und Kollegen 2023). Details: „RIR & Muskelversagen erklärt".</li>' +
    '<li><b>Steigern:</b> Sobald du überall die obere Wiederholungszahl schaffst, geht das Gewicht rauf (ACSM-Leitlinie: +2 bis 10%). Genau das rechnet die App nach jedem Training für dich aus.</li>' +
    '<li><b>Aufwärmen:</b> Leichte Aufwärmsätze mit ca. 40% und 80% des Arbeitsgewichts machen die schweren Sätze messbar besser (Studien zu Bankdrücken und Kniebeugen).</li>' +
    '<li><b>Pause:</b> 2-3 Minuten zwischen schweren Sätzen bringen mehr Kraft und Muskeln als 1 Minute (Schoenfeld und Kollegen, 2016).</li>' +
    '<li><b>Kalorien:</b> grobe Schätzung über MET-Werte aus dem Kompendium körperlicher Aktivitäten (Krafttraining ~3,5 MET, Cardio je nach Gerät), gerechnet mit deinem Körpergewicht. Als Orientierung gedacht, nicht als Messung.</li>' +
    '</ul>';

  const rirBody =
    '<p class="sub"><b>RIR</b> heißt „Reps in Reserve": wie viele technisch saubere Wiederholungen du am Satzende noch schaffen KÖNNTEST.</p>' +
    '<ul class="science-list">' +
    '<li><b>RIR 3:</b> ungefähr drei saubere Wiederholungen wären noch drin. Fühlt sich zügig, aber kontrolliert an.</li>' +
    '<li><b>RIR 2:</b> zwei wären noch drin. Die letzten Wiederholungen werden langsamer: das ist dein Normalfall für die meisten Sätze.</li>' +
    '<li><b>RIR 1:</b> genau eine wäre noch drin. Schwer, aber sauber.</li>' +
    '<li><b>RIR 0:</b> keine weitere saubere Wiederholung möglich. Das ist Muskelversagen.</li>' +
    '<li><b>Technisches Versagen:</b> die vorgegebene Technik lässt sich nicht mehr sicher halten (Schwung, Hohlkreuz, Wackeln). <b>Hier ist IMMER Schluss</b>, egal was der Plan sagt.</li>' +
    '<li><b>Konzentrisches Versagen:</b> du bekommst das Gewicht trotz sauberer Technik nicht mehr hoch. An sicheren, geführten Übungen im letzten Satz okay.</li>' +
    '<li><b>Absolutes Versagen:</b> auch Halten/Ablassen geht nicht mehr. Braucht niemand: bringt kein Extra-Wachstum, kostet nur Erholung.</li>' +
    '<li><b>Brennen ≠ Versagen:</b> Muskelbrennen und Anstrengung kommen früher. Zähl ehrlich: könntest du noch 2-3 saubere Wiederholungen? Dann bist du bei RIR 2-3, nicht am Limit. Die meisten haben mehr im Tank, als sie denken (im Schnitt verschätzt man sich um etwa 1 Wiederholung).</li>' +
    '</ul>' +
    '<p class="sub" style="margin-top:8px"><b>So nutzt die App das:</b> Jede Übung zeigt im Training ihr RIR-Ziel und ob Muskelversagen dort okay ist. Nach dem letzten Satz fragt die App kurz, wie viel noch drin war: bei unsauberer Technik (und bei riskanteren freien Übungen auch bei „0, gerade so") wird das Gewicht NICHT automatisch erhöht, sondern erst sauber bestätigt.</p>' +
    '<p class="sub" style="margin-top:8px"><b>Tipp zum Eichen:</b> Gerade am Anfang sind das grobe Richtwerte, die meisten hören zu früh auf. Teste an einer sicheren Maschinen-Übung (z. B. Beinstrecker) im letzten Satz gelegentlich, wie sich echtes Versagen anfühlt: dann weißt du, wie weit weg „2 im Tank" wirklich ist.</p>' +
    '<p class="sub" style="margin-top:8px">Basis ist die Studienlage (u. a. Robinson 2024, Refalo 2023/24, Grgic 2022, Morán-Navarro 2017): Nähe zum Versagen wirkt graduell, die allerletzte Wiederholung ist fürs Wachstum nicht nötig und kostet 1-2 Tage Extra-Erholung. Die konkreten RIR-Zahlen und Übungs-Einstufungen sind daraus abgeleitete Praxis-Empfehlungen, keine exakten Studien-Schwellen.</p>';

  const schutzBody =
    '<p class="sub">🔒 Alle Daten bleiben nur auf deinem Gerät: kein Konto, keine Cloud, kein Tracking. Sichern kannst du sie über das Backup weiter oben.</p>' +
    '<p class="sub" style="margin-top:8px">⚕️ Trainings- und Kalorienangaben sind Orientierungshilfen, keine medizinische Beratung. Bei Schmerzen oder gesundheitlichen Problemen: Training abbrechen und ärztlich abklären lassen.</p>';

  const gefahrBody =
    '<p class="sub">Vorsicht: Diese Aktionen lassen sich nicht rückgängig machen. Vorher am besten ein Backup speichern.</p>' +
    '<button class="btn btn-ghost" data-action="reset-plan" style="margin-top:10px">Pläne auf Standard zurücksetzen</button>' +
    '<button class="btn btn-danger-ghost" data-action="wipe-all" style="margin-top:10px">Alle Daten löschen</button>';

  view.innerHTML =
    /* 1) Woche & Ziele */
    '<div class="section-title">Woche & Ziele</div>' +
    '<div class="card">' +
    '<h3>Wochenziel</h3>' +
    '<p class="sub">Wie viele Trainings pro Woche zählen für dich als „geschafft"? Zählt für Fortschritt und Serie.</p>' +
    '<div class="chip-row" style="margin-top:10px">' + [2, 3, 4, 5, 6].map(function (n) {
      return '<button class="chip' + (getWeeklyTarget() === n ? ' active' : '') + '" data-action="set-target" data-v="' + n + '">' + n + '×</button>';
    }).join('') + '</div>' +
    '<div class="switch-row" data-action="toggle-streak" style="margin-top:16px">' +
    '<div><h3>Wochen-Serie anzeigen</h3><p class="sub">Motiviert dich die 🔥-Serie nicht? Dann blende sie einfach aus.</p></div>' +
    '<span class="switch' + (state.settings.showStreak ? ' on' : '') + '"></span>' +
    '</div>' +
    '<button class="btn btn-ghost" data-action="toggle-pause" style="margin-top:12px">' +
    (isPaused ? '⏸ Pause für diese Woche aufheben' : '⏸ Diese Woche pausieren (Urlaub / krank)') +
    '</button>' +
    '<p class="sub" style="margin-top:8px">Pausenwochen unterbrechen deine Serie nicht. Erholung gehört dazu.</p>' +
    '</div>' +
    /* 2) Training */
    '<div class="section-title">Training</div>' +
    '<div class="card">' +
    '<div class="switch-row" data-action="toggle-autotimer">' +
    '<div><h3>Auto-Pause-Timer</h3><p class="sub">Nach jedem abgehakten Satz startet die Pause von allein (Grundübung 2,5 Min, kleine Übung 90 s, Aufwärmsatz 60 s).</p></div>' +
    '<span class="switch' + (state.settings.autoTimer ? ' on' : '') + '"></span>' +
    '</div>' +
    '<p class="sub" style="margin-top:10px">📱 Während eines Trainings bleibt der Bildschirm automatisch an (wenn dein Handy das unterstützt).</p>' +
    '<div class="switch-row" data-action="toggle-timersound" style="margin-top:16px">' +
    '<div><h3>Ton am Pausen-Ende</h3><p class="sub">Kurzer Signalton, wenn die Pause vorbei ist. Klappt nur, wenn dein Handy nicht stummgeschaltet ist.</p></div>' +
    '<span class="switch' + (state.settings.timerSound ? ' on' : '') + '"></span>' +
    '</div>' +
    '<div class="switch-row" style="cursor:default;margin-top:16px">' +
    '<div><h3>Dein Körpergewicht</h3><p class="sub">Grundlage für die Kalorien-Schätzung. Aktualisiere es ab und zu, wenn du abnimmst.</p></div>' +
    '<span class="bw-wrap"><input type="number" class="bw-input" min="40" max="300" step="0.5" value="' + state.settings.bodyWeight + '" data-setting-field="bodyWeight"> kg</span>' +
    '</div>' +
    '</div>' +
    /* 3) Daten & Backup (bewusst weit oben) */
    '<div class="section-title">Daten & Backup</div>' +
    '<div class="card">' +
    '<p class="sub"><b>Wichtig zu wissen:</b> Deine Daten leben nur in diesem Browser auf diesem Gerät. Wenn du Browser-Daten löschst oder das Gerät wechselst, sind sie ohne Backup weg. Sichere dir deshalb regelmäßig ein Backup, zum Beispiel einmal pro Woche.</p>' +
    '<div class="btn-row" style="margin-top:12px">' +
    '<button class="btn btn-ghost" data-action="export">Backup speichern</button>' +
    '<button class="btn btn-ghost" data-action="import">Backup laden</button>' +
    '</div>' +
    '<button class="btn btn-ghost" data-action="export-csv" style="margin-top:10px">Trainings als CSV exportieren (für Excel)</button>' +
    (localStorage.getItem(PREIMPORT_KEY) ? '<button class="btn btn-ghost" data-action="restore-preimport" style="margin-top:10px">Stand von vor dem letzten Import wiederherstellen</button>' : '') +
    '</div>' +
    /* 4) Trainings-Modus (kompakt) */
    '<div class="section-title">Trainings-Modus</div>' +
    '<div class="card">' +
    modeRow('3x', 'Ganzkörper-Split (3 Tage)', 'Tag A (Brust & Druck), Tag B (Rücken & Zug), Tag C (Beine & Core). Ideal für Einstieg und Wiedereinstieg.') +
    modeRow('5x', '5er-Split (5 Tage)', 'Push / Pull / Beine / Oberkörper / Unterkörper. Für später, wenn der Ganzkörper-Plan locker läuft.') +
    '<p class="sub" style="margin-top:10px">Beide Pläne bleiben gespeichert, dein Verlauf geht beim Umschalten nicht verloren. Wochentage stellst du im Plan-Editor ein.</p>' +
    '<div class="switch-row" data-action="toggle-rotation" style="margin-top:14px">' +
    '<div><h3>Rotierender Plan</h3><p class="sub">Die Einheiten folgen ihrer Reihenfolge statt festen Wochentagen. Auf „Heute" kannst du dann jederzeit einen Rest Day einlegen: das fällige Training rutscht einfach auf morgen, nichts geht verloren.</p></div>' +
    '<span class="switch' + (state.settings.rotationMode ? ' on' : '') + '"></span>' +
    '</div>' +
    '</div>' +
    /* 5) Einrichtung */
    '<div class="card">' +
    '<h3>Einrichtung</h3>' +
    '<p class="sub">Ziel, Trainingsort, Häufigkeit und Trainingstage neu festlegen.</p>' +
    '<button class="btn btn-ghost" data-action="rerun-setup" style="margin-top:10px">Einrichtung erneut öffnen</button>' +
    '</div>' +
    /* 6) Beta & Feedback */
    '<div class="section-title">Beta & Feedback</div>' +
    '<div class="card">' +
    '<p class="sub">Stemma ist in einer Testphase. Fällt dir ein Fehler auf, schick eine kurze Nachricht: was du erwartet hast und was passiert ist. Die Technik-Infos helfen bei der Suche (sie enthalten keine Trainings- oder Körperdaten).</p>' +
    '<button class="btn btn-ghost" data-action="diag-copy" style="margin-top:10px">Technik-Infos für Fehlerbericht anzeigen</button>' +
    '</div>' +
    /* 7) Eingeklappte Bereiche */
    '<div class="section-title">Mehr Infos</div>' +
    collapse('rir', '🎯 RIR & Muskelversagen erklärt', rirBody) +
    collapse('wissen', '📚 Warum die App so tickt', wissenBody) +
    collapse('schutz', '🔒 Datenschutz & Hinweis', schutzBody) +
    collapse('gefahr', '⚠️ Gefahrenzone', gefahrBody, true) +
    '<p class="sub" style="text-align:center;margin-top:14px">' + BRAND.name + ' ' + BRAND.version + ' · ' + BRAND.claim + ' 💪<br>Übungsfotos: free-exercise-db (Public Domain)</p>';
}

function setMode(mode) {
  if (mode !== '3x' && mode !== '5x') return;
  if (state.mode === mode) return;
  state.mode = mode;
  editingDayId = null;
  editingCopy = null;
  chartExName = null;
  chartSelIdx = null;
  saveState();
  renderMehr();
  toast('Umgestellt auf ' + (mode === '3x' ? '3× pro Woche' : '5× pro Woche'));
}

/* =====================================================
   Datensicherung: gehärteter Export, validierter Import
   mit Vorschau, Auto-Sicherung und Integritätsprüfung.
   Grundsatz: Ein Import verändert NIE ungeprüft Daten,
   ein fehlgeschlagener Import lässt alles unangetastet.
   ===================================================== */

function downloadFile(name, content, mime) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function exportData() {
  const backup = {
    app: 'stemma',
    backupVersion: BACKUP_FORMAT_VERSION,
    dataVersion: state.version || CURRENT_DATA_VERSION,
    appVersion: BRAND.version,
    exportedAt: new Date().toISOString(),
    counts: { logs: state.logs.length, weights: state.weights.length },
    /* draft (laufendes Training) ist flüchtig und gehört nicht ins Backup */
    state: { version: state.version, mode: state.mode, plans: state.plans, logs: state.logs, weights: state.weights, rot: state.rot, settings: state.settings, draft: null }
  };
  downloadFile('stemma-backup-' + todayISO() + '.json', JSON.stringify(backup, null, 2), 'application/json');
  toast('Backup heruntergeladen ✓');
}

/* CSV: bewusst NUR Trainingsdaten, ohne Körpergewicht und Einstellungen */
function csvCell(v) {
  v = (v === null || v === undefined) ? '' : String(v);
  if (/[";\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
  return v;
}

function exportCsv() {
  const rows = [['Datum', 'Trainingstag', 'Uebung', 'Satz', 'Aufwaermsatz', 'Gewicht_kg', 'Wiederholungen', 'Abgehakt', 'Dauer_min', 'Kalorien_geschaetzt', 'Cardio_Art', 'Cardio_Minuten']];
  state.logs.forEach(function (log) {
    let firstRow = true;
    log.entries.forEach(function (en) {
      let setNum = 0;
      en.sets.forEach(function (s) {
        if (!s.warmup) setNum++;
        rows.push([
          log.date, log.dayName, en.name,
          s.warmup ? '' : setNum, s.warmup ? 'ja' : 'nein',
          s.weight, s.reps, s.done ? 'ja' : 'nein',
          (firstRow && log.durationMin) ? log.durationMin : '',
          (firstRow && log.kcal) ? log.kcal : '',
          (firstRow && log.cardio) ? log.cardio.name : '',
          (firstRow && log.cardio) ? log.cardio.minutes : ''
        ]);
        firstRow = false;
      });
    });
  });
  /* \ufeff = UTF-8-BOM, damit Excel Umlaute korrekt erkennt */
  const csv = '\ufeff' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
  downloadFile('stemma-trainings-' + todayISO() + '.csv', csv, 'text/csv;charset=utf-8');
  toast('CSV heruntergeladen ✓');
}

/* ===== Import: Validierung ===== */

function asStr(v, max) {
  if (typeof v !== 'string') v = (v === null || v === undefined) ? '' : String(v);
  return v.slice(0, max || 200);
}

function clampInt(v, min, max, dflt) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function numOrNull(v) {
  const n = (typeof v === 'number') ? v : parseFloat(v);
  return (typeof n === 'number' && !isNaN(n)) ? n : null;
}

function validateBackupState(p) {
  const errors = [];
  const warnings = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) {
    return { ok: false, errors: ['Der Inhalt ist kein Stemma-Datenbestand.'], warnings: warnings, stats: null };
  }
  ['3x', '5x'].forEach(function (k) {
    const pl = p.plans && p.plans[k];
    if (!pl || !Array.isArray(pl.days) || pl.days.length === 0) {
      errors.push('Trainingsplan „' + k + '" fehlt oder ist beschädigt.');
      return;
    }
    pl.days.forEach(function (d, i) {
      if (!d || typeof d !== 'object' || !Array.isArray(d.exercises)) {
        errors.push('Plan „' + k + '", Tag ' + (i + 1) + ' ist beschädigt.');
        return;
      }
      d.exercises.forEach(function (e, j) {
        if (!e || typeof e.name !== 'string' || !e.name.trim()) {
          errors.push('Plan „' + k + '", Tag ' + (i + 1) + ', Übung ' + (j + 1) + ': Name fehlt.');
        }
      });
    });
  });
  if (!Array.isArray(p.logs)) {
    errors.push('Der Trainings-Verlauf fehlt oder ist beschädigt.');
  } else {
    if (p.logs.length > 5000) warnings.push('Sehr viele Trainings (' + p.logs.length + '): die neuesten 5000 werden übernommen.');
    p.logs.forEach(function (l, i) {
      if (!l || typeof l !== 'object') { errors.push('Verlaufs-Eintrag ' + (i + 1) + ' ist beschädigt.'); return; }
      if (typeof l.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.date)) errors.push('Verlaufs-Eintrag ' + (i + 1) + ': ungültiges Datum.');
      if (!Array.isArray(l.entries)) errors.push('Verlaufs-Eintrag ' + (i + 1) + ': Übungsdaten fehlen.');
    });
  }
  if (p.weights !== undefined) {
    if (!Array.isArray(p.weights)) {
      errors.push('Der Gewichts-Verlauf ist beschädigt.');
    } else {
      p.weights.forEach(function (w, i) {
        if (!w || typeof w !== 'object' || typeof w.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(w.date)) {
          errors.push('Gewichts-Eintrag ' + (i + 1) + ': ungültiges Datum.');
          return;
        }
        const kg = numOrNull(w.kg);
        if (kg === null || kg < 30 || kg > 300) errors.push('Gewichts-Eintrag ' + (i + 1) + ': ungültiger Wert.');
      });
    }
  }
  if (p.rot !== undefined) {
    if (!p.rot || typeof p.rot !== 'object' || Array.isArray(p.rot) || (p.rot.rests !== undefined && !Array.isArray(p.rot.rests))) {
      errors.push('Die Rest-Day-Daten sind beschädigt.');
    } else if (Array.isArray(p.rot.rests)) {
      p.rot.rests.forEach(function (r, i) {
        if (!r || typeof r !== 'object' || typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) {
          errors.push('Rest-Day-Eintrag ' + (i + 1) + ': ungültiges Datum.');
        }
      });
    }
  }
  if (p.settings === undefined || p.settings === null || typeof p.settings !== 'object') {
    warnings.push('Einstellungen fehlen im Backup: Standardwerte werden gesetzt.');
  }
  if (p.mode !== '3x' && p.mode !== '5x') warnings.push('Trainings-Modus unbekannt: Ganzkörper-Plan wird aktiv gesetzt.');

  let first = null, last = null;
  if (Array.isArray(p.logs)) {
    p.logs.forEach(function (l) {
      if (l && typeof l.date === 'string') {
        if (!first || l.date < first) first = l.date;
        if (!last || l.date > last) last = l.date;
      }
    });
  }
  const stats = {
    logs: Array.isArray(p.logs) ? Math.min(p.logs.length, 5000) : 0,
    weights: Array.isArray(p.weights) ? Math.min(p.weights.length, 1000) : 0,
    days3: (p.plans && p.plans['3x'] && Array.isArray(p.plans['3x'].days)) ? p.plans['3x'].days.length : 0,
    days5: (p.plans && p.plans['5x'] && Array.isArray(p.plans['5x'].days)) ? p.plans['5x'].days.length : 0,
    firstDate: first,
    lastDate: last
  };
  return { ok: errors.length === 0, errors: errors, warnings: warnings, stats: stats };
}

/* ===== Import: Bereinigung (nur bekannte Felder übernehmen) ===== */

function sanitizeExercise(e) {
  const w = numOrNull(e.workWeight);
  return {
    id: asStr(e.id, 40) || uid(),
    name: asStr(e.name, 80).trim(),
    sets: clampInt(e.sets, 1, 10, 3),
    reps: asStr(e.reps, 20) || '8-10',
    workWeight: (w !== null && w > 0 && w < 1000) ? w : null,
    failStreak: clampInt(e.failStreak, 0, 99, 0),
    lastResult: ['up', 'down', 'hold', 'hold-low'].indexOf(e.lastResult) !== -1 ? e.lastResult : ''
  };
}

function sanitizeDay(d, i) {
  return {
    id: asStr(d.id, 10) || ('T' + i),
    short: asStr(d.short, 20) || ('Tag ' + (i + 1)),
    name: asStr(d.name, 60) || 'Training',
    weekday: clampInt(d.weekday, 0, 6, i % 7),
    exercises: d.exercises.slice(0, 20).map(sanitizeExercise).filter(function (e) { return e.name; })
  };
}

function sanitizeSet(x) {
  x = (x && typeof x === 'object') ? x : {};
  return { weight: asStr(x.weight, 10), reps: asStr(x.reps, 10), done: x.done === true, warmup: x.warmup === true };
}

function sanitizeEntry(en) {
  en = (en && typeof en === 'object') ? en : {};
  const out = {
    exId: asStr(en.exId, 40),
    name: asStr(en.name, 80),
    repsTarget: asStr(en.repsTarget, 20),
    sets: Array.isArray(en.sets) ? en.sets.slice(0, 20).map(sanitizeSet) : []
  };
  /* Optionale RIR-Angaben (seit v7.4): additiv, kein Formatwechsel */
  if (en.lastRir === '0' || en.lastRir === '1' || en.lastRir === '2') out.lastRir = en.lastRir;
  if (en.techFail === true) out.techFail = true;
  return out;
}

function sanitizeLog(l) {
  const out = {
    id: asStr(l.id, 40) || uid(),
    date: l.date,
    mode: l.mode === '5x' ? '5x' : '3x',
    dayId: asStr(l.dayId, 10),
    dayName: asStr(l.dayName, 60),
    entries: Array.isArray(l.entries) ? l.entries.slice(0, 30).map(sanitizeEntry) : []
  };
  if (Array.isArray(l.results)) {
    out.results = l.results.slice(0, 30).map(function (r) {
      r = (r && typeof r === 'object') ? r : {};
      return { name: asStr(r.name, 80), verdict: asStr(r.verdict, 10), text: asStr(r.text, 120), isPR: r.isPR === true };
    });
  }
  const dm = numOrNull(l.durationMin);
  if (dm !== null && dm > 0 && dm < 10000) out.durationMin = Math.round(dm);
  const kc = numOrNull(l.kcal);
  if (kc !== null && kc >= 0 && kc < 100000) out.kcal = Math.round(kc);
  if (l.cardio && typeof l.cardio === 'object') {
    const cm = numOrNull(l.cardio.minutes);
    if (cm !== null && cm > 0) {
      out.cardio = {
        type: asStr(l.cardio.type, 10),
        name: asStr(l.cardio.name, 40),
        minutes: Math.min(600, Math.max(1, Math.round(cm))),
        kcal: Math.max(0, Math.round(numOrNull(l.cardio.kcal) || 0))
      };
    }
  }
  return out;
}

function sanitizeSettings(s) {
  s = (s && typeof s === 'object') ? s : {};
  return {
    autoTimer: s.autoTimer !== false,
    timerSound: s.timerSound !== false,
    rirHintSeen: s.rirHintSeen === true,
    bodyWeight: (typeof s.bodyWeight === 'number' && s.bodyWeight >= 40 && s.bodyWeight <= 300) ? s.bodyWeight : 80,
    onboarded: s.onboarded === true,
    weeklyTarget: clampInt(s.weeklyTarget, 1, 7, 3),
    pausedWeeks: Array.isArray(s.pausedWeeks)
      ? s.pausedWeeks.filter(function (w) { return typeof w === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w); }).slice(0, 260)
      : [],
    showStreak: s.showStreak !== false,
    rotationMode: s.rotationMode === true,
    targetWeightKg: (function () {
      const t = numOrNull(s.targetWeightKg);
      return (t !== null && t >= 30 && t <= 300) ? Math.round(t * 10) / 10 : null;
    })(),
    goal: asStr(s.goal, 30) || 'fitness',
    experience: asStr(s.experience, 30) || 'wiedereinstieg',
    location: s.location === 'zuhause' ? 'zuhause' : 'gym'
  };
}

function sanitizeWeights(arr) {
  if (!Array.isArray(arr)) return [];
  const flagIds = WEIGHT_FLAGS.map(function (f) { return f.id; });
  return arr.slice(-1000).map(function (w) {
    w = (w && typeof w === 'object') ? w : {};
    const parsed = num(w.kg); /* versteht Punkt UND Komma */
    const kg = isNaN(parsed) ? null : parsed;
    const out = {
      id: asStr(w.id, 40) || uid(),
      date: (typeof w.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(w.date)) ? w.date : '',
      kg: (kg !== null) ? Math.round(kg * 10) / 10 : null
    };
    const note = asStr(w.note, 120).trim();
    if (note) out.note = note;
    if (Array.isArray(w.flags)) {
      const f = w.flags.filter(function (x) { return flagIds.indexOf(x) !== -1; }).slice(0, flagIds.length);
      if (f.length) out.flags = f;
    }
    return out;
  }).filter(function (w) {
    return w.date && w.kg !== null && w.kg >= 30 && w.kg <= 300;
  }).sort(function (a, b) { return a.date < b.date ? -1 : 1; });
}

function sanitizeRot(rot) {
  rot = (rot && typeof rot === 'object' && !Array.isArray(rot)) ? rot : {};
  const ids = REST_REASONS.map(function (r) { return r.id; });
  const rests = (Array.isArray(rot.rests) ? rot.rests : []).slice(-400).map(function (r) {
    r = (r && typeof r === 'object') ? r : {};
    const out = {
      date: (typeof r.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date)) ? r.date : '',
      dayId: asStr(r.dayId, 10)
    };
    if (ids.indexOf(r.reason) !== -1) out.reason = r.reason;
    return out;
  }).filter(function (r) { return r.date !== ''; });
  rests.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  return { rests: rests };
}

function sanitizeStateForImport(p) {
  return {
    version: clampInt(p.version, 1, CURRENT_DATA_VERSION, 1),
    mode: p.mode === '5x' ? '5x' : '3x',
    plans: {
      '3x': { label: asStr(p.plans['3x'].label, 40) || '3x', days: p.plans['3x'].days.slice(0, 7).map(sanitizeDay) },
      '5x': { label: asStr(p.plans['5x'].label, 40) || '5x', days: p.plans['5x'].days.slice(0, 7).map(sanitizeDay) }
    },
    logs: p.logs.slice(-5000).map(sanitizeLog),
    weights: sanitizeWeights(p.weights),
    rot: sanitizeRot(p.rot),
    settings: sanitizeSettings(p.settings),
    draft: null
  };
}

/* ===== Import: Ablauf ===== */

let pendingImport = null;
let importBusy = false;

function showImportError(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>Import nicht möglich</h3>' +
    '<p class="sub" style="margin-top:10px">' + html + '</p>' +
    '<button class="btn btn-primary" data-action="close-modal" style="margin-top:14px">Verstanden</button>' +
    '</div></div>';
  root.classList.add('open');
}

function showImportPreview(meta, stats, warnings) {
  const root = document.getElementById('modal-root');
  const lines = [
    ['Erstellt am', meta.exportedAt ? fmtDate(meta.exportedAt.slice(0, 10)) : 'unbekannt (älteres Format)'],
    ['Datenformat', 'Version ' + meta.dataVersion + (meta.legacy ? ' (altes Backup)' : '')],
    ['Trainings', String(stats.logs)],
    ['Gewichts-Einträge', String(stats.weights || 0)],
    ['Pläne', stats.days3 + ' Tage (Ganzkörper) + ' + stats.days5 + ' Tage (5er-Split)'],
    ['Zeitraum', stats.firstDate ? (fmtDate(stats.firstDate) + ' bis ' + fmtDate(stats.lastDate)) : 'keine Trainings enthalten']
  ];
  const rows = lines.map(function (l) {
    return '<div class="log-details" style="border:none;margin:0;padding:2px 0"><b>' + l[0] + ':</b> ' + esc(l[1]) + '</div>';
  }).join('');
  const warnHtml = warnings.length
    ? '<p class="banner banner-down" style="margin-top:12px">⚠️ ' + warnings.map(esc).join('<br>⚠️ ') + '</p>'
    : '';
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>Backup prüfen</h3>' +
    '<div style="margin-top:10px">' + rows + '</div>' +
    warnHtml +
    '<p class="sub" style="margin-top:12px">Dein aktueller Stand wird vor dem Import automatisch gesichert und kann danach wiederhergestellt werden.</p>' +
    '<button class="btn btn-primary" data-action="import-confirm" style="margin-top:14px">Ja, dieses Backup importieren</button>' +
    '<button class="btn btn-ghost" data-action="close-modal" style="margin-top:10px">Abbrechen</button>' +
    '</div></div>';
  root.classList.add('open');
}

function importData(file) {
  if (importBusy) { toast('Ein Import läuft bereits …'); return; }
  if (file.size > MAX_IMPORT_BYTES) {
    showImportError('Die Datei ist ungewöhnlich groß (' + Math.round(file.size / 1024 / 1024) + ' MB). Ein Stemma-Backup ist deutlich kleiner: bitte prüfe, ob du die richtige Datei gewählt hast.');
    return;
  }
  importBusy = true;
  const reader = new FileReader();
  reader.onerror = function () {
    importBusy = false;
    showImportError('Die Datei konnte nicht gelesen werden. Bitte versuche es noch einmal.');
  };
  reader.onload = function () {
    importBusy = false;
    let obj = null;
    try {
      obj = JSON.parse(reader.result);
    } catch (e) {
      showImportError('Das ist keine gültige Backup-Datei (der Inhalt ist kein lesbares JSON). Bitte wähle die .json-Datei aus „Backup speichern".');
      return;
    }

    let payload = null;
    const meta = { exportedAt: null, dataVersion: 1, legacy: false };
    if (obj && obj.app === 'stemma' && obj.state && typeof obj.state === 'object') {
      if (clampInt(obj.backupVersion, 0, 999, 0) > BACKUP_FORMAT_VERSION) {
        showImportError('Dieses Backup stammt aus einer neueren Stemma-Version. Bitte aktualisiere zuerst die App und versuche es dann erneut.');
        return;
      }
      payload = obj.state;
      meta.exportedAt = asStr(obj.exportedAt, 40) || null;
      meta.dataVersion = clampInt(obj.dataVersion, 1, 999, 1);
    } else if (obj && obj.plans && Array.isArray(obj.logs)) {
      payload = obj;
      meta.legacy = true;
      meta.dataVersion = clampInt(obj.version, 1, 999, 1);
    } else {
      showImportError('Das sieht nicht wie ein Stemma-Backup aus. Bitte wähle die .json-Datei aus „Backup speichern".');
      return;
    }
    if (meta.dataVersion > CURRENT_DATA_VERSION) {
      showImportError('Dieses Backup nutzt ein neueres Datenformat (Version ' + meta.dataVersion + '). Bitte aktualisiere zuerst die App und versuche es dann erneut.');
      return;
    }

    const v = validateBackupState(payload);
    if (!v.ok) {
      showImportError('Dieses Backup ist beschädigt und wird zum Schutz deiner Daten nicht importiert:<br>· ' + v.errors.slice(0, 4).map(esc).join('<br>· '));
      return;
    }
    if (meta.legacy) v.warnings.push('Älteres Backup-Format: es wird beim Import automatisch auf den neuesten Stand gebracht.');
    if (state.draft) v.warnings.push('Dein gerade laufendes (nicht abgeschlossenes) Training geht beim Import verloren.');

    pendingImport = sanitizeStateForImport(payload);
    showImportPreview(meta, v.stats, v.warnings);
  };
  reader.readAsText(file);
}

function confirmImport() {
  if (!pendingImport) return;
  const incoming = pendingImport;
  pendingImport = null;
  closeModal();

  /* 1. Auto-Sicherung: ohne erfolgreiche Sicherung KEIN Import */
  try {
    localStorage.setItem(PREIMPORT_KEY, JSON.stringify(state));
  } catch (e) {
    showImportError('Die Sicherheitskopie vor dem Import konnte nicht angelegt werden (Speicher voll?). Der Import wurde abgebrochen, deine Daten sind unverändert.');
    return;
  }
  /* 2. Schreiben */
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(incoming));
  } catch (e) {
    showImportError('Das Speichern des Backups ist fehlgeschlagen (Speicher voll?). Deine bisherigen Daten sind unverändert.');
    return;
  }
  /* 3. Integritätsprüfung: zurücklesen und erneut prüfen */
  let check = null;
  try { check = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { check = null; }
  const cv = check ? validateBackupState(check) : { ok: false };
  if (!cv.ok) {
    try { localStorage.setItem(STORAGE_KEY, localStorage.getItem(PREIMPORT_KEY)); } catch (e2) {}
    showImportError('Die Prüfung nach dem Import ist fehlgeschlagen: dein vorheriger Stand wurde wiederhergestellt.');
    return;
  }
  location.reload();
}

function resetPlans() {
  if (!confirm('Beide Pläne (3× und 5×) auf den Standard zurücksetzen? Dein Verlauf bleibt erhalten.')) return;
  state.plans = defaultPlans();
  editingDayId = null;
  editingCopy = null;
  saveState();
  rerender();
  toast('Pläne zurückgesetzt ✓');
}

function wipeAll() {
  if (!confirm('Wirklich ALLE Daten löschen? Plan-Änderungen und der komplette Verlauf gehen verloren.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/* ===== Onboarding (personalisierte Einrichtung) ===== */

let obStep = 0;
let obData = null;

function defaultObData() {
  return { goal: 'fitness', experience: 'wiedereinstieg', location: 'gym', freq: 3, days: [0, 2, 4], bw: '' };
}

const OB_GOALS = [
  { id: 'muskeln', label: '💪 Muskelaufbau' },
  { id: 'kraft', label: '🏋️ Stärker werden' },
  { id: 'fitness', label: '⚡ Allgemeine Fitness' },
  { id: 'gewicht', label: '⚖️ Gewichtsmanagement' }
];
const OB_EXP = [
  { id: 'neu', label: 'Ganz neu' },
  { id: 'wiedereinstieg', label: 'Wiedereinsteiger' },
  { id: 'regelmaessig', label: 'Trainiere schon regelmäßig' }
];
const OB_LOC = [
  { id: 'gym', label: '🏢 Im Gym' },
  { id: 'zuhause', label: '🏠 Zuhause' }
];

function obChips(list, key, current) {
  return '<div class="chip-row ob-chips">' + list.map(function (o) {
    return '<button class="chip' + (o.id === current ? ' active' : '') + '" data-action="ob-set" data-k="' + key + '" data-v="' + o.id + '">' + o.label + '</button>';
  }).join('') + '</div>';
}

function obPlanDayCount() {
  return (obData.location === 'gym' && obData.freq >= 4) ? 5 : 3;
}

function renderOnboarding() {
  const root = document.getElementById('overlay-root');
  const total = 5;
  let body = '';
  let footer = '';

  if (obStep === 0) {
    body =
      '<div class="finish-emoji">💪</div>' +
      '<h2>' + esc(BRAND.name) + '</h2>' +
      '<p class="sub" style="margin-top:6px"><b>' + esc(BRAND.claim) + '</b> Dein Plan, deine Gewichte, dein Fortschritt: alles in einer App. Alle Daten bleiben nur auf diesem Gerät, kein Konto nötig.</p>';
    footer =
      '<button class="btn btn-primary" data-action="ob-next">Einrichten (1 Minute)</button>' +
      '<button class="btn btn-ghost" data-action="ob-quick" style="margin-top:10px">Schnell starten mit Standard-Plan</button>';
  } else if (obStep === 1) {
    body =
      '<h2>Was ist dein Ziel?</h2>' + obChips(OB_GOALS, 'goal', obData.goal) +
      '<h2 style="margin-top:18px">Wie viel Erfahrung hast du?</h2>' + obChips(OB_EXP, 'experience', obData.experience);
  } else if (obStep === 2) {
    const freqs = obData.location === 'zuhause' ? [2, 3, 4] : [2, 3, 4, 5];
    body =
      '<h2>Wo trainierst du?</h2>' + obChips(OB_LOC, 'location', obData.location) +
      '<h2 style="margin-top:18px">Wie oft pro Woche?</h2>' +
      '<div class="chip-row ob-chips">' + freqs.map(function (n) {
        return '<button class="chip' + (n === obData.freq ? ' active' : '') + '" data-action="ob-set" data-k="freq" data-v="' + n + '">' + n + '×</button>';
      }).join('') + '</div>' +
      '<p class="sub" style="margin-top:10px">' + (obData.location === 'zuhause'
        ? 'Zuhause bekommst du einen Ganzkörper-Plan mit Kurzhanteln und Körpergewicht.'
        : 'Bei 2-3× bekommst du einen Ganzkörper-Plan, bei 4-5× einen 5er-Split.') + '</p>';
  } else if (obStep === 3) {
    const need = obPlanDayCount();
    body =
      '<h2>An welchen Tagen?</h2>' +
      '<p class="sub" style="margin:6px 0 10px">Wähle ' + need + ' Tage für deinen Plan (dein Wochenziel: ' + obData.freq + ' Trainings). Später jederzeit änderbar.</p>' +
      '<div class="chip-row ob-chips">' + WEEKDAYS_SHORT.map(function (w, i) {
        return '<button class="chip' + (obData.days.indexOf(i) !== -1 ? ' active' : '') + '" data-action="ob-day" data-v="' + i + '">' + w + '</button>';
      }).join('') + '</div>';
  } else {
    body =
      '<h2>Dein Körpergewicht?</h2>' +
      '<p class="sub" style="margin:6px 0 12px">Nur für die grobe Kalorien-Schätzung, bleibt auf deinem Gerät. Kannst du auch überspringen.</p>' +
      '<div style="display:flex;justify-content:center"><span class="bw-wrap"><input type="number" class="bw-input" min="40" max="300" step="0.5" placeholder="80" value="' + esc(obData.bw) + '" data-ob-field="bw"> kg</span></div>';
    footer = '<button class="btn btn-primary" data-action="ob-finish">Los geht’s 💪</button>';
  }

  if (!footer) footer = '<button class="btn btn-primary" data-action="ob-next">Weiter</button>';
  const back = obStep > 0 ? '<button class="btn btn-ghost" data-action="ob-prev" style="margin-top:10px">Zurück</button>' : '';
  let dots = '';
  for (let i = 0; i < total; i++) dots += '<span class="ob-dot' + (i === obStep ? ' on' : '') + '"></span>';

  root.innerHTML =
    '<div class="overlay-backdrop">' +
    '<div class="finish-card ob-card">' + body +
    '<div class="ob-dots">' + dots + '</div>' +
    footer + back +
    '</div></div>';
  root.classList.add('open');
}

function applyOnboarding(d) {
  state.settings.goal = d.goal;
  state.settings.experience = d.experience;
  state.settings.weeklyTarget = d.freq;
  const bw = num(d.bw);
  if (!isNaN(bw) && bw >= 40 && bw <= 300) state.settings.bodyWeight = bw;

  /* Heim-Plan nur einsetzen, wenn der Ort neu auf „Zuhause" gestellt wird */
  if (d.location === 'zuhause' && (state.settings.location !== 'zuhause' || !state.settings.onboarded)) {
    if (state.logs.length === 0 || confirm('Heim-Plan einsetzen? Dein bisheriger Ganzkörper-Plan wird ersetzt (dein Verlauf bleibt erhalten).')) {
      state.plans['3x'].days = homePlanDays();
    }
  }
  state.settings.location = d.location;
  state.mode = (d.location === 'gym' && d.freq >= 4) ? '5x' : '3x';

  const days = d.days.slice().sort(function (a, b) { return a - b; });
  state.plans[state.mode].days.forEach(function (day, i) {
    if (typeof days[i] === 'number') day.weekday = days[i];
  });

  state.settings.onboarded = true;
  chartExName = null;
  chartSelIdx = null;
  saveState();
  closeOverlay();
  showView('heute');
  toast('Alles eingerichtet. ' + BRAND.claim + ' 💪');
}

/* ===== Technik-Infos für Fehlerberichte (nur Geräte-/Versionsdaten) ===== */

/* ===== Rest-Day-Dialog (rotierender Plan) ===== */

function showRestModal() {
  restModalReason = '';
  const chips = REST_REASONS.map(function (r) {
    return '<button class="chip" data-action="rest-reason" data-r="' + r.id + '">' + r.label + '</button>';
  }).join('');
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>Rest Day einlegen?</h3>' +
    '<p class="sub" style="margin-top:6px">Das heutige Training wird auf morgen verschoben. Die folgenden Einheiten rücken automatisch entsprechend nach hinten: die Reihenfolge deines Splits bleibt vollständig erhalten, nichts wird gelöscht, übersprungen oder doppelt angelegt.</p>' +
    '<p class="sub" style="margin-top:10px">Grund (optional, keine Diagnose):</p>' +
    '<div class="chip-row" style="margin-top:8px">' + chips + '</div>' +
    '<button class="btn btn-primary" data-action="rest-confirm" style="margin-top:14px">Rest Day bestätigen</button>' +
    '<button class="btn btn-ghost" data-action="close-modal" style="margin-top:10px">Abbrechen</button>' +
    '</div></div>';
  root.classList.add('open');
}

/* ===== Gewichts-Dialog (neu anlegen oder bearbeiten) ===== */

function showWeightModal(editId) {
  const w = editId ? state.weights.find(function (x) { return x.id === editId; }) : null;
  weightModalFlags = (w && Array.isArray(w.flags)) ? w.flags.slice() : [];
  const tIso = todayISO();
  const flagChips = WEIGHT_FLAGS.map(function (f) {
    return '<button class="chip' + (weightModalFlags.indexOf(f.id) !== -1 ? ' active' : '') + '" data-action="weight-flag" data-f="' + f.id + '">' + f.label + '</button>';
  }).join('');
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>' + (w ? 'Gewichts-Eintrag bearbeiten' : 'Gewicht eintragen') + '</h3>' +
    '<p class="sub" style="margin-top:6px">Vergleichbare Bedingungen: morgens, nach dem Toilettengang, vor dem Essen und Trinken, möglichst ohne Kleidung, immer dieselbe Waage.</p>' +
    '<div class="wt-form-row"><label class="sub" for="wt-date">Datum</label>' +
    '<input type="date" id="wt-date" class="wt-input" max="' + tIso + '" value="' + (w ? w.date : tIso) + '"></div>' +
    '<div class="wt-form-row"><label class="sub" for="wt-kg">Gewicht (kg)</label>' +
    '<input type="text" id="wt-kg" class="wt-input" inputmode="decimal" autocomplete="off" placeholder="z. B. 98,5" value="' + (w ? String(w.kg).replace('.', ',') : '') + '"></div>' +
    '<p class="sub" style="margin-top:10px">Besondere Umstände heute? (optional, erklärt Ausreißer)</p>' +
    '<div class="chip-row" style="margin-top:8px">' + flagChips + '</div>' +
    '<div class="wt-form-row"><label class="sub" for="wt-note">Notiz (optional)</label>' +
    '<input type="text" id="wt-note" class="wt-input" maxlength="120" placeholder="z. B. nach dem Urlaub" value="' + (w && w.note ? esc(w.note) : '') + '"></div>' +
    '<button class="btn btn-primary" data-action="weight-save" data-edit="' + (editId || '') + '" style="margin-top:14px">Speichern</button>' +
    '<button class="btn btn-ghost" data-action="close-modal" style="margin-top:10px">Abbrechen</button>' +
    '</div></div>';
  root.classList.add('open');
}

function saveWeightFromModal(editId) {
  const dateEl = document.getElementById('wt-date');
  const kgEl = document.getElementById('wt-kg');
  const noteEl = document.getElementById('wt-note');
  if (!dateEl || !kgEl) return;

  const kg = num(kgEl.value);
  if (isNaN(kg)) { toast('Bitte ein Gewicht eingeben'); return; }
  if (kg < 30 || kg > 300) { toast('Bitte einen Wert zwischen 30 und 300 kg eingeben'); return; }

  let date = dateEl.value;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) date = todayISO();
  if (date > todayISO()) { toast('Das Datum liegt in der Zukunft'); return; }

  const kgR = Math.round(kg * 10) / 10;

  /* Plausibilität: großer Sprung zum letzten Eintrag → nachfragen statt stumm speichern */
  const others = state.weights.filter(function (x) { return x.id !== editId; });
  const prev = others.length ? others[others.length - 1] : null;
  if (prev && Math.abs(kgR - prev.kg) > Math.max(3, prev.kg * 0.05)) {
    const diff = Math.round(Math.abs(kgR - prev.kg) * 10) / 10;
    if (!confirm('Das sind ' + diff.toLocaleString('de-DE') + ' kg Unterschied zum letzten Eintrag (' + fmtW(prev.kg) + '). Stimmt der Wert?')) return;
  }

  /* Ein regulärer Wert pro Kalenderwoche: vorhandenen Eintrag bewusst ersetzen */
  const weekMon = mondayIsoOf(date);
  const existing = others.find(function (x) { return mondayIsoOf(x.date) === weekMon; });
  let target = null;
  if (editId) target = state.weights.find(function (x) { return x.id === editId; });
  if (existing && (!target || existing.id !== target.id)) {
    if (!confirm('Für diese Woche gibt es schon einen Eintrag (' + fmtW(existing.kg) + ' vom ' + fmtDate(existing.date) + '). Soll er ersetzt werden?')) return;
    target = existing;
  }

  const note = asStr(noteEl ? noteEl.value : '', 120).trim();
  if (!target) {
    target = { id: uid() };
    state.weights.push(target);
  }
  target.date = date;
  target.kg = kgR;
  if (note) target.note = note; else delete target.note;
  if (weightModalFlags.length) target.flags = weightModalFlags.slice(0, WEIGHT_FLAGS.length); else delete target.flags;

  state.weights.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  /* Kalorien-Schätzung nutzt ab jetzt das frische Gewicht */
  state.settings.bodyWeight = kgR;
  wtSelIdx = null;
  saveState();
  closeModal();
  rerender();
  toast('⚖️ Gespeichert: ' + fmtW(kgR));
}

function buildDiagInfo() {
  const standalone = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator.standalone === true);
  return [
    'Stemma ' + BRAND.version,
    'Datenformat: v' + (state.version || CURRENT_DATA_VERSION),
    'Installiert als App: ' + (standalone ? 'ja' : 'nein (Browser-Tab)'),
    'Online: ' + (navigator.onLine ? 'ja' : 'nein'),
    'Sprache: ' + (navigator.language || 'unbekannt'),
    'Bildschirm: ' + window.screen.width + 'x' + window.screen.height,
    'Browser: ' + navigator.userAgent
  ].join('\n');
}

function showDiagModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>Technik-Infos</h3>' +
    '<p class="sub" style="margin-top:8px">Für Fehlerberichte: kopieren und in deine Nachricht einfügen. Enthält keine Trainings- oder Körperdaten.</p>' +
    '<textarea class="diag-text" readonly rows="8">' + esc(buildDiagInfo()) + '</textarea>' +
    '<button class="btn btn-primary" data-action="diag-clipboard" style="margin-top:12px">Kopieren</button>' +
    '<button class="btn btn-ghost" data-action="close-modal" style="margin-top:10px">Schließen</button>' +
    '</div></div>';
  root.classList.add('open');
}

/* ===== Toast ===== */

let toastTimeout = null;

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(function () { t.classList.remove('show'); }, 2200);
}

/* ===== Events ===== */

function handleAction(action, el) {
  switch (action) {
    case 'start-day': startWorkout(el.dataset.day); break;
    case 'resume': showView('workout'); break;
    case 'finish-workout': finishWorkout(); break;
    case 'cancel-workout': cancelWorkout(); break;
    case 'toggle-set': {
      const draft = state.draft;
      if (!draft) break;
      const entry = draft.entries[parseInt(el.dataset.ex, 10)];
      const set = entry && entry.sets[parseInt(el.dataset.set, 10)];
      if (!set) break;
      set.done = !set.done;
      if (set.done && state.settings.autoTimer) startTimer(set.warmup ? 60 : (entry.rest || 90));
      if (set.done && navigator.vibrate && !prefersReducedMotion()) navigator.vibrate(15);
      saveState();
      renderWorkout();
      break;
    }
    case 'timer': startTimer(parseInt(el.dataset.sec, 10)); break;
    case 'edit-day': startEditDay(el.dataset.day); break;
    case 'cancel-edit': editingDayId = null; editingCopy = null; renderPlan(); break;
    case 'save-day': saveEditDay(); break;
    case 'add-ex':
      if (editingCopy) {
        editingCopy.exercises.push(ex('', 3, '8-10'));
        renderPlan();
        const editor = document.getElementById('day-editor');
        if (editor) {
          const inputs = editor.querySelectorAll('input[data-edit-field="name"]');
          if (inputs.length) inputs[inputs.length - 1].focus();
        }
      }
      break;
    case 'rm-ex':
      if (editingCopy) {
        editingCopy.exercises.splice(parseInt(el.dataset.i, 10), 1);
        renderPlan();
      }
      break;
    case 'toggle-log':
      expandedLogId = expandedLogId === el.dataset.log ? null : el.dataset.log;
      renderVerlauf();
      break;
    case 'del-log': {
      const log = state.logs.find(function (l) { return l.id === el.dataset.log; });
      if (!log) break;
      if (!confirm('Training „' + log.dayName + '" vom ' + fmtDate(log.date) + ' löschen?')) break;
      state.logs = state.logs.filter(function (l) { return l.id !== el.dataset.log; });
      expandedLogId = null;
      saveState();
      renderVerlauf();
      toast('Eintrag gelöscht');
      break;
    }
    case 'set-mode': setMode(el.dataset.mode); break;
    case 'export': exportData(); break;
    case 'import': document.getElementById('import-file').click(); break;
    case 'reset-plan': resetPlans(); break;
    case 'wipe-all': wipeAll(); break;
    case 'export-csv': exportCsv(); break;
    case 'import-confirm': confirmImport(); break;
    case 'restore-preimport': {
      const prev = localStorage.getItem(PREIMPORT_KEY);
      if (!prev) { toast('Keine Vor-Import-Sicherung vorhanden.'); break; }
      if (!confirm('Stand von vor dem letzten Import wiederherstellen? Der aktuelle Datenstand wird dabei ersetzt.')) break;
      try {
        localStorage.setItem(STORAGE_KEY, prev);
      } catch (e) {
        toast('Wiederherstellen fehlgeschlagen (Speicher voll?)');
        break;
      }
      location.reload();
      break;
    }
    case 'ex-info': showExModal(el.dataset.name, el.dataset.reps || '8-10'); break;
    case 'swap-ex':
      openSwapChooser({ day: el.dataset.day, exId: el.dataset.exId, name: el.dataset.name, from: el.dataset.from || '' });
      break;
    case 'do-swap': {
      if (el.dataset.from === 'workout' && state.draft) {
        const en = state.draft.entries.find(function (x) { return x.exId === el.dataset.exId; });
        if (en && en.sets.some(function (s) { return s.done; })) {
          if (!confirm('Du hast bei dieser Übung schon Sätze abgehakt, die gehen beim Tauschen verloren. Trotzdem tauschen?')) break;
        }
      }
      swapExercise(el.dataset.day, el.dataset.exId, el.dataset.new);
      break;
    }
    case 'close-modal': closeModal(); pendingImport = null; break;
    case 'noop': break;
    case 'finish-close': closeOverlay(); break;
    case 'ob-next': {
      if (obStep === 3 && obData.days.length !== obPlanDayCount()) {
        toast('Bitte genau ' + obPlanDayCount() + ' Tage wählen');
        break;
      }
      obStep++;
      renderOnboarding();
      break;
    }
    case 'ob-prev': obStep--; renderOnboarding(); break;
    case 'ob-set': {
      const k = el.dataset.k;
      obData[k] = (k === 'freq') ? parseInt(el.dataset.v, 10) : el.dataset.v;
      if (k === 'freq' || k === 'location') {
        if (obData.location === 'zuhause' && obData.freq > 4) obData.freq = 4;
        obData.days = obPlanDayCount() === 5 ? [0, 1, 2, 3, 4] : [0, 2, 4];
      }
      renderOnboarding();
      break;
    }
    case 'ob-day': {
      const v = parseInt(el.dataset.v, 10);
      const di2 = obData.days.indexOf(v);
      if (di2 !== -1) obData.days.splice(di2, 1);
      else if (obData.days.length < obPlanDayCount()) obData.days.push(v);
      else { toast('Maximal ' + obPlanDayCount() + ' Tage: erst einen abwählen'); break; }
      renderOnboarding();
      break;
    }
    case 'ob-quick': applyOnboarding(defaultObData()); break;
    case 'ob-finish': applyOnboarding(obData); break;
    case 'set-target':
      state.settings.weeklyTarget = parseInt(el.dataset.v, 10);
      saveState();
      renderMehr();
      toast('Wochenziel: ' + el.dataset.v + ' Trainings pro Woche');
      break;
    case 'toggle-streak':
      state.settings.showStreak = !state.settings.showStreak;
      saveState();
      renderMehr();
      break;
    case 'toggle-pause': {
      const monIso = isoOf(mondayOfCurrentWeek());
      const arr = state.settings.pausedWeeks;
      const pi = arr.indexOf(monIso);
      if (pi !== -1) { arr.splice(pi, 1); toast('Pause aufgehoben'); }
      else { arr.push(monIso); toast('Diese Woche zählt als Pause ⏸'); }
      saveState();
      renderMehr();
      break;
    }
    case 'rerun-setup':
      if (state.draft) {
        toast('Bitte zuerst das laufende Training abschließen oder abbrechen.');
        break;
      }
      obStep = 0;
      obData = defaultObData();
      obData.goal = state.settings.goal;
      obData.experience = state.settings.experience;
      obData.location = state.settings.location;
      obData.freq = Math.min(5, Math.max(2, getWeeklyTarget()));
      if (obData.location === 'zuhause' && obData.freq > 4) obData.freq = 4;
      obData.days = obPlanDayCount() === 5 ? [0, 1, 2, 3, 4] : [0, 2, 4];
      renderOnboarding();
      break;
    case 'timer-stop': resetTimer(); updateTimerUI(); break;
    case 'diag-copy': showDiagModal(); break;
    case 'diag-clipboard': {
      const ta = document.querySelector('.diag-text');
      if (!ta) break;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ta.value)
          .then(function () { toast('Kopiert ✓'); })
          .catch(function () { ta.select(); toast('Bitte manuell kopieren (Text ist markiert)'); });
      } else {
        ta.select();
        try { document.execCommand('copy'); toast('Kopiert ✓'); } catch (e) { toast('Bitte manuell kopieren'); }
      }
      break;
    }
    case 'chart-ex': chartExName = el.dataset.name; chartSelIdx = null; renderVerlauf(); break;
    case 'chart-dot': chartSelIdx = parseInt(el.dataset.i, 10); renderVerlauf(); break;
    case 'week-chart-mode': weekChartMode = el.dataset.m; renderVerlauf(); break;
    case 'toggle-plan-day':
      planOpenDayId = el.getAttribute('aria-expanded') === 'true' ? 'none' : el.dataset.day;
      renderPlan();
      break;
    case 'toggle-more-sec':
      mehrOpen[el.dataset.sec] = !mehrOpen[el.dataset.sec];
      renderMehr();
      break;
    case 'goto-view': showView(el.dataset.v); break;
    case 'set-lastrir': {
      const en = state.draft && state.draft.entries[parseInt(el.dataset.ex, 10)];
      if (!en) break;
      en.lastRir = (en.lastRir === el.dataset.v) ? null : el.dataset.v;
      saveState();
      renderWorkout();
      break;
    }
    case 'rest-open': showRestModal(); break;
    case 'rest-reason': {
      if (restModalReason === el.dataset.r) {
        restModalReason = '';
        el.classList.remove('active');
      } else {
        restModalReason = el.dataset.r;
        const row = el.parentElement;
        if (row) {
          row.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('active'); });
        }
        el.classList.add('active');
      }
      break;
    }
    case 'rest-confirm': {
      const due = rotDue();
      const entry = { date: todayISO(), dayId: due ? due.id : '' };
      if (restModalReason) entry.reason = restModalReason;
      state.rot.rests = state.rot.rests.filter(function (r) { return r.date !== entry.date; });
      state.rot.rests.push(entry);
      state.rot.rests.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      saveState();
      closeModal();
      rerender();
      toast('🛌 Rest Day eingelegt: morgen geht es weiter');
      break;
    }
    case 'rest-undo': {
      const t = todayISO();
      if (state.draft || state.logs.some(function (l) { return l.date === t; })) {
        toast('Heute wurde schon trainiert: nichts zu ändern.');
        break;
      }
      state.rot.rests = state.rot.rests.filter(function (r) { return r.date !== t; });
      saveState();
      rerender();
      toast('Rest Day entfernt: heute ist wieder Training geplant');
      break;
    }
    case 'toggle-rotation':
      state.settings.rotationMode = !state.settings.rotationMode;
      saveState();
      renderMehr();
      toast(state.settings.rotationMode ? 'Rotierender Plan aktiv 🔁' : 'Feste Wochentage aktiv');
      break;
    case 'weight-open': showWeightModal(''); break;
    case 'weight-edit': showWeightModal(el.dataset.id); break;
    case 'weight-save': saveWeightFromModal(el.dataset.edit || ''); break;
    case 'weight-flag': {
      const f = el.dataset.f;
      const fi = weightModalFlags.indexOf(f);
      if (fi !== -1) weightModalFlags.splice(fi, 1); else weightModalFlags.push(f);
      el.classList.toggle('active');
      break;
    }
    case 'weight-del': {
      const w = state.weights.find(function (x) { return x.id === el.dataset.id; });
      if (!w) break;
      if (!confirm('Gewichts-Eintrag vom ' + fmtDate(w.date) + ' (' + fmtW(w.kg) + ') löschen?')) break;
      state.weights = state.weights.filter(function (x) { return x.id !== el.dataset.id; });
      wtSelIdx = null;
      saveState();
      rerender();
      toast('Eintrag gelöscht');
      break;
    }
    case 'weight-dot':
      wtSelIdx = wtSelIdx === parseInt(el.dataset.i, 10) ? null : parseInt(el.dataset.i, 10);
      renderVerlauf();
      break;
    case 'toggle-wt-list':
      wtListOpen = !wtListOpen;
      renderVerlauf();
      break;
    case 'weight-target-save': {
      const inp = document.getElementById('wt-target');
      if (!inp) break;
      if (inp.value === '' || inp.value === null) {
        state.settings.targetWeightKg = null;
        toast('Zielgewicht entfernt');
      } else {
        const tv = num(inp.value);
        if (isNaN(tv) || tv < 30 || tv > 300) { toast('Bitte ein Ziel zwischen 30 und 300 kg (oder leer lassen)'); break; }
        state.settings.targetWeightKg = Math.round(tv * 10) / 10;
        toast('🎯 Zielgewicht: ' + fmtW(state.settings.targetWeightKg));
      }
      saveState();
      renderVerlauf();
      break;
    }
    case 'rir-hint-ok':
      state.settings.rirHintSeen = true;
      saveState();
      renderWorkout();
      break;
    case 'toggle-techfail': {
      const en = state.draft && state.draft.entries[parseInt(el.dataset.ex, 10)];
      if (!en) break;
      en.techFail = !en.techFail;
      if (en.techFail) toast('Alles gut: gleiches Gewicht sauber schaffen ist auch Fortschritt 💪');
      saveState();
      renderWorkout();
      break;
    }
    case 'toggle-autotimer':
      state.settings.autoTimer = !state.settings.autoTimer;
      saveState();
      renderMehr();
      toast(state.settings.autoTimer ? 'Auto-Timer an ⏱️' : 'Auto-Timer aus');
      break;
    case 'toggle-timersound':
      state.settings.timerSound = !state.settings.timerSound;
      saveState();
      renderMehr();
      if (state.settings.timerSound) {
        unlockAudio();
        setTimeout(playTimerSound, 150); /* kurze Hörprobe */
        toast('Ton am Pausen-Ende an 🔔');
      } else {
        toast('Ton am Pausen-Ende aus');
      }
      break;
  }
}

function init() {
  state = loadState();
  saveState(); /* Migrationen sofort festschreiben */

  const now = new Date();
  document.getElementById('header-date').textContent =
    WEEKDAYS_LONG[dayIdx(now)] + ', ' + fmtDate(todayISO()).slice(5);

  /* Tab-Leiste */
  document.getElementById('tabbar').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-view]');
    if (btn) showView(btn.dataset.view);
  });

  /* Klicks (Delegation, auch für Modal/Overlay): innerste data-action gewinnt */
  document.addEventListener('click', function (e) {
    unlockAudio(); /* iOS: Audio-Kontext braucht eine Nutzer-Interaktion */
    const el = e.target.closest('[data-action]');
    if (!el) return;
    /* Buttons in Log-Karten nicht doppelt auslösen */
    if (el.dataset.action !== 'toggle-log') e.stopPropagation();
    handleAction(el.dataset.action, el);
  });

  /* Eingaben (Delegation, auch fürs Onboarding-Overlay) */
  document.addEventListener('input', function (e) {
    const t = e.target;
    if (t.dataset.field && state.draft) {
      const entry = state.draft.entries[parseInt(t.dataset.ex, 10)];
      const set = entry && entry.sets[parseInt(t.dataset.set, 10)];
      if (set) {
        set[t.dataset.field] = t.value;
        saveState();
      }
      return;
    }
    if (t.dataset.obField && obData) {
      obData[t.dataset.obField] = t.value;
      return;
    }
    if (t.dataset.cardioField && state.draft) {
      if (!state.draft.cardio) state.draft.cardio = { type: '', minutes: '' };
      state.draft.cardio[t.dataset.cardioField] = t.value;
      saveState();
      return;
    }
    if (t.dataset.settingField === 'bodyWeight') {
      const v = num(t.value);
      if (!isNaN(v) && v >= 40 && v <= 300) {
        state.settings.bodyWeight = v;
        saveState();
      }
      return;
    }
    if (t.dataset.editField && editingCopy) {
      const f = t.dataset.editField;
      if (f === 'dayname') editingCopy.name = t.value;
      else if (f === 'weekday') editingCopy.weekday = parseInt(t.value, 10);
      else {
        const exObj = editingCopy.exercises[parseInt(t.dataset.i, 10)];
        if (exObj) exObj[f] = t.value;
      }
    }
  });

  /* Auch das select im Editor abfangen (change statt input) */
  document.getElementById('main').addEventListener('change', function (e) {
    const t = e.target;
    if (t.dataset.editField === 'weekday' && editingCopy) {
      editingCopy.weekday = parseInt(t.value, 10);
    }
    if (t.dataset.cardioField === 'type' && state.draft) {
      if (!state.draft.cardio) state.draft.cardio = { type: '', minutes: '' };
      state.draft.cardio.type = t.value;
      saveState();
    }
  });

  /* Backup-Import */
  document.getElementById('import-file').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  /* Wake Lock nach App-Wechsel wiederherstellen + Nachhol-Hinweis,
     wenn die Pause im Hintergrund abgelaufen ist */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || currentView !== 'workout') return;
    acquireWakeLock();
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(function () {});
    if (timerEndAt > 0 && !timerFinished && Date.now() >= timerEndAt) {
      tickTimer(); /* löst Ton + Aufblinken aus */
      toast('⏱ Pause ist um: weiter geht’s!');
    }
  });

  showView('heute');

  if (corruptBackupMade) {
    toast('⚠️ Gespeicherte Daten waren beschädigt: eine Rohdaten-Sicherung wurde angelegt.');
  }

  if (!state.settings.onboarded) {
    obStep = 0;
    obData = defaultObData();
    renderOnboarding();
  }
}

init();
