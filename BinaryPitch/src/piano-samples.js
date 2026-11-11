// Salamander recordings are separately licensed from the application code.
// Original files, attribution, license and SHA-256 inventory: ../assets/salamander/.
export const PIANO_SOURCE_COMMIT = 'efd8296360f9526e379bfbe5c1698ff54d6a1d34';

export const PIANO_SAMPLES = Object.freeze(Array.from({ length: 30 }, (_, index) => {
  const midi = 21 + index * 3;
  const pitch = { 0: 'C', 3: 'Ds', 6: 'Fs', 9: 'A' }[midi % 12];
  const name = `${pitch}${Math.floor(midi / 12) - 1}`;
  return Object.freeze({ midi, url: new URL(`../assets/salamander/${name}.mp3`, import.meta.url).href });
}));

export const SAMPLE_CREDITS = Object.freeze({
  title: 'Salamander Grand Piano (Yamaha C5)',
  author: 'Alexander Holm',
  sourceUrl: `https://github.com/Tonejs/audio/tree/${PIANO_SOURCE_COMMIT}/salamander`,
  license: 'CC BY 3.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/3.0/',
});
