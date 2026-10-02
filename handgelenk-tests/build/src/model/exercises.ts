// Strengthening exercises (data in exercises.json). They use the same step format and the same player as the clinical
// tests; `PROGRAMS` is everything the player can run.
import data from './exercises.json';
import { TESTS, type Program } from './tests';

export type Exercise = Program & {
  summary: string; // one line for the list
  goal: string; dose: string; progress: string; stop: string; equipment: string;
};

export const EXERCISES = data.exercises as unknown as Exercise[];
export const EXERCISE_RULES = data._meta.rules;
export const EXERCISE_GROUPS = [...new Set(EXERCISES.map((x) => x.group))];

export const PROGRAMS: Program[] = [...TESTS, ...EXERCISES];
export const findProgram = (id: string | null | undefined): Program | undefined => (id ? PROGRAMS.find((x) => x.id === id) : undefined);
