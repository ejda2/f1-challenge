import { useState, useEffect, useCallback } from "react";
import { db } from "./firebase.js";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ADMIN_PASSWORD = "f1admin2026";

const PLAYERS = [
  "Andy Jurasek","Brett Sprinkel","Claire Deakin","Greg Angelo",
  "Jason Hoey","Jim Deakin","Joe Deakin","Joe Jurasek",
  "Joel Greenfield","Katie Logue","Rick Pflasterer","Sam Levine",
  "Ted Deakin","Vic Woods","Will Deakin",
];

const DRIVERS = [
  "Albon","Alonso","Antonelli","Bearman","Bortoleto","Bottas",
  "Colapinto","Gasly","Hadjar","Hamilton","Hulkenberg","Lawson",
  "Leclerc","Lindblad","Norris","Ocon","Perez","Piastri",
  "Russell","Sainz","Stroll","Verstappen",
];

const CONSTRUCTORS = [
  "Alpine","Aston Martin","Audi","Cadillac","Ferrari",
  "Haas","McLaren","Mercedes","Racing Bulls","Red Bull","Williams",
];

const RACES = [
  { id:1,  name:"Australia",     date:"2026-03-08", flag:"🇦🇺" },
  { id:2,  name:"China",         date:"2026-03-15", flag:"🇨🇳" },
  { id:3,  name:"Japan",         date:"2026-03-29", flag:"🇯🇵" },
  { id:4,  name:"Bahrain",       date:"2026-04-12", flag:"🇧🇭" },
  { id:5,  name:"Saudi Arabia",  date:"2026-04-19", flag:"🇸🇦" },
  { id:6,  name:"Miami",         date:"2026-05-03", flag:"🇺🇸" },
  { id:7,  name:"Canada",        date:"2026-05-24", flag:"🇨🇦" },
  { id:8,  name:"Monaco",        date:"2026-06-07", flag:"🇲🇨" },
  { id:9,  name:"Barcelona",     date:"2026-06-14", flag:"🇪🇸" },
  { id:10, name:"Austria",       date:"2026-06-28", flag:"🇦🇹" },
  { id:11, name:"Great Britain", date:"2026-07-05", flag:"🇬🇧" },
  { id:12, name:"Belgium",       date:"2026-07-19", flag:"🇧🇪" },
  { id:13, name:"Hungary",       date:"2026-07-26", flag:"🇭🇺" },
  { id:14, name:"Netherlands",   date:"2026-08-23", flag:"🇳🇱" },
  { id:15, name:"Monza",         date:"2026-09-06", flag:"🇮🇹" },
  { id:16, name:"Madrid",        date:"2026-09-13", flag:"🇪🇸" },
  { id:17, name:"Azerbaijan",    date:"2026-09-27", flag:"🇦🇿" },
  { id:18, name:"Singapore",     date:"2026-10-11", flag:"🇸🇬" },
  { id:19, name:"Austin",        date:"2026-10-25", flag:"🇺🇸" },
  { id:20, name:"Mexico",        date:"2026-11-01", flag:"🇲🇽" },
  { id:21, name:"Brazil",        date:"2026-11-08", flag:"🇧🇷" },
  { id:22, name:"Las Vegas",     date:"2026-11-21", flag:"🇺🇸" },
  { id:23, name:"Qatar",         date:"2026-11-29", flag:"🇶🇦" },
  { id:24, name:"Abu Dhabi",     date:"2026-12-06", flag:"🇦🇪" },
];

const TEAM_COLORS = {
  Mercedes:"#00D2BE", Ferrari:"#DC0000", McLaren:"#FF8000",
  "Red Bull":"#3671C6", Haas:"#B6BABD", "Racing Bulls":"#6692FF",
  Audi:"#C0C0C0", Alpine:"#FF87BC", Williams:"#64C4FF",
  Cadillac:"#333333", "Aston Martin":"#229971",
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_RESULTS = {
  1: {
    finishing_order: ["Russell","Antonelli","Leclerc","Hamilton","Norris","Verstappen","Bearman","Lindblad","Bortoleto","Gasly","Ocon","Albon","Lawson","Colapinto","Sainz","Perez","Stroll","Alonso","Bottas","Hadjar","Piastri","Hulkenberg"],
    dnf1: "Hadjar",
    constructor_order: ["Mercedes","Ferrari","McLaren","Red Bull","Haas","Racing Bulls","Audi","Alpine","Williams","Cadillac","Aston Martin"],
  },
};

const SEED_PICKS = {
  "Joe Jurasek":     { 1: { p10:"Gasly",      dnf1:"Perez",   constructor:"Mercedes"     }},
  "Greg Angelo":     { 1: { p10:"Gasly",      dnf1:"Bearman", constructor:"Racing Bulls"  }},
  "Katie Logue":     { 1: { p10:"Bortoleto",  dnf1:"Sainz",   constructor:"Mercedes"     }},
  "Vic Woods":       { 1: { p10:"Bortoleto",  dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Claire Deakin":   { 1: { p10:"Albon",      dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Brett Sprinkel":  { 1: { p10:"Lawson",     dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Joe Deakin":      { 1: { p10:"Bearman",    dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Ted Deakin":      { 1: { p10:"Bearman",    dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Jason Hoey":      { 1: { p10:"Lawson",     dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Joel Greenfield": { 1: { p10:"Lawson",     dnf1:"Gasly",   constructor:"Mercedes"     }},
  "Andy Jurasek":    { 1: { p10:"Bearman",    dnf1:"Alonso",  constructor:"Mercedes"     }},
  "Will Deakin":     { 1: { p10:"Verstappen", dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Jim Deakin":      { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Rick Pflasterer": { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Mercedes"     }},
  "Sam Levine":      { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Red Bull"     }},
};

// ─── SCORING ─────────────────────────────────────────────────────────────────

function scoreP10(driver, finishing_order) {
  const pos = finishing_order.indexOf(driver);
  if (pos < 0) return 0;
  const dist = Math.abs(pos + 1 - 10);
  return [25,18,15,12,10,8,6,4,2,1][dist] ?? 0;
}
function scoreDNF(driver, dnf1) { return driver === dnf1 ? 10 : 0; }
function scoreCon(team, constructor_order) {
  const pos = constructor_order.indexOf(team);
  return [3,2,1][pos] ?? 0;
}

function computeStandings(allPicks, allResults) {
  return PLAYERS.map(player => {
    let total = 0;
    const raceTotals = {};
    const playerPicks = allPicks[player] || {};
    Object.entries(playerPicks).forEach(([raceId, pick]) => {
      const result = allResults[Number(raceId)];
      if (!result || !pick) return;
      const p10pts = scoreP10(pick.p10, result.finishing_order);
      const dnfpts = scoreDNF(pick.dnf1, result.dnf1);
      const conpts = scoreCon(pick.constructor, result.constructor_order);
      const raceTotal = p10pts + dnfpts + conpts;
      raceTotals[Number(raceId)] = { ...pick, p10pts, dnfpts, conpts, total: raceTotal };
      total += raceTotal;
    });
    return { player, total, raceTotals };
  }).sort((a, b) => b.total - a.total || a.player.localeCompare(b.player));
}

function isRaceLocked(race) {
  return new Date() >= new Date(race.date + "T00:00:00");
}

function getNextRace() {
  return RACES.find(r => !isRaceLocked(r)) || null;
}

// ─── FIREBASE ────────────────────────────────────────────────────────────────

async function fbSavePicks(picks) {
  await setDoc(doc(db, "data", "picks"), picks);
}
async function fbSaveResults(results) {
  // Firestore keys can't be numbers, stringify them
  const serialized = {};
  Object.entries(results).forEach(([k, v]) => { serialized[`r${k}`] = v; });
  await setDoc(doc(db, "data", "results"), serialized);
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@300;400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#050505;color:#f0ede8;font-family:'Barlow',sans-serif;min-height:100vh}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#e10600;border-radius:2px}
button{cursor:pointer;font-family:'Barlow',sans-serif}
select,input{font-family:'Barlow',sans-serif}

.app{max-width:880px;margin:0 auto;padding:0 16px 80px}

/* HOME */
.home{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;position:relative}
.home-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(225,6,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(225,6,0,0.04) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
.home-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(225,6,0,0.08) 0%,transparent 70%);pointer-events:none}
.home-season{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.3em;color:#e10600;text-transform:uppercase;margin-bottom:16px}
.home-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(56px,12vw,120px);line-height:0.85;color:#fff;margin-bottom:8px}
.home-title span{color:#e10600;display:block}
.home-sub{font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:0.15em;color:#555;margin-bottom:48px}
.home-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;max-width:500px}
@media(max-width:480px){.home-cards{grid-template-columns:1fr}}
.home-card{background:#0d0d0d;border:1px solid #1c1c1c;border-radius:10px;padding:28px 20px;text-align:left;transition:border-color 0.2s,transform 0.15s;position:relative;overflow:hidden}
.home-card::before{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:#e10600;transform:scaleX(0);transition:transform 0.2s;transform-origin:left}
.home-card:hover{border-color:#333;transform:translateY(-2px)}
.home-card:hover::before{transform:scaleX(1)}
.home-card-icon{font-size:28px;margin-bottom:12px}
.home-card-title{font-family:'Barlow Condensed',sans-serif;font-size:20px;font-weight:700;letter-spacing:0.05em;color:#fff;margin-bottom:4px}
.home-card-desc{font-size:12px;color:#555;line-height:1.5}

/* MODAL */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:28px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto}
.modal-title{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;margin-bottom:4px}
.modal-sub{font-size:12px;color:#555;margin-bottom:20px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em}
.player-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.player-btn{background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;text-align:left;color:#ccc;font-size:13px;font-weight:500;transition:all 0.15s}
.player-btn:hover{background:#1a1a1a;border-color:#444;color:#fff}
.player-btn.selected{background:rgba(225,6,0,0.1);border-color:#e10600;color:#fff}
.modal-close{background:none;border:1px solid #222;color:#666;border-radius:6px;padding:8px 16px;font-size:12px;letter-spacing:0.1em;transition:all 0.15s;margin-top:8px;width:100%}
.modal-close:hover{border-color:#555;color:#aaa}
.input-field{width:100%;background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;color:#fff;font-size:14px;margin-bottom:12px;outline:none;transition:border-color 0.15s}
.input-field:focus{border-color:#e10600}
.input-error{color:#ff4444;font-size:12px;margin-bottom:12px}
.btn-primary{width:100%;background:#e10600;border:none;border-radius:6px;padding:13px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:0.1em;font-weight:700;transition:background 0.15s}
.btn-primary:hover{background:#c00500}
.btn-primary:disabled{background:#333;color:#666;cursor:not-allowed}

/* SHELL */
.shell{min-height:100vh}
.topbar{background:#080808;border-bottom:1px solid #111;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.topbar-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#fff;letter-spacing:0.05em}
.topbar-logo span{color:#e10600}
.topbar-user{display:flex;align-items:center;gap:10px}
.topbar-name{font-size:13px;font-weight:500;color:#aaa}
.topbar-name strong{color:#fff}
.logout-btn{background:none;border:1px solid #222;color:#555;border-radius:4px;padding:5px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.15s}
.logout-btn:hover{border-color:#444;color:#aaa}
.content{max-width:880px;margin:0 auto;padding:28px 16px 80px}

/* TABS */
.tabs{display:flex;gap:2px;margin-bottom:28px;border-bottom:1px solid #111;padding-bottom:0}
.tab{background:none;border:none;padding:10px 20px;color:#444;font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:0.12em;text-transform:uppercase;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.15s,border-color 0.15s}
.tab:hover{color:#888}
.tab.active{color:#fff;border-bottom-color:#e10600}

/* SECTION HEADER */
.sh{display:flex;align-items:baseline;gap:12px;margin-bottom:20px}
.sh-title{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#fff}
.sh-meta{font-family:'Barlow Condensed',sans-serif;font-size:12px;color:#444;letter-spacing:0.1em;text-transform:uppercase}

/* LEADERBOARD */
.lb-header{display:grid;grid-template-columns:44px 1fr auto;padding:6px 14px;margin-bottom:4px}
.lb-header span{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.15em;color:#333;text-transform:uppercase}
.lb-row{display:grid;grid-template-columns:44px 1fr auto;align-items:center;padding:14px 14px;border-radius:7px;margin-bottom:3px;cursor:pointer;transition:background 0.15s;border:1px solid transparent}
.lb-row:hover{background:#0e0e0e;border-color:#1a1a1a}
.lb-row.me{border-color:#e1060030;background:#0e0e0e}
.lb-row.p1{background:linear-gradient(90deg,rgba(255,215,0,0.06),transparent)}
.lb-row.p2{background:linear-gradient(90deg,rgba(192,192,192,0.05),transparent)}
.lb-row.p3{background:linear-gradient(90deg,rgba(205,127,50,0.05),transparent)}
.lb-rank{font-family:'Bebas Neue',sans-serif;font-size:26px;color:#222}
.lb-row.p1 .lb-rank{color:#FFD700}
.lb-row.p2 .lb-rank{color:#C0C0C0}
.lb-row.p3 .lb-rank{color:#CD7F32}
.lb-name{font-size:14px;font-weight:500;color:#ddd}
.lb-name .you{font-size:10px;background:#e10600;color:#fff;border-radius:3px;padding:1px 6px;margin-left:6px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;vertical-align:middle}
.lb-bar-wrap{height:2px;background:#161616;border-radius:1px;margin-top:5px;overflow:hidden;max-width:300px}
.lb-bar{height:100%;background:linear-gradient(90deg,#e10600,#ff4500);border-radius:1px;transition:width 0.7s ease}
.lb-pts-col{text-align:right}
.lb-pts{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#fff;line-height:1}
.lb-pts-label{font-family:'Barlow Condensed',sans-serif;font-size:10px;color:#333;letter-spacing:0.1em}

/* DRAWER */
.drawer{background:#0a0a0a;border:1px solid #161616;border-radius:8px;padding:20px;margin-bottom:4px;animation:fd 0.18s ease}
@keyframes fd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.drawer-title{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-bottom:16px}
.race-picks-row{display:grid;grid-template-columns:140px 1fr 1fr 1fr 80px;gap:8px;align-items:start;padding:10px 12px;border-radius:5px;border-bottom:1px solid #111;font-size:13px}
@media(max-width:600px){.race-picks-row{grid-template-columns:1fr 1fr;gap:6px}}
.race-picks-row:last-child{border-bottom:none}
.race-picks-row:hover{background:#111}
.rpr-race{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.05em;color:#666}
.rpr-val{color:#ccc;font-weight:500}
.rpr-val.correct{color:#4cff91}
.rpr-pts{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;text-align:right}
.rpr-pts.zero{color:#333}
.badge{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.05em;padding:2px 8px;border-radius:3px;background:#151515;color:#555;display:inline-block}
.badge.hit{background:rgba(76,255,145,0.1);color:#4cff91}
.badge.close{background:rgba(255,165,0,0.1);color:#ffa500}
.badge.perfect{background:rgba(225,6,0,0.15);color:#ff4444}

/* PICKS */
.pick-race-banner{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:20px 24px;margin-bottom:24px;position:relative;overflow:hidden}
.pick-race-banner::after{content:'';position:absolute;top:0;left:0;bottom:0;width:3px;background:#e10600}
.prb-eyebrow{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.2em;color:#e10600;text-transform:uppercase;margin-bottom:4px}
.prb-title{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#fff;line-height:1;margin-bottom:2px}
.prb-date{font-family:'Barlow Condensed',sans-serif;font-size:12px;color:#444;letter-spacing:0.1em}
.pick-form{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:24px}
.form-row{margin-bottom:20px}
.form-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.2em;color:#555;text-transform:uppercase;margin-bottom:6px;display:block}
.form-label span{color:#e10600;margin-left:4px}
.form-label em{font-style:normal;color:#333;font-size:10px;margin-left:8px}
.form-select{width:100%;background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;color:#fff;font-size:14px;font-weight:500;outline:none;transition:border-color 0.15s;appearance:none;cursor:pointer}
.form-select:focus{border-color:#e10600}
.form-select option{background:#1a1a1a}
.form-save-row{display:flex;align-items:center;gap:12px;margin-top:24px}
.save-btn{background:#e10600;border:none;border-radius:6px;padding:13px 28px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:0.1em;font-weight:700;transition:background 0.15s}
.save-btn:hover{background:#c00500}
.save-btn:disabled{background:#222;color:#555;cursor:not-allowed}
.save-confirm{font-size:13px;color:#4cff91;animation:fd 0.3s ease}

/* RACE GRID */
.race-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:24px}
.rc{background:#0d0d0d;border:1px solid #161616;border-radius:8px;padding:16px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
.rc:hover{border-color:#2a2a2a;background:#111}
.rc.done::before{content:'';position:absolute;top:0;left:0;bottom:0;width:2px;background:#e10600}
.rc.active{border-color:#e10600}
.rc.has-pick::after{content:'✓';position:absolute;top:8px;right:10px;font-size:11px;color:#4cff91}
.rc-num{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#161616;line-height:1}
.rc-flag{font-size:20px;margin-bottom:4px}
.rc-name{font-size:12px;font-weight:600;color:#ccc;margin-bottom:2px}
.rc-date{font-family:'Barlow Condensed',sans-serif;font-size:10px;color:#333;letter-spacing:0.05em}
.rc-done{font-family:'Barlow Condensed',sans-serif;font-size:9px;letter-spacing:0.1em;color:#e10600;text-transform:uppercase;margin-top:6px}

/* RESULTS */
.result-panel{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:24px;animation:fd 0.18s ease}
.rp-title{font-family:'Bebas Neue',sans-serif;font-size:40px;color:#fff;margin-bottom:20px}
.result-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
@media(max-width:500px){.result-stats{grid-template-columns:1fr}}
.rs-box{background:#141414;border:1px solid #1e1e1e;border-radius:7px;padding:14px}
.rs-label{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.2em;color:#444;text-transform:uppercase;margin-bottom:8px}
.rs-val{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#e10600;line-height:1}
.rs-sub{font-size:11px;color:#333;margin-top:3px;font-family:'Barlow Condensed',sans-serif}
.results-table{width:100%;border-collapse:collapse;font-size:13px}
.results-table th{text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.15em;color:#333;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid #111}
.results-table td{padding:10px 10px;border-bottom:1px solid #0d0d0d;color:#aaa}
.results-table tr:last-child td{border-bottom:none}
.results-table tr:hover td{background:#0a0a0a}

/* CON BADGE */
.con{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:700;letter-spacing:0.03em}

/* ADMIN */
.admin-grid{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
@media(max-width:600px){.admin-grid{grid-template-columns:1fr}}
.admin-race-list{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;overflow:hidden;max-height:80vh;overflow-y:auto}
.admin-race-item{padding:12px 16px;border-bottom:1px solid #111;cursor:pointer;transition:background 0.12s;display:flex;justify-content:space-between;align-items:center}
.admin-race-item:last-child{border-bottom:none}
.admin-race-item:hover{background:#111}
.admin-race-item.active{background:#151515;border-left:2px solid #e10600}
.ari-name{font-size:13px;font-weight:500;color:#ccc}
.ari-num{font-family:'Bebas Neue',sans-serif;font-size:16px;color:#333;margin-right:8px}
.ari-done{width:8px;height:8px;border-radius:50%;background:#e10600;flex-shrink:0}
.admin-form{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:24px}
.admin-form-title{font-family:'Bebas Neue',sans-serif;font-size:32px;color:#fff;margin-bottom:4px}
.admin-form-sub{font-size:12px;color:#444;margin-bottom:20px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em}
.admin-section-title{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.2em;color:#555;text-transform:uppercase;margin:16px 0 8px}
.driver-order-list{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.driver-order-item{display:flex;align-items:center;gap:10px;background:#141414;border:1px solid #1a1a1a;border-radius:5px;padding:8px 12px}
.doi-pos{font-family:'Bebas Neue',sans-serif;font-size:18px;color:#333;width:32px}
.doi-name{font-size:13px;color:#ccc;flex:1}
.move-btn{background:none;border:1px solid #222;color:#444;border-radius:3px;width:24px;height:24px;font-size:14px;line-height:1;transition:all 0.1s}
.move-btn:hover{border-color:#555;color:#aaa}
.reset-link{font-size:11px;color:#333;cursor:pointer;margin-left:8px;text-decoration:underline}
.reset-link:hover{color:#666}
.admin-save-row{display:flex;align-items:center;gap:12px;margin-top:20px}

/* LOCKED MSG */
.locked-msg{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:20px;text-align:center;color:#444;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;font-size:14px}

/* LOADING */
.loading{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}
.loading-text{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#222;letter-spacing:0.1em;animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{0%,100%{color:#222}50%{color:#444}}
`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function isLight(hex) {
  if (!hex || hex.length < 7) return false;
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return (r*299+g*587+b*114)/1000 > 140;
}

function ConBadge({ team }) {
  const bg = TEAM_COLORS[team] || "#333";
  return <span className="con" style={{ background: bg, color: isLight(bg) ? "#000" : "#fff" }}>{team || "—"}</span>;
}

function ptsBadgeClass(pts, max=25) {
  if (pts === max) return "badge perfect";
  if (pts >= max * 0.6) return "badge close";
  if (pts > 0) return "badge hit";
  return "badge";
}

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

function Leaderboard({ standings, allResults, currentPlayer }) {
  const [open, setOpen] = useState(null);
  const max = standings[0]?.total || 1;
  const completedRaces = Object.keys(allResults).map(Number);

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Standings</span>
        <span className="sh-meta">Race {completedRaces.length} of 24</span>
      </div>
      <div className="lb-header">
        <span></span><span>Player</span><span style={{textAlign:"right"}}>Points</span>
      </div>
      {standings.map((entry, i) => {
        const rank = i + 1;
        const isMe = entry.player === currentPlayer;
        const isOpen = open === entry.player;
        const cls = `lb-row ${rank===1?"p1":rank===2?"p2":rank===3?"p3":""} ${isMe?"me":""}`;
        return (
          <div key={entry.player}>
            <div className={cls} onClick={() => setOpen(isOpen ? null : entry.player)}>
              <div className="lb-rank">{rank}</div>
              <div>
                <div className="lb-name">
                  {entry.player}
                  {isMe && <span className="you">YOU</span>}
                </div>
                <div className="lb-bar-wrap">
                  <div className="lb-bar" style={{ width: `${(entry.total / max) * 100}%` }} />
                </div>
              </div>
              <div className="lb-pts-col">
                <div className="lb-pts">{entry.total}</div>
                <div className="lb-pts-label">PTS</div>
              </div>
            </div>
            {isOpen && (
              <div className="drawer">
                <div className="drawer-title">{entry.player} · Race Breakdown</div>
                <div className="race-picks-row" style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"10px",letterSpacing:"0.15em",color:"#333",textTransform:"uppercase",paddingBottom:6}}>
                  <span>Race</span><span>P10 Pick</span><span>DNF1</span><span>Constructor</span><span style={{textAlign:"right"}}>Pts</span>
                </div>
                {completedRaces.map(raceId => {
                  const d = entry.raceTotals[raceId];
                  const res = allResults[raceId];
                  const race = RACES.find(r => r.id === raceId);
                  if (!d) return (
                    <div className="race-picks-row" key={raceId} style={{opacity:0.35}}>
                      <span className="rpr-race">{race?.flag} {race?.name}</span>
                      <span style={{color:"#333",fontSize:12,gridColumn:"2/6"}}>No pick submitted</span>
                    </div>
                  );
                  const p10pos = res.finishing_order.indexOf(d.p10) + 1;
                  return (
                    <div className="race-picks-row" key={raceId}>
                      <span className="rpr-race">{race?.flag} {race?.name}</span>
                      <span>
                        <span className={`rpr-val ${d.p10pts>0?"correct":""}`}>{d.p10}</span>
                        <span className={ptsBadgeClass(d.p10pts)} style={{marginLeft:6}}>{d.p10pts}pt</span>
                        <div style={{fontSize:10,color:"#444",fontFamily:"'Barlow Condensed',sans-serif",marginTop:2}}>Finished P{p10pos}</div>
                      </span>
                      <span>
                        <span className={`rpr-val ${d.dnfpts>0?"correct":""}`}>{d.dnf1}</span>
                        {d.dnfpts > 0 && <span className="badge hit" style={{marginLeft:6}}>+10</span>}
                      </span>
                      <span>
                        <ConBadge team={d.constructor}/>
                        {d.conpts > 0 && <span className="badge hit" style={{marginLeft:4}}>+{d.conpts}</span>}
                      </span>
                      <span className={`rpr-pts ${d.total===0?"zero":""}`}>{d.total}</span>
                    </div>
                  );
                })}
                {completedRaces.length === 0 && (
                  <div style={{color:"#444",padding:"10px 0",fontSize:13}}>No races completed yet.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MY PICKS ────────────────────────────────────────────────────────────────

function MyPicks({ player, allPicks, allResults, onSave }) {
  const playerPicks = allPicks[player] || {};
  const nextRace = getNextRace();
  const [editRace, setEditRace] = useState(nextRace?.id || null);
  const [form, setForm] = useState({ p10: "", dnf1: "", constructor: "" });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editRace) {
      const existing = playerPicks[editRace] || {};
      setForm({ p10: existing.p10 || "", dnf1: existing.dnf1 || "", constructor: existing.constructor || "" });
      setSaved(false);
    }
  }, [editRace, player]);

  const handleSave = () => {
    if (!form.p10 || !form.dnf1 || !form.constructor) return;
    onSave(player, editRace, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const editableRace = editRace ? RACES.find(r => r.id === editRace) : null;
  const raceIsLocked = editableRace ? isRaceLocked(editableRace) : false;

  return (
    <div>
      <div className="sh">
        <span className="sh-title">My Picks</span>
        <span className="sh-meta">{player}</span>
      </div>

      {nextRace && (
        <div className="pick-race-banner">
          <div className="prb-eyebrow">Next Race · Deadline {nextRace.date}</div>
          <div className="prb-title">{nextRace.flag} {nextRace.name} Grand Prix</div>
          <div className="prb-date">Round {nextRace.id} of 24</div>
        </div>
      )}

      <div className="race-grid">
        {RACES.map(r => {
          const hasResult = !!allResults[r.id];
          const hasPick = !!playerPicks[r.id];
          return (
            <div
              key={r.id}
              className={`rc ${hasResult?"done":""} ${editRace===r.id?"active":""} ${hasPick&&!hasResult?"has-pick":""}`}
              onClick={() => setEditRace(r.id)}
            >
              <div className="rc-num">{String(r.id).padStart(2,"0")}</div>
              <div className="rc-flag">{r.flag}</div>
              <div className="rc-name">{r.name}</div>
              <div className="rc-date">{r.date}</div>
              {hasResult && <div className="rc-done">Results in</div>}
            </div>
          );
        })}
      </div>

      {editableRace && (
        <div style={{animation:"fd 0.2s ease"}}>
          {raceIsLocked ? (
            playerPicks[editRace] ? (
              <div className="pick-form">
                <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:"0.2em",color:"#555",textTransform:"uppercase",marginBottom:16}}>
                  {editableRace.flag} {editableRace.name} · Your Picks (Locked)
                </div>
                {["p10","dnf1","constructor"].map(key => (
                  <div key={key} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #111"}}>
                    <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:"0.15em",color:"#444",textTransform:"uppercase"}}>
                      {key==="p10"?"P10 Driver":key==="dnf1"?"DNF1 Driver":"Constructor"}
                    </span>
                    <span style={{fontWeight:500,color:"#ddd"}}>{playerPicks[editRace][key]}</span>
                  </div>
                ))}
                <div style={{marginTop:12,fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,color:"#333",letterSpacing:"0.08em"}}>
                  🔒 Picks locked — race has started
                </div>
              </div>
            ) : (
              <div className="locked-msg">🔒 {editableRace.flag} {editableRace.name} — picks closed, no pick was submitted</div>
            )
          ) : (
            <div className="pick-form">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:"0.2em",color:"#e10600",textTransform:"uppercase",marginBottom:4}}>
                Submit Picks
              </div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff",marginBottom:20}}>
                {editableRace.flag} {editableRace.name} Grand Prix · R{editableRace.id}
              </div>

              <div className="form-row">
                <label className="form-label">P10 Driver <span>*</span> <em>Pick the driver you think finishes 10th</em></label>
                <select className="form-select" value={form.p10} onChange={e => setForm(f => ({...f, p10: e.target.value}))}>
                  <option value="">Select a driver...</option>
                  {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">DNF1 Driver <span>*</span> <em>First retirement of the race</em></label>
                <select className="form-select" value={form.dnf1} onChange={e => setForm(f => ({...f, dnf1: e.target.value}))}>
                  <option value="">Select a driver...</option>
                  {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="form-row">
                <label className="form-label">Top Constructor <span>*</span> <em>Team that scores the most points</em></label>
                <select className="form-select" value={form.constructor} onChange={e => setForm(f => ({...f, constructor: e.target.value}))}>
                  <option value="">Select a constructor...</option>
                  {CONSTRUCTORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="form-save-row">
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={!form.p10 || !form.dnf1 || !form.constructor}
                >
                  {playerPicks[editRace] ? "Update Picks" : "Submit Picks"}
                </button>
                {saved && <span className="save-confirm">✓ Picks saved!</span>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RACE RESULTS VIEW ───────────────────────────────────────────────────────

function RaceResultsView({ allPicks, allResults, currentPlayer, standings }) {
  const [selectedRace, setSelectedRace] = useState(
    Object.keys(allResults).length > 0 ? Math.max(...Object.keys(allResults).map(Number)) : 1
  );
  const race = RACES.find(r => r.id === selectedRace);
  const result = allResults[selectedRace];

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Race Results</span>
        <span className="sh-meta">Select a completed race</span>
      </div>
      <div className="race-grid">
        {RACES.map(r => (
          <div
            key={r.id}
            className={`rc ${allResults[r.id]?"done":""} ${selectedRace===r.id?"active":""}`}
            onClick={() => setSelectedRace(r.id)}
          >
            <div className="rc-num">{String(r.id).padStart(2,"0")}</div>
            <div className="rc-flag">{r.flag}</div>
            <div className="rc-name">{r.name}</div>
            <div className="rc-date">{r.date}</div>
            {allResults[r.id] && <div className="rc-done">Completed</div>}
          </div>
        ))}
      </div>

      {race && (
        <div className="result-panel">
          <div className="rp-title">{race.flag} {race.name} Grand Prix</div>
          {result ? (
            <>
              <div className="result-stats">
                <div className="rs-box">
                  <div className="rs-label">P10 Finisher</div>
                  <div className="rs-val">{result.finishing_order[9]}</div>
                  <div className="rs-sub">25pts if picked exactly</div>
                </div>
                <div className="rs-box">
                  <div className="rs-label">DNF1</div>
                  <div className="rs-val">{result.dnf1 || "None"}</div>
                  <div className="rs-sub">10pt bonus if picked</div>
                </div>
                <div className="rs-box">
                  <div className="rs-label">Constructor P1</div>
                  <ConBadge team={result.constructor_order[0]} />
                  <div className="rs-sub" style={{marginTop:6}}>3pts if picked correctly</div>
                </div>
              </div>

              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.2em",color:"#333",textTransform:"uppercase",marginBottom:10}}>
                All Picks This Race
              </div>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>P10 Pick</th>
                    <th>DNF1</th>
                    <th>Constructor</th>
                    <th style={{textAlign:"right"}}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {standings
                    .filter(s => s.raceTotals[selectedRace])
                    .sort((a, b) => b.raceTotals[selectedRace].total - a.raceTotals[selectedRace].total)
                    .map((s, i) => {
                      const d = s.raceTotals[selectedRace];
                      const pos = result.finishing_order.indexOf(d.p10) + 1;
                      const isMe = s.player === currentPlayer;
                      return (
                        <tr key={s.player} style={isMe ? {background:"rgba(225,6,0,0.04)"} : {}}>
                          <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:"#333"}}>{i+1}</td>
                          <td style={{color:isMe?"#fff":"#aaa",fontWeight:isMe?600:400}}>
                            {s.player}
                            {isMe && <span className="you" style={{marginLeft:6}}>YOU</span>}
                          </td>
                          <td>
                            <span style={{color:d.p10pts>0?"#4cff91":"#aaa"}}>{d.p10}</span>
                            <span className={ptsBadgeClass(d.p10pts)} style={{marginLeft:6}}>{d.p10pts}pt</span>
                            <div style={{fontSize:10,color:"#333",fontFamily:"'Barlow Condensed',sans-serif"}}>P{pos}</div>
                          </td>
                          <td>
                            <span style={{color:d.dnfpts>0?"#4cff91":"#aaa"}}>{d.dnf1}</span>
                            {d.dnfpts > 0 && <span className="badge hit" style={{marginLeft:6}}>+10</span>}
                          </td>
                          <td>
                            <ConBadge team={d.constructor} />
                            {d.conpts > 0 && <span className="badge hit" style={{marginLeft:4}}>+{d.conpts}</span>}
                          </td>
                          <td style={{textAlign:"right",fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:"#fff"}}>{d.total}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </>
          ) : (
            <div style={{color:"#333",padding:"40px 0",textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:14,letterSpacing:"0.1em"}}>
              No results entered yet for {race.name}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

function AdminPanel({ allResults, onSaveResults }) {
  const [selectedRace, setSelectedRace] = useState(1);
  const [order, setOrder] = useState([...DRIVERS]);
  const [dnf1, setDnf1] = useState("");
  const [conOrder, setConOrder] = useState([...CONSTRUCTORS]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = allResults[selectedRace];
    if (existing) {
      setOrder(existing.finishing_order);
      setDnf1(existing.dnf1 || "");
      setConOrder(existing.constructor_order);
    } else {
      setOrder([...DRIVERS]);
      setDnf1("");
      setConOrder([...CONSTRUCTORS]);
    }
    setSaved(false);
  }, [selectedRace]);

  const moveDriver = (i, dir) => {
    const arr = [...order];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setOrder(arr);
  };

  const moveCon = (i, dir) => {
    const arr = [...conOrder];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setConOrder(arr);
  };

  const handleSave = () => {
    onSaveResults(selectedRace, {
      finishing_order: order,
      dnf1,
      constructor_order: conOrder,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const race = RACES.find(r => r.id === selectedRace);

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Admin</span>
        <span className="sh-meta">Enter Race Results</span>
      </div>
      <div className="admin-grid">
        <div className="admin-race-list">
          {RACES.map(r => (
            <div
              key={r.id}
              className={`admin-race-item ${selectedRace===r.id?"active":""}`}
              onClick={() => setSelectedRace(r.id)}
            >
              <div style={{display:"flex",alignItems:"center"}}>
                <span className="ari-num">{r.id}</span>
                <span className="ari-name">{r.flag} {r.name}</span>
              </div>
              {allResults[r.id] && <span className="ari-done"/>}
            </div>
          ))}
        </div>

        <div className="admin-form">
          <div className="admin-form-title">{race?.flag} {race?.name}</div>
          <div className="admin-form-sub">Round {race?.id} · {race?.date} — use arrows to set finishing order</div>

          <div className="admin-section-title">
            Finishing Order (P1 → P22)
            <span className="reset-link" onClick={() => setOrder([...DRIVERS])}>Reset</span>
          </div>
          <div className="driver-order-list">
            {order.map((driver, i) => (
              <div key={driver} className="driver-order-item">
                <span className="doi-pos">{i + 1}</span>
                <span className="doi-name">{driver}</span>
                <button className="move-btn" onClick={() => moveDriver(i, -1)}>↑</button>
                <button className="move-btn" onClick={() => moveDriver(i, 1)}>↓</button>
              </div>
            ))}
          </div>

          <div className="admin-section-title">First DNF (DNF1)</div>
          <select className="form-select" style={{marginBottom:16}} value={dnf1} onChange={e => setDnf1(e.target.value)}>
            <option value="">None / No DNF</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="admin-section-title">
            Constructor Order (P1 → P11)
            <span className="reset-link" onClick={() => setConOrder([...CONSTRUCTORS])}>Reset</span>
          </div>
          <div className="driver-order-list">
            {conOrder.map((team, i) => (
              <div key={team} className="driver-order-item">
                <span className="doi-pos">{i + 1}</span>
                <span className="doi-name"><ConBadge team={team} /></span>
                <button className="move-btn" onClick={() => moveCon(i, -1)}>↑</button>
                <button className="move-btn" onClick={() => moveCon(i, 1)}>↓</button>
              </div>
            ))}
          </div>

          <div className="admin-save-row">
            <button className="save-btn" onClick={handleSave}>Save Results</button>
            {saved && <span className="save-confirm">✓ Results published to all players!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function Home({ onPlayer, onAdmin }) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  const handlePlayerGo = () => { if (selectedPlayer) onPlayer(selectedPlayer); };
  const handleAdminGo = () => {
    if (adminPw === ADMIN_PASSWORD) { onAdmin(); setAdminErr(false); }
    else setAdminErr(true);
  };

  return (
    <div className="home">
      <div className="home-grid" />
      <div className="home-glow" />
      <div className="home-season">2026 Formula One Season</div>
      <div className="home-title">P10 · DNF1<span>Constructors</span></div>
      <div className="home-sub">15 Players · 24 Races · 3 Picks Per Race</div>
      <div className="home-cards">
        <div className="home-card" onClick={() => setShowPlayerModal(true)}>
          <div className="home-card-icon">🏎️</div>
          <div className="home-card-title">I'm a Player</div>
          <div className="home-card-desc">Submit your picks, track your score, and see the leaderboard.</div>
        </div>
        <div className="home-card" onClick={() => setShowAdminModal(true)}>
          <div className="home-card-icon">⚙️</div>
          <div className="home-card-title">Admin</div>
          <div className="home-card-desc">Enter race results after each Grand Prix to update everyone's scores.</div>
        </div>
      </div>

      {showPlayerModal && (
        <div className="modal-bg" onClick={() => setShowPlayerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Who Are You?</div>
            <div className="modal-sub">SELECT YOUR NAME FROM THE LIST</div>
            <div className="player-list">
              {PLAYERS.map(p => (
                <button
                  key={p}
                  className={`player-btn ${selectedPlayer === p ? "selected" : ""}`}
                  onClick={() => setSelectedPlayer(p)}
                >{p}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={handlePlayerGo} disabled={!selectedPlayer}>
              Enter as {selectedPlayer || "..."}
            </button>
            <button className="modal-close" onClick={() => setShowPlayerModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="modal-bg" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Admin Login</div>
            <div className="modal-sub">ENTER THE ADMIN PASSWORD</div>
            <input
              type="password"
              className="input-field"
              placeholder="Password"
              value={adminPw}
              onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }}
              onKeyDown={e => e.key === "Enter" && handleAdminGo()}
              autoFocus
            />
            {adminErr && <div className="input-error">Incorrect password.</div>}
            <button className="btn-primary" onClick={handleAdminGo}>Enter Admin</button>
            <button className="modal-close" onClick={() => setShowAdminModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState("home");
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [allPicks, setAllPicks] = useState(SEED_PICKS);
  const [allResults, setAllResults] = useState(SEED_RESULTS);
  const [playerTab, setPlayerTab] = useState("picks");
  const [loading, setLoading] = useState(true);

  // Real-time Firestore listeners
  useEffect(() => {
    let picksLoaded = false;
    let resultsLoaded = false;

    const checkDone = () => {
      if (picksLoaded && resultsLoaded) setLoading(false);
    };

    const unsubPicks = onSnapshot(doc(db, "data", "picks"), snap => {
      if (snap.exists()) setAllPicks(snap.data());
      else fbSavePicks(SEED_PICKS); // seed on first run
      picksLoaded = true;
      checkDone();
    });

    const unsubResults = onSnapshot(doc(db, "data", "results"), snap => {
      if (snap.exists()) {
        // Convert r1, r2... keys back to numbers
        const raw = snap.data();
        const parsed = {};
        Object.entries(raw).forEach(([k, v]) => {
          parsed[Number(k.replace("r", ""))] = v;
        });
        setAllResults(parsed);
      } else {
        fbSaveResults(SEED_RESULTS); // seed on first run
      }
      resultsLoaded = true;
      checkDone();
    });

    return () => { unsubPicks(); unsubResults(); };
  }, []);

  const handleSavePick = useCallback((player, raceId, pick) => {
    setAllPicks(prev => {
      const updated = { ...prev, [player]: { ...(prev[player] || {}), [raceId]: pick } };
      fbSavePicks(updated);
      return updated;
    });
  }, []);

  const handleSaveResults = useCallback((raceId, result) => {
    setAllResults(prev => {
      const updated = { ...prev, [raceId]: result };
      fbSaveResults(updated);
      return updated;
    });
  }, []);

  const standings = computeStandings(allPicks, allResults);

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="loading">
          <div style={{fontSize:48}}>🏎️</div>
          <div className="loading-text">LOADING SEASON DATA...</div>
        </div>
      </>
    );
  }

  if (screen === "home") {
    return (
      <>
        <style>{CSS}</style>
        <Home
          onPlayer={name => { setCurrentPlayer(name); setScreen("player"); setPlayerTab("picks"); }}
          onAdmin={() => setScreen("admin")}
        />
      </>
    );
  }

  if (screen === "admin") {
    return (
      <>
        <style>{CSS}</style>
        <div className="shell">
          <div className="topbar">
            <div className="topbar-logo">P10 · DNF1 · <span>CON</span></div>
            <div className="topbar-user">
              <span className="topbar-name">Admin Mode</span>
              <button className="logout-btn" onClick={() => setScreen("home")}>← Exit</button>
            </div>
          </div>
          <div className="content">
            <AdminPanel allResults={allResults} onSaveResults={handleSaveResults} />
          </div>
        </div>
      </>
    );
  }

  const tabs = [
    { id: "picks",     label: "My Picks"  },
    { id: "standings", label: "Standings" },
    { id: "results",   label: "Results"   },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="shell">
        <div className="topbar">
          <div className="topbar-logo">P10 · DNF1 · <span>CON</span></div>
          <div className="topbar-user">
            <span className="topbar-name">Playing as <strong>{currentPlayer}</strong></span>
            <button className="logout-btn" onClick={() => { setScreen("home"); setCurrentPlayer(null); }}>Switch</button>
          </div>
        </div>
        <div className="content">
          <nav className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={`tab ${playerTab===t.id?"active":""}`} onClick={() => setPlayerTab(t.id)}>
                {t.label}
              </button>
            ))}
          </nav>
          {playerTab === "standings" && <Leaderboard standings={standings} allResults={allResults} currentPlayer={currentPlayer} />}
          {playerTab === "picks"     && <MyPicks player={currentPlayer} allPicks={allPicks} allResults={allResults} onSave={handleSavePick} />}
          {playerTab === "results"   && <RaceResultsView allPicks={allPicks} allResults={allResults} currentPlayer={currentPlayer} standings={standings} />}
        </div>
      </div>
    </>
  );
}
