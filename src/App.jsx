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

const DRIVER_CONSTRUCTOR = {
  Russell:"Mercedes",    Antonelli:"Mercedes",
  Leclerc:"Ferrari",     Hamilton:"Ferrari",
  Norris:"McLaren",      Piastri:"McLaren",
  Verstappen:"Red Bull", Hadjar:"Red Bull",
  Bearman:"Haas",        Ocon:"Haas",
  Lindblad:"Racing Bulls", Lawson:"Racing Bulls",
  Bortoleto:"Audi",      Hulkenberg:"Audi",
  Gasly:"Alpine",        Colapinto:"Alpine",
  Albon:"Williams",      Sainz:"Williams",
  Perez:"Cadillac",      Bottas:"Cadillac",
  Stroll:"Aston Martin", Alonso:"Aston Martin",
};

const F1_PTS = [25,18,15,12,10,8,6,4,2,1];

const F1_RESULTS_URL = "https://www.formula1.com/en/results/2026/races";

function calcConstructorOrder(finishing_order) {
  const pts = {};
  const bestPos = {};
  CONSTRUCTORS.forEach(c => { pts[c] = 0; bestPos[c] = 99; });
  finishing_order.forEach((driver, i) => {
    const team = DRIVER_CONSTRUCTOR[driver];
    if (!team) return;
    pts[team] += F1_PTS[i] ?? 0;
    if (i < bestPos[team]) bestPos[team] = i;
  });
  return [...CONSTRUCTORS].sort((a, b) => {
    if (pts[b] !== pts[a]) return pts[b] - pts[a];
    return bestPos[a] - bestPos[b];
  });
}

const CANCELLED_RACES = [4, 5]; // Bahrain and Saudi Arabia — cancelled due to Iran conflict

const RACES = [
  { id:1,  name:"Australia",     date:"2026-03-08", flag:"🇦🇺" },
  { id:2,  name:"China",         date:"2026-03-15", flag:"🇨🇳" },
  { id:3,  name:"Japan",         date:"2026-03-29", flag:"🇯🇵" },
  { id:4,  name:"Bahrain",       date:"2026-04-12", flag:"🇧🇭", cancelled:true },
  { id:5,  name:"Saudi Arabia",  date:"2026-04-19", flag:"🇸🇦", cancelled:true },
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
  Cadillac:"#444444", "Aston Martin":"#229971",
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────

const SEED_FINISHING_ORDER_R1 = ["Russell","Antonelli","Leclerc","Hamilton","Norris","Verstappen","Bearman","Lindblad","Bortoleto","Gasly","Ocon","Albon","Lawson","Colapinto","Sainz","Perez","Stroll","Alonso","Bottas","Hadjar","Piastri","Hulkenberg"];

const SEED_RESULTS = {
  1: {
    finishing_order: SEED_FINISHING_ORDER_R1,
    dnf1: "Hadjar",
    constructor_order: calcConstructorOrder(SEED_FINISHING_ORDER_R1),
  },
};

const SEED_PICKS = {
  "Joe Jurasek":     { 1: { p10:"Gasly",      dnf1:"Perez",   constructor:"Mercedes"    }},
  "Greg Angelo":     { 1: { p10:"Gasly",      dnf1:"Bearman", constructor:"Racing Bulls" }},
  "Katie Logue":     { 1: { p10:"Bortoleto",  dnf1:"Sainz",   constructor:"Mercedes"    }},
  "Vic Woods":       { 1: { p10:"Bortoleto",  dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Claire Deakin":   { 1: { p10:"Albon",      dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Brett Sprinkel":  { 1: { p10:"Lawson",     dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Joe Deakin":      { 1: { p10:"Bearman",    dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Ted Deakin":      { 1: { p10:"Bearman",    dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Jason Hoey":      { 1: { p10:"Lawson",     dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Joel Greenfield": { 1: { p10:"Lawson",     dnf1:"Gasly",   constructor:"Mercedes"    }},
  "Andy Jurasek":    { 1: { p10:"Bearman",    dnf1:"Alonso",  constructor:"Mercedes"    }},
  "Will Deakin":     { 1: { p10:"Verstappen", dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Jim Deakin":      { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Rick Pflasterer": { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Mercedes"    }},
  "Sam Levine":      { 1: { p10:"Hulkenberg", dnf1:"Stroll",  constructor:"Red Bull"    }},
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

function computeStandings(allPicks, allResults, players) {
  const roster = players || PLAYERS;
  return roster.map(player => {
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
  return RACES.find(r => !r.cancelled && !isRaceLocked(r)) || null;
}

// ─── FIREBASE ────────────────────────────────────────────────────────────────

async function fbSavePicks(picks) {
  await setDoc(doc(db, "data", "picks"), picks);
}
async function fbSaveResults(results) {
  const serialized = {};
  Object.entries(results).forEach(([k, v]) => { serialized[`r${k}`] = v; });
  await setDoc(doc(db, "data", "results"), serialized);
}
async function fbSaveConfig(config) {
  await setDoc(doc(db, "data", "config"), config);
}

const DEFAULT_CONFIG = {
  password: "f1admin2026",
  players: [...PLAYERS],
};

// ─── STYLES ──────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700&family=Barlow:wght@300;400;500&display=swap');

*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{background:#050505;color:#f0ede8;font-family:'Barlow',sans-serif;min-height:100vh}
::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#111}::-webkit-scrollbar-thumb{background:#e10600;border-radius:2px}
button{cursor:pointer;font-family:'Barlow',sans-serif}
select,input{font-family:'Barlow',sans-serif}

.home{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 20px;position:relative}
.home-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(225,6,0,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(225,6,0,0.04) 1px,transparent 1px);background-size:40px 40px;pointer-events:none}
.home-glow{position:absolute;top:30%;left:50%;transform:translate(-50%,-50%);width:600px;height:600px;background:radial-gradient(circle,rgba(225,6,0,0.08) 0%,transparent 70%);pointer-events:none}
.home-season{font-family:'Barlow Condensed',sans-serif;font-size:14px;letter-spacing:0.3em;color:#e10600;text-transform:uppercase;margin-bottom:16px}
.home-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,11vw,110px);line-height:0.85;color:#fff;margin-bottom:10px}
.home-title .red{color:#e10600;display:block}
.home-title .challenge{color:#fff;font-size:clamp(26px,5.5vw,56px);letter-spacing:0.1em;display:block;margin-top:6px}
.home-sub{font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:0.15em;color:#999;margin-bottom:44px}
.home-cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;width:100%;max-width:520px;margin-bottom:16px}
@media(max-width:480px){.home-cards{grid-template-columns:1fr}}
.home-card{background:#0d0d0d;border:1px solid #1c1c1c;border-radius:10px;padding:28px 20px;text-align:left;transition:border-color 0.2s,transform 0.15s;position:relative;overflow:hidden;cursor:pointer}
.home-card::before{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:#e10600;transform:scaleX(0);transition:transform 0.2s;transform-origin:left}
.home-card:hover{border-color:#333;transform:translateY(-2px)}
.home-card:hover::before{transform:scaleX(1)}
.home-card-icon{font-size:28px;margin-bottom:12px}
.home-card-title{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:700;letter-spacing:0.05em;color:#fff;margin-bottom:6px}
.home-card-desc{font-size:14px;color:#999;line-height:1.55}
.home-how-btn{background:none;border:1px solid #282828;color:#bbb;border-radius:8px;padding:11px 32px;font-family:'Barlow Condensed',sans-serif;font-size:15px;letter-spacing:0.15em;text-transform:uppercase;transition:all 0.15s}
.home-how-btn:hover{border-color:#555;color:#fff}

.directions{max-width:700px;margin:0 auto;padding:48px 20px 80px}
.directions-back{background:none;border:none;color:#999;font-family:'Barlow Condensed',sans-serif;font-size:15px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:28px;padding:0;display:flex;align-items:center;gap:8px;transition:color 0.15s}
.directions-back:hover{color:#fff}
.dir-title{font-family:'Bebas Neue',sans-serif;font-size:60px;color:#fff;line-height:1;margin-bottom:4px}
.dir-sub{font-family:'Barlow Condensed',sans-serif;font-size:15px;color:#999;letter-spacing:0.08em;margin-bottom:36px}
.dir-section{margin-bottom:32px}
.dir-section-title{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#e10600;margin-bottom:14px;letter-spacing:0.05em}
.dir-card{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:18px 20px;margin-bottom:10px}
.dir-card-title{font-family:'Barlow Condensed',sans-serif;font-size:17px;font-weight:700;color:#fff;letter-spacing:0.05em;margin-bottom:8px}
.dir-card-body{font-size:15px;color:#bbb;line-height:1.65}
.dir-card-body strong{color:#fff}
.dir-pts-row{display:flex;align-items:baseline;gap:12px;padding:9px 0;border-bottom:1px solid #111}
.dir-pts-row:last-child{border-bottom:none}
.dir-pts-val{font-family:'Bebas Neue',sans-serif;font-size:26px;color:#e10600;width:56px;flex-shrink:0}
.dir-pts-desc{font-size:14px;color:#bbb;line-height:1.4}
.dir-pts-desc strong{color:#ddd}

.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:100;padding:20px}
.modal{background:#0d0d0d;border:1px solid #222;border-radius:12px;padding:28px;width:100%;max-width:420px;max-height:85vh;overflow-y:auto}
.modal-title{font-family:'Bebas Neue',sans-serif;font-size:34px;color:#fff;margin-bottom:4px}
.modal-sub{font-size:14px;color:#999;margin-bottom:20px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em}
.player-list{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}
.player-btn{background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;text-align:left;color:#ccc;font-size:14px;font-weight:500;transition:all 0.15s}
.player-btn:hover{background:#1a1a1a;border-color:#444;color:#fff}
.player-btn.selected{background:rgba(225,6,0,0.1);border-color:#e10600;color:#fff}
.modal-close{background:none;border:1px solid #222;color:#888;border-radius:6px;padding:10px 16px;font-size:14px;letter-spacing:0.1em;transition:all 0.15s;margin-top:8px;width:100%}
.modal-close:hover{border-color:#555;color:#bbb}
.input-field{width:100%;background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;color:#fff;font-size:15px;margin-bottom:12px;outline:none;transition:border-color 0.15s}
.input-field:focus{border-color:#e10600}
.input-error{color:#ff4444;font-size:14px;margin-bottom:12px}
.btn-primary{width:100%;background:#e10600;border:none;border-radius:6px;padding:14px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:0.1em;font-weight:700;transition:background 0.15s}
.btn-primary:hover{background:#c00500}
.btn-primary:disabled{background:#333;color:#666;cursor:not-allowed}

.shell{min-height:100vh}
.topbar{background:#080808;border-bottom:1px solid #111;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.topbar-logo{font-family:'Bebas Neue',sans-serif;font-size:22px;color:#fff;letter-spacing:0.05em}
.topbar-logo span{color:#e10600}
.topbar-user{display:flex;align-items:center;gap:10px}
.topbar-name{font-size:14px;font-weight:500;color:#bbb}
.topbar-name strong{color:#fff}
.logout-btn{background:none;border:1px solid #222;color:#888;border-radius:4px;padding:5px 12px;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;transition:all 0.15s}
.logout-btn:hover{border-color:#444;color:#ccc}
.content{max-width:880px;margin:0 auto;padding:28px 16px 80px}

.tabs{display:flex;gap:2px;margin-bottom:28px;border-bottom:1px solid #111;padding-bottom:0;overflow-x:auto}
.tab{background:none;border:none;padding:10px 18px;color:#777;font-family:'Barlow Condensed',sans-serif;font-size:15px;letter-spacing:0.12em;text-transform:uppercase;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color 0.15s,border-color 0.15s;white-space:nowrap}
.tab:hover{color:#bbb}
.tab.active{color:#fff;border-bottom-color:#e10600}

.sh{display:flex;align-items:baseline;gap:12px;margin-bottom:20px}
.sh-title{font-family:'Bebas Neue',sans-serif;font-size:38px;color:#fff}
.sh-meta{font-family:'Barlow Condensed',sans-serif;font-size:14px;color:#777;letter-spacing:0.1em;text-transform:uppercase}

.lb-header{display:grid;grid-template-columns:44px 1fr auto;padding:6px 14px;margin-bottom:4px}
.lb-header span{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.15em;color:#444;text-transform:uppercase}
.lb-row{display:grid;grid-template-columns:44px 1fr auto;align-items:center;padding:14px 14px;border-radius:7px;margin-bottom:3px;cursor:pointer;transition:background 0.15s;border:1px solid transparent}
.lb-row:hover{background:#0e0e0e;border-color:#1a1a1a}
.lb-row.me{border-color:#e1060030;background:#0e0e0e}
.lb-row.p1{background:linear-gradient(90deg,rgba(255,215,0,0.06),transparent)}
.lb-row.p2{background:linear-gradient(90deg,rgba(192,192,192,0.05),transparent)}
.lb-row.p3{background:linear-gradient(90deg,rgba(205,127,50,0.05),transparent)}
.lb-rank{font-family:'Bebas Neue',sans-serif;font-size:26px;color:#333}
.lb-row.p1 .lb-rank{color:#FFD700}
.lb-row.p2 .lb-rank{color:#C0C0C0}
.lb-row.p3 .lb-rank{color:#CD7F32}
.lb-name{font-size:15px;font-weight:500;color:#ddd}
.lb-name .you{font-size:11px;background:#e10600;color:#fff;border-radius:3px;padding:1px 6px;margin-left:6px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;vertical-align:middle}
.lb-bar-wrap{height:2px;background:#161616;border-radius:1px;margin-top:5px;overflow:hidden;max-width:300px}
.lb-bar{height:100%;background:linear-gradient(90deg,#e10600,#ff4500);border-radius:1px;transition:width 0.7s ease}
.lb-pts-col{text-align:right}
.lb-pts{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#fff;line-height:1}
.lb-pts-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#444;letter-spacing:0.1em}

.drawer{background:#0a0a0a;border:1px solid #161616;border-radius:8px;padding:20px;margin-bottom:4px;animation:fd 0.18s ease}
@keyframes fd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
.drawer-title{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.2em;color:#666;text-transform:uppercase;margin-bottom:16px}
.race-picks-row{display:grid;grid-template-columns:140px 1fr 1fr 1fr 80px;gap:8px;align-items:start;padding:10px 12px;border-radius:5px;border-bottom:1px solid #111;font-size:14px}
@media(max-width:600px){.race-picks-row{grid-template-columns:1fr 1fr;gap:6px}}
.race-picks-row:last-child{border-bottom:none}
.race-picks-row:hover{background:#111}
.rpr-race{font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:0.05em;color:#888}
.rpr-val{color:#ddd;font-weight:500}
.rpr-val.correct{color:#4cff91}
.rpr-pts{font-family:'Barlow Condensed',sans-serif;font-size:18px;font-weight:700;text-align:right}
.rpr-pts.zero{color:#444}
.badge{font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.05em;padding:2px 8px;border-radius:3px;background:#151515;color:#666;display:inline-block}
.badge.hit{background:rgba(76,255,145,0.1);color:#4cff91}
.badge.close{background:rgba(255,165,0,0.1);color:#ffa500}
.badge.perfect{background:rgba(225,6,0,0.15);color:#ff4444}

.pick-race-banner{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:20px 24px;margin-bottom:24px;position:relative;overflow:hidden}
.pick-race-banner::after{content:'';position:absolute;top:0;left:0;bottom:0;width:3px;background:#e10600}
.prb-eyebrow{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.2em;color:#e10600;text-transform:uppercase;margin-bottom:4px}
.prb-title{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#fff;line-height:1;margin-bottom:2px}
.prb-date{font-family:'Barlow Condensed',sans-serif;font-size:14px;color:#888;letter-spacing:0.1em}
.pick-form{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:24px}
.form-row{margin-bottom:20px}
.form-label{font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:0.18em;color:#999;text-transform:uppercase;margin-bottom:8px;display:block}
.form-label span{color:#e10600;margin-left:4px}
.form-label em{font-style:normal;color:#666;font-size:11px;margin-left:8px}
.form-select{width:100%;background:#141414;border:1px solid #222;border-radius:6px;padding:12px 14px;color:#fff;font-size:15px;font-weight:500;outline:none;transition:border-color 0.15s;appearance:none;cursor:pointer}
.form-select:focus{border-color:#e10600}
.form-select option{background:#1a1a1a}
.form-save-row{display:flex;align-items:center;gap:12px;margin-top:24px}
.save-btn{background:#e10600;border:none;border-radius:6px;padding:13px 28px;color:#fff;font-family:'Barlow Condensed',sans-serif;font-size:17px;letter-spacing:0.1em;font-weight:700;transition:background 0.15s}
.save-btn:hover{background:#c00500}
.save-btn:disabled{background:#222;color:#555;cursor:not-allowed}
.save-confirm{font-size:14px;color:#4cff91;animation:fd 0.3s ease}

.locked-banner{background:#0d0d0d;border:1px solid #2a1800;border-radius:8px;padding:16px 20px;display:flex;align-items:center;gap:12px;margin-bottom:20px}
.locked-banner-text{font-family:'Barlow Condensed',sans-serif;font-size:15px;color:#cc8800;letter-spacing:0.04em;line-height:1.4}
.locked-pick-row{display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #111}
.locked-pick-row:last-child{border-bottom:none}
.locked-pick-label{font-family:'Barlow Condensed',sans-serif;font-size:13px;letter-spacing:0.15em;color:#888;text-transform:uppercase}
.locked-pick-value{font-size:15px;font-weight:500;color:#ddd}

.race-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:24px}
.rc{background:#0d0d0d;border:1px solid #161616;border-radius:8px;padding:16px;cursor:pointer;transition:all 0.15s;position:relative;overflow:hidden}
.rc:hover{border-color:#2a2a2a;background:#111}
.rc.done::before{content:'';position:absolute;top:0;left:0;bottom:0;width:2px;background:#e10600}
.rc.active{border-color:#e10600}
.rc.has-pick::after{content:'✓';position:absolute;top:8px;right:10px;font-size:12px;color:#4cff91}
.rc-num{font-family:'Bebas Neue',sans-serif;font-size:36px;color:#161616;line-height:1}
.rc-flag{font-size:20px;margin-bottom:4px}
.rc-name{font-size:13px;font-weight:600;color:#ccc;margin-bottom:2px}
.rc-date{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#666;letter-spacing:0.05em}
.rc-done{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.1em;color:#e10600;text-transform:uppercase;margin-top:6px}
.rc-locked{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.08em;color:#cc8800;text-transform:uppercase;margin-top:6px}

.rc.cancelled{opacity:0.45;cursor:default;border-color:#111}
.rc.cancelled:hover{background:#0d0d0d;border-color:#111;transform:none}
.rc-cancelled{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.12em;color:#cc2200;text-transform:uppercase;margin-top:6px;font-weight:700}

background:#0d0d0d;border:1px solid #1a1a1a;border-radius:10px;padding:24px;animation:fd 0.18s ease}
.rp-title{font-family:'Bebas Neue',sans-serif;font-size:40px;color:#fff;margin-bottom:8px}
.rp-f1-link{display:inline-flex;align-items:center;gap:6px;font-family:'Barlow Condensed',sans-serif;font-size:13px;color:#e10600;letter-spacing:0.1em;text-decoration:none;text-transform:uppercase;margin-bottom:20px;border:1px solid #2a0600;border-radius:4px;padding:6px 14px;transition:all 0.15s}
.rp-f1-link:hover{background:#1a0400;border-color:#e10600}
.result-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px}
@media(max-width:500px){.result-stats{grid-template-columns:1fr}}
.rs-box{background:#141414;border:1px solid #1e1e1e;border-radius:7px;padding:14px}
.rs-label{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.2em;color:#777;text-transform:uppercase;margin-bottom:8px}
.rs-val{font-family:'Bebas Neue',sans-serif;font-size:30px;color:#e10600;line-height:1}
.rs-sub{font-size:13px;color:#666;margin-top:4px;font-family:'Barlow Condensed',sans-serif}
.results-table{width:100%;border-collapse:collapse;font-size:14px}
.results-table th{text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.15em;color:#555;text-transform:uppercase;padding:8px 10px;border-bottom:1px solid #111}
.results-table td{padding:10px 10px;border-bottom:1px solid #0d0d0d;color:#bbb}
.results-table tr:last-child td{border-bottom:none}
.results-table tr:hover td{background:#0a0a0a}

.prerace-section-banner{background:#0d0d0d;border:1px solid #1a2a0a;border-radius:10px;padding:18px 22px;margin-bottom:22px;position:relative;overflow:hidden}
.prerace-section-banner::after{content:'';position:absolute;top:0;left:0;bottom:0;width:3px;background:#4cff91}
.prerace-eyebrow{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.2em;color:#4cff91;text-transform:uppercase;margin-bottom:4px}
.prerace-title{font-family:'Bebas Neue',sans-serif;font-size:34px;color:#fff;line-height:1;margin-bottom:3px}
.prerace-sub{font-family:'Barlow Condensed',sans-serif;font-size:14px;color:#888;letter-spacing:0.06em}
.prerace-race-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px;margin-bottom:22px}
.prerace-rc{background:#0d0d0d;border:1px solid #161616;border-radius:8px;padding:14px;cursor:pointer;transition:all 0.15s;border-left:2px solid #e10600}
.prerace-rc:hover{border-color:#333}
.prerace-rc.active{border-color:#4cff91;border-left-color:#4cff91}
.prerace-rc-name{font-size:13px;font-weight:600;color:#ccc;margin-bottom:2px}
.prerace-rc-date{font-family:'Barlow Condensed',sans-serif;font-size:11px;color:#666;margin-bottom:4px}
.prerace-rc-count{font-family:'Barlow Condensed',sans-serif;font-size:12px;color:#4cff91}
.prerace-table{width:100%;border-collapse:collapse;font-size:14px}
.prerace-table th{text-align:left;font-family:'Barlow Condensed',sans-serif;font-size:11px;letter-spacing:0.15em;color:#555;text-transform:uppercase;padding:8px 12px;border-bottom:1px solid #111}
.prerace-table td{padding:11px 12px;border-bottom:1px solid #0d0d0d;color:#ccc}
.prerace-table tr:last-child td{border-bottom:none}
.prerace-table tr:hover td{background:#0a0a0a}
.prerace-nopick{color:#444;font-style:italic;font-size:13px}
.prerace-empty{text-align:center;padding:48px 0;color:#555;font-family:'Barlow Condensed',sans-serif;font-size:16px;letter-spacing:0.08em;line-height:1.6}

.con{display:inline-block;padding:2px 8px;border-radius:3px;font-size:12px;font-weight:700;letter-spacing:0.03em}
.you{font-size:11px;background:#e10600;color:#fff;border-radius:3px;padding:1px 6px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;vertical-align:middle}

.admin-grid{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
@media(max-width:600px){.admin-grid{grid-template-columns:1fr}}
.admin-race-list{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;overflow:hidden;max-height:80vh;overflow-y:auto}
.admin-race-item{padding:12px 16px;border-bottom:1px solid #111;cursor:pointer;transition:background 0.12s;display:flex;justify-content:space-between;align-items:center}
.admin-race-item:last-child{border-bottom:none}
.admin-race-item:hover{background:#111}
.admin-race-item.active{background:#151515;border-left:2px solid #e10600}
.ari-name{font-size:14px;font-weight:500;color:#ccc}
.ari-num{font-family:'Bebas Neue',sans-serif;font-size:16px;color:#444;margin-right:8px}
.ari-done{width:8px;height:8px;border-radius:50%;background:#e10600;flex-shrink:0}
.admin-form{background:#0d0d0d;border:1px solid #1a1a1a;border-radius:8px;padding:24px}
.admin-form-title{font-family:'Bebas Neue',sans-serif;font-size:34px;color:#fff;margin-bottom:4px}
.admin-form-sub{font-size:13px;color:#777;margin-bottom:20px;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em}
.admin-section-title{font-family:'Barlow Condensed',sans-serif;font-size:12px;letter-spacing:0.2em;color:#777;text-transform:uppercase;margin:16px 0 8px;display:flex;align-items:center;gap:10px}
.reset-link{font-size:11px;color:#444;cursor:pointer;text-decoration:underline;transition:color 0.15s}
.reset-link:hover{color:#888}
.driver-order-list{display:flex;flex-direction:column;gap:4px;margin-bottom:8px}
.driver-order-item{display:flex;align-items:center;gap:10px;background:#141414;border:1px solid #1a1a1a;border-radius:5px;padding:8px 12px}
.doi-pos{font-family:'Bebas Neue',sans-serif;font-size:18px;color:#444;width:32px}
.doi-name{font-size:13px;color:#ccc;flex:1}
.move-btn{background:none;border:1px solid #222;color:#555;border-radius:3px;width:24px;height:24px;font-size:14px;line-height:1;transition:all 0.1s}
.move-btn:hover{border-color:#555;color:#ccc}
.con-preview{background:#0a0a0a;border:1px solid #1a1a1a;border-radius:6px;padding:12px 14px;margin-bottom:6px}
.con-preview-row{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #111}
.con-preview-row:last-child{border-bottom:none}
.con-preview-pts{font-family:'Barlow Condensed',sans-serif;font-size:13px;color:#666}
.con-preview-note{font-size:12px;color:#555;font-family:'Barlow Condensed',sans-serif;letter-spacing:0.05em;margin-bottom:16px}
.admin-save-row{display:flex;align-items:center;gap:12px;margin-top:20px}

.loading{min-height:100vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px}
.loading-text{font-family:'Bebas Neue',sans-serif;font-size:28px;color:#333;letter-spacing:0.1em;animation:pulse 1.4s ease-in-out infinite}
@keyframes pulse{0%,100%{color:#333}50%{color:#555}}
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

// ─── DIRECTIONS ───────────────────────────────────────────────────────────────

function Directions({ onBack }) {
  return (
    <div className="directions">
      <button className="directions-back" onClick={onBack}>← Back to Home</button>
      <div className="dir-title">How to Play</div>
      <div className="dir-sub">P10 · DNF1 · CONSTRUCTORS CHALLENGE · 2026 SEASON</div>

      <div className="dir-section">
        <div className="dir-section-title">The Basics</div>
        <div className="dir-card">
          <div className="dir-card-body">
            Before each race, every player submits <strong>3 picks</strong>: a P10 driver, a DNF1 driver, and a top constructor. Picks lock the moment the commissioner enters results — you can still update picks on race day right up until that point. After the race, the commissioner enters the results and scores update instantly for everyone.
          </div>
        </div>
      </div>

      <div className="dir-section">
        <div className="dir-section-title">Scoring</div>
        <div className="dir-card">
          <div className="dir-card-title">Pick 1 — P10 Driver (up to 25 pts)</div>
          <div className="dir-card-body" style={{marginTop:4,marginBottom:10}}>Pick the driver you think finishes in 10th place. Points scale based on how close you are:</div>
          {[
            ["25","Exactly right — your driver finishes P10"],
            ["18","1 position away (P9 or P11)"],
            ["15","2 positions away"],
            ["12","3 positions away"],
            ["10","4 positions away"],
            ["8","5 positions away"],
            ["6","6 positions away"],
            ["4","7 positions away"],
            ["2","8 positions away"],
            ["1","9 positions away (P1 or P19)"],
            ["0","P20 or further"],
          ].map(([val, desc]) => (
            <div className="dir-pts-row" key={val}>
              <span className="dir-pts-val">{val}</span>
              <span className="dir-pts-desc">{desc}</span>
            </div>
          ))}
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Pick 2 — DNF1 Driver (10 pts)</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            Pick the driver who retires first. <strong>10 points</strong> if correct. The driver must have completed the formation lap to count. If no one retires, no one scores on this pick.
          </div>
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Pick 3 — Top Constructor (up to 3 pts)</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            Pick the constructor that scores the most F1 points in the race. <strong>3 pts</strong> for picking P1, <strong>2 pts</strong> for P2, <strong>1 pt</strong> for P3. Tied constructors are separated by which team has the higher-finishing driver.
          </div>
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Maximum: 38 pts per race · 836 pts for the season</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            25 (P10) + 10 (DNF1) + 3 (Constructor) = <strong>38 pts</strong> maximum per race across <strong>22 races</strong>.
          </div>
        </div>
      </div>

      <div className="dir-section">
        <div className="dir-section-title">Using the App</div>
        <div className="dir-card">
          <div className="dir-card-title">Submitting Picks</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            Tap <strong>I'm a Player</strong>, choose your name, then go to <strong>My Picks</strong>. Select a race, fill in all three picks, and hit Submit. You can update picks any time — even on race day — until the commissioner enters results for that race.
          </div>
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Pre-Race Picks</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            Once a race locks, the <strong>Pre-Race</strong> tab reveals everyone's picks. See who picked what before the action unfolds.
          </div>
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Standings and Results</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            <strong>Standings</strong> shows the live season leaderboard — tap any player for a race-by-race breakdown. <strong>Results</strong> shows full picks and scores for every completed race, plus a link to the official F1 results.
          </div>
        </div>
      </div>
    </div>
  );
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
        <span className="sh-meta">Race {completedRaces.length} of 22</span>
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
                  {isMe && <span className="you" style={{marginLeft:6}}>YOU</span>}
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
                <div className="race-picks-row" style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:"11px",letterSpacing:"0.15em",color:"#444",textTransform:"uppercase",paddingBottom:6}}>
                  <span>Race</span><span>P10 Pick</span><span>DNF1</span><span>Constructor</span><span style={{textAlign:"right"}}>Pts</span>
                </div>
                {completedRaces.map(raceId => {
                  const d = entry.raceTotals[raceId];
                  const res = allResults[raceId];
                  const race = RACES.find(r => r.id === raceId);
                  if (!d) return (
                    <div className="race-picks-row" key={raceId} style={{opacity:0.4}}>
                      <span className="rpr-race">{race?.flag} {race?.name}</span>
                      <span style={{color:"#444",fontSize:13,gridColumn:"2/6"}}>No pick submitted</span>
                    </div>
                  );
                  const p10pos = res.finishing_order.indexOf(d.p10) + 1;
                  return (
                    <div className="race-picks-row" key={raceId}>
                      <span className="rpr-race">{race?.flag} {race?.name}</span>
                      <span>
                        <span className={`rpr-val ${d.p10pts>0?"correct":""}`}>{d.p10}</span>
                        <span className={ptsBadgeClass(d.p10pts)} style={{marginLeft:6}}>{d.p10pts}pt</span>
                        <div style={{fontSize:11,color:"#666",fontFamily:"'Barlow Condensed',sans-serif",marginTop:2}}>Finished P{p10pos}</div>
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
                  <div style={{color:"#666",padding:"10px 0",fontSize:14}}>No races completed yet.</div>
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
  // Picks lock only when the commissioner has entered results — not at midnight on race day
  const raceIsLocked = editRace ? !!allResults[editRace] : false;
  const existingPick = editRace ? playerPicks[editRace] : null;

  return (
    <div>
      <div className="sh">
        <span className="sh-title">My Picks</span>
        <span className="sh-meta">{player}</span>
      </div>

      {nextRace && (
        <div className="pick-race-banner">
          <div className="prb-eyebrow">Next Race · {nextRace.date} · Picks close when results are entered</div>
          <div className="prb-title">{nextRace.flag} {nextRace.name} Grand Prix</div>
          <div className="prb-date">Round {nextRace.id} of 22</div>
        </div>
      )}

      <div className="race-grid">
        {RACES.map(r => {
          const hasResult = !!allResults[r.id];
          const hasPick = !!playerPicks[r.id];
          const locked = isRaceLocked(r);
          const cancelled = !!r.cancelled;
          return (
            <div
              key={r.id}
              className={`rc ${hasResult?"done":""} ${editRace===r.id&&!cancelled?"active":""} ${hasPick&&!locked&&!cancelled?"has-pick":""} ${cancelled?"cancelled":""}`}
              onClick={() => { if (!cancelled) setEditRace(r.id); }}
            >
              <div className="rc-num">{String(r.id).padStart(2,"0")}</div>
              <div className="rc-flag">{r.flag}</div>
              <div className="rc-name">{r.name}</div>
              <div className="rc-date">{r.date}</div>
              {cancelled && <div className="rc-cancelled">⛔ Cancelled</div>}
              {!cancelled && hasResult && <div className="rc-done">Results in</div>}
              {!cancelled && !hasResult && locked && <div className="rc-locked" style={{color:"#4cff91"}}>✓ Still Open</div>}
            </div>
          );
        })}
      </div>

      {editRace && !RACES.find(r => r.id === editRace)?.cancelled && (
        <div style={{animation:"fd 0.2s ease"}}>
          {raceIsLocked ? (
            <div className="pick-form">
              <div className="locked-banner">
                <span style={{fontSize:20}}>🔒</span>
                <span className="locked-banner-text">
                  {existingPick
                    ? `Results have been entered for ${editableRace.name} — picks are now locked.`
                    : `Results have been entered for ${editableRace.name} — picks are closed. No pick was submitted for this race.`
                  }
                </span>
              </div>
              {existingPick && (
                <>
                  <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.18em",color:"#777",textTransform:"uppercase",marginBottom:14}}>
                    {editableRace.flag} {editableRace.name} · Your Submitted Picks
                  </div>
                  {[
                    {label:"P10 Driver",   val: existingPick.p10},
                    {label:"DNF1 Driver",  val: existingPick.dnf1},
                    {label:"Constructor",  val: existingPick.constructor},
                  ].map(item => (
                    <div className="locked-pick-row" key={item.label}>
                      <span className="locked-pick-label">{item.label}</span>
                      <span className="locked-pick-value">{item.val}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          ) : (
            <div className="pick-form">
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.2em",color:"#e10600",textTransform:"uppercase",marginBottom:4}}>
                Submit Picks
              </div>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"30px",color:"#fff",marginBottom:20}}>
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
                <button className="save-btn" onClick={handleSave} disabled={!form.p10 || !form.dnf1 || !form.constructor}>
                  {existingPick ? "Update Picks" : "Submit Picks"}
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

// ─── PRE-RACE PICKS ───────────────────────────────────────────────────────────

function PreRacePicks({ allPicks, allResults, currentPlayer, players }) {
  const roster = players || PLAYERS;
  // Show all races that have at least one pick submitted, or are the next upcoming race
  const nextRace = getNextRace();
  const visibleRaces = RACES.filter(r => {
    if (r.cancelled) return false;
    const hasAnyPick = roster.some(p => allPicks[p]?.[r.id]);
    return hasAnyPick || r.id === nextRace?.id;
  });

  const defaultRace = nextRace || visibleRaces[visibleRaces.length - 1];
  const [selectedRace, setSelectedRace] = useState(defaultRace?.id || 1);
  const race = RACES.find(r => r.id === selectedRace);
  const hasResult = !!allResults[selectedRace];
  const locked = race ? isRaceLocked(race) : false;

  if (visibleRaces.length === 0) {
    return (
      <div>
        <div className="sh"><span className="sh-title">Pre-Race Picks</span></div>
        <div className="prerace-empty">
          No picks have been submitted yet.<br/>
          Be the first to submit your picks for {nextRace?.name || "the next race"}!
        </div>
      </div>
    );
  }

  const submittedCount = roster.filter(p => allPicks[p]?.[selectedRace]).length;

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Pre-Race Picks</span>
        <span className="sh-meta">Everyone's picks · live</span>
      </div>

      <div className="prerace-race-grid">
        {visibleRaces.map(r => {
          const count = roster.filter(p => allPicks[p]?.[r.id]).length;
          const isLocked = isRaceLocked(r);
          return (
            <div
              key={r.id}
              className={`prerace-rc ${selectedRace===r.id?"active":""}`}
              onClick={() => setSelectedRace(r.id)}
            >
              <div className="prerace-rc-name">{r.flag} {r.name}</div>
              <div className="prerace-rc-date">{r.date}</div>
              <div className="prerace-rc-count">{count}/{roster.length} submitted</div>
              {!isLocked && <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:"#4cff91",letterSpacing:"0.08em",marginTop:2}}>OPEN</div>}
            </div>
          );
        })}
      </div>

      {race && (
        <>
          <div className="prerace-section-banner">
            <div className="prerace-eyebrow">
              {hasResult ? "Completed Race" : locked ? "Race Locked — Picks Frozen" : "Race Open — Picks Updating Live"}
            </div>
            <div className="prerace-title">{race.flag} {race.name} Grand Prix · R{race.id}</div>
            <div className="prerace-sub">{submittedCount} of {roster.length} players submitted picks</div>
          </div>

          <table className="prerace-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>P10 Pick</th>
                <th>DNF1</th>
                <th>Constructor</th>
              </tr>
            </thead>
            <tbody>
              {roster.map(player => {
                const pick = allPicks[player]?.[selectedRace];
                const isMe = player === currentPlayer;
                return (
                  <tr key={player} style={isMe ? {background:"rgba(225,6,0,0.04)"} : {}}>
                    <td style={{color:isMe?"#fff":"#ccc",fontWeight:isMe?600:400}}>
                      {player}
                      {isMe && <span className="you" style={{marginLeft:6}}>YOU</span>}
                    </td>
                    {pick ? (
                      <>
                        <td>{pick.p10}</td>
                        <td>{pick.dnf1}</td>
                        <td><ConBadge team={pick.constructor}/></td>
                      </>
                    ) : (
                      <td colSpan={3} className="prerace-nopick">No pick submitted</td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// ─── RACE RESULTS VIEW ───────────────────────────────────────────────────────

function RaceResultsView({ allPicks, allResults, currentPlayer, standings }) {
  const completedRaceIds = Object.keys(allResults).map(Number);
  const [selectedRace, setSelectedRace] = useState(
    completedRaceIds.length > 0 ? Math.max(...completedRaceIds) : 1
  );
  const race = RACES.find(r => r.id === selectedRace);
  const result = allResults[selectedRace];

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Results</span>
        <span className="sh-meta">Select a completed race</span>
      </div>
      <div className="race-grid">
        {RACES.map(r => (
          <div
            key={r.id}
            className={`rc ${allResults[r.id]?"done":""} ${selectedRace===r.id&&!r.cancelled?"active":""} ${r.cancelled?"cancelled":""}`}
            onClick={() => { if (!r.cancelled) setSelectedRace(r.id); }}
          >
            <div className="rc-num">{String(r.id).padStart(2,"0")}</div>
            <div className="rc-flag">{r.flag}</div>
            <div className="rc-name">{r.name}</div>
            <div className="rc-date">{r.date}</div>
            {r.cancelled && <div className="rc-cancelled">⛔ Cancelled</div>}
            {!r.cancelled && allResults[r.id] && <div className="rc-done">Completed</div>}
          </div>
        ))}
      </div>

      {race && (
        <div className="result-panel">
          <div className="rp-title">{race.flag} {race.name} Grand Prix</div>
          {result && (
            <a href={F1_RESULTS_URL} target="_blank" rel="noopener noreferrer" className="rp-f1-link">
              🏁 Official F1 Race Results ↗
            </a>
          )}
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
              <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:11,letterSpacing:"0.2em",color:"#555",textTransform:"uppercase",marginBottom:10}}>
                All Picks This Race
              </div>
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th><th>Player</th><th>P10 Pick</th><th>DNF1</th><th>Constructor</th>
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
                          <td style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:"#444"}}>{i+1}</td>
                          <td style={{color:isMe?"#fff":"#bbb",fontWeight:isMe?600:400}}>
                            {s.player}{isMe && <span className="you" style={{marginLeft:6}}>YOU</span>}
                          </td>
                          <td>
                            <span style={{color:d.p10pts>0?"#4cff91":"#bbb"}}>{d.p10}</span>
                            <span className={ptsBadgeClass(d.p10pts)} style={{marginLeft:6}}>{d.p10pts}pt</span>
                            <div style={{fontSize:11,color:"#666",fontFamily:"'Barlow Condensed',sans-serif"}}>P{pos}</div>
                          </td>
                          <td>
                            <span style={{color:d.dnfpts>0?"#4cff91":"#bbb"}}>{d.dnf1}</span>
                            {d.dnfpts > 0 && <span className="badge hit" style={{marginLeft:6}}>+10</span>}
                          </td>
                          <td>
                            <ConBadge team={d.constructor}/>
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
            <div style={{color:"#666",padding:"40px 0",textAlign:"center",fontFamily:"'Barlow Condensed',sans-serif",fontSize:15,letterSpacing:"0.1em"}}>
              No results entered yet for {race.name}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ADMIN PANEL ─────────────────────────────────────────────────────────────

function CommissionerGuide({ onBack }) {
  return (
    <div className="directions">
      <button className="directions-back" onClick={onBack}>← Back to Commissioner</button>
      <div className="dir-title">Commissioner Guide</div>
      <div className="dir-sub">P10 · DNF1 · CONSTRUCTORS CHALLENGE · 2026</div>

      <div className="dir-section">
        <div className="dir-section-title">Enter Results</div>
        <div className="dir-card">
          <div className="dir-card-title">After each race</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            Use the <strong>finishing order dropdowns</strong> to set P1 through P22. Selecting a driver in one slot automatically swaps them with their previous position — no duplicates are possible. The constructor standings calculate automatically from the driver order. Set the <strong>DNF1</strong> dropdown to the first driver who retired. Hit <strong>Save Results</strong> to publish scores instantly to all players.
          </div>
        </div>
        <div className="dir-card" style={{marginTop:10}}>
          <div className="dir-card-title">Correcting a mistake</div>
          <div className="dir-card-body" style={{marginTop:6}}>
            You can re-enter and overwrite results for any race at any time. Just select the race from the left sidebar, adjust the order, and save again. Scores recalculate immediately for all players.
          </div>
        </div>
      </div>

      <div className="dir-section">
        <div className="dir-section-title">Season Standings</div>
        <div className="dir-card">
          <div className="dir-card-body">
            Shows the full 15-player leaderboard in a compact, screenshot-friendly format. Designed to fit on one screen so you can send it to the group after each race. Rank, player name, total points, and races played are all visible at a glance.
          </div>
        </div>
      </div>

      <div className="dir-section">
        <div className="dir-section-title">Player Picks</div>
        <div className="dir-card">
          <div className="dir-card-body">
            Use this tab when a player forgets to submit their picks before a race starts. Select the player and the race, enter their three picks, and save. You can also use this to correct a pick entered in error. If picks already exist for that player and race, a warning will appear before you overwrite them. Picks entered here are treated identically to player-submitted picks for scoring purposes.
          </div>
        </div>
      </div>

      <div className="dir-section">
        <div className="dir-section-title">Settings</div>
        <div className="dir-card">
          <div className="dir-card-body">
            Manage the league roster and commissioner password. You can add players up to the 15-player maximum. Removing a player will hide them from the standings and pick screens — their historical data is preserved in the database but will not display. The password change takes effect immediately on all devices.
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionerSettings({ config, onSaveConfig }) {
  const [players, setPlayers] = useState([...(config.players || PLAYERS)]);
  const [newPlayer, setNewPlayer] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaved, setPwSaved] = useState(false);
  const [rosterSaved, setRosterSaved] = useState(false);
  const [pwErr, setPwErr] = useState("");

  const handleAddPlayer = () => {
    const name = newPlayer.trim();
    if (!name) return;
    if (players.length >= 15) return;
    if (players.map(p => p.toLowerCase()).includes(name.toLowerCase())) return;
    setPlayers(prev => [...prev, name]);
    setNewPlayer("");
  };

  const handleRemovePlayer = (name) => {
    setPlayers(prev => prev.filter(p => p !== name));
  };

  const handleSaveRoster = () => {
    onSaveConfig({ ...config, players });
    setRosterSaved(true);
    setTimeout(() => setRosterSaved(false), 3000);
  };

  const handleSavePassword = () => {
    setPwErr("");
    if (!newPw) { setPwErr("Enter a new password."); return; }
    if (newPw !== confirmPw) { setPwErr("Passwords do not match."); return; }
    if (newPw.length < 6) { setPwErr("Password must be at least 6 characters."); return; }
    onSaveConfig({ ...config, password: newPw });
    setPwSaved(true);
    setNewPw("");
    setConfirmPw("");
    setTimeout(() => setPwSaved(false), 3000);
  };

  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:24}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,letterSpacing:"0.08em",color:"#fff",textTransform:"uppercase"}}>Settings</span>
      </div>

      <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:24,marginBottom:20}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:"0.18em",color:"#999",textTransform:"uppercase",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span>Player Roster</span>
          <span style={{color: players.length >= 15 ? "#e10600" : "#555"}}>{players.length} / 15</span>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {players.map(p => (
            <div key={p} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"#141414",border:"1px solid #1e1e1e",borderRadius:6,padding:"9px 14px"}}>
              <span style={{fontSize:14,color:"#ddd"}}>{p}</span>
              <button
                onClick={() => handleRemovePlayer(p)}
                style={{background:"none",border:"1px solid #2a0a0a",color:"#883333",borderRadius:4,padding:"3px 10px",fontSize:12,fontFamily:"'Barlow Condensed',sans-serif",letterSpacing:"0.08em",transition:"all 0.15s"}}
                onMouseOver={e => { e.target.style.borderColor="#e10600"; e.target.style.color="#ff4444"; }}
                onMouseOut={e => { e.target.style.borderColor="#2a0a0a"; e.target.style.color="#883333"; }}
              >Remove</button>
            </div>
          ))}
        </div>

        {players.length < 15 && (
          <div style={{display:"flex",gap:8,marginBottom:16}}>
            <input
              className="input-field"
              style={{marginBottom:0,flex:1}}
              placeholder="New player name..."
              value={newPlayer}
              onChange={e => setNewPlayer(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddPlayer()}
            />
            <button
              className="save-btn"
              style={{padding:"12px 20px",whiteSpace:"nowrap"}}
              onClick={handleAddPlayer}
              disabled={!newPlayer.trim()}
            >Add Player</button>
          </div>
        )}
        {players.length >= 15 && (
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:"#e10600",letterSpacing:"0.05em",marginBottom:16}}>
            Maximum of 15 players reached.
          </div>
        )}

        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button className="save-btn" onClick={handleSaveRoster}>Save Roster</button>
          {rosterSaved && <span className="save-confirm">✓ Roster saved!</span>}
        </div>
      </div>

      <div style={{background:"#0d0d0d",border:"1px solid #1a1a1a",borderRadius:10,padding:24}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:"0.18em",color:"#999",textTransform:"uppercase",marginBottom:16}}>
          Change Commissioner Password
        </div>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.12em",color:"#555",marginBottom:4}}>Current password: <span style={{color:"#777"}}>{config.password}</span></div>
        <div style={{marginTop:14}}>
          <input
            type="password"
            className="input-field"
            placeholder="New password (min 6 characters)"
            value={newPw}
            onChange={e => { setNewPw(e.target.value); setPwErr(""); }}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Confirm new password"
            value={confirmPw}
            onChange={e => { setConfirmPw(e.target.value); setPwErr(""); }}
          />
          {pwErr && <div className="input-error">{pwErr}</div>}
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button className="save-btn" onClick={handleSavePassword}>Update Password</button>
            {pwSaved && <span className="save-confirm">✓ Password updated!</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommissionerStandings({ standings, allResults }) {
  const completedCount = Object.keys(allResults).length;
  const maxPts = standings[0]?.total || 1;

  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:14}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,letterSpacing:"0.08em",color:"#fff",textTransform:"uppercase"}}>Season Standings</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase"}}>{completedCount} of 22 races complete</span>
      </div>
      <div style={{background:"#0a0a0a",border:"1px solid #1a1a1a",borderRadius:10,padding:"14px 20px"}}>
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,letterSpacing:"0.2em",color:"#444",textTransform:"uppercase",display:"grid",gridTemplateColumns:"36px 1fr 70px 70px",gap:8,paddingBottom:8,borderBottom:"1px solid #111",marginBottom:2}}>
          <span>Rank</span><span>Player</span><span style={{textAlign:"right"}}>Points</span><span style={{textAlign:"right"}}>Races</span>
        </div>
        {standings.map((entry, i) => {
          const rank = i + 1;
          const racesPlayed = Object.keys(entry.raceTotals).length;
          const rankColor = rank===1?"#FFD700":rank===2?"#C0C0C0":rank===3?"#CD7F32":"#444";
          return (
            <div key={entry.player} style={{display:"grid",gridTemplateColumns:"36px 1fr 70px 70px",gap:8,alignItems:"center",padding:"6px 0",borderBottom:"1px solid #0d0d0d"}}>
              <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:rankColor,lineHeight:1}}>{rank}</span>
              <div style={{fontSize:14,fontWeight:500,color:"#ddd",lineHeight:1.2}}>{entry.player}</div>
              <div style={{textAlign:"right",fontFamily:"'Bebas Neue',sans-serif",fontSize:20,color:"#fff",lineHeight:1}}>{entry.total}</div>
              <div style={{textAlign:"right",fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,color:"#555"}}>{racesPlayed}r</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommissionerPicks({ allPicks, onSavePick, players }) {
  const roster = players || PLAYERS;
  const [selectedPlayer, setSelectedPlayer] = useState(roster[0]);
  const [selectedRace, setSelectedRace] = useState(1);
  const [form, setForm] = useState({ p10: "", dnf1: "", constructor: "" });
  const [saved, setSaved] = useState(false);

  const existingPick = allPicks[selectedPlayer]?.[selectedRace];

  useEffect(() => {
    const existing = allPicks[selectedPlayer]?.[selectedRace] || {};
    setForm({ p10: existing.p10 || "", dnf1: existing.dnf1 || "", constructor: existing.constructor || "" });
    setSaved(false);
  }, [selectedPlayer, selectedRace]);

  const handleSave = () => {
    if (!form.p10 || !form.dnf1 || !form.constructor) return;
    onSavePick(selectedPlayer, selectedRace, form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const race = RACES.find(r => r.id === selectedRace);

  return (
    <div>
      <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:20}}>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:20,fontWeight:700,letterSpacing:"0.08em",color:"#fff",textTransform:"uppercase"}}>Player Picks</span>
        <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:"#666",letterSpacing:"0.1em",textTransform:"uppercase"}}>Override or enter any player's picks</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:20}}>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.18em",color:"#888",textTransform:"uppercase",marginBottom:6}}>Player</div>
          <select
            className="form-select"
            value={selectedPlayer}
            onChange={e => setSelectedPlayer(e.target.value)}
          >
            {roster.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.18em",color:"#888",textTransform:"uppercase",marginBottom:6}}>Race</div>
          <select
            className="form-select"
            value={selectedRace}
            onChange={e => setSelectedRace(Number(e.target.value))}
          >
            {RACES.map(r => <option key={r.id} value={r.id}>{r.flag} R{r.id} · {r.name}</option>)}
          </select>
        </div>
      </div>

      <div className="pick-form">
        <div style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:12,letterSpacing:"0.2em",color:"#e10600",textTransform:"uppercase",marginBottom:4}}>
          {existingPick ? "Override Existing Pick" : "Enter Pick"}
        </div>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,color:"#fff",marginBottom:16}}>
          {selectedPlayer} · {race?.flag} {race?.name} · R{race?.id}
        </div>

        {existingPick && (
          <div style={{background:"#111",border:"1px solid #2a1800",borderRadius:6,padding:"10px 14px",marginBottom:16,fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,color:"#cc8800",letterSpacing:"0.04em"}}>
            ⚠ This player already has picks for this race. Saving will overwrite them.
          </div>
        )}

        <div className="form-row">
          <label className="form-label">P10 Driver <span>*</span></label>
          <select className="form-select" value={form.p10} onChange={e => setForm(f => ({...f, p10: e.target.value}))}>
            <option value="">Select a driver...</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">DNF1 Driver <span>*</span></label>
          <select className="form-select" value={form.dnf1} onChange={e => setForm(f => ({...f, dnf1: e.target.value}))}>
            <option value="">Select a driver...</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="form-label">Top Constructor <span>*</span></label>
          <select className="form-select" value={form.constructor} onChange={e => setForm(f => ({...f, constructor: e.target.value}))}>
            <option value="">Select a constructor...</option>
            {CONSTRUCTORS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-save-row">
          <button className="save-btn" onClick={handleSave} disabled={!form.p10 || !form.dnf1 || !form.constructor}>
            {existingPick ? "Overwrite Picks" : "Save Picks"}
          </button>
          {saved && <span className="save-confirm">✓ Picks saved for {selectedPlayer}!</span>}
        </div>
      </div>
    </div>
  );
}

function AdminPanel({ allResults, onSaveResults, standings, allPicks, onSavePick, config, onSaveConfig, onHelp }) {
  const [adminTab, setAdminTab] = useState("results");
  const [selectedRace, setSelectedRace] = useState(1);
  const [order, setOrder] = useState([...DRIVERS]);
  const [dnf1, setDnf1] = useState("");
  const [saved, setSaved] = useState(false);

  const conOrder = calcConstructorOrder(order);

  useEffect(() => {
    const existing = allResults[selectedRace];
    if (existing) {
      setOrder(existing.finishing_order);
      setDnf1(existing.dnf1 || "");
    } else {
      setOrder([...DRIVERS]);
      setDnf1("");
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

  const handleSave = () => {
    onSaveResults(selectedRace, { finishing_order: order, dnf1, constructor_order: conOrder });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const race = RACES.find(r => r.id === selectedRace);
  const teamPts = {};
  CONSTRUCTORS.forEach(c => { teamPts[c] = 0; });
  order.forEach((driver, i) => {
    const team = DRIVER_CONSTRUCTOR[driver];
    if (team) teamPts[team] += F1_PTS[i] ?? 0;
  });

  return (
    <div>
      <div className="sh">
        <span className="sh-title">Commissioner</span>
      </div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <nav className="tabs" style={{marginBottom:0,borderBottom:"none"}}>
          <button className={`tab ${adminTab==="results"?"active":""}`} onClick={() => setAdminTab("results")}>Enter Results</button>
          <button className={`tab ${adminTab==="standings"?"active":""}`} onClick={() => setAdminTab("standings")}>Season Standings</button>
          <button className={`tab ${adminTab==="picks"?"active":""}`} onClick={() => setAdminTab("picks")}>Player Picks</button>
          <button className={`tab ${adminTab==="settings"?"active":""}`} onClick={() => setAdminTab("settings")}>Settings</button>
        </nav>
        <button
          onClick={onHelp}
          style={{background:"none",border:"1px solid #222",color:"#888",borderRadius:6,padding:"6px 16px",fontFamily:"'Barlow Condensed',sans-serif",fontSize:13,letterSpacing:"0.12em",textTransform:"uppercase",whiteSpace:"nowrap",transition:"all 0.15s",flexShrink:0}}
          onMouseOver={e => { e.target.style.borderColor="#555"; e.target.style.color="#fff"; }}
          onMouseOut={e => { e.target.style.borderColor="#222"; e.target.style.color="#888"; }}
        >? Help</button>
      </div>
      <div style={{borderBottom:"1px solid #111",marginBottom:28}} />

      {adminTab === "standings" && <CommissionerStandings standings={standings} allResults={allResults} />}

      {adminTab === "picks" && <CommissionerPicks allPicks={allPicks} onSavePick={onSavePick} players={config?.players} />}
      {adminTab === "settings" && <CommissionerSettings config={config} onSaveConfig={onSaveConfig} />}

      {adminTab === "results" && (
      <div className="admin-grid">
        <div className="admin-race-list">
          {RACES.map(r => (
            <div
              key={r.id}
              className={`admin-race-item ${selectedRace===r.id&&!r.cancelled?"active":""}`}
              onClick={() => { if (!r.cancelled) setSelectedRace(r.id); }}
              style={r.cancelled ? {opacity:0.4, cursor:"default"} : {}}
            >
              <div style={{display:"flex",alignItems:"center"}}>
                <span className="ari-num">{r.id}</span>
                <span className="ari-name">{r.flag} {r.name}</span>
              </div>
              {r.cancelled
                ? <span style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:10,color:"#cc2200",letterSpacing:"0.1em"}}>CANCELLED</span>
                : allResults[r.id] && <span className="ari-done"/>
              }
            </div>
          ))}
        </div>
        <div className="admin-form">
          <div className="admin-form-title">{race?.flag} {race?.name}</div>
          <div className="admin-form-sub">Round {race?.id} · {race?.date} — set driver order, constructor ranking auto-calculates</div>

          <div className="admin-section-title">
            Finishing Order (P1 → P22)
            <span className="reset-link" onClick={() => setOrder([...DRIVERS])}>Reset</span>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
            {order.map((driver, i) => {
              const available = DRIVERS.filter(d => d === driver || !order.slice(0, order.length).filter((_, idx) => idx !== i).includes(d));
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:8,background:"#141414",border:"1px solid #1a1a1a",borderRadius:5,padding:"6px 10px"}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:"#ccc",fontWeight:600,width:24,flexShrink:0}}>{i+1}</span>
                  <select
                    value={driver}
                    onChange={e => {
                      const newDriver = e.target.value;
                      if (!newDriver) return;
                      const newOrder = [...order];
                      const swapIdx = newOrder.indexOf(newDriver);
                      if (swapIdx !== -1) newOrder[swapIdx] = newOrder[i];
                      newOrder[i] = newDriver;
                      setOrder(newOrder);
                    }}
                    style={{flex:1,background:"transparent",border:"none",color:"#ccc",fontSize:13,fontFamily:"'Barlow',sans-serif",outline:"none",cursor:"pointer"}}
                  >
                    {DRIVERS.map(d => (
                      <option key={d} value={d} style={{background:"#1a1a1a"}}>{d}</option>
                    ))}
                  </select>
                  <span style={{fontSize:11,color:"#444",fontFamily:"'Barlow Condensed',sans-serif",flexShrink:0}}>{DRIVER_CONSTRUCTOR[driver]?.slice(0,4)}</span>
                </div>
              );
            })}
          </div>
          <div className="admin-section-title">First DNF (DNF1)</div>
          <select className="form-select" style={{marginBottom:20}} value={dnf1} onChange={e => setDnf1(e.target.value)}>
            <option value="">None / No DNF</option>
            {DRIVERS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <div className="admin-section-title">Constructor Order — Auto-calculated ✓</div>
          <div className="con-preview">
            {conOrder.map((team, i) => (
              <div key={team} className="con-preview-row">
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,color:"#ccc",fontWeight:600,width:24}}>{i+1}</span>
                  <ConBadge team={team}/>
                </div>
                <span className="con-preview-pts">{teamPts[team]}pts</span>
              </div>
            ))}
          </div>
          <div className="con-preview-note">Ranked by F1 constructor points · ties broken by highest finishing driver</div>

          <div className="admin-save-row">
            <button className="save-btn" onClick={handleSave}>Save Results</button>
            {saved && <span className="save-confirm">✓ Results published to all players!</span>}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

function Home({ onPlayer, onAdmin, onDirections, config }) {
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [adminPw, setAdminPw] = useState("");
  const [adminErr, setAdminErr] = useState(false);

  const handlePlayerGo = () => { if (selectedPlayer) onPlayer(selectedPlayer); };
  const handleAdminGo = () => {
    const pw = config?.password || ADMIN_PASSWORD;
    if (adminPw === pw) { onAdmin(); setAdminErr(false); }
    else setAdminErr(true);
  };

  return (
    <div className="home">
      <div className="home-grid" />
      <div className="home-glow" />
      <div className="home-season">2026 Formula One Season</div>
      <div className="home-title">
        P10 · DNF1
        <span className="red">Constructors</span>
        <span className="challenge">Challenge</span>
      </div>
      <div className="home-sub">15 Players · 22 Races · 3 Picks Per Race</div>
      <div className="home-cards">
        <div className="home-card" onClick={() => setShowPlayerModal(true)}>
          <div className="home-card-icon">🏎️</div>
          <div className="home-card-title">I'm a Player</div>
          <div className="home-card-desc">Submit your picks, track your score, and see the leaderboard.</div>
        </div>
        <div className="home-card" onClick={() => setShowAdminModal(true)}>
          <div className="home-card-icon">⚙️</div>
          <div className="home-card-title">Commissioner</div>
          <div className="home-card-desc">Enter race results, manage player picks, view standings, and configure league settings.</div>
        </div>
      </div>
      <button className="home-how-btn" onClick={onDirections}>📋 How to Play</button>

      {showPlayerModal && (
        <div className="modal-bg" onClick={() => setShowPlayerModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Who Are You?</div>
            <div className="modal-sub">Select your name from the list</div>
            <div className="player-list">
              {(config?.players || PLAYERS).map(p => (
                <button key={p} className={`player-btn ${selectedPlayer===p?"selected":""}`} onClick={() => setSelectedPlayer(p)}>{p}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={handlePlayerGo} disabled={!selectedPlayer}>Enter as {selectedPlayer || "..."}</button>
            <button className="modal-close" onClick={() => setShowPlayerModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {showAdminModal && (
        <div className="modal-bg" onClick={() => setShowAdminModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Commissioner Login</div>
            <div className="modal-sub">Enter the commissioner password</div>
            <input type="password" className="input-field" placeholder="Password" value={adminPw}
              onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }}
              onKeyDown={e => e.key === "Enter" && handleAdminGo()} autoFocus />
            {adminErr && <div className="input-error">Incorrect password.</div>}
            <button className="btn-primary" onClick={handleAdminGo}>Enter Commissioner</button>
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
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [playerTab, setPlayerTab] = useState("picks");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let picksLoaded = false;
    let resultsLoaded = false;
    let configLoaded = false;
    const checkDone = () => { if (picksLoaded && resultsLoaded && configLoaded) setLoading(false); };
    const unsubPicks = onSnapshot(doc(db, "data", "picks"), snap => {
      if (snap.exists()) setAllPicks(snap.data());
      else fbSavePicks(SEED_PICKS);
      picksLoaded = true; checkDone();
    });
    const unsubResults = onSnapshot(doc(db, "data", "results"), snap => {
      if (snap.exists()) {
        const raw = snap.data();
        const parsed = {};
        Object.entries(raw).forEach(([k, v]) => { parsed[Number(k.replace("r",""))] = v; });
        setAllResults(parsed);
      } else { fbSaveResults(SEED_RESULTS); }
      resultsLoaded = true; checkDone();
    });
    const unsubConfig = onSnapshot(doc(db, "data", "config"), snap => {
      if (snap.exists()) setConfig(snap.data());
      else fbSaveConfig(DEFAULT_CONFIG);
      configLoaded = true; checkDone();
    });
    return () => { unsubPicks(); unsubResults(); unsubConfig(); };
  }, []);

  const handleSavePick = useCallback((player, raceId, pick) => {
    setAllPicks(prev => {
      const updated = { ...prev, [player]: { ...(prev[player]||{}), [raceId]: pick } };
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

  const handleSaveConfig = useCallback((newConfig) => {
    setConfig(newConfig);
    fbSaveConfig(newConfig);
  }, []);

  const standings = computeStandings(allPicks, allResults, config.players);

  if (loading) return (
    <><style>{CSS}</style>
      <div className="loading">
        <div style={{fontSize:48}}>🏎️</div>
        <div className="loading-text">LOADING SEASON DATA...</div>
      </div>
    </>
  );

  if (screen === "directions") return (
    <><style>{CSS}</style><Directions onBack={() => setScreen("home")} /></>
  );

  if (screen === "commguide") return (
    <><style>{CSS}</style><CommissionerGuide onBack={() => setScreen("admin")} /></>
  );

  if (screen === "home") return (
    <><style>{CSS}</style>
      <Home
        onPlayer={name => { setCurrentPlayer(name); setScreen("player"); setPlayerTab("picks"); }}
        onAdmin={() => setScreen("admin")}
        onDirections={() => setScreen("directions")}
        config={config}
      />
    </>
  );

  if (screen === "admin") return (
    <><style>{CSS}</style>
      <div className="shell">
        <div className="topbar">
          <div className="topbar-logo">P10 · DNF1 · <span>CONSTRUCTORS</span></div>
          <div className="topbar-user">
            <span className="topbar-name">Commissioner Mode</span>
            <button className="logout-btn" onClick={() => setScreen("home")}>← Exit</button>
          </div>
        </div>
        <div className="content">
          <AdminPanel
            allResults={allResults}
            onSaveResults={handleSaveResults}
            standings={standings}
            allPicks={allPicks}
            onSavePick={handleSavePick}
            config={config}
            onSaveConfig={handleSaveConfig}
            onHelp={() => setScreen("commguide")}
          />
        </div>
      </div>
    </>
  );

  const tabs = [
    { id:"picks",     label:"My Picks"  },
    { id:"prerace",   label:"Pre-Race"  },
    { id:"standings", label:"Standings" },
    { id:"results",   label:"Results"   },
  ];

  return (
    <><style>{CSS}</style>
      <div className="shell">
        <div className="topbar">
          <div className="topbar-logo">P10 · DNF1 · <span>CONSTRUCTORS</span></div>
          <div className="topbar-user">
            <span className="topbar-name">Playing as <strong>{currentPlayer}</strong></span>
            <button className="logout-btn" onClick={() => { setScreen("home"); setCurrentPlayer(null); }}>Switch</button>
          </div>
        </div>
        <div className="content">
          <nav className="tabs">
            {tabs.map(t => (
              <button key={t.id} className={`tab ${playerTab===t.id?"active":""}`} onClick={() => setPlayerTab(t.id)}>{t.label}</button>
            ))}
          </nav>
          {playerTab==="picks"     && <MyPicks player={currentPlayer} allPicks={allPicks} allResults={allResults} onSave={handleSavePick}/>}
          {playerTab==="prerace"   && <PreRacePicks allPicks={allPicks} allResults={allResults} currentPlayer={currentPlayer} players={config.players}/>}
          {playerTab==="standings" && <Leaderboard standings={standings} allResults={allResults} currentPlayer={currentPlayer}/>}
          {playerTab==="results"   && <RaceResultsView allPicks={allPicks} allResults={allResults} currentPlayer={currentPlayer} standings={standings}/>}
        </div>
      </div>
    </>
  );
}
