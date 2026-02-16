import { CharacterSheet, SheetSaveOrSkill } from '../types/index.js';
import { SKILLS_BY_KEY } from '../constants/skills.js';
import { getSpellSlotsTotal } from '../constants/spellSlots.js';
import type { Race, Class } from '../types/index.js';
import type { Background, Alignment } from '../types/dnd.js';

type AbilityKey = 'strength' | 'dexterity' | 'constitution' | 'intelligence' | 'wisdom' | 'charisma';

const ABILITY_NAMES_ES: Record<AbilityKey, string> = {
  strength: 'Fuerza',
  dexterity: 'Destreza',
  constitution: 'Constitución',
  intelligence: 'Inteligencia',
  wisdom: 'Sabiduría',
  charisma: 'Carisma',
};

const ABILITY_NAMES_EN: Record<AbilityKey, string> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** Bonificación de competencia según nivel (D&D 5e: +2 nivel 1-4, +3 nivel 5-8, etc.) */
function proficiencyBonus(level: number): number {
  return Math.floor((level - 1) / 4) + 2;
}

export interface CharacterRow {
  id: string;
  user_id: number;
  name_es: string;
  name_en: string | null;
  race_id: string;
  subrace_id: string | null;
  class_id: string;
  subclass_id: string | null;
  level: number;
  experience: number;
  background_id: string | null;
  alignment_id: string | null;
  personality_ideals: string | null;
  personality_bonds: string | null;
  personality_flaws: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface AbilitiesRow {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface GameStatsRow {
  current_health: number;
  maximum_health: number;
  current_gold: number;
  inspiration_points: number;
  spell_slots_level_1: number;
  spell_slots_level_2: number;
  spell_slots_level_3: number;
  spell_slots_level_4: number;
  spell_slots_level_5: number;
  spell_slots_level_6: number;
  spell_slots_level_7: number;
  spell_slots_level_8: number;
  spell_slots_level_9: number;
  concentrating_on?: string | null;
}

export function buildCharacterSheet(
  character: CharacterRow,
  abilities: AbilitiesRow,
  gameStats: GameStatsRow,
  proficientSkillKeys: string[],
  race: Race,
  charClass: Class,
  background: Background | null,
  alignment: Alignment | null,
  activeConditionIds: string[] = [],
  inventoryRows: { id: string; name: string; quantity: number }[] = []
): CharacterSheet {
  const level = character.level;
  const profBonus = proficiencyBonus(level);
  const mods = {
    strength: abilityModifier(abilities.strength),
    dexterity: abilityModifier(abilities.dexterity),
    constitution: abilityModifier(abilities.constitution),
    intelligence: abilityModifier(abilities.intelligence),
    wisdom: abilityModifier(abilities.wisdom),
    charisma: abilityModifier(abilities.charisma),
  };

  const savingThrows: SheetSaveOrSkill[] = (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as AbilityKey[]).map(
    key => ({
      key,
      nameEs: ABILITY_NAMES_ES[key],
      nameEn: ABILITY_NAMES_EN[key],
      modifier: mods[key] + (charClass.savingThrows.includes(key) ? profBonus : 0),
      proficient: charClass.savingThrows.includes(key),
    })
  );

  const skills: SheetSaveOrSkill[] = Object.keys(SKILLS_BY_KEY).map(skillKey => {
    const def = SKILLS_BY_KEY[skillKey];
    const proficient = proficientSkillKeys.includes(skillKey);
    return {
      key: skillKey,
      nameEs: def.nameEs,
      nameEn: def.nameEn,
      modifier: mods[def.ability] + (proficient ? profBonus : 0),
      proficient,
    };
  });

  const perceptionSkill = skills.find(s => s.key === 'perception');
  const passivePerception = 10 + (perceptionSkill?.modifier ?? mods.wisdom);

  const traitsAndFeatures: string[] = [];
  if (race.traits) traitsAndFeatures.push(...race.traits);
  const subrace = character.subrace_id && race.subraces
    ? race.subraces.find(sr => sr.id === character.subrace_id)
    : null;
  if (subrace?.traits) traitsAndFeatures.push(...subrace.traits);
  if (background?.feature) traitsAndFeatures.push(background.feature);
  if (charClass.subclasses) {
    const subclass = charClass.subclasses.find(sc => sc.id === character.subclass_id);
    if (subclass?.features) traitsAndFeatures.push(...subclass.features);
  }

  const hitDiceTotal = level;
  const hitDice = `1d${charClass.hitDice}`;

  return {
    id: character.id,
    userId: String(character.user_id),
    nameEs: character.name_es,
    nameEn: character.name_en ?? undefined,
    raceId: character.race_id,
    raceNameEs: race.nameEs,
    raceNameEn: race.nameEn,
    subraceId: character.subrace_id ?? undefined,
    subraceNameEs: subrace?.nameEs,
    subraceNameEn: subrace?.nameEn,
    classId: character.class_id,
    classNameEs: charClass.nameEs,
    classNameEn: charClass.nameEn,
    subclassId: character.subclass_id ?? undefined,
    subclassNameEs: charClass.subclasses?.find(sc => sc.id === character.subclass_id)?.nameEs,
    subclassNameEn: charClass.subclasses?.find(sc => sc.id === character.subclass_id)?.nameEn,
    level: character.level,
    experience: character.experience,
    backgroundId: character.background_id ?? undefined,
    backgroundNameEs: background?.nameEs,
    backgroundNameEn: background?.nameEn,
    alignmentId: character.alignment_id ?? undefined,
    alignmentNameEs: alignment?.nameEs,
    alignmentNameEn: alignment?.nameEn,
    personality: {
      ideals: character.personality_ideals ?? undefined,
      bonds: character.personality_bonds ?? undefined,
      flaws: character.personality_flaws ?? undefined,
    },
    abilities: {
      strength: abilities.strength,
      dexterity: abilities.dexterity,
      constitution: abilities.constitution,
      intelligence: abilities.intelligence,
      wisdom: abilities.wisdom,
      charisma: abilities.charisma,
    },
    abilityModifiers: mods,
    proficiencyBonus: profBonus,
    savingThrows,
    skills,
    passivePerception,
    armorClass: 10 + mods.dexterity,
    initiative: mods.dexterity,
    speed: race.speed,
    health: {
      current: gameStats.current_health,
      maximum: gameStats.maximum_health,
    },
    hitDice,
    hitDiceTotal,
    gold: gameStats.current_gold,
    inspiration: gameStats.inspiration_points,
    spellSlots: {
      level1: gameStats.spell_slots_level_1,
      level2: gameStats.spell_slots_level_2,
      level3: gameStats.spell_slots_level_3,
      level4: gameStats.spell_slots_level_4,
      level5: gameStats.spell_slots_level_5,
      level6: gameStats.spell_slots_level_6,
      level7: gameStats.spell_slots_level_7,
      level8: gameStats.spell_slots_level_8,
      level9: gameStats.spell_slots_level_9,
    },
    spellSlotsTotal: getSpellSlotsTotal(character.class_id, character.level),
    concentratingOn: gameStats.concentrating_on ?? null,
    activeConditions: activeConditionIds,
    inventory: inventoryRows.map(r => ({ id: r.id, name: r.name, quantity: r.quantity })),
    traitsAndFeatures,
    createdAt: character.created_at,
    updatedAt: character.updated_at,
  };
}
