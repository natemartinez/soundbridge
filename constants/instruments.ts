export const INSTRUMENTS = [
  { key: 'vocals',     label: 'Vocals',       icon: 'microphone-variant', lib: 'mci' },
  { key: 'guitar',     label: 'Guitar',        icon: 'guitar',             lib: 'fa6' },
  { key: 'bass',       label: 'Bass',          icon: 'guitar-electric',    lib: 'mci' },
  { key: 'drums',      label: 'Drums',         icon: 'drum',              lib: 'fa6' },
  { key: 'keys',       label: 'Keys / Piano',  icon: 'piano',             lib: 'mci' },
  { key: 'audio_tech', label: 'Audio Tech',    icon: 'sliders',           lib: 'fa6' },
  { key: 'other',      label: 'Other',         icon: 'music-note',        lib: 'mci' },
] as const;

export type InstrumentKey = (typeof INSTRUMENTS)[number]['key'];
