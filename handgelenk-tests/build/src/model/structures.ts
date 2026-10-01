export const STRUCTURE_IDS = [
  'tfcc', 'druj', 'ecu', 'ulnocarpal', 'sl', 'lt', 'volar', 'dorsal', 'midcarpal', 'flexors', 'extensors', 'fcu',
] as const;
export type StructureId = (typeof STRUCTURE_IDS)[number];

export type ViewId = 'dorsal' | 'thumb' | 'palm' | 'ulnar' | 'end';

// Camera preset that shows each structure best (used when a row in the list is tapped).
export const STRUCTURE_VIEW: Record<StructureId, ViewId> = {
  tfcc: 'dorsal', druj: 'end', ecu: 'dorsal', ulnocarpal: 'palm', sl: 'dorsal', lt: 'dorsal',
  volar: 'palm', dorsal: 'dorsal', midcarpal: 'palm', flexors: 'palm', extensors: 'dorsal', fcu: 'palm',
};
