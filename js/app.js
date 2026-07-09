'use strict';

/* =====================================================
   Mein Training · Trainingsplan-App für Dennis
   Speichert alles lokal im Browser (localStorage).
   ===================================================== */

const STORAGE_KEY = 'mein-training-v1';
const WEEKDAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

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
            ex('Seitheben', 3, '12-15'),
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
            ex('Bizeps-Curls (Kurzhanteln)', 3, '10-12')
          ]
        },
        {
          id: 'C', short: 'Tag C', name: 'Beine & Core', weekday: 4,
          exercises: [
            ex('Beinpresse', 3, '10-12'),
            ex('Hip Thrust (Langhantel)', 3, '10-12'),
            ex('Beinstrecker', 3, '12-15'),
            ex('Beinbeuger liegend', 3, '12-15'),
            ex('Adduktoren-Maschine', 2, '12-15'),
            ex('Abduktoren-Maschine', 2, '12-15'),
            ex('Wadenheben', 3, '15-20'),
            ex('Kabel-Crunch', 3, '12-15')
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
            ex('Beinbeuger liegend', 3, '12-15'),
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
            ex('Hammer-Curls', 3, '10-12')
          ]
        },
        {
          id: 'P5', short: 'Unterkörper', name: 'Beine & Core', weekday: 4,
          exercises: [
            ex('Goblet Squats', 3, '10-12'),
            ex('Ausfallschritte', 3, '10-12'),
            ex('Hip Thrust (Langhantel)', 3, '10-12'),
            ex('Beinbeuger liegend', 3, '12-15'),
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

function loadState() {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch (e) {
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
  /* Angefangenes Training nur am selben Tag fortsetzen */
  if (s.draft && s.draft.date !== todayISO()) s.draft = null;

  /* Migration v1 → v2: neue Felder ergänzen, nichts löschen */
  if (typeof s.version !== 'number') s.version = 1;
  if (!s.settings || typeof s.settings !== 'object') s.settings = {};
  if (typeof s.settings.autoTimer !== 'boolean') s.settings.autoTimer = true;
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
  s.version = 3;
  return s;
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
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

/* ===== Ansichten-Steuerung ===== */

let currentView = 'heute';
let editingDayId = null;
let editingCopy = null;
let expandedLogId = null;
let chartExName = null;
let chartSelIdx = null;

function showView(name) {
  currentView = name;
  document.querySelectorAll('.view').forEach(function (v) {
    v.classList.toggle('active', v.id === 'view-' + name);
  });
  document.querySelectorAll('.tabbar button').forEach(function (b) {
    b.classList.toggle('active', b.dataset.view === name);
  });
  document.body.classList.toggle('workout-open', name === 'workout');
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
    const isTrainDay = plan.days.some(function (x) { return x.weekday === i; });
    const cls = 'wday' + (iso === todayIso ? ' today' : '') + (trained ? ' done' : '');
    strip += '<div class="' + cls + '"><span class="wl">' + WEEKDAYS_SHORT[i] + '</span><span class="wd">' + d.getDate() + '</span>' +
      (trained ? '<span class="wcheck">✓</span>' : (isTrainDay ? '<span class="wdot"></span>' : '')) + '</div>';
  }
  strip += '</div>';

  /* Wochenfortschritt */
  const target = plan.days.length;
  const doneCount = weekIsos.filter(function (iso) {
    return state.logs.some(function (l) { return l.date === iso; });
  }).length;
  const pct = Math.min(100, Math.round((doneCount / target) * 100));
  const progress =
    '<div class="progress-wrap">' +
    '<div class="progress-label"><span>Diese Woche</span><span>' + doneCount + ' von ' + target + ' Trainings</span></div>' +
    '<div class="progress-bar"><div class="progress-fill' + (doneCount >= target ? ' full' : '') + '" style="width:' + pct + '%"></div></div>' +
    '</div>';

  /* Hauptkarte */
  let mainCard = '';
  const todayDay = plan.days.find(function (d) { return d.weekday === tIdx; });
  const logsToday = state.logs.filter(function (l) { return l.date === todayIso; });

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
    mainCard =
      '<div class="card success-card">' +
      '<span class="badge green">✓ Erledigt</span>' +
      '<h2>Heute schon trainiert!</h2>' +
      '<p class="sub">' + names + ' ist im Verlauf gespeichert. Stark, dranbleiben!</p>' +
      '</div>';
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
    mainCard =
      '<div class="card">' +
      '<span class="badge">Ruhetag</span>' +
      '<h2>Heute ist Erholung dran 😌</h2>' +
      '<p class="sub">' + nextTxt + ' Erholung ist Teil des Plans: da wachsen die Muskeln.</p>' +
      '</div>';
  }

  /* Schnellstart-Chips */
  const chips = plan.days.map(function (d) {
    return '<button class="chip" data-action="start-day" data-day="' + d.id + '">' + esc(d.short) + '</button>';
  }).join('');
  const chipBlock =
    '<div class="section-title">Anderes Training starten</div>' +
    '<div class="chip-row">' + chips + '</div>';

  document.getElementById('view-heute').innerHTML = strip + progress + mainCard + chipBlock;
}

/* ===== Ansicht: Plan ===== */

function renderPlan() {
  const plan = currentPlan();
  let html = '<div class="section-title">Dein Plan · ' + esc(plan.label) + '</div>';

  plan.days.forEach(function (day) {
    if (editingDayId === day.id && editingCopy) {
      html += renderDayEditor(editingCopy);
      return;
    }
    const rows = day.exercises.map(function (e) {
      const thumb = exImagesHtml(e.name, 'ex-thumb');
      const kg = (typeof e.workWeight === 'number' && e.workWeight > 0) ? '<br><span class="kg">' + fmtKg(e.workWeight) + '</span>' : '';
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
      '<div class="card">' +
      '<div class="card-top">' +
      '<span class="badge">' + WEEKDAYS_LONG[day.weekday] + '</span>' +
      '<button class="btn btn-ghost small" data-action="edit-day" data-day="' + day.id + '">✏️ Bearbeiten</button>' +
      '</div>' +
      '<h3>' + esc(dayTitle(day)) + '</h3>' +
      '<ul class="ex-preview">' + rows + '</ul>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-action="start-day" data-day="' + day.id + '">Starten</button></div>' +
      '</div>';
  });

  html += '<p class="sub" style="margin:6px 4px 0">Tipp: Übung antippen zeigt die Ausführung mit Bild. Über „Bearbeiten" kannst du Übungen, Sätze, Wiederholungen, Arbeitsgewicht und den Wochentag anpassen.</p>';
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

  let html =
    '<div class="workout-head">' +
    '<div><span class="badge">' + fmtDate(draft.date) + '</span><h2 style="margin-top:6px">' + esc(draft.dayName) + '</h2></div>' +
    '<button class="close-btn" data-action="cancel-workout" title="Training abbrechen">✕</button>' +
    '</div>';

  html +=
    '<div class="timer-bar">' +
    '<span class="timer-display" id="timer-display">Pause-Timer bereit</span>' +
    '<button class="chip" data-action="timer" data-sec="60">60 s</button>' +
    '<button class="chip" data-action="timer" data-sec="90">90 s</button>' +
    '<button class="chip" data-action="timer" data-sec="120">120 s</button>' +
    '</div>';

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
        '<button class="set-done" data-action="toggle-set" data-ex="' + ei + '" data-set="' + si + '">✓</button>' +
        '</div>';
    });

    const info = exInfo(entry.name);
    const workCount = entry.sets.filter(function (s) { return !s.warmup; }).length;
    const thumb = exImagesHtml(entry.name, 'ex-thumb');
    const metaParts = ['Ziel: ' + workCount + ' × ' + esc(entry.repsTarget), restLabel(entry.rest)];
    if (entry.e1rm) metaParts.push('Max ~' + fmtKg(round25(entry.e1rm)));
    const infoAttrs = 'data-action="ex-info" data-name="' + esc(entry.name) + '" data-reps="' + esc(entry.repsTarget) + '"';

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
      '<p class="banner banner-' + entry.banner.cls + '">' + esc(entry.banner.text) + '</p>' +
      (entry.lastInfo ? '<p class="last-info">' + esc(entry.lastInfo) + '</p>' : '') +
      '<div class="set-rows">' + rows + '</div>' +
      '</div>';
  });

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
  state.logs.push(log);
  const stats = logStats(log);

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
let timerFinished = false;

function startTimer(sec) {
  stopTimer();
  timerFinished = false;
  timerLeft = sec;
  updateTimerUI();
  timerInterval = setInterval(function () {
    timerLeft--;
    if (timerLeft <= 0) {
      stopTimer();
      timerFinished = true;
      if (navigator.vibrate) navigator.vibrate(300);
    }
    updateTimerUI();
  }, 1000);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  stopTimer();
  timerLeft = 0;
  timerFinished = false;
}

function updateTimerUI() {
  const el = document.getElementById('timer-display');
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

function renderVerlauf() {
  const view = document.getElementById('view-verlauf');
  const todayIso = todayISO();
  const monday = mondayOfCurrentWeek();
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const weekCount = distinctLogDates(isoOf(monday), isoOf(sunday)).length;
  const monthPrefix = todayIso.slice(0, 7);
  const monthCount = state.logs.filter(function (l) { return l.date.slice(0, 7) === monthPrefix; }).length;

  let html =
    '<div class="section-title">Deine Bilanz</div>' +
    '<div class="stat-grid">' +
    '<div class="stat"><div class="num" data-count="' + state.logs.length + '">0</div><div class="lbl">Trainings gesamt</div></div>' +
    '<div class="stat"><div class="num">' + weekCount + '/' + currentPlan().days.length + '</div><div class="lbl">Diese Woche</div></div>' +
    '<div class="stat"><div class="num" data-count="' + monthCount + '">0</div><div class="lbl">Diesen Monat</div></div>' +
    '</div>';

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
    html +=
      '<div class="section-title">Fortschritt pro Übung</div>' +
      '<div class="card chart-card">' +
      '<div class="chip-row chart-chips">' + chips + '</div>' +
      chart +
      (infoLine ? '<p class="chart-info">' + infoLine + ' · Punkt antippen für Details</p>' : '') +
      '</div>';
  }

  html += '<div class="section-title">Vergangene Trainings</div>';

  if (state.logs.length === 0) {
    html += '<div class="card"><p class="sub">Noch keine Trainings gespeichert. Dein erstes Training wartet auf dem „Heute"-Tab! 🔥</p></div>';
  } else {
    const sorted = state.logs.slice().reverse();
    sorted.forEach(function (log) {
      const st = logStats(log);
      const open = expandedLogId === log.id;
      let details = '';
      if (open) {
        const lines = log.entries.map(function (e) {
          const setTxt = e.sets
            .filter(function (s) { return !s.warmup && (s.done || s.weight !== '' || s.reps !== ''); })
            .map(function (s) { return (s.weight !== '' ? s.weight : '–') + '×' + (s.reps !== '' ? s.reps : '–') + (s.done ? '✓' : ''); })
            .join('  ');
          return '<div><b>' + esc(e.name) + ':</b> ' + (setTxt || 'nichts eingetragen') + '</div>';
        }).join('');
        let resLines = '';
        if (Array.isArray(log.results) && log.results.length) {
          resLines = '<div class="res-note" style="margin-top:8px"><b>Empfehlung danach:</b></div>' +
            log.results.map(function (r) {
              return '<div class="res-note">' + (r.isPR ? '🏆 ' : '→ ') + esc(r.name) + ': ' + esc(r.text) + '</div>';
            }).join('');
        }
        details =
          '<div class="log-details">' + lines + resLines +
          '<div class="log-actions"><button class="btn btn-danger-ghost small" data-action="del-log" data-log="' + log.id + '">Eintrag löschen</button></div>' +
          '</div>';
      }
      html +=
        '<div class="card log-item" data-action="toggle-log" data-log="' + log.id + '">' +
        '<div class="log-summary">' +
        '<div><h3>' + esc(log.dayName) + '</h3><p class="sub">' + fmtDate(log.date) + '</p></div>' +
        '<div class="sub" style="text-align:right">' + setsWord(st.sets) + (st.volume > 0 ? '<br>' + st.volume.toLocaleString('de-DE') + ' kg bewegt' : '') + '</div>' +
        '</div>' +
        details +
        '</div>';
    });
  }

  view.innerHTML = html;
  view.querySelectorAll('.stat .num[data-count]').forEach(animateCount);
}

/* ===== Ansicht: Mehr ===== */

function renderMehr() {
  const view = document.getElementById('view-mehr');
  const modeCard = function (mode, title, desc) {
    const active = state.mode === mode;
    return '<div class="card mode-card' + (active ? ' active' : '') + '" data-action="set-mode" data-mode="' + mode + '">' +
      '<div class="card-top"><h3>' + title + '</h3>' + (active ? '<span class="check">✓ Aktiv</span>' : '') + '</div>' +
      '<p class="sub">' + desc + '</p>' +
      '</div>';
  };

  view.innerHTML =
    '<div class="section-title">Trainings-Modus</div>' +
    modeCard('3x', '3× pro Woche', 'Ganzkörper-Split: Tag A (Brust & Druck), Tag B (Rücken & Zug), Tag C (Beine & Core). Standard: Mo / Mi / Fr. Perfekt für den Einstieg.') +
    modeCard('5x', '5× pro Woche', 'Push / Pull / Beine / Oberkörper / Unterkörper. Standard: Mo bis Fr. Für später, wenn 3× locker läuft.') +
    '<p class="sub" style="margin:0 4px 6px">Beide Pläne bleiben gespeichert, dein Verlauf geht beim Umschalten nicht verloren.</p>' +
    '<div class="section-title">Training</div>' +
    '<div class="card">' +
    '<div class="switch-row" data-action="toggle-autotimer">' +
    '<div><h3>Auto-Pause-Timer</h3><p class="sub">Nach jedem abgehakten Satz startet die Pause von allein (Grundübung 2,5 Min, kleine Übung 90 s, Aufwärmsatz 60 s).</p></div>' +
    '<span class="switch' + (state.settings.autoTimer ? ' on' : '') + '"></span>' +
    '</div></div>' +
    '<div class="section-title">Warum die App so tickt</div>' +
    '<div class="card">' +
    '<p class="sub">Die Empfehlungen kommen nicht aus dem Bauch, sondern aus Studien:</p>' +
    '<ul class="science-list">' +
    '<li><b>Nah ans Limit:</b> Muskeln wachsen am besten, wenn die letzten 1-2 Wiederholungen wirklich schwer sind (Meta-Analyse von Robinson und Kollegen, 2023).</li>' +
    '<li><b>Steigern:</b> Sobald du überall die obere Wiederholungszahl schaffst, geht das Gewicht rauf (ACSM-Leitlinie: +2 bis 10%). Genau das rechnet die App nach jedem Training für dich aus.</li>' +
    '<li><b>Aufwärmen:</b> Leichte Aufwärmsätze mit ca. 40% und 80% des Arbeitsgewichts machen die schweren Sätze messbar besser (Studien zu Bankdrücken und Kniebeugen).</li>' +
    '<li><b>Pause:</b> 2-3 Minuten zwischen schweren Sätzen bringen mehr Kraft und Muskeln als 1 Minute (Schoenfeld und Kollegen, 2016).</li>' +
    '</ul></div>' +
    '<div class="section-title">Daten</div>' +
    '<div class="card">' +
    '<p class="sub" style="margin-bottom:12px">Alles wird nur lokal in diesem Browser gespeichert. Mit dem Backup kannst du deine Daten sichern oder auf ein anderes Gerät mitnehmen.</p>' +
    '<div class="btn-row">' +
    '<button class="btn btn-ghost" data-action="export">Backup speichern</button>' +
    '<button class="btn btn-ghost" data-action="import">Backup laden</button>' +
    '</div>' +
    '</div>' +
    '<div class="card">' +
    '<button class="btn btn-ghost" data-action="reset-plan">Pläne auf Standard zurücksetzen</button>' +
    '<button class="btn btn-danger-ghost" data-action="wipe-all" style="margin-top:10px">Alle Daten löschen</button>' +
    '</div>' +
    '<p class="sub" style="text-align:center;margin-top:14px">Mein Training v2.0 · für Dennis 💪<br>Übungsfotos: free-exercise-db (Public Domain)</p>';
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

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'mein-training-backup-' + todayISO() + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  toast('Backup heruntergeladen ✓');
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = function () {
    let data = null;
    try {
      data = JSON.parse(reader.result);
    } catch (e) {
      alert('Die Datei konnte nicht gelesen werden (kein gültiges Backup).');
      return;
    }
    if (!data || typeof data !== 'object' || !data.plans || !Array.isArray(data.logs)) {
      alert('Das sieht nicht wie ein Backup dieser App aus.');
      return;
    }
    if (!confirm('Backup laden? Deine aktuellen Daten werden dabei ersetzt.')) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      alert('Speichern fehlgeschlagen.');
      return;
    }
    location.reload();
  };
  reader.readAsText(file);
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
    case 'close-modal': closeModal(); break;
    case 'noop': break;
    case 'finish-close': closeOverlay(); break;
    case 'chart-ex': chartExName = el.dataset.name; chartSelIdx = null; renderVerlauf(); break;
    case 'chart-dot': chartSelIdx = parseInt(el.dataset.i, 10); renderVerlauf(); break;
    case 'toggle-autotimer':
      state.settings.autoTimer = !state.settings.autoTimer;
      saveState();
      renderMehr();
      toast(state.settings.autoTimer ? 'Auto-Timer an ⏱️' : 'Auto-Timer aus');
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
    const el = e.target.closest('[data-action]');
    if (!el) return;
    /* Buttons in Log-Karten nicht doppelt auslösen */
    if (el.dataset.action !== 'toggle-log') e.stopPropagation();
    handleAction(el.dataset.action, el);
  });

  /* Eingaben (Delegation) */
  document.getElementById('main').addEventListener('input', function (e) {
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
  });

  /* Backup-Import */
  document.getElementById('import-file').addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (file) importData(file);
    e.target.value = '';
  });

  showView('heute');
}

init();
