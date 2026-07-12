'use strict';

/* =====================================================
   coach.js · Trainings-Intelligenz für Mein Training
   Grundlage ist die Studienlage (Stand 2026):
   - Progression: Last um ~2-10% erhöhen, sobald 1-2 Wdh.
     über dem Ziel geschafft werden (ACSM Position Stand).
   - Muskelaufbau ist besser, je näher man ans Muskel-
     versagen trainiert (0-2 Wdh. Reserve; Robinson et al.
     2023, Meta-Regression).
   - Spezifisches Aufwärmen mit ~40% und ~80% der Arbeits-
     last verbessert die Leistung in den ersten Sätzen
     (u. a. J Strength Cond Res 2021, PMC7558980).
   - Satzpausen: 2-3 Min schlagen 1 Min bei Kraft und
     Muskelaufbau (Schoenfeld et al. 2016).
   Übungsfotos: free-exercise-db (Public Domain / Unlicense),
   lokal gespeichert in img/exercises/.
   ===================================================== */

const IMG_BASE = 'img/exercises/';

/* type: compound (Grundübung) | isolation (Isolationsübung)
   inc: Steigerungsschritt in kg · rest: Pausenempfehlung in Sekunden */
const EX_INFO = {
  'Bankdrücken (Langhantel)': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 150, img: 'Barbell_Bench_Press_-_Medium_Grip',
    cues: ['Schulterblätter zusammenziehen, Brust raus', 'Stange kontrolliert zur Brustmitte, Ellbogen ca. 45 Grad', 'Füße fest in den Boden drücken']
  },
  'Schrägbankdrücken (Kurzhanteln)': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 150, img: 'Incline_Dumbbell_Press',
    cues: ['Bank auf 30-45 Grad stellen', 'Hanteln über der oberen Brust führen', 'Langsam ablassen, nicht abprallen lassen']
  },
  'Schulterdrücken (Kurzhanteln)': {
    type: 'compound', muscle: 'schulter-druck', inc: 2.5, rest: 150, img: 'Dumbbell_Shoulder_Press',
    cues: ['Rücken fest an die Lehne', 'Unterarme senkrecht halten', 'Nicht ins Hohlkreuz ausweichen']
  },
  'Seitheben': {
    type: 'isolation', muscle: 'schulter-seite', inc: 2.5, rest: 90, img: 'Side_Lateral_Raise',
    cues: ['Ellbogen leicht gebeugt lassen', 'Nur bis auf Schulterhöhe heben', 'Kein Schwung aus dem Oberkörper']
  },
  'Trizepsdrücken am Kabel': {
    type: 'isolation', muscle: 'trizeps', inc: 2.5, rest: 90, img: 'Triceps_Pushdown',
    cues: ['Ellbogen fest am Körper lassen', 'Nur die Unterarme bewegen', 'Unten kurz den Trizeps anspannen']
  },
  'Latzug zur Brust': {
    type: 'compound', muscle: 'ruecken-vertikal', inc: 2.5, rest: 150, img: 'Wide-Grip_Lat_Pulldown',
    cues: ['Brust raus, leicht zurücklehnen', 'Stange zur oberen Brust ziehen', 'Schultern unten lassen, nicht hochziehen']
  },
  'Rudern am Kabel': {
    type: 'compound', muscle: 'ruecken-horizontal', inc: 2.5, rest: 150, img: 'Seated_Cable_Rows',
    cues: ['Aufrecht sitzen, Rücken gerade', 'Griff zum Bauch ziehen, Ellbogen eng', 'Schulterblätter am Ende zusammendrücken']
  },
  'Einarmiges Kurzhantel-Rudern': {
    type: 'compound', muscle: 'ruecken-horizontal', inc: 2.5, rest: 120, img: 'One-Arm_Dumbbell_Row',
    cues: ['Knie und Hand auf der Bank abstützen', 'Rücken gerade wie eine Tischplatte', 'Hantel Richtung Hüfte ziehen']
  },
  'Face Pulls': {
    type: 'isolation', muscle: 'schulter-hinten', inc: 2.5, rest: 90, img: 'Face_Pull',
    cues: ['Seil auf Augenhöhe einstellen', 'Zum Gesicht ziehen, Ellbogen hoch', 'Am Ende Schulterblätter zusammen']
  },
  'Bizeps-Curls (Kurzhanteln)': {
    type: 'isolation', muscle: 'bizeps', inc: 2.5, rest: 90, img: 'Dumbbell_Bicep_Curl',
    cues: ['Ellbogen bleiben am Körper', 'Ohne Schwung nach oben curlen', 'Langsam ablassen (2-3 Sekunden)']
  },
  'Beinpresse': {
    type: 'compound', muscle: 'beine-quad', inc: 5, rest: 150, img: 'Leg_Press',
    cues: ['Füße schulterbreit auf die Platte', 'Knie oben nicht ganz durchstrecken', 'Tief ablassen, unterer Rücken bleibt am Polster']
  },
  'Beinstrecker': {
    type: 'isolation', muscle: 'beine-quad', inc: 2.5, rest: 90, img: 'Leg_Extensions',
    cues: ['Rücken an die Lehne', 'Oben 1 Sekunde halten', 'Langsam wieder ablassen']
  },
  'Beinbeuger liegend': {
    type: 'isolation', muscle: 'beine-beuger', inc: 2.5, rest: 90, img: 'Lying_Leg_Curls',
    cues: ['Hüfte bleibt auf dem Polster', 'Fersen Richtung Po ziehen', 'Kontrolliert zurückführen']
  },
  'Wadenheben': {
    type: 'isolation', muscle: 'waden', inc: 2.5, rest: 90, img: 'Standing_Calf_Raises',
    cues: ['Ganz hoch auf die Zehenspitzen', 'Oben kurz halten', 'Ferse tief ablassen, Dehnung spüren']
  },
  'Kabel-Crunch': {
    type: 'isolation', muscle: 'bauch', inc: 2.5, rest: 90, img: 'Cable_Crunch',
    cues: ['Im Knien, Seil neben dem Kopf halten', 'Mit den Bauchmuskeln einrollen', 'Hüfte bleibt dabei still']
  },
  'Bankdrücken (Kurzhanteln)': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 150, img: 'Dumbbell_Bench_Press',
    cues: ['Hanteln auf Brusthöhe starten', 'Nach oben und leicht zusammen drücken', 'Kontrolliert tief ablassen']
  },
  'Latzug (enger Griff)': {
    type: 'compound', muscle: 'ruecken-vertikal', inc: 2.5, rest: 150, img: 'Close-Grip_Front_Lat_Pulldown',
    cues: ['Enger Griff, aufrecht sitzen', 'Zur Brust ziehen, Ellbogen eng am Körper', 'Langsam nach oben zurück']
  },
  'Schulterdrücken (Maschine)': {
    type: 'compound', muscle: 'schulter-druck', inc: 2.5, rest: 150, img: 'Leverage_Shoulder_Press',
    cues: ['Sitz so einstellen, dass die Griffe auf Schulterhöhe sind', 'Gleichmäßig nach oben drücken', 'Nicht ins Hohlkreuz ausweichen']
  },
  'Butterfly': {
    type: 'isolation', muscle: 'brust-iso', inc: 2.5, rest: 90, img: 'Butterfly',
    cues: ['Ellbogen leicht gebeugt', 'Vor der Brust zusammenführen', 'Langsam öffnen, Dehnung in der Brust spüren']
  },
  'Hammer-Curls': {
    type: 'isolation', muscle: 'bizeps', inc: 2.5, rest: 90, img: 'Hammer_Curls',
    cues: ['Neutraler Griff, Daumen zeigen nach oben', 'Ellbogen bleiben am Körper', 'Ohne Schwung arbeiten']
  },
  'Goblet Squats': {
    type: 'compound', muscle: 'beine-quad', inc: 2.5, rest: 150, img: 'Goblet_Squat',
    cues: ['Hantel vor der Brust halten', 'Tief in die Hocke, Knie zeigen nach außen', 'Brust bleibt aufrecht']
  },
  'Ausfallschritte': {
    type: 'compound', muscle: 'beine-quad', inc: 2.5, rest: 120, img: 'Dumbbell_Lunges',
    cues: ['Großer Schritt nach vorn', 'Hinteres Knie Richtung Boden', 'Oberkörper aufrecht halten']
  },
  'Wadenheben sitzend': {
    type: 'isolation', muscle: 'waden', inc: 2.5, rest: 90, img: 'Seated_Calf_Raise',
    cues: ['Polster fest auf den Knien', 'Hoch auf die Zehenspitzen', 'Langsam und über die volle Bewegung']
  },
  'Hip Thrust (Langhantel)': {
    type: 'compound', muscle: 'po', inc: 5, rest: 150, img: 'Barbell_Hip_Thrust',
    cues: ['Schulterblätter an die Bank, Füße hüftbreit aufstellen', 'Hüfte nach oben drücken, oben den Po fest anspannen', 'Kinn leicht zur Brust, nicht ins Hohlkreuz fallen']
  },
  'Adduktoren-Maschine': {
    type: 'isolation', muscle: 'adduktoren', inc: 2.5, rest: 90, img: 'Thigh_Adductor',
    cues: ['Aufrecht sitzen, Beine an die Polster', 'Beine kontrolliert zusammendrücken', 'Langsam öffnen und die Spannung halten']
  },
  'Abduktoren-Maschine': {
    type: 'isolation', muscle: 'po', inc: 2.5, rest: 90, img: 'Thigh_Abductor',
    cues: ['Aufrecht sitzen (leicht nach vorn gelehnt trifft den Po stärker)', 'Knie kräftig nach außen drücken', 'Kurz halten, langsam zurückführen']
  },

  /* ===== Alternativ-Übungen (nur über „Tauschen" erreichbar) ===== */
  'Brustpresse (Maschine)': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 150, img: 'Machine_Bench_Press',
    cues: ['Sitz so einstellen, dass die Griffe auf Brusthöhe sind', 'Gleichmäßig nach vorn drücken, Arme nicht ganz strecken', 'Langsam zurück, Schultern unten lassen']
  },
  'Schrägbankdrücken (Langhantel)': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 150, img: 'Barbell_Incline_Bench_Press_-_Medium_Grip',
    cues: ['Bank auf 30-45 Grad stellen', 'Stange zur oberen Brust ablassen', 'Füße fest am Boden, kontrolliert drücken']
  },
  'Fliegende (Kurzhanteln)': {
    type: 'isolation', muscle: 'brust-iso', inc: 2.5, rest: 90, img: 'Dumbbell_Flyes',
    cues: ['Ellbogen leicht gebeugt, Handflächen zueinander', 'Weit öffnen, bis die Brust dehnt', 'Wie eine Umarmung wieder zusammenführen']
  },
  'Kabelzug über Kreuz': {
    type: 'isolation', muscle: 'brust-iso', inc: 2.5, rest: 90, img: 'Cable_Crossover',
    cues: ['Leichter Ausfallschritt, Oberkörper stabil', 'Griffe vor der Brust zusammenführen', 'Langsam öffnen, Spannung halten']
  },
  'Schulterdrücken (Langhantel)': {
    type: 'compound', muscle: 'schulter-druck', inc: 2.5, rest: 150, img: 'Barbell_Shoulder_Press',
    cues: ['Stange auf Schlüsselbeinhöhe starten', 'Über den Kopf drücken, Kopf leicht zurück', 'Po und Bauch fest, kein Hohlkreuz']
  },
  'Seitheben sitzend': {
    type: 'isolation', muscle: 'schulter-seite', inc: 2.5, rest: 90, img: 'Seated_Side_Lateral_Raise',
    cues: ['Aufrecht sitzen, so ist kein Schwung möglich', 'Nur bis Schulterhöhe heben', 'Langsam ablassen']
  },
  'Seitheben am Kabel': {
    type: 'isolation', muscle: 'schulter-seite', inc: 2.5, rest: 90, img: 'Cable_Seated_Lateral_Raise',
    cues: ['Das Kabel hält durchgehend Spannung', 'Ellbogen leicht gebeugt lassen', 'Nur bis Schulterhöhe heben']
  },
  'Reverse Butterfly (Maschine)': {
    type: 'isolation', muscle: 'schulter-hinten', inc: 2.5, rest: 90, img: 'Reverse_Machine_Flyes',
    cues: ['Brust an das Polster lehnen', 'Arme weit nach hinten öffnen', 'Schulterblätter zusammendrücken, kurz halten']
  },
  'Vorgebeugtes Seitheben (Kurzhanteln)': {
    type: 'isolation', muscle: 'schulter-hinten', inc: 2.5, rest: 90, img: 'Seated_Bent-Over_Rear_Delt_Raise',
    cues: ['Oberkörper vorbeugen, Rücken gerade halten', 'Hanteln seitlich nach oben führen', 'Kein Schwung, lieber leichter starten']
  },
  'V-Griff-Latzug': {
    type: 'compound', muscle: 'ruecken-vertikal', inc: 2.5, rest: 150, img: 'V-Bar_Pulldown',
    cues: ['Enger V-Griff, aufrecht sitzen', 'Griff zur oberen Brust ziehen', 'Ellbogen eng, langsam nach oben zurück']
  },
  'Langhantel-Rudern': {
    type: 'compound', muscle: 'ruecken-horizontal', inc: 2.5, rest: 150, img: 'Bent_Over_Barbell_Row',
    cues: ['Oberkörper vorgebeugt, Rücken die ganze Zeit GERADE', 'Stange zum Bauch ziehen', 'Schulterblätter zusammen, kein Schwung']
  },
  'Trizepsdrücken (Seil)': {
    type: 'isolation', muscle: 'trizeps', inc: 2.5, rest: 90, img: 'Triceps_Pushdown_-_Rope_Attachment',
    cues: ['Seil greifen, Ellbogen fest am Körper', 'Nach unten drücken und das Seil auseinanderziehen', 'Unten kurz den Trizeps anspannen']
  },
  'Stirndrücken (SZ-Stange)': {
    type: 'isolation', muscle: 'trizeps', inc: 2.5, rest: 90, img: 'EZ-Bar_Skullcrusher',
    cues: ['Auf der Bank liegend, Stange über der Stirn', 'Nur die Unterarme beugen und strecken', 'Ellbogen zeigen die ganze Zeit zur Decke']
  },
  'Langhantel-Curls': {
    type: 'isolation', muscle: 'bizeps', inc: 2.5, rest: 90, img: 'Barbell_Curl',
    cues: ['Schulterbreiter Griff', 'Ohne Schwung nach oben curlen', 'Ellbogen bleiben am Körper']
  },
  'Bizeps-Curls am Kabel': {
    type: 'isolation', muscle: 'bizeps', inc: 2.5, rest: 90, img: 'Standing_Biceps_Cable_Curl',
    cues: ['Das Kabel hält durchgehend Spannung', 'Ellbogen am Körper lassen', 'Langsam ablassen (2-3 Sekunden)']
  },
  'Kniebeugen (Langhantel)': {
    type: 'compound', muscle: 'beine-quad', inc: 2.5, rest: 150, img: 'Barbell_Squat',
    cues: ['Stange auf dem oberen Rücken, Blick nach vorn', 'Tief in die Hocke, Knie Richtung Fußspitzen', 'Brust raus, Rücken gerade']
  },
  'Beinbeuger sitzend': {
    type: 'isolation', muscle: 'beine-beuger', inc: 2.5, rest: 90, img: 'Seated_Leg_Curl',
    cues: ['Rücken an die Lehne, Polster über den Knöcheln', 'Fersen kraftvoll nach unten ziehen', 'Langsam zurückführen']
  },
  'Rumänisches Kreuzheben (Langhantel)': {
    type: 'compound', muscle: 'beine-beuger', inc: 5, rest: 150, img: 'Romanian_Deadlift',
    cues: ['Beine fast gestreckt, Hüfte nach hinten schieben', 'Rücken die ganze Zeit gerade halten', 'Dehnung hinten spüren, dann Hüfte nach vorn drücken']
  },
  'Glute Bridge (Langhantel)': {
    type: 'compound', muscle: 'po', inc: 5, rest: 150, img: 'Barbell_Glute_Bridge',
    cues: ['Auf dem Boden liegend, Stange auf der Hüfte', 'Hüfte hochdrücken, oben den Po fest anspannen', 'Langsam ablassen']
  },
  'Po-Kickback am Kabel': {
    type: 'isolation', muscle: 'po', inc: 2.5, rest: 90, img: 'One-Legged_Cable_Kickback',
    cues: ['Manschette am Knöchel, leicht vorbeugen', 'Bein nach hinten oben drücken', 'Po anspannen, kein Hohlkreuz']
  },
  'Adduktion am Kabel': {
    type: 'isolation', muscle: 'adduktoren', inc: 2.5, rest: 90, img: 'Cable_Hip_Adduction',
    cues: ['Manschette am Knöchel, seitlich zum Kabelturm stehen', 'Bein vor dem Körper nach innen ziehen', 'Langsam zurück, Spannung halten']
  },
  'Wadenheben an der Beinpresse': {
    type: 'isolation', muscle: 'waden', inc: 2.5, rest: 90, img: 'Calf_Press_On_The_Leg_Press_Machine',
    cues: ['Fußballen auf die untere Plattenkante', 'Volle Bewegung: tief dehnen, hoch drücken', 'Oben kurz halten']
  },
  'Crunch (Maschine)': {
    type: 'isolation', muscle: 'bauch', inc: 2.5, rest: 90, img: 'Ab_Crunch_Machine',
    cues: ['Sitz einstellen, Griffe fassen', 'Mit den Bauchmuskeln einrollen', 'Langsam zurück, nicht fallen lassen']
  },

  /* ===== Heim-Übungen (Körpergewicht, ohne Geräte) ===== */
  'Liegestütze': {
    type: 'compound', muscle: 'brust-druck', inc: 2.5, rest: 90, img: 'Pushups',
    cues: ['Hände etwas breiter als schulterbreit', 'Körper bildet eine Linie, Bauch fest', 'Brust Richtung Boden, kraftvoll hochdrücken. Zu schwer? Knie ablegen.']
  },
  'Crunches': {
    type: 'isolation', muscle: 'bauch', inc: 2.5, rest: 60, img: 'Crunches',
    cues: ['Unterer Rücken bleibt am Boden', 'Mit dem Bauch einrollen, nicht am Kopf ziehen', 'Langsam ablassen']
  },
  'Glute Bridge': {
    type: 'compound', muscle: 'po', inc: 2.5, rest: 90, img: 'Butt_Lift_Bridge',
    cues: ['Fersen nah am Po aufstellen', 'Hüfte hochdrücken, oben den Po fest anspannen', 'Langsam ablassen. Schwerer machen: Gewicht auf die Hüfte legen.']
  }
};

function exInfo(name) { return EX_INFO[name] || null; }
function exType(name) { const i = exInfo(name); return i ? i.type : 'isolation'; }
function exInc(name) { const i = exInfo(name); return i ? i.inc : 2.5; }
function exRest(name) { const i = exInfo(name); return i ? i.rest : 90; }
function restLabel(sec) { return sec >= 120 ? '2-3 Min Pause' : '60-90 s Pause'; }

function round25(x) { return Math.round(x / 2.5) * 2.5; }

function fmtKg(w) {
  if (w === null || w === undefined || isNaN(w)) return '–';
  return fmtWeightVal(w);
}

function parseRange(repsStr) {
  const m = String(repsStr).match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return { low: parseInt(m[1], 10), high: parseInt(m[2], 10) };
  const s = String(repsStr).match(/(\d+)/);
  const v = s ? parseInt(s[1], 10) : 10;
  return { low: v, high: v };
}

/* Geschätztes 1-Wiederholungs-Maximum nach Epley */
function epley(w, r) {
  if (isNaN(w) || isNaN(r) || r <= 0) return NaN;
  if (r === 1) return w;
  return w * (1 + r / 30);
}

/* ===== Aufwärmsätze (Rampe auf die Arbeitslast) ===== */

function buildWarmupSets(name, workWeight) {
  const protocol = exType(name) === 'compound'
    ? [{ pct: 0.4, reps: 8 }, { pct: 0.8, reps: 3 }]
    : [{ pct: 0.5, reps: 8 }];
  return protocol.map(function (p) {
    return {
      weight: (workWeight && workWeight > 0) ? String(round25(workWeight * p.pct)) : '',
      reps: String(p.reps),
      done: false,
      warmup: true
    };
  });
}

/* ===== Banner: was ist heute der Auftrag für diese Übung? ===== */

function bannerFor(exercise, range) {
  const ww = exercise.workWeight;
  switch (exercise.lastResult) {
    case 'up':
      return { cls: 'up', text: '🔥 Heute steigern: ' + fmtKg(ww) + ' auflegen und ' + range.low + '-' + range.high + ' Wdh. holen.' };
    case 'down':
      return { cls: 'down', text: '🔁 Heute bewusst leichter (' + fmtKg(ww) + '): sauber durchziehen, dann geht es wieder rauf.' };
    case 'hold-low':
      return { cls: 'hold', text: '🎯 Gewicht halten (' + fmtKg(ww) + '): diesmal mehr Wiederholungen als letztes Mal.' };
    case 'hold':
      return { cls: 'hold', text: '🎯 Gewicht halten (' + fmtKg(ww) + '): Wdh. steigern, bis überall ' + range.high + ' stehen.' };
    default:
      if (typeof ww === 'number' && ww > 0) return { cls: 'hold', text: '🎯 Arbeitsgewicht: ' + fmtKg(ww) + ' · nah ans Limit (1-2 Wdh. Reserve).' };
      return { cls: 'find', text: '🧭 Arbeitsgewicht finden: so schwer, dass ' + range.low + '-' + range.high + ' Wdh. gerade so sauber klappen (1-2 in Reserve).' };
  }
}

/* ===== Progression (Doppel-Progression nach ACSM) =====
   Wird nach jedem Training gerechnet und schreibt das neue
   Arbeitsgewicht direkt in den Plan. */

function applyProgression(draft, plans, logs) {
  const results = [];
  const plan = plans[draft.mode];
  if (!plan) return results;
  const all = [];
  plan.days.forEach(function (d) { d.exercises.forEach(function (e) { all.push(e); }); });

  draft.entries.forEach(function (entry) {
    const exercise = all.find(function (e) { return e.id === entry.exId; }) ||
                     all.find(function (e) { return e.name === entry.name; });
    const workSets = entry.sets.filter(function (s) { return !s.warmup; });
    const doneSets = workSets.filter(function (s) {
      return s.done && !isNaN(num(s.weight)) && num(s.weight) > 0 && !isNaN(num(s.reps));
    });
    if (doneSets.length === 0) return;

    const range = parseRange(entry.repsTarget);
    const topWeight = Math.max.apply(null, doneSets.map(function (s) { return num(s.weight); }));
    let bestE = 0;
    doneSets.forEach(function (s) {
      const e = epley(num(s.weight), num(s.reps));
      if (!isNaN(e) && e > bestE) bestE = e;
    });

    /* Rekord-Check gegen alle bisherigen Trainings */
    let prevBest = 0;
    logs.forEach(function (l) {
      l.entries.forEach(function (en) {
        if (en.exId !== entry.exId && en.name !== entry.name) return;
        en.sets.forEach(function (s) {
          if (s.warmup || !s.done) return;
          const w = num(s.weight);
          if (!isNaN(w) && w > prevBest) prevBest = w;
        });
      });
    });
    const isPR = prevBest > 0 && topWeight > prevBest;

    if (!exercise) {
      results.push({ name: entry.name, verdict: 'none', text: 'Gespeichert (Übung nicht mehr im Plan)', topWeight: topWeight, e1rm: bestE, isPR: isPR });
      return;
    }

    const inc = exInc(entry.name);
    const fullCount = doneSets.length >= workSets.length;
    const allTop = fullCount && doneSets.every(function (s) { return num(s.reps) >= range.high; });
    const anyBelow = doneSets.some(function (s) { return num(s.reps) < range.low; });

    let verdict, newWW;
    if (allTop) {
      newWW = round25(topWeight + inc);
      verdict = 'up';
      exercise.failStreak = 0;
    } else if (anyBelow) {
      exercise.failStreak = (exercise.failStreak || 0) + 1;
      if (exercise.failStreak >= 2) {
        newWW = Math.max(round25(topWeight * 0.9), 2.5);
        verdict = 'down';
        exercise.failStreak = 0;
      } else {
        newWW = topWeight;
        verdict = 'hold-low';
      }
    } else {
      newWW = topWeight;
      verdict = 'hold';
      exercise.failStreak = 0;
    }
    exercise.workWeight = newWW;
    exercise.lastResult = verdict;

    const texts = {
      up: 'Nächstes Mal ' + fmtKg(newWW) + ' ⬆',
      down: 'Kurzer Reset: nächstes Mal ' + fmtKg(newWW) + ' ⬇',
      'hold-low': 'Gewicht halten (' + fmtKg(newWW) + '), Wdh. steigern ▶',
      hold: 'Gewicht halten (' + fmtKg(newWW) + '), Wdh. steigern ▶'
    };
    results.push({ name: entry.name, verdict: verdict, text: texts[verdict], topWeight: topWeight, e1rm: bestE, isPR: isPR });
  });
  return results;
}

/* ===== Übungs-Bilder (2 Positionen, überblendet = Animation) ===== */

function exImagesHtml(name, cls) {
  const i = exInfo(name);
  if (!i || !i.img) return '';
  const base = IMG_BASE + encodeURIComponent(i.img) + '/';
  /* Kleine Vorschauen laden die leichten Thumbnail-Dateien */
  const small = cls.indexOf('ex-thumb') !== -1;
  const f0 = small ? 't0.jpg' : '0.jpg';
  const f1 = small ? 't1.jpg' : '1.jpg';
  return '<div class="ex-anim ' + cls + '">' +
    '<img src="' + base + f0 + '" alt="" loading="lazy">' +
    '<img class="frame2" src="' + base + f1 + '" alt="" loading="lazy">' +
    '</div>';
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ===== Übungs-Info-Modal (Ausführung) ===== */

function showExModal(name, repsTarget) {
  const i = exInfo(name);
  const root = document.getElementById('modal-root');
  const cues = (i && i.cues) ? i.cues.map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('') : '';
  const range = parseRange(repsTarget || '8-10');
  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    (i && i.img ? exImagesHtml(name, 'ex-big') : '') +
    '<h3 style="margin:12px 0 4px">' + esc(name) + '</h3>' +
    '<p class="sub">' + range.low + '-' + range.high + ' Wiederholungen · ' + restLabel(exRest(name)) + ' · letzte Wdh. sollen schwer sein (1-2 in Reserve)</p>' +
    (cues ? '<ul class="cue-list">' + cues + '</ul>' : '') +
    '<button class="btn btn-primary" data-action="close-modal" style="margin-top:14px">Alles klar 💪</button>' +
    '</div></div>';
  root.classList.add('open');
}

function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.remove('open');
  root.innerHTML = '';
}

/* ===== Kalorien-Schätzung über MET-Werte =====
   (Kompendium körperlicher Aktivitäten: Krafttraining mit
   mehreren Übungen ~3,5 MET; Cardio je nach Gerät.)
   kcal = MET × Körpergewicht (kg) × Stunden. Bewusst GROB. */

const STRENGTH_MET = 3.5;

const CARDIO_TYPES = [
  { id: 'walk', name: 'Laufband (zügig gehen)', met: 4.3 },
  { id: 'jog', name: 'Laufband (Joggen)', met: 8.0 },
  { id: 'cross', name: 'Crosstrainer', met: 5.0 },
  { id: 'bike', name: 'Ergometer / Rad', met: 6.0 },
  { id: 'row', name: 'Rudergerät', met: 7.0 },
  { id: 'stair', name: 'Stepper / Treppensteigen', met: 9.0 }
];

function cardioType(id) {
  return CARDIO_TYPES.find(function (t) { return t.id === id; }) || null;
}

function kcalFor(met, kg, minutes) {
  if (!met || !kg || !minutes || minutes <= 0) return 0;
  return Math.round(met * kg * (minutes / 60));
}

function fmtDuration(min) {
  if (min === null || min === undefined || isNaN(min)) return '–';
  if (min < 60) return min + ' Min';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h + ' Std ' + (m > 0 ? m + ' Min' : '');
}

/* ===== Abschluss-Overlay mit Konfetti ===== */

function showFinishOverlay(stats, results) {
  const root = document.getElementById('overlay-root');
  const prs = results.filter(function (r) { return r.isPR; });
  let lines = results.map(function (r) {
    return '<li class="res-' + r.verdict + '"><span>' + esc(r.name) + (r.isPR ? ' 🏆' : '') + '</span><span class="res-text">' + esc(r.text) + '</span></li>';
  }).join('');
  if (!lines) lines = '<li><span class="sub">Keine gewerteten Sätze (Gewicht + Wdh. eintragen und abhaken, dann rechnet die App für dich).</span></li>';

  const statGrid =
    '<div class="finish-stats">' +
    '<div><span class="fs-num">' + fmtDuration(stats.durationMin) + '</span><span class="fs-lbl">Dauer</span></div>' +
    '<div><span class="fs-num">' + (stats.volume > 0 ? stats.volume.toLocaleString('de-DE') + ' kg' : '–') + '</span><span class="fs-lbl">gestemmt</span></div>' +
    '<div><span class="fs-num">' + (stats.kcal > 0 ? '~' + stats.kcal.toLocaleString('de-DE') : '–') + '</span><span class="fs-lbl">kcal (grob)</span></div>' +
    '<div><span class="fs-num">' + stats.sets + '</span><span class="fs-lbl">' + (stats.sets === 1 ? 'Satz' : 'Sätze') + '</span></div>' +
    '</div>';

  const cardioLine = stats.cardio
    ? '<p class="cardio-line">🏃 ' + esc(stats.cardio.name) + ': ' + stats.cardio.minutes + ' Min (~' + stats.cardio.kcal.toLocaleString('de-DE') + ' kcal)</p>'
    : '';

  const goalLine = stats.weekGoal ? '<p class="goal-line">' + esc(stats.weekGoal) + '</p>' : '';
  const milestoneLine = stats.milestone ? '<p class="goal-line">' + esc(stats.milestone) + '</p>' : '';

  root.innerHTML =
    '<div class="overlay-backdrop">' +
    '<div class="finish-card">' +
    '<div class="finish-emoji">🎉</div>' +
    '<h2>Training geschafft!</h2>' +
    statGrid +
    cardioLine +
    goalLine +
    milestoneLine +
    (prs.length ? '<p class="pr-line">🏆 Neuer Rekord: ' + prs.map(function (r) { return esc(r.name); }).join(', ') + '!</p>' : '') +
    '<div class="section-title" style="text-align:left">Plan fürs nächste Mal</div>' +
    '<ul class="result-list">' + lines + '</ul>' +
    '<button class="btn btn-primary" data-action="finish-close">Weiter</button>' +
    '</div></div>';
  root.classList.add('open');
  spawnConfetti();
}

function closeOverlay() {
  const root = document.getElementById('overlay-root');
  root.classList.remove('open');
  root.innerHTML = '';
}

function spawnConfetti() {
  const root = document.getElementById('confetti-root');
  if (!root || prefersReducedMotion()) return;
  const colors = ['#ff8a2e', '#ffb26e', '#3ddc84', '#eef1f7', '#ff5566'];
  let html = '';
  for (let i = 0; i < 40; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.6;
    const dur = 1.4 + Math.random() * 1.2;
    const size = 6 + Math.random() * 6;
    const color = colors[i % colors.length];
    html += '<span class="confetti" style="left:' + left + 'vw;width:' + size + 'px;height:' + (size * 0.5) + 'px;background:' + color +
      ';animation-duration:' + dur + 's;animation-delay:' + delay + 's"></span>';
  }
  root.innerHTML = html;
  setTimeout(function () { root.innerHTML = ''; }, 3500);
}

/* ===== Zahlen hochzählen (kleine Animation) ===== */

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10);
  if (isNaN(target) || target <= 0) return;
  if (prefersReducedMotion()) { el.textContent = target; return; }
  const dur = 500;
  const start = performance.now();
  function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ===== Fortschritts-Chart (eine Linie, Arbeitsgewicht pro Training) ===== */

function chartDataFor(logs, name) {
  const pts = [];
  logs.forEach(function (l) {
    const en = l.entries.find(function (e) { return e.name === name; });
    if (!en) return;
    let top = 0, bestE = 0;
    en.sets.forEach(function (s) {
      if (s.warmup || !s.done) return;
      const w = num(s.weight), r = num(s.reps);
      if (isNaN(w) || w <= 0) return;
      if (w > top) top = w;
      const e = epley(w, r);
      if (!isNaN(e) && e > bestE) bestE = e;
    });
    if (top > 0) pts.push({ date: l.date, w: top, e: bestE });
  });
  return pts;
}

function chartSVG(pts, selIdx) {
  const W = 340, H = 170, padL = 38, padR = 14, padT = 16, padB = 24;
  const iw = W - padL - padR, ih = H - padT - padB;
  const ws = pts.map(function (p) { return p.w; });
  let min = Math.min.apply(null, ws), max = Math.max.apply(null, ws);
  if (min === max) { min -= 2.5; max += 2.5; }
  const pad = (max - min) * 0.15;
  min = Math.max(0, min - pad); max = max + pad;

  function x(i) { return padL + (pts.length === 1 ? iw / 2 : (i / (pts.length - 1)) * iw); }
  function y(v) { return padT + ih - ((v - min) / (max - min)) * ih; }

  /* 3 ruhige Rasterlinien mit Beschriftung */
  let grid = '';
  for (let g = 0; g <= 2; g++) {
    const v = min + ((max - min) * g) / 2;
    const gy = y(v);
    grid += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" class="chart-grid"/>' +
      '<text x="' + (padL - 6) + '" y="' + (gy + 3) + '" class="chart-tick" text-anchor="end">' + (Math.round(v * 2) / 2).toLocaleString('de-DE') + '</text>';
  }

  const path = pts.map(function (p, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.w).toFixed(1); }).join(' ');

  let dots = '';
  pts.forEach(function (p, i) {
    const sel = i === selIdx;
    dots += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.w).toFixed(1) + '" r="' + (sel ? 6 : 4) + '" class="chart-dot' + (sel ? ' sel' : '') + '"/>' +
      '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.w).toFixed(1) + '" r="14" class="chart-hit" data-action="chart-dot" data-i="' + i + '"/>';
  });

  /* Direkte Labels: erster und letzter Wert */
  const first = pts[0], lastP = pts[pts.length - 1];
  let labels = '<text x="' + x(0).toFixed(1) + '" y="' + (y(first.w) - 10) + '" class="chart-label" text-anchor="start">' + fmtKg(first.w) + '</text>';
  if (pts.length > 1) {
    labels += '<text x="' + x(pts.length - 1).toFixed(1) + '" y="' + (y(lastP.w) - 10) + '" class="chart-label strong" text-anchor="end">' + fmtKg(lastP.w) + '</text>';
  }

  /* X-Achse: erstes und letztes Datum */
  function shortDate(iso) { return iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.'; }
  let xlab = '<text x="' + padL + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="start">' + shortDate(first.date) + '</text>';
  if (pts.length > 1) xlab += '<text x="' + (W - padR) + '" y="' + (H - 6) + '" class="chart-tick" text-anchor="end">' + shortDate(lastP.date) + '</text>';

  return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="progress-chart" role="img" aria-label="Gewichtsverlauf">' +
    grid +
    '<path d="' + path + '" class="chart-line" pathLength="1"/>' +
    dots + labels + xlab +
    '</svg>';
}

/* ===== Übungs-Tausch: Alternativen für denselben Muskel ===== */

const MUSCLES = {
  'brust-druck': 'Brust (Drücken)',
  'brust-iso': 'Brust (Isolation)',
  'schulter-druck': 'Schultern (Drücken)',
  'schulter-seite': 'Seitliche Schulter',
  'schulter-hinten': 'Hintere Schulter & oberer Rücken',
  'ruecken-vertikal': 'Rücken (Ziehen von oben)',
  'ruecken-horizontal': 'Rücken (Rudern)',
  'trizeps': 'Trizeps',
  'bizeps': 'Bizeps',
  'beine-quad': 'Oberschenkel vorne & Beine',
  'beine-beuger': 'Oberschenkel hinten',
  'po': 'Po',
  'adduktoren': 'Innenseite Oberschenkel',
  'waden': 'Waden',
  'bauch': 'Bauch'
};

function exMuscle(name) {
  const i = exInfo(name);
  return i ? i.muscle : null;
}

function muscleLabel(slot) {
  return MUSCLES[slot] || 'Gleicher Muskel';
}

/* Alle Übungen mit demselben Muskel, außer der aktuellen und
   denen, die am Tag schon vorkommen */
function alternativesFor(name, takenNames) {
  const m = exMuscle(name);
  if (!m) return [];
  return Object.keys(EX_INFO).filter(function (n) {
    return n !== name && EX_INFO[n].muscle === m && takenNames.indexOf(n) === -1;
  });
}

function showSwapModal(name, alts, ds, logs) {
  const root = document.getElementById('modal-root');
  const items = alts.map(function (alt) {
    /* Falls die Alternative früher schon trainiert wurde: letztes Gewicht zeigen */
    let lastW = 0;
    logs.forEach(function (l) {
      l.entries.forEach(function (en) {
        if (en.name !== alt) return;
        en.sets.forEach(function (s) {
          if (s.warmup || !s.done) return;
          const w = num(s.weight);
          if (!isNaN(w) && w > lastW) lastW = w;
        });
      });
    });
    return '<button class="swap-item" data-action="do-swap" data-day="' + esc(ds.day) + '" data-ex-id="' + esc(ds.exId) + '" data-new="' + esc(alt) + '" data-from="' + esc(ds.from || '') + '">' +
      exImagesHtml(alt, 'ex-thumb') +
      '<span class="grow">' + esc(alt) + (lastW > 0 ? '<br><span class="kg">zuletzt ' + fmtKg(lastW) + '</span>' : '') + '</span>' +
      '<span class="swap-arrow">⇄</span>' +
      '</button>';
  }).join('');

  root.innerHTML =
    '<div class="modal-backdrop" data-action="close-modal">' +
    '<div class="modal-sheet" data-action="noop">' +
    '<h3>Alternative zu „' + esc(name) + '"</h3>' +
    '<p class="sub">' + esc(muscleLabel(exMuscle(name))) + ' · Sätze und Wiederholungen bleiben gleich, das Arbeitsgewicht wird neu ermittelt.</p>' +
    '<div class="swap-list">' + items + '</div>' +
    '<button class="btn btn-ghost" data-action="close-modal" style="margin-top:12px">Abbrechen</button>' +
    '</div></div>';
  root.classList.add('open');
}
