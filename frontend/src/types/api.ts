/**
 * Tipos que coinciden con las respuestas del Backend (API).
 * Mantener alineados con los modelos y controladores del backend.
 */

export interface CampaignDto {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  master_user_id: number;
  created_at: string;
  updated_at: string;
  role?: 'master' | 'player';
}

export interface CampaignWithMembersDto extends CampaignDto {
  members: { user_id: number; username: string; role: string; joined_at: string; email?: string }[];
}

export interface CampaignCharacterDto {
  id: string;
  name_es: string;
  name_en?: string | null;
  race_id: string;
  class_id: string;
  level: number;
  user_id?: number;
  username?: string;
}

export interface CampaignInviteLinkDto {
  token: string;
  campaignId: string;
  expiresAt: string;
  inviteUrl: string;
}

export interface CampaignInviteItemDto {
  token: string;
  inviteUrl: string;
  expiresAt: string;
  revoked: boolean;
  createdAt: string;
}

export interface JoinCampaignByInviteDto {
  joined: boolean;
  campaignId: string;
  campaignName: string;
  alreadyMember: boolean;
}

export interface CharacterListItemDto {
  id: string;
  name_es: string;
  name_en?: string | null;
  race_id: string;
  subrace_id?: string | null;
  class_id: string;
  subclass_id?: string | null;
  level: number;
  experience: number;
  campaign_id?: string | null;
  created_at: string;
}

export interface RaceDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  abilityBonus: Record<string, number>;
  speed: number;
  size: 'small' | 'medium';
  languages: string[];
  traits?: string[];
  subraces?: SubraceDto[];
}

export interface SubraceDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  abilityBonus?: Record<string, number>;
  traits?: string[];
}

export interface ClassDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  hitDice: number;
  primaryAbility: string;
  savingThrows: string[];
  skillOptions: string[];
  skillChoicesCount?: number;
  subclasses: SubclassDto[];
}

export interface SubclassDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  minLevel: number;
  features?: string[];
}

export interface BackgroundDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  skillProficiencies: string[];
  toolProficiencies?: string[];
  languages?: string[];
  equipment: string[];
  feature: string;
}

export interface AlignmentDto {
  id: string;
  nameEs: string;
  nameEn: string;
  abbreviation?: string;
  descriptionEs: string;
  descriptionEn: string;
  moralAxis?: string;
  ethicsAxis?: string;
}

export interface CharacterCreationOptionsDto {
  races: RaceDto[];
  classes: ClassDto[];
  backgrounds: BackgroundDto[];
  alignments: AlignmentDto[];
  skills?: { key: string; ability: string; nameEs: string; nameEn: string }[];
}

export interface SpellDto {
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

export interface MonsterDto {
  id: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  hp: number;
  speed: string;
  abilities: Record<string, number>;
  savingThrows?: Record<string, number>;
  skills?: Record<string, number>;
  damageResistances?: string[];
  damageImmunities?: string[];
  conditionImmunities?: string[];
  senses: string;
  languages?: string;
  challenge: string;
  traits?: { name: string; description: string }[];
  actions?: { name: string; description: string }[];
  legendaryActions?: { name: string; description: string }[];
}

/** Ficha de personaje (respuesta de GET /characters/:id). */
export interface CharacterSheetDto {
  id: string;
  userId: string;
  nameEs: string;
  nameEn?: string | null;
  raceId: string;
  raceNameEs: string;
  raceNameEn: string;
  subraceId?: string | null;
  subraceNameEs?: string;
  subraceNameEn?: string;
  classId: string;
  classNameEs: string;
  classNameEn: string;
  subclassId?: string | null;
  subclassNameEs?: string;
  subclassNameEn?: string;
  level: number;
  experience: number;
  backgroundId?: string | null;
  backgroundNameEs?: string;
  backgroundNameEn?: string;
  alignmentId?: string | null;
  alignmentNameEs?: string;
  alignmentNameEn?: string;
  personality?: { ideals?: string | null; bonds?: string | null; flaws?: string | null };
  abilities: Record<string, number>;
  abilityModifiers: Record<string, number>;
  proficiencyBonus: number;
  savingThrows: { key: string; nameEs: string; nameEn: string; modifier: number; proficient: boolean }[];
  skills: { key: string; nameEs: string; nameEn: string; modifier: number; proficient: boolean }[];
  passivePerception: number;
  armorClass: number;
  initiative: number;
  speed: number;
  health: { current: number; maximum: number };
  hitDice: string;
  hitDiceTotal: number;
  gold: number;
  inspiration: number;
  spellSlots?: Record<string, number>;
  spellSlotsTotal?: Record<string, number>;
  concentratingOn?: string | null;
  activeConditions?: string[];
  inventory?: { id: string; name: string; quantity: number }[];
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
