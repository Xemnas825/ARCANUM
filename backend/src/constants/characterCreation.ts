/**
 * Reglas de creación de personaje que no vienen explícitas en los datos base.
 * En D&D 5e, cada clase permite elegir un número distinto de competencias.
 */
export const CLASS_SKILL_CHOICES: Record<string, number> = {
  artificer: 2,
  barbarian: 2,
  bard: 3,
  cleric: 2,
  druid: 2,
  fighter: 2,
  monk: 2,
  paladin: 2,
  ranger: 3,
  rogue: 4,
  sorcerer: 2,
  warlock: 2,
  wizard: 2,
};

export function getClassSkillChoicesCount(classId: string, explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  return CLASS_SKILL_CHOICES[classId] ?? 2;
}
