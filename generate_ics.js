#!/usr/bin/env node
// generate_ics.js — run with: node generate_ics.js
// Writes schedule.ics to the repo root.
// Commit & push → Cloudflare Pages serves it at /schedule.ics

const fs = require('fs');

// ── Match data (keep in sync with index.html) ─────────────────
const GROUPS = [
  {id:'A', matches:[
    {home:'Mexico',away:'South Africa',kickoff:'2026-06-11T20:00:00Z',venue:'Estadio Azteca',city:'Mexico City, MX'},
    {home:'South Korea',away:'Czechia',kickoff:'2026-06-12T03:00:00Z',venue:'Estadio Akron',city:'Guadalajara, MX'},
    {home:'Mexico',away:'South Korea',kickoff:'2026-06-19T00:00:00Z',venue:'Estadio Akron',city:'Guadalajara, MX'},
    {home:'Czechia',away:'South Africa',kickoff:'2026-06-18T16:00:00Z',venue:'Mercedes-Benz Stadium',city:'Atlanta, GA'},
    {home:'Czechia',away:'Mexico',kickoff:'2026-06-24T22:00:00Z',venue:'Estadio Azteca',city:'Mexico City, MX'},
    {home:'South Africa',away:'South Korea',kickoff:'2026-06-24T22:00:00Z',venue:'Estadio BBVA',city:'Monterrey, MX'},
  ]},
  {id:'B', matches:[
    {home:'Canada',away:'Bosnia and Herzegovina',kickoff:'2026-06-12T19:00:00Z',venue:'BMO Field',city:'Toronto, ON'},
    {home:'Qatar',away:'Switzerland',kickoff:'2026-06-13T19:00:00Z',venue:"Levi's Stadium",city:'San Francisco, CA'},
    {home:'Canada',away:'Qatar',kickoff:'2026-06-19T01:00:00Z',venue:'BC Place',city:'Vancouver, BC'},
    {home:'Switzerland',away:'Bosnia and Herzegovina',kickoff:'2026-06-18T22:00:00Z',venue:'SoFi Stadium',city:'Los Angeles, CA'},
    {home:'Switzerland',away:'Canada',kickoff:'2026-06-24T22:00:00Z',venue:'BC Place',city:'Vancouver, BC'},
    {home:'Bosnia and Herzegovina',away:'Qatar',kickoff:'2026-06-24T22:00:00Z',venue:'Lumen Field',city:'Seattle, WA'},
  ]},
  {id:'C', matches:[
    {home:'Brazil',away:'Morocco',kickoff:'2026-06-13T22:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'},
    {home:'Haiti',away:'Scotland',kickoff:'2026-06-14T01:00:00Z',venue:'Gillette Stadium',city:'Boston, MA'},
    {home:'Brazil',away:'Haiti',kickoff:'2026-06-19T22:00:00Z',venue:'Lincoln Financial Field',city:'Philadelphia, PA'},
    {home:'Scotland',away:'Morocco',kickoff:'2026-06-20T01:00:00Z',venue:'Gillette Stadium',city:'Boston, MA'},
    {home:'Morocco',away:'Haiti',kickoff:'2026-06-24T22:00:00Z',venue:'Mercedes-Benz Stadium',city:'Atlanta, GA'},
    {home:'Scotland',away:'Brazil',kickoff:'2026-06-24T22:00:00Z',venue:'Hard Rock Stadium',city:'Miami, FL'},
  ]},
  {id:'D', matches:[
    {home:'USA',away:'Paraguay',kickoff:'2026-06-13T01:00:00Z',venue:'SoFi Stadium',city:'Los Angeles, CA'},
    {home:'Australia',away:'Türkiye',kickoff:'2026-06-13T16:00:00Z',venue:'BC Place',city:'Vancouver, BC'},
    {home:'USA',away:'Australia',kickoff:'2026-06-20T01:00:00Z',venue:'Lumen Field',city:'Seattle, WA'},
    {home:'Türkiye',away:'Paraguay',kickoff:'2026-06-19T19:00:00Z',venue:"Levi's Stadium",city:'San Francisco, CA'},
    {home:'Paraguay',away:'Australia',kickoff:'2026-06-25T22:00:00Z',venue:"Levi's Stadium",city:'San Francisco, CA'},
    {home:'Türkiye',away:'USA',kickoff:'2026-06-25T22:00:00Z',venue:'SoFi Stadium',city:'Los Angeles, CA'},
  ]},
  {id:'E', matches:[
    {home:'Germany',away:'Curaçao',kickoff:'2026-06-14T19:00:00Z',venue:'NRG Stadium',city:'Houston, TX'},
    {home:"Côte d'Ivoire",away:'Ecuador',kickoff:'2026-06-14T22:00:00Z',venue:'Lincoln Financial Field',city:'Philadelphia, PA'},
    {home:'Germany',away:"Côte d'Ivoire",kickoff:'2026-06-20T22:00:00Z',venue:'BMO Field',city:'Toronto, ON'},
    {home:'Ecuador',away:'Curaçao',kickoff:'2026-06-21T01:00:00Z',venue:'Arrowhead Stadium',city:'Kansas City, MO'},
    {home:'Ecuador',away:'Germany',kickoff:'2026-06-25T22:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'},
    {home:'Curaçao',away:"Côte d'Ivoire",kickoff:'2026-06-25T22:00:00Z',venue:'Lincoln Financial Field',city:'Philadelphia, PA'},
  ]},
  {id:'F', matches:[
    {home:'Sweden',away:'Tunisia',kickoff:'2026-06-14T16:00:00Z',venue:'Estadio BBVA',city:'Monterrey, MX'},
    {home:'Netherlands',away:'Japan',kickoff:'2026-06-15T01:00:00Z',venue:'AT&T Stadium',city:'Arlington, TX'},
    {home:'Netherlands',away:'Sweden',kickoff:'2026-06-21T01:00:00Z',venue:'NRG Stadium',city:'Houston, TX'},
    {home:'Tunisia',away:'Japan',kickoff:'2026-06-20T19:00:00Z',venue:'Estadio BBVA',city:'Monterrey, MX'},
    {home:'Tunisia',away:'Netherlands',kickoff:'2026-06-25T22:00:00Z',venue:'Arrowhead Stadium',city:'Kansas City, MO'},
    {home:'Japan',away:'Sweden',kickoff:'2026-06-25T22:00:00Z',venue:'AT&T Stadium',city:'Arlington, TX'},
  ]},
  {id:'G', matches:[
    {home:'Iran',away:'New Zealand',kickoff:'2026-06-16T01:00:00Z',venue:'SoFi Stadium',city:'Los Angeles, CA'},
    {home:'Belgium',away:'Egypt',kickoff:'2026-06-15T22:00:00Z',venue:'Lumen Field',city:'Seattle, WA'},
    {home:'New Zealand',away:'Egypt',kickoff:'2026-06-21T22:00:00Z',venue:'BC Place',city:'Vancouver, BC'},
    {home:'Belgium',away:'Iran',kickoff:'2026-06-22T01:00:00Z',venue:'SoFi Stadium',city:'Los Angeles, CA'},
    {home:'Egypt',away:'Iran',kickoff:'2026-06-26T22:00:00Z',venue:'Lumen Field',city:'Seattle, WA'},
    {home:'New Zealand',away:'Belgium',kickoff:'2026-06-26T22:00:00Z',venue:'BC Place',city:'Vancouver, BC'},
  ]},
  {id:'H', matches:[
    {home:'Spain',away:'Cabo Verde',kickoff:'2026-06-15T19:00:00Z',venue:'Mercedes-Benz Stadium',city:'Atlanta, GA'},
    {home:'Saudi Arabia',away:'Uruguay',kickoff:'2026-06-15T16:00:00Z',venue:'Hard Rock Stadium',city:'Miami, FL'},
    {home:'Spain',away:'Saudi Arabia',kickoff:'2026-06-21T19:00:00Z',venue:'Mercedes-Benz Stadium',city:'Atlanta, GA'},
    {home:'Uruguay',away:'Cabo Verde',kickoff:'2026-06-21T16:00:00Z',venue:'Hard Rock Stadium',city:'Miami, FL'},
    {home:'Cabo Verde',away:'Saudi Arabia',kickoff:'2026-06-26T22:00:00Z',venue:'NRG Stadium',city:'Houston, TX'},
    {home:'Uruguay',away:'Spain',kickoff:'2026-06-26T22:00:00Z',venue:'Estadio Akron',city:'Guadalajara, MX'},
  ]},
  {id:'I', matches:[
    {home:'France',away:'Senegal',kickoff:'2026-06-17T01:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'},
    {home:'Iraq',away:'Norway',kickoff:'2026-06-16T22:00:00Z',venue:'Gillette Stadium',city:'Boston, MA'},
    {home:'Norway',away:'Senegal',kickoff:'2026-06-23T01:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'},
    {home:'France',away:'Iraq',kickoff:'2026-06-22T22:00:00Z',venue:'Lincoln Financial Field',city:'Philadelphia, PA'},
    {home:'Norway',away:'France',kickoff:'2026-06-26T22:00:00Z',venue:'Gillette Stadium',city:'Boston, MA'},
    {home:'Senegal',away:'Iraq',kickoff:'2026-06-26T22:00:00Z',venue:'BMO Field',city:'Toronto, ON'},
  ]},
  {id:'J', matches:[
    {home:'Argentina',away:'Algeria',kickoff:'2026-06-16T19:00:00Z',venue:'Arrowhead Stadium',city:'Kansas City, MO'},
    {home:'Austria',away:'Jordan',kickoff:'2026-06-16T16:00:00Z',venue:"Levi's Stadium",city:'San Francisco, CA'},
    {home:'Argentina',away:'Austria',kickoff:'2026-06-22T19:00:00Z',venue:'AT&T Stadium',city:'Arlington, TX'},
    {home:'Jordan',away:'Algeria',kickoff:'2026-06-22T16:00:00Z',venue:"Levi's Stadium",city:'San Francisco, CA'},
    {home:'Jordan',away:'Argentina',kickoff:'2026-06-27T22:00:00Z',venue:'AT&T Stadium',city:'Arlington, TX'},
    {home:'Algeria',away:'Austria',kickoff:'2026-06-27T22:00:00Z',venue:'Arrowhead Stadium',city:'Kansas City, MO'},
  ]},
  {id:'K', matches:[
    {home:'Portugal',away:'DR Congo',kickoff:'2026-06-18T01:00:00Z',venue:'NRG Stadium',city:'Houston, TX'},
    {home:'Uzbekistan',away:'Colombia',kickoff:'2026-06-17T22:00:00Z',venue:'Estadio Azteca',city:'Mexico City, MX'},
    {home:'Colombia',away:'DR Congo',kickoff:'2026-06-23T22:00:00Z',venue:'Estadio Akron',city:'Guadalajara, MX'},
    {home:'Portugal',away:'Uzbekistan',kickoff:'2026-06-24T01:00:00Z',venue:'NRG Stadium',city:'Houston, TX'},
    {home:'DR Congo',away:'Uzbekistan',kickoff:'2026-06-27T22:00:00Z',venue:'Mercedes-Benz Stadium',city:'Atlanta, GA'},
    {home:'Colombia',away:'Portugal',kickoff:'2026-06-27T22:00:00Z',venue:'Hard Rock Stadium',city:'Miami, FL'},
  ]},
  {id:'L', matches:[
    {home:'England',away:'Croatia',kickoff:'2026-06-17T19:00:00Z',venue:'AT&T Stadium',city:'Arlington, TX'},
    {home:'Ghana',away:'Panama',kickoff:'2026-06-17T16:00:00Z',venue:'BMO Field',city:'Toronto, ON'},
    {home:'England',away:'Ghana',kickoff:'2026-06-23T19:00:00Z',venue:'Gillette Stadium',city:'Boston, MA'},
    {home:'Panama',away:'Croatia',kickoff:'2026-06-23T16:00:00Z',venue:'BMO Field',city:'Toronto, ON'},
    {home:'Panama',away:'England',kickoff:'2026-06-27T22:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'},
    {home:'Croatia',away:'Ghana',kickoff:'2026-06-27T22:00:00Z',venue:'Lincoln Financial Field',city:'Philadelphia, PA'},
  ]},
];

const FINAL = {home:'TBD — SF Winner 1',away:'TBD — SF Winner 2',kickoff:'2026-07-19T19:00:00Z',venue:'MetLife Stadium',city:'East Rutherford, NJ'};
const THIRD = {home:'TBD — SF Loser 1',away:'TBD — SF Loser 2',kickoff:'2026-07-18T19:00:00Z',venue:'Hard Rock Stadium',city:'Miami, FL'};

// ── ICS helpers ────────────────────────────────────────────────
function icsDate(iso) {
  const d = new Date(iso);
  const p = n => String(n).padStart(2,'0');
  return `${d.getUTCFullYear()}${p(d.getUTCMonth()+1)}${p(d.getUTCDate())}T${p(d.getUTCHours())}${p(d.getUTCMinutes())}00Z`;
}

function icsText(s) {
  return (s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\n/g,'\\n');
}

function vevent(home, away, startIso, venue, city, description, uid) {
  const start = icsDate(startIso);
  const end   = icsDate(new Date(new Date(startIso).getTime() + 105*60000).toISOString());
  const stamp = icsDate(new Date().toISOString());
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsText(`⚽ ${home} vs ${away}`)}`,
    `LOCATION:${icsText(`${venue}, ${city}`)}`,
    `DESCRIPTION:${icsText(description)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
  ].join('\r\n');
}

// ── Build ──────────────────────────────────────────────────────
let lines = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//WC2026 Tracker//EN',
  'CALSCALE:GREGORIAN',
  'METHOD:PUBLISH',
  'X-WR-CALNAME:⚽ FIFA World Cup 2026',
  'X-WR-CALDESC:Full match schedule for the 2026 FIFA World Cup — all 104 matches',
  'X-WR-TIMEZONE:UTC',
  'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
  'X-PUBLISHED-TTL:PT1H',
];

// Group stage
GROUPS.forEach(g => {
  g.matches.forEach(m => {
    const desc = `FIFA World Cup 2026 — Group ${g.id}\n${m.home} vs ${m.away}\n${m.venue}, ${m.city}`;
    const uid  = `wc2026-grp${g.id}-${m.home.replace(/\W+/g,'')}-${m.away.replace(/\W+/g,'')}@wc2026tracker`;
    lines.push(vevent(m.home, m.away, m.kickoff, m.venue, m.city, desc, uid));
  });
});

// 3rd place and Final (TBD until semis are played)
const thirdDesc = `FIFA World Cup 2026 — 3rd Place Match\nSF Loser 1 vs SF Loser 2\n${THIRD.venue}, ${THIRD.city}`;
lines.push(vevent(THIRD.home, THIRD.away, THIRD.kickoff, THIRD.venue, THIRD.city, thirdDesc, 'wc2026-3rdplace@wc2026tracker'));

const finalDesc = `FIFA World Cup 2026 — THE FINAL\nSF Winner 1 vs SF Winner 2\n${FINAL.venue}, ${FINAL.city}`;
lines.push(vevent(FINAL.home, FINAL.away, FINAL.kickoff, FINAL.venue, FINAL.city, finalDesc, 'wc2026-final@wc2026tracker'));

lines.push('END:VCALENDAR');

const output = lines.join('\r\n') + '\r\n';
fs.writeFileSync('schedule.ics', output, 'utf8');
console.log(`✅ schedule.ics written — ${GROUPS.reduce((s,g)=>s+g.matches.length,0)+2} events`);
