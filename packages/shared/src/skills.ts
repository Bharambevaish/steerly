// Driving skills a student progresses through. Level 0 = not started, 3 = confident.
export const SKILLS = [
  { id: 'controls', label: 'Car controls & mirrors' },
  { id: 'steering', label: 'Steering' },
  { id: 'clutch', label: 'Clutch & gears' },
  { id: 'starting_stopping', label: 'Starting & stopping' },
  { id: 'turns', label: 'Turns & signalling' },
  { id: 'traffic', label: 'City traffic' },
  { id: 'reversing', label: 'Reversing' },
  { id: 'parking', label: 'Parking' },
  { id: 'hill', label: 'Hill / slope start' },
  { id: 'highway', label: 'Highway driving' },
  { id: 'night', label: 'Night driving' },
  { id: 'rules', label: 'Road signs & rules' },
] as const;

export type SkillId = (typeof SKILLS)[number]['id'];
export type SkillLevel = 0 | 1 | 2 | 3;

export const SKILL_IDS = SKILLS.map((s) => s.id) as [SkillId, ...SkillId[]];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  0: 'Not started',
  1: 'Learning',
  2: 'Practising',
  3: 'Confident',
};

/** 0–100 overall progress from the skill levels. */
export function skillProgress(skills: Partial<Record<SkillId, SkillLevel>>): number {
  const total = SKILLS.length * 3;
  const sum = SKILLS.reduce((acc, s) => acc + (skills[s.id] ?? 0), 0);
  return Math.round((sum / total) * 100);
}
