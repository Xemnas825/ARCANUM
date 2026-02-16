export interface Equipment {
  id: string;
  nameEs: string;
  nameEn: string;
  type: 'weapon' | 'armor' | 'gear' | 'magic-item' | 'consumable' | 'wondrous-item' | 'wand' | 'staff';
  rarity?: 'common' | 'uncommon' | 'rare' | 'very-rare' | 'legendary' | 'artifact';
  cost: string; // ej: "1 pd" (1 pieza de oro)
  weight?: number | string; // en libras (número o texto ej. "0.5 lb")
  descriptionEs: string;
  descriptionEn: string;
  properties?: string[];
}

export interface Weapon extends Equipment {
  type: 'weapon';
  damage: string; // ej: "1d8"
  damageType: string; // ej: "cortante", "contundente"
  properties: string[]; // "fineza", "rango", etc
}

export interface Armor extends Equipment {
  type: 'armor';
  ac: number; // clase de armadura base
  strengthRequirement?: number;
  stealthDisadvantage: boolean;
}

export interface Background {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  skillProficiencies: string[];
  toolProficiencies?: string[];
  languages?: string[];
  equipment: string[];
  feature: string; // nombre de la característica especial
}

export interface Feat {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  prerequisites?: string;
  abilityModifier?: string;
}

export interface Spell {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  components: string[];
  duration: string;
  isConcentration?: boolean;
}

export interface Monster {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';
  type: string;
  alignment: string;
  ac: number;
  hp: number;
  speed: string;
  abilities: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses: string;
  languages?: string;
  challenge: string;
  traits?: Trait[];
  actions?: Action[];
  legendaryActions?: Action[];
}

export interface Trait {
  name: string;
  description: string;
}

export interface Action {
  name: string;
  description: string;
}

export interface Condition {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  effects?: string[];
}

export interface Alignment {
  id: string;
  nameEs: string;
  nameEn: string;
  abbreviation?: string;
  descriptionEs: string;
  descriptionEn: string;
  moralAxis?: string;
  ethicsAxis?: string;
}
