import { useState, useEffect, useRef, useCallback } from "react";

const WAVE_LOADERS = [
  () => import("./waves/wave1.json"),
  () => import("./waves/wave2.json"),
  () => import("./waves/wave3.json"),
  () => import("./waves/wave4.json"),
  () => import("./waves/wave5.json"),
];

const CHINESE = [
  "小時候，我父親經常會教誨我：你作為華裔，必須要學好漢字。三千五百個漢字，一個也不能忘。他給我購買了一沓語文課本和網盤，然後每天晚上他會執着的監督我默寫幾十個漢字，寫不出來我就不能喫晚飯。我以前並沒有對漢字有多少興趣。我哭過，偷懶過，惡作劇過，我們兩人以前也為此吵過架，也對彼此發過很多場脾氣。",
  "長大以後我才意識到他給我積累的財富：三千五百顆漢字，銘記於心，不少說提筆會寫我也還是都認識的。這是我積累的文化財富，也是我保留著的對漢字興趣的基礎。我很慶幸。我很喜歡漢字的結構，彎折撇捺裏面蘊含的靈氣。現在我看以前的本子也會有收穫，可以回憶到自己十幾歲時的掙扎。",
  "我一開始專門編出這個網上小程序的原因是想要實驗疊字的性質。在漢字裡，形與意是相觀的，那假如觀眾看不懂中文的話，他們是否還能領悟到其意呢？又亦是可以理解的更深一些？所以你所看到的之前的那些字格都是同様相連的。而這些思緒又啓發了我對漢字簡化的興趣。",
  "我想理解我們如何識別這些字；但是現在我覺得最有意思的還是這些字本身的形體和其演繹。在由繁化簡的過程中， 哪些關係被留存，哪些關係被變換乃至消滅，這些都是我很感興趣的話題。我兒時學習的是簡體中文，我也已經忘了是怎樣學會讀繁體的。現在我寫不出繁體字，但至少我讀的流利。",
  "這個網站是最後一場展示。我從維基百科上的網頁借來了簡化字推行的時間段，然後用千問換成了json。隨着每一段新的段落，我也把一批對應的漢字換算成了簡體。在創作的時候，我學習到了很多以前沒有考慮到的細節，也樂在其中。願你也同樣學到了些東西，回想起來也覺的漢字的演繹像歌曲一樣美麗，燦爛。",
];

const ENGLISH = [
  "When I was younger, my dad would tell me that I must learn to write Chinese well. 'There are 3500 base characters, you can't forget any of them.' He bought some textbooks and online resources for me, and if I don't write them I cannot eat dinner. We fought a lot.",
  "It was only once I grew up that I realised how meaningful this was: memorising the 3500 characters became a cultural wealth for me, and preserved my interest in the Chinese language. I'm glad this happened; I love the structure of Chinese, how the strokes and bends contain so much meaning and life. There's a lot of nostalgia when I review my old workbooks now, and there's always a lot to gain.",
  "My initial purpose for making this little web page was to examine the art of reduplication. In chinese characters, reduplication is at the character scale, so I wondered whether people could interpret and understand the patterns between reduplicative structure. So the characters you have seen in the previous grids are all connected, and this connection also catalysed an interest in something else: the relationship between simplified and traditional Chinese.",
  "I wanted to understand how we identify and find patterns in the characters, but for simplified and traditional I wanted to understand what relationships were preserved in the context of Chinese, and I wanted to learn more about traditional and simplified chinese. I don't remember when I learned traditional Chinese, but despite its complexity reading it feels (mostly) like second nature to me.",
  "This page is the last demonstration. I pulled the series of text from Wikipedia, and then used the open-source Qwen3.5 model to convert the texts into jsons. You'll notice that characters are changing: their transitions roughly correspond to the order in which they were introduced to be simplified. This was a really fun project, and I found a lot of interest and joy through making this project. I hope you also learned something about the structure of this language, and find it as beautiful as I do.",
];

const PHASE_MS = 3000;
const MAX_STEP = 9; // Chinese[0] pre-shown; then 9 presses for remaining 4 Chinese + 5 English

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export default function TextEvolutionPage({ onBack }) {
  const [step, setStep] = useState(0);
  const charsRef = useRef(CHINESE.map(p => p.split("")));
  const [chars, setChars] = useState(() => CHINESE.map(p => p.split("")));
  const simplifiedRef = useRef(CHINESE.map(p => new Array(p.split("").length).fill(false)));
  const wavesRef = useRef([]);
  const [ready, setReady] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    Promise.all(WAVE_LOADERS.map(fn => fn().then(m => m.default))).then(loaded => {
      wavesRef.current = loaded;
      setReady(true);
    });
  }, []);

  const triggerWave = useCallback((waveIndex, numParagraphs) => {
    const dict = wavesRef.current[waveIndex];
    if (!dict) return;

    // Collect all positions eligible to flip in this wave across all visible Chinese paragraphs
    const targets = [];
    for (let p = 0; p < numParagraphs; p++) {
      for (let c = 0; c < charsRef.current[p].length; c++) {
        if (!simplifiedRef.current[p][c] && dict[charsRef.current[p][c]]) {
          targets.push([p, c]);
        }
      }
    }
    if (targets.length === 0) return;

    shuffle(targets);

    const interval = PHASE_MS / targets.length;
    let placed = 0;

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (placed >= targets.length) {
        clearInterval(timerRef.current);
        return;
      }
      const [p, c] = targets[placed];
      const simplified = dict[charsRef.current[p][c]];
      if (simplified && !simplifiedRef.current[p][c]) {
        simplifiedRef.current[p][c] = true;
        charsRef.current[p][c] = simplified;
        setChars(prev => {
          const next = prev.map(row => [...row]);
          next[p][c] = simplified;
          return next;
        });
      }
      placed++;
    }, interval);
  }, []);

  const advance = useCallback(() => {
    if (!ready) return;
    setStep(prev => {
      if (prev >= MAX_STEP) return prev;
      const next = prev + 1;
      // Odd steps trigger a wave: step 1 → wave 0, step 3 → wave 1, etc.
      if (next % 2 === 1) {
        const waveIndex = (next - 1) / 2;
        const numParagraphs = waveIndex + 1;
        triggerWave(waveIndex, numParagraphs);
      }
      return next;
    });
  }, [ready, triggerWave]);

  useEffect(() => {
    const handler = (e) => {
      if (e.code === "Space") { e.preventDefault(); advance(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [advance]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Build paragraph list based on current step
  // Chinese para i visible at step >= 2*i (i=0 means always visible)
  // English para i visible at step >= 2*i + 1
  const paragraphs = [];
  for (let i = 0; i < 5; i++) {
    if (step >= 2 * i) {
      paragraphs.push(
        <p key={`zh-${i}`} className="evolution-chinese">
          {chars[i].join("")}
        </p>
      );
    }
    if (step >= 2 * i + 1) {
      paragraphs.push(
        <p key={`en-${i}`} className="evolution-english">
          {ENGLISH[i]}
        </p>
      );
    }
  }

  return (
    <div className="page-evolution">
      <button className="btn-back" onClick={onBack}>← Back</button>
      <div className="evolution-content">
        {paragraphs}
      </div>
      {step < MAX_STEP && (
        <button className="btn-advance" onClick={advance}>→</button>
      )}
    </div>
  );
}
