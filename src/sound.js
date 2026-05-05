// Plays Mandarin pronunciation for a single character.
// Tries a local file first (drop your own recordings into public/sounds/{char}.mp3),
// then falls back to Wikimedia Commons (Zh-{char}.ogg via Special:FilePath redirect).

const cache = new Map(); // char -> Audio | null (null = both sources failed)

const wikimediaUrl = (char) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/Zh-${encodeURIComponent(char)}.ogg`;

const localUrl = (char) => `/sounds/${encodeURIComponent(char)}.mp3`;

function playAudio(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function playCharSound(char) {
  if (cache.has(char)) {
    const audio = cache.get(char);
    if (audio) playAudio(audio);
    return;
  }

  const local = new Audio(localUrl(char));
  local.play()
    .then(() => cache.set(char, local))
    .catch(() => {
      const remote = new Audio(wikimediaUrl(char));
      remote.play()
        .then(() => cache.set(char, remote))
        .catch(() => cache.set(char, null));
    });
}
