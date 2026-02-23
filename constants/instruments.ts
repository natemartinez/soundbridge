export const INSTRUMENTS = [
  { key: 'vocals', label: 'Vocals' },
  { key: 'guitar', label: 'Guitar' },
  { key: 'bass', label: 'Bass' },
  { key: 'drums', label: 'Drums' },
  { key: 'keys', label: 'Keys / Piano' },
  { key: 'audio_tech', label: 'Audio Tech' },
  { key: 'other', label: 'Other' },
] as const;

export type InstrumentKey = (typeof INSTRUMENTS)[number]['key'];
