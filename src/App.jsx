import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import TextEvolutionPage from "./TextEvolution";
import { playCharSound } from "./sound";

const H = 30, W = 30;
const CLICKS_PER_GUEST = 5;
const WALK_STEPS = 40;
const WALK_INTERVAL_MS = 15;
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

const SETS = [
  {
    title: "EchoOoOOoooes",
    init: "口",
    guests:      ["曰","回","吅","㗊","响","昌","唱"],
    transitions: ["—","口","口","吅","向","曰","口"],
    endCursor: 0x266B,
    english: {
      "口": "mouth",
      "曰": "speak",
      "回": "return",
      "吅": "shout",
      "㗊": "clamor",
      "响": "sound",
      "昌": "prosper",
      "唱": "sing",
    },
    // dict: { cellChar: { cursorChar: resultChar } }
    // when a walker steps on a cell, look up the cell's current char,
    // then the active guest/cursor char, to get the new char (or undefined = no change)
    dict: {
      "口": { "—": "曰", "口": "吅", "向": "响" },
      "曰": { "曰": "昌", "口": "回"},
      "回": {  },
      "吅": { "吅": "㗊" },
      "响": {  },
      "昌": { "口": "唱" },
    },
  },
  {
    title: "See the forest for the trees",
    init: "人",
    guests:      ["木","从","丛","林","森","树"],
    transitions: ["十","人","__","木","木","对"],
    endCursor: 0x2698,
    english: {
      "人": "person",
      "木": "tree",
      "从": "follow",
      "丛": "thicket",
      "林": "grove",
      "森": "forest",
      "树": "tree",
    },
    dict: {
      "人": { "十": "木", "人": "从" },
      "从": { "__": "丛" },
      "木": { "木": "林", "对": "树" },
      "丛": {  },
      "林": { "木": "森" },
      "森": {  },
    },
  },
  {
    title: "Let there be light",
    init: "日",
    guests:      ["月","明","朝","昌","晶","暮"],
    transitions: ["月","日","十","日","日","艹"],
    endCursor: 0x2600,
    english: {
      "日": "sun",
      "月": "moon",
      "明": "bright",
      "朝": "morning",
      "昌": "sunlight",
      "晶": "crystal",
      "暮": "dusk",
    },
    dict: {
      "日": { "月": "月", "月": "明", "日": "昌" },
      "月": { "日": "明" },
      "明": { "十": "朝" },
      "朝": {  },
      "昌": { "艹": "暮", "日":"晶" },
      "晶": {  },
    },
  },
  {
    title: "Let there be light",
    init: "日",
    guests:      ["月","明","朝","昌","晶","暮"],
    transitions: ["月","日","十","日","日","艹"],
    endCursor: 0x2600,
    english: {
      "日": "sun",
      "月": "moon",
      "明": "bright",
      "朝": "morning",
      "昌": "sunlight",
      "晶": "crystal",
      "暮": "dusk",
    },
    dict: {
      "日": { "月": "月", "月": "明", "日": "昌" },
      "月": { "日": "明" },
      "明": { "十": "朝" },
      "朝": {  },
      "昌": { "艹": "暮", "日":"晶" },
      "晶": {  },
    },
  },
];

function Grid({ set, isComplete, onGuestChange }) {
  const [grid, setGrid] = useState(() =>
    Array.from({ length: H }, () => Array(W).fill(set.init))
  );

  // Refs so the game loop closure never goes stale
  const guestIndexRef = useRef(0);
  const clickCountRef = useRef(0);
  const walkersRef = useRef([]); // [{ r, c, guestIndex, stepsLeft }]
  const gridRef = useRef(Array.from({ length: H }, () => Array(W).fill(set.init)));
  const loopRef = useRef(null);
  const preRef = useRef(null);

  const ensureLoop = useCallback(() => {
    if (loopRef.current) return;
    loopRef.current = setInterval(() => {
      if (walkersRef.current.length === 0) {
        clearInterval(loopRef.current);
        loopRef.current = null;
        return;
      }
      const updates = [];
      walkersRef.current = walkersRef.current
        .map(w => {
          const [dr, dc] = DIRS[Math.floor(Math.random() * 4)];
          const r = Math.max(0, Math.min(H - 1, w.r + dr));
          const c = Math.max(0, Math.min(W - 1, w.c + dc));
          const current = gridRef.current[r][c];
          const cursorChar = (set.transitions ?? set.guests)[w.guestIndex];
          const next = set.dict[current]?.[cursorChar];
          if (next !== undefined) {
            updates.push([r, c, next]);
            gridRef.current[r][c] = next;
          }
          return { ...w, r, c, stepsLeft: w.stepsLeft - 1 };
        })
        .filter(w => w.stepsLeft > 0);

      if (updates.length > 0) {
        setGrid(g => {
          const next = g.map(row => [...row]);
          for (const [r, c, ch] of updates) next[r][c] = ch;
          return next;
        });
      }
    }, WALK_INTERVAL_MS);
  }, [set.dict, set.guests]);

  const handleClick = useCallback((e) => {
    const gi = guestIndexRef.current;
    if (gi >= set.guests.length) return;

    const rect = preRef.current.getBoundingClientRect();
    const col = Math.floor(((e.clientX - rect.left) / rect.width) * W);
    const row = Math.floor(((e.clientY - rect.top) / rect.height) * H);
    if (row < 0 || row >= H || col < 0 || col >= W) return;

    const cursorChar = (set.transitions ?? set.guests)[gi];
    const current = gridRef.current[row][col];
    const placed = set.dict[current]?.[cursorChar] ?? current;
    gridRef.current[row][col] = placed;
    setGrid(g => {
      const next = g.map(r => [...r]);
      next[row][col] = placed;
      return next;
    });

    walkersRef.current.push({ r: row, c: col, guestIndex: gi, stepsLeft: WALK_STEPS });
    ensureLoop();

    clickCountRef.current++;
    if (clickCountRef.current >= CLICKS_PER_GUEST) {
      clickCountRef.current = 0;
      const nextGi = gi + 1;
      guestIndexRef.current = nextGi;
      onGuestChange(nextGi);
    }
  }, [set.guests, ensureLoop, onGuestChange]);

  useEffect(() => () => clearInterval(loopRef.current), []);

  return (
    <pre ref={preRef} className={`grid-text${isComplete ? " complete" : ""}`} onClick={handleClick}>
      {grid.map((row, r) => (
        <span key={r}>
          {row.map((ch, c) => (
            <span key={c} className="grid-cell">{ch}</span>
          ))}
          {r < H - 1 ? "\n" : null}
        </span>
      ))}
    </pre>
  );
}

export default function App() {
  const [view, setView] = useState(null);
  const [key, setKey] = useState(0);
  const [aboutView, setAboutView] = useState(false);
  const [aboutUnlocked, setAboutUnlocked] = useState(false);
  const [guestIndex, setGuestIndex] = useState(0);
  const [mousePos, setMousePos] = useState({ x: -200, y: -200 });
  const [clickedEnglish, setClickedEnglish] = useState(null);

  const handleSetView = (i) => {
    setView(i);
    setKey(k => k + 1);
    setGuestIndex(0);
    setClickedEnglish(null);
    setAboutUnlocked(true);
  };

  if (aboutView) {
    return <TextEvolutionPage onBack={() => setAboutView(false)} />;
  }

  if (view !== null) {
    const set = SETS[view];
    const isComplete = guestIndex >= set.guests.length;
    const cursorChar = isComplete && set.endCursor != null
      ? String.fromCodePoint(set.endCursor)
      : (set.transitions ?? set.guests)[Math.min(guestIndex, set.guests.length - 1)];

    const handlePageClick = (e) => {
      if (!isComplete) return;
      const cell = e.target.closest?.(".grid-cell");
      if (cell) {
        const char = cell.textContent;
        playCharSound(char);
        setClickedEnglish(set.english?.[char] ?? null);
      } else {
        setClickedEnglish(null);
      }
    };

    return (
      <div
        className="page-view"
        onMouseMove={e => setMousePos({ x: e.clientX, y: e.clientY })}
        onClick={handlePageClick}
      >
        <button className="btn-back" onClick={() => { setView(null); setClickedEnglish(null); }}>
          ← Back
        </button>
        <h2 className="view-title">{clickedEnglish ?? set.title}</h2>
        <Grid key={key} set={set} isComplete={isComplete} onGuestChange={setGuestIndex} />
        <div className="grid-cursor" style={{ left: mousePos.x, top: mousePos.y }}>
          {cursorChar}
        </div>
      </div>
    );
  }

  return (
    <div className="page-home">
      <div className="set-grid">
        {SETS.map((s, i) => (
          <div
            key={i}
            className="set-item"
            onClick={() => handleSetView(i)}
          >
            {s.title}
          </div>
        ))}
      </div>
      {aboutUnlocked && (
        <button className="btn-about" onClick={() => setAboutView(true)}>关于</button>
      )}
    </div>
  );
}
