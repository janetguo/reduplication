import { useState, useEffect, useRef } from "react";

const WAVE_FILES = [
  () => import("./waves/wave1.json"),
  () => import("./waves/wave2.json"),
  () => import("./waves/wave3.json"),
  () => import("./waves/wave4.json"),
  () => import("./waves/wave5.json"),
];

const PHASE_MS = 3000;

export default function TextEvolution({ set }) {
  const [chars, setChars] = useState(() => set.text.split(""));
  const [ready, setReady] = useState(false);
  const wavesRef = useRef([]);
  const timer = useRef(null);

  // Load all wave JSONs once on mount
  useEffect(() => {
    Promise.all(WAVE_FILES.map(fn => fn().then(m => m.default))).then(loaded => {
      wavesRef.current = loaded;
      setReady(true);
    });
  }, []);

  // Run waves once dictionaries are loaded
  useEffect(() => {
    if (!ready) return;

    let cancelled = false;
    const text = set.text.split("");

    const runWave = (waveIndex) => {
      if (cancelled || waveIndex >= wavesRef.current.length) return;

      const dict = wavesRef.current[waveIndex];

      // Find positions in the text that this wave simplifies
      const targets = text
        .map((ch, i) => (dict[ch] ? i : null))
        .filter(i => i !== null);

      if (targets.length === 0) {
        runWave(waveIndex + 1);
        return;
      }

      // Shuffle targets so they flip in random order
      for (let i = targets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [targets[i], targets[j]] = [targets[j], targets[i]];
      }

      const interval = PHASE_MS / targets.length;
      let placed = 0;

      timer.current = setInterval(() => {
        if (cancelled) { clearInterval(timer.current); return; }
        if (placed >= targets.length) {
          clearInterval(timer.current);
          runWave(waveIndex + 1);
          return;
        }
        const idx = targets[placed];
        text[idx] = dict[text[idx]]; // update local copy
        setChars([...text]);
        placed++;
      }, interval);
    };

    runWave(0);
    return () => {
      cancelled = true;
      clearInterval(timer.current);
    };
  }, [ready, set]);

  if (!ready) return null;

  return (
    <div className="text-evolution">
      {chars.map((ch, i) => (
        <span key={i}>{ch}</span>
      ))}
    </div>
  );
}
