'use strict';

/* =====================================================
   config.js · Zentrale Konfiguration
   Marke, Einheiten und Formate an EINER Stelle statt
   verstreut im Code. Sprache: Deutsch aktiv, die
   Architektur ist für weitere Sprachen vorbereitet.
   ===================================================== */

const BRAND = {
  name: 'Stemma',
  claim: 'Du stemmst das.',
  subtitle: 'Training & Fortschritt',
  version: 'v7.7-beta'
};

/* Einheiten: 'kg' aktiv; 'lbs' ist vorbereitet und läuft
   komplett über fmtWeightVal(), gespeichert wird immer kg. */
const UNITS = { weight: 'kg' };

function kgToLbs(kg) { return kg * 2.2046226218; }

function fmtWeightVal(kg) {
  if (UNITS.weight === 'lbs') {
    return (Math.round(kgToLbs(kg) * 10) / 10).toLocaleString('de-DE') + ' lbs';
  }
  return (Math.round(kg * 10) / 10).toLocaleString('de-DE') + ' kg';
}

function fmtNum(n) {
  return Number(n).toLocaleString('de-DE');
}
