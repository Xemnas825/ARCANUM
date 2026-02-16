/**
 * Habilidades (skills) de D&D 5e: clave interna, habilidad asociada y nombres ES/EN.
 * Usado para calcular modificadores de la ficha y mapear nombres de trasfondos.
 */
export type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

export interface SkillDefinition {
  key: string;
  ability: AbilityKey;
  nameEs: string;
  nameEn: string;
}

export const SKILLS: SkillDefinition[] = [
  { key: 'acrobatics', ability: 'dexterity', nameEs: 'Acrobacias', nameEn: 'Acrobatics' },
  { key: 'animal-handling', ability: 'wisdom', nameEs: 'Trato con Animales', nameEn: 'Animal Handling' },
  { key: 'arcana', ability: 'intelligence', nameEs: 'Arcano', nameEn: 'Arcana' },
  { key: 'athletics', ability: 'strength', nameEs: 'Atletismo', nameEn: 'Athletics' },
  { key: 'deception', ability: 'charisma', nameEs: 'Engaño', nameEn: 'Deception' },
  { key: 'history', ability: 'intelligence', nameEs: 'Historia', nameEn: 'History' },
  { key: 'insight', ability: 'wisdom', nameEs: 'Perspicacia', nameEn: 'Insight' },
  { key: 'intimidation', ability: 'charisma', nameEs: 'Intimidación', nameEn: 'Intimidation' },
  { key: 'investigation', ability: 'intelligence', nameEs: 'Investigación', nameEn: 'Investigation' },
  { key: 'medicine', ability: 'wisdom', nameEs: 'Medicina', nameEn: 'Medicine' },
  { key: 'nature', ability: 'intelligence', nameEs: 'Naturaleza', nameEn: 'Nature' },
  { key: 'perception', ability: 'wisdom', nameEs: 'Percepción', nameEn: 'Perception' },
  { key: 'performance', ability: 'charisma', nameEs: 'Interpretación', nameEn: 'Performance' },
  { key: 'persuasion', ability: 'charisma', nameEs: 'Persuasión', nameEn: 'Persuasion' },
  { key: 'religion', ability: 'intelligence', nameEs: 'Religión', nameEn: 'Religion' },
  { key: 'sleight-of-hand', ability: 'dexterity', nameEs: 'Juego de Manos', nameEn: 'Sleight of Hand' },
  { key: 'stealth', ability: 'dexterity', nameEs: 'Sigilo', nameEn: 'Stealth' },
  { key: 'survival', ability: 'wisdom', nameEs: 'Supervivencia', nameEn: 'Survival' },
];

/** Mapa skill_key -> definición */
export const SKILLS_BY_KEY: Record<string, SkillDefinition> = Object.fromEntries(
  SKILLS.map(s => [s.key, s])
);

/** Mapeo nombre en inglés (como en backgrounds) -> skill_key */
export const BACKGROUND_SKILL_NAME_TO_KEY: Record<string, string> = {
  'Acrobatics': 'acrobatics',
  'Animal Handling': 'animal-handling',
  'Arcana': 'arcana',
  'Athletics': 'athletics',
  'Deception': 'deception',
  'History': 'history',
  'Insight': 'insight',
  'Intimidation': 'intimidation',
  'Investigation': 'investigation',
  'Medicine': 'medicine',
  'Nature': 'nature',
  'Perception': 'perception',
  'Performance': 'performance',
  'Persuasion': 'persuasion',
  'Persuation': 'persuasion', // typo en algunos backgrounds
  'Religion': 'religion',
  "Sleight of Hand": 'sleight-of-hand',
  'Stealth': 'stealth',
  'Survival': 'survival',
};

export function getSkillKeyFromBackgroundName(name: string): string {
  const key = BACKGROUND_SKILL_NAME_TO_KEY[name];
  if (key) return key;
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
