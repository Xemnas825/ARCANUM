/**
 * Servicio de contenido: devuelve datos oficiales (SRD) y opcionalmente
 * los homebrew de una campaña cuando se pasa campaignId.
 */
import pool from '../database/pool.js';
import { races as officialRaces, classes as officialClasses, spells as officialSpells, monsters as officialMonsters, backgrounds as officialBackgrounds } from '../data/dnd-data.js';
import type { Race, Subrace } from '../types/index.js';
import type { Class as ClassType, Subclass } from '../types/index.js';
import type { Spell, Monster, Background } from '../types/dnd.js';

type HomebrewRaceRow = {
  id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  ability_bonus: Record<string, number>;
  speed: number;
  size: string;
  languages: unknown;
  traits: unknown;
  subraces: unknown;
};

// ----- Helpers para mapear filas homebrew al formato oficial -----

function mapHomebrewRace(row: HomebrewRaceRow): Race {
  const languages = Array.isArray(row.languages) ? (row.languages as string[]) : [];
  const traits = Array.isArray(row.traits) ? (row.traits as string[]) : [];
  const subraces = Array.isArray(row.subraces) ? (row.subraces as Subrace[]) : [];
  const abilityBonus = row.ability_bonus && typeof row.ability_bonus === 'object' ? row.ability_bonus as Race['abilityBonus'] : {};
  return {
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en ?? row.name_es,
    descriptionEs: row.description_es ?? '',
    descriptionEn: row.description_en ?? '',
    abilityBonus,
    speed: Number(row.speed) || 30,
    size: (row.size === 'small' || row.size === 'medium') ? row.size : 'medium',
    languages,
    traits,
    subraces,
  };
}

function mapHomebrewClass(row: {
  id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  hit_dice: number;
  primary_ability: string;
  saving_throws: string[];
  skill_options: string[];
  subclasses: Subclass[] | unknown;
}): ClassType {
  const savingThrows = Array.isArray(row.saving_throws) ? row.saving_throws : [];
  const skillOptions = Array.isArray(row.skill_options) ? row.skill_options : [];
  const subclasses = Array.isArray(row.subclasses) ? (row.subclasses as Subclass[]) : [];
  const primaryAbility = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].includes(row.primary_ability)
    ? row.primary_ability
    : 'strength';
  return {
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en ?? row.name_es,
    descriptionEs: row.description_es ?? '',
    descriptionEn: row.description_en ?? '',
    hitDice: Number(row.hit_dice) || 8,
    primaryAbility: primaryAbility as ClassType['primaryAbility'],
    savingThrows,
    skillOptions,
    subclasses,
  };
}

function mapHomebrewSpell(row: {
  id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  level: number;
  school: string;
  casting_time: string;
  range: string;
  components: string[];
  duration: string;
  is_concentration: boolean;
}): Spell {
  const components = Array.isArray(row.components) ? row.components : [];
  return {
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en ?? row.name_es,
    descriptionEs: row.description_es ?? '',
    descriptionEn: row.description_en ?? '',
    level: Number(row.level) ?? 0,
    school: row.school ?? '',
    castingTime: row.casting_time ?? '',
    range: row.range ?? '',
    components,
    duration: row.duration ?? '',
    isConcentration: Boolean(row.is_concentration),
  };
}

function mapHomebrewMonster(row: {
  id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  hp: number;
  speed: string;
  abilities: Record<string, number>;
  saving_throws: Record<string, number>;
  skills: Record<string, number>;
  damage_resistances: string[];
  damage_immunities: string[];
  condition_immunities: string[];
  senses: string;
  languages: string;
  challenge: string;
  traits: { name: string; description: string }[];
  actions: { name: string; description: string }[];
  legendary_actions: { name: string; description: string }[];
}): Monster {
  const abilities = row.abilities && typeof row.abilities === 'object' ? row.abilities : { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  return {
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en ?? row.name_es,
    descriptionEs: row.description_es ?? '',
    descriptionEn: row.description_en ?? '',
    size: (['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'].includes(row.size) ? row.size : 'medium') as Monster['size'],
    type: row.type ?? '',
    alignment: row.alignment ?? '',
    ac: Number(row.ac) ?? 10,
    hp: Number(row.hp) ?? 1,
    speed: row.speed ?? '30 pies',
    abilities: {
      str: Number(abilities.str) ?? 10,
      dex: Number(abilities.dex) ?? 10,
      con: Number(abilities.con) ?? 10,
      int: Number(abilities.int) ?? 10,
      wis: Number(abilities.wis) ?? 10,
      cha: Number(abilities.cha) ?? 10,
    },
    savingThrows: row.saving_throws && typeof row.saving_throws === 'object' ? row.saving_throws : undefined,
    skills: row.skills && typeof row.skills === 'object' ? row.skills : undefined,
    damageResistances: Array.isArray(row.damage_resistances) ? row.damage_resistances : undefined,
    damageImmunities: Array.isArray(row.damage_immunities) ? row.damage_immunities : undefined,
    conditionImmunities: Array.isArray(row.condition_immunities) ? row.condition_immunities : undefined,
    senses: row.senses ?? '',
    languages: row.languages,
    challenge: row.challenge ?? '',
    traits: Array.isArray(row.traits) ? row.traits : undefined,
    actions: Array.isArray(row.actions) ? row.actions : undefined,
    legendaryActions: Array.isArray(row.legendary_actions) ? row.legendary_actions : undefined,
  };
}

function mapHomebrewBackground(row: {
  id: string;
  name_es: string;
  name_en: string | null;
  description_es: string | null;
  description_en: string | null;
  skill_proficiencies: string[];
  tool_proficiencies: string[];
  languages: string[];
  equipment: string[];
  feature: string;
}): Background {
  return {
    id: row.id,
    nameEs: row.name_es,
    nameEn: row.name_en ?? row.name_es,
    descriptionEs: row.description_es ?? '',
    descriptionEn: row.description_en ?? '',
    skillProficiencies: Array.isArray(row.skill_proficiencies) ? row.skill_proficiencies : [],
    toolProficiencies: Array.isArray(row.tool_proficiencies) ? row.tool_proficiencies : [],
    languages: Array.isArray(row.languages) ? row.languages : [],
    equipment: Array.isArray(row.equipment) ? row.equipment : [],
    feature: row.feature ?? '',
  };
}

/** Busca un trasfondo por id (oficial o homebrew de la campaña). */
export async function findBackgroundById(backgroundId: string, campaignId: string | null, userId: number): Promise<Background | null> {
  const official = officialBackgrounds.find((b) => b.id === backgroundId);
  if (official) return official;
  if (!campaignId) return null;
  const isMember = await isCampaignMember(campaignId, userId);
  if (!isMember) return null;
  const result = await pool.query(
    `SELECT id, name_es, name_en, description_es, description_en, skill_proficiencies, tool_proficiencies, languages, equipment, feature FROM homebrew_backgrounds WHERE campaign_id = $1 AND id = $2`,
    [campaignId, backgroundId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as Record<string, unknown>;
  return mapHomebrewBackground({
    id: r.id as string,
    name_es: r.name_es as string,
    name_en: r.name_en as string | null,
    description_es: r.description_es as string | null,
    description_en: r.description_en as string | null,
    skill_proficiencies: Array.isArray(r.skill_proficiencies) ? r.skill_proficiencies : [],
    tool_proficiencies: Array.isArray(r.tool_proficiencies) ? r.tool_proficiencies : [],
    languages: Array.isArray(r.languages) ? r.languages : [],
    equipment: Array.isArray(r.equipment) ? r.equipment : [],
    feature: (r.feature as string) ?? '',
  });
}

/** Verifica que el usuario sea miembro de la campaña. Devuelve true si es miembro. */
export async function isCampaignMember(campaignId: string, userId: number): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM campaign_members WHERE campaign_id = $1 AND user_id = $2`,
    [campaignId, userId]
  );
  return result.rows.length > 0;
}

/** Razas: oficiales + homebrew de la campaña (si campaignId y el usuario es miembro). */
export async function getRaces(campaignId: string | null, _userId: number): Promise<Race[]> {
  const list = [...officialRaces];
  if (campaignId) {
    const isMember = await isCampaignMember(campaignId, _userId);
    if (isMember) {
      const homebrew = await pool.query(
        `SELECT id, name_es, name_en, description_es, description_en, ability_bonus, speed, size, languages, traits, subraces FROM homebrew_races WHERE campaign_id = $1`,
        [campaignId]
      );
      for (const row of homebrew.rows) {
        list.push(mapHomebrewRace(row as HomebrewRaceRow));
      }
    }
  }
  return list;
}

/** Clases: oficiales + homebrew de la campaña. */
export async function getClasses(campaignId: string | null, userId: number): Promise<ClassType[]> {
  const list = [...officialClasses];
  if (campaignId) {
    const isMember = await isCampaignMember(campaignId, userId);
    if (isMember) {
      const homebrew = await pool.query(
        `SELECT id, name_es, name_en, description_es, description_en, hit_dice, primary_ability, saving_throws, skill_options, subclasses FROM homebrew_classes WHERE campaign_id = $1`,
        [campaignId]
      );
      for (const row of homebrew.rows) {
        const r = row as Record<string, unknown>;
        list.push(mapHomebrewClass({
          id: r.id as string,
          name_es: r.name_es as string,
          name_en: r.name_en as string | null,
          description_es: r.description_es as string | null,
          description_en: r.description_en as string | null,
          hit_dice: Number(r.hit_dice) ?? 8,
          primary_ability: (r.primary_ability as string) ?? 'strength',
          saving_throws: (Array.isArray(r.saving_throws) ? r.saving_throws : []) as string[],
          skill_options: (Array.isArray(r.skill_options) ? r.skill_options : []) as string[],
          subclasses: (Array.isArray(r.subclasses) ? r.subclasses : []) as Subclass[],
        }));
      }
    }
  }
  return list;
}

/** Hechizos: oficiales + homebrew de la campaña. */
export async function getSpells(campaignId: string | null, userId: number): Promise<Spell[]> {
  const list = [...officialSpells];
  if (campaignId) {
    const isMember = await isCampaignMember(campaignId, userId);
    if (isMember) {
      const homebrew = await pool.query(
        `SELECT id, name_es, name_en, description_es, description_en, level, school, casting_time, range, components, duration, is_concentration FROM homebrew_spells WHERE campaign_id = $1`,
        [campaignId]
      );
      for (const row of homebrew.rows) {
        const r = row as Record<string, unknown>;
        list.push(mapHomebrewSpell({
          id: r.id as string,
          name_es: r.name_es as string,
          name_en: r.name_en as string | null,
          description_es: r.description_es as string | null,
          description_en: r.description_en as string | null,
          level: Number(r.level) ?? 0,
          school: (r.school as string) ?? '',
          casting_time: (r.casting_time as string) ?? '',
          range: (r.range as string) ?? '',
          components: (Array.isArray(r.components) ? r.components : []) as string[],
          duration: (r.duration as string) ?? '',
          is_concentration: Boolean(r.is_concentration),
        }));
      }
    }
  }
  return list;
}

/** Monstruos: oficiales + homebrew de la campaña. */
export async function getMonsters(campaignId: string | null, userId: number): Promise<Monster[]> {
  const list = [...officialMonsters];
  if (campaignId) {
    const isMember = await isCampaignMember(campaignId, userId);
    if (isMember) {
      const homebrew = await pool.query(
        `SELECT id, name_es, name_en, description_es, description_en, size, type, alignment, ac, hp, speed,
                abilities, saving_throws, skills, damage_resistances, damage_immunities, condition_immunities,
                senses, languages, challenge, traits, actions, legendary_actions FROM homebrew_monsters WHERE campaign_id = $1`,
        [campaignId]
      );
      for (const row of homebrew.rows) {
        const r = row as Record<string, unknown>;
        list.push(mapHomebrewMonster({
          id: r.id as string,
          name_es: r.name_es as string,
          name_en: r.name_en as string | null,
          description_es: r.description_es as string | null,
          description_en: r.description_en as string | null,
          size: (r.size as string) ?? 'medium',
          type: (r.type as string) ?? '',
          alignment: (r.alignment as string) ?? '',
          ac: Number(r.ac) ?? 10,
          hp: Number(r.hp) ?? 1,
          speed: (r.speed as string) ?? '',
          abilities: (r.abilities && typeof r.abilities === 'object' ? r.abilities : {}) as Record<string, number>,
          saving_throws: (r.saving_throws && typeof r.saving_throws === 'object' ? r.saving_throws : {}) as Record<string, number>,
          skills: (r.skills && typeof r.skills === 'object' ? r.skills : {}) as Record<string, number>,
          damage_resistances: Array.isArray(r.damage_resistances) ? r.damage_resistances : [],
          damage_immunities: Array.isArray(r.damage_immunities) ? r.damage_immunities : [],
          condition_immunities: Array.isArray(r.condition_immunities) ? r.condition_immunities : [],
          senses: (r.senses as string) ?? '',
          languages: (r.languages as string) ?? '',
          challenge: (r.challenge as string) ?? '',
          traits: Array.isArray(r.traits) ? r.traits : [],
          actions: Array.isArray(r.actions) ? r.actions : [],
          legendary_actions: Array.isArray(r.legendary_actions) ? r.legendary_actions : [],
        }));
      }
    }
  }
  return list;
}

/** Trasfondos: oficiales + homebrew de la campaña. */
export async function getBackgrounds(campaignId: string | null, userId: number): Promise<Background[]> {
  const list = [...officialBackgrounds];
  if (campaignId) {
    const isMember = await isCampaignMember(campaignId, userId);
    if (isMember) {
      const homebrew = await pool.query(
        `SELECT id, name_es, name_en, description_es, description_en, skill_proficiencies, tool_proficiencies, languages, equipment, feature FROM homebrew_backgrounds WHERE campaign_id = $1`,
        [campaignId]
      );
      for (const row of homebrew.rows) {
        const r = row as Record<string, unknown>;
        list.push(mapHomebrewBackground({
          id: r.id as string,
          name_es: r.name_es as string,
          name_en: r.name_en as string | null,
          description_es: r.description_es as string | null,
          description_en: r.description_en as string | null,
          skill_proficiencies: Array.isArray(r.skill_proficiencies) ? r.skill_proficiencies : [],
          tool_proficiencies: Array.isArray(r.tool_proficiencies) ? r.tool_proficiencies : [],
          languages: Array.isArray(r.languages) ? r.languages : [],
          equipment: Array.isArray(r.equipment) ? r.equipment : [],
          feature: (r.feature as string) ?? '',
        }));
      }
    }
  }
  return list;
}

/** Busca una raza por id: primero oficial, luego homebrew de la campaña si campaignId y es miembro. */
export async function findRaceById(raceId: string, campaignId: string | null, userId: number): Promise<Race | null> {
  const official = officialRaces.find((r) => r.id === raceId);
  if (official) return official;
  if (!campaignId) return null;
  const isMember = await isCampaignMember(campaignId, userId);
  if (!isMember) return null;
  const result = await pool.query(
    `SELECT id, name_es, name_en, description_es, description_en, ability_bonus, speed, size, languages, traits, subraces FROM homebrew_races WHERE campaign_id = $1 AND id = $2`,
    [campaignId, raceId]
  );
  if (result.rows.length === 0) return null;
  return mapHomebrewRace(result.rows[0] as HomebrewRaceRow);
}

/** Busca una clase por id. */
export async function findClassById(classId: string, campaignId: string | null, userId: number): Promise<ClassType | null> {
  const official = officialClasses.find((c) => c.id === classId);
  if (official) return official;
  if (!campaignId) return null;
  const isMember = await isCampaignMember(campaignId, userId);
  if (!isMember) return null;
  const result = await pool.query(
    `SELECT id, name_es, name_en, description_es, description_en, hit_dice, primary_ability, saving_throws, skill_options, subclasses FROM homebrew_classes WHERE campaign_id = $1 AND id = $2`,
    [campaignId, classId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as Record<string, unknown>;
  return mapHomebrewClass({
    id: r.id as string,
    name_es: r.name_es as string,
    name_en: r.name_en as string | null,
    description_es: r.description_es as string | null,
    description_en: r.description_en as string | null,
    hit_dice: Number(r.hit_dice) ?? 8,
    primary_ability: (r.primary_ability as string) ?? 'strength',
    saving_throws: (Array.isArray(r.saving_throws) ? r.saving_throws : []) as string[],
    skill_options: (Array.isArray(r.skill_options) ? r.skill_options : []) as string[],
    subclasses: (Array.isArray(r.subclasses) ? r.subclasses : []) as Subclass[],
  });
}

/** Busca un hechizo por id. */
export async function findSpellById(spellId: string, campaignId: string | null, userId: number): Promise<Spell | null> {
  const official = officialSpells.find((s) => s.id === spellId);
  if (official) return official;
  if (!campaignId) return null;
  const isMember = await isCampaignMember(campaignId, userId);
  if (!isMember) return null;
  const result = await pool.query(
    `SELECT id, name_es, name_en, description_es, description_en, level, school, casting_time, range, components, duration, is_concentration FROM homebrew_spells WHERE campaign_id = $1 AND id = $2`,
    [campaignId, spellId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as Record<string, unknown>;
  return mapHomebrewSpell({
    id: r.id as string,
    name_es: r.name_es as string,
    name_en: r.name_en as string | null,
    description_es: r.description_es as string | null,
    description_en: r.description_en as string | null,
    level: Number(r.level) ?? 0,
    school: (r.school as string) ?? '',
    casting_time: (r.casting_time as string) ?? '',
    range: (r.range as string) ?? '',
    components: (Array.isArray(r.components) ? r.components : []) as string[],
    duration: (r.duration as string) ?? '',
    is_concentration: Boolean(r.is_concentration),
  });
}

/** Busca un monstruo por id. */
export async function findMonsterById(monsterId: string, campaignId: string | null, userId: number): Promise<Monster | null> {
  const official = officialMonsters.find((m) => m.id === monsterId);
  if (official) return official;
  if (!campaignId) return null;
  const isMember = await isCampaignMember(campaignId, userId);
  if (!isMember) return null;
  const result = await pool.query(
    `SELECT id, name_es, name_en, description_es, description_en, size, type, alignment, ac, hp, speed,
            abilities, saving_throws, skills, damage_resistances, damage_immunities, condition_immunities,
            senses, languages, challenge, traits, actions, legendary_actions FROM homebrew_monsters WHERE campaign_id = $1 AND id = $2`,
    [campaignId, monsterId]
  );
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as Record<string, unknown>;
  return mapHomebrewMonster({
    id: r.id as string,
    name_es: r.name_es as string,
    name_en: r.name_en as string | null,
    description_es: r.description_es as string | null,
    description_en: r.description_en as string | null,
    size: (r.size as string) ?? 'medium',
    type: (r.type as string) ?? '',
    alignment: (r.alignment as string) ?? '',
    ac: Number(r.ac) ?? 10,
    hp: Number(r.hp) ?? 1,
    speed: (r.speed as string) ?? '',
    abilities: (r.abilities && typeof r.abilities === 'object' ? r.abilities : {}) as Record<string, number>,
    saving_throws: (r.saving_throws && typeof r.saving_throws === 'object' ? r.saving_throws : {}) as Record<string, number>,
    skills: (r.skills && typeof r.skills === 'object' ? r.skills : {}) as Record<string, number>,
    damage_resistances: Array.isArray(r.damage_resistances) ? r.damage_resistances : [],
    damage_immunities: Array.isArray(r.damage_immunities) ? r.damage_immunities : [],
    condition_immunities: Array.isArray(r.condition_immunities) ? r.condition_immunities : [],
    senses: (r.senses as string) ?? '',
    languages: (r.languages as string) ?? '',
    challenge: (r.challenge as string) ?? '',
    traits: Array.isArray(r.traits) ? r.traits : [],
    actions: Array.isArray(r.actions) ? r.actions : [],
    legendary_actions: Array.isArray(r.legendary_actions) ? r.legendary_actions : [],
  });
}
