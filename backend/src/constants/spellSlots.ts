/**
 * Tabla de slots de hechizo por nivel (D&D 5e, full caster).
 * Índice 0 = personaje nivel 1, índice 19 = nivel 20.
 * Cada fila: [slots nivel 1, slots nivel 2, ..., slots nivel 9].
 * Nivel 1: 2 slots de nivel 1. Nivel 2: 3 slots de nivel 1. Nivel 3: 4 de nivel 1, 2 de nivel 2, etc.
 */
export const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0], // personaje nivel 1 → 2 slots nivel 1
  [3, 0, 0, 0, 0, 0, 0, 0, 0], // personaje nivel 2 → 3 slots nivel 1
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1], // level 20
];

/** Clases que usan progresión full caster (bard, cleric, druid, sorcerer, wizard). */
const FULL_CASTER_IDS = new Set(['bard', 'cleric', 'druid', 'sorcerer', 'wizard']);
/** Clases half caster: nivel efectivo = floor(level/2) para la tabla, máx slots nivel 5. */
const HALF_CASTER_IDS = new Set(['artificer', 'paladin', 'ranger']);

export interface SpellSlotsTotal {
  level1: number;
  level2: number;
  level3: number;
  level4: number;
  level5: number;
  level6: number;
  level7: number;
  level8: number;
  level9: number;
}

export function getSpellSlotsTotal(classId: string, characterLevel: number): SpellSlotsTotal {
  const level = Math.max(1, Math.min(20, characterLevel));
  if (FULL_CASTER_IDS.has(classId)) {
    const row = FULL_CASTER_SLOTS[level - 1];
    return {
      level1: row[0],
      level2: row[1],
      level3: row[2],
      level4: row[3],
      level5: row[4],
      level6: row[5],
      level7: row[6],
      level8: row[7],
      level9: row[8],
    };
  }
  if (HALF_CASTER_IDS.has(classId)) {
    const effectiveLevel = Math.floor(level / 2);
    const row = effectiveLevel === 0 ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : FULL_CASTER_SLOTS[effectiveLevel - 1];
    return {
      level1: row[0],
      level2: row[1],
      level3: row[2],
      level4: row[3],
      level5: row[4],
      level6: 0,
      level7: 0,
      level8: 0,
      level9: 0,
    };
  }
  return {
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    level5: 0,
    level6: 0,
    level7: 0,
    level8: 0,
    level9: 0,
  };
}
