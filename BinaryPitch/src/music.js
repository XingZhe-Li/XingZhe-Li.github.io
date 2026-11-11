export const PITCH_CLASSES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const isBlack = note => [1, 3, 6, 8, 10].includes(note % 12);
export const noteName = note => `${PITCH_CLASSES[note % 12]}${Math.floor(note / 12) - 1}`;
export const frequency = note => 440 * 2 ** ((note - 69) / 12);
export const soundToken = notes => [...new Set(notes)].sort((a, b) => a - b).join(',');
export const rangeNotes = ({low, high}) => Array.from({length: high - low + 1}, (_, i) => low + i);
