<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import AppHeader from '../components/AppHeader.vue';

const route  = useRoute();
const router = useRouter();

const campaignId = computed(() => route.params.id as string);

interface PartyMember {
  id: string;
  name_es: string;
  name_en: string | null;
  race_id: string;
  class_id: string;
  subclass_id: string | null;
  level: number;
  experience: number;
  user_id: number;
  owner_username: string;
  current_health: number | null;
  maximum_health: number | null;
  current_gold: number | null;
  inspiration_points: number | null;
  concentrating_on: string | null;
  conditions: string[];
  strength: number | null;
  dexterity: number | null;
  constitution: number | null;
  intelligence: number | null;
  wisdom: number | null;
  charisma: number | null;
  personality_ideals: string | null;
  personality_bonds: string | null;
  personality_flaws: string | null;
}

const party    = ref<PartyMember[]>([]);
const loading  = ref(true);
const error    = ref('');
const expanded = ref<string | null>(null);

const ABILITY_LABELS: Record<string, string> = {
  strength: 'FUE', dexterity: 'DES', constitution: 'CON',
  intelligence: 'INT', wisdom: 'SAB', charisma: 'CAR',
};

onMounted(async () => {
  try {
    party.value = await api.get<PartyMember[]>(`/campaigns/${campaignId.value}/party`);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error al cargar el grupo';
  } finally {
    loading.value = false;
  }
});

function hpPercent(m: PartyMember) {
  if (!m.maximum_health || !m.current_health) return 0;
  return Math.max(0, Math.min(100, (m.current_health / m.maximum_health) * 100));
}

function hpColor(pct: number) {
  if (pct > 60) return 'hp-good';
  if (pct > 25) return 'hp-warn';
  return 'hp-crit';
}

function mod(val: number | null) {
  if (val == null) return '—';
  const m = Math.floor((val - 10) / 2);
  return m >= 0 ? `+${m}` : String(m);
}

function profBonus(level: number) {
  return Math.ceil(level / 4) + 1;
}

function xpToNext(level: number) {
  const XP = [0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
  return XP[level] ?? '—';
}

function toggle(id: string) {
  expanded.value = expanded.value === id ? null : id;
}

function goToSheet(characterId: string) {
  router.push(`/personajes/${characterId}`);
}

function goToPlaySession(characterId: string) {
  router.push({ path: `/personajes/${characterId}/partida`, query: { campaignId: campaignId.value } });
}

function isDead(m: PartyMember) {
  return m.current_health !== null && m.current_health <= 0;
}
</script>

<template>
  <div class="page">
    <AppHeader />
    <main class="main party-main">
      <div class="party-header animate-fade-in">
        <div>
          <button type="button" class="btn-ghost btn-sm back-btn" @click="router.push(`/campanas/${campaignId}`)">
            ← Volver a la campaña
          </button>
          <h1 class="page-title">Panel del grupo</h1>
          <p class="page-sub">Resumen de todos los aventureros de la campaña</p>
        </div>
        <div class="party-summary" v-if="!loading && party.length">
          <div class="summary-stat">
            <span class="summary-num">{{ party.length }}</span>
            <span class="summary-label">Aventureros</span>
          </div>
          <div class="summary-stat">
            <span class="summary-num">{{ Math.round(party.reduce((s,m) => s + m.level, 0) / party.length) || 0 }}</span>
            <span class="summary-label">Nivel medio</span>
          </div>
          <div class="summary-stat">
            <span class="summary-num">{{ party.filter(m => isDead(m)).length }}</span>
            <span class="summary-label">Caídos</span>
          </div>
        </div>
      </div>

      <div v-if="loading" class="loader-wrap"><div class="loader"></div><p>Cargando grupo…</p></div>
      <p v-else-if="error" class="error-banner">{{ error }}</p>

      <div v-else-if="party.length === 0" class="empty-party dark-card">
        <p>No hay personajes asignados a esta campaña todavía.</p>
      </div>

      <div v-else class="party-grid animate-fade-in">
        <div
          v-for="m in party"
          :key="m.id"
          class="member-card dark-card"
          :class="{ dead: isDead(m), expanded: expanded === m.id }"
        >
          <!-- Cabecera compacta siempre visible -->
          <div class="member-header" @click="toggle(m.id)">
            <div class="member-avatar">
              {{ m.name_es?.charAt(0).toUpperCase() }}
            </div>
            <div class="member-info">
              <div class="member-name-row">
                <strong class="member-name">{{ m.name_es }}</strong>
                <span class="member-level badge badge-ember">Nv {{ m.level }}</span>
                <span v-if="isDead(m)" class="dead-badge">💀 Caído</span>
                <span v-if="m.concentrating_on" class="conc-badge badge badge-arcane" :title="`Concentrando: ${m.concentrating_on}`">◎</span>
              </div>
              <div class="member-class-race">
                <span>{{ m.class_id }}</span>
                <span class="sep">·</span>
                <span>{{ m.race_id }}</span>
                <span v-if="m.subclass_id" class="sep">·</span>
                <span v-if="m.subclass_id">{{ m.subclass_id }}</span>
              </div>
              <div class="member-owner">
                <span class="owner-tag">@{{ m.owner_username }}</span>
              </div>
            </div>

            <!-- HP bar -->
            <div class="hp-col">
              <div class="hp-numbers">
                <span class="hp-current" :class="hpColor(hpPercent(m))">
                  {{ m.current_health ?? '—' }}
                </span>
                <span class="hp-slash">/</span>
                <span class="hp-max">{{ m.maximum_health ?? '—' }}</span>
              </div>
              <div class="hp-bar-bg">
                <div
                  class="hp-bar-fill"
                  :class="hpColor(hpPercent(m))"
                  :style="{ width: hpPercent(m) + '%' }"
                ></div>
              </div>
              <div class="gold-line" v-if="m.current_gold != null">
                🪙 {{ m.current_gold }} po
              </div>
            </div>

            <span class="expand-arrow">{{ expanded === m.id ? '▲' : '▽' }}</span>
          </div>

          <!-- Condiciones -->
          <div v-if="m.conditions?.length" class="conditions-row">
            <span v-for="c in m.conditions" :key="c" class="condition-chip badge badge-danger">{{ c }}</span>
          </div>

          <!-- Panel expandido: stats, personalidad, acciones -->
          <div v-if="expanded === m.id" class="member-detail">
            <hr class="runic-separator" />

            <!-- Características -->
            <div v-if="m.strength != null" class="abilities-grid">
              <div
                v-for="key in ['strength','dexterity','constitution','intelligence','wisdom','charisma']"
                :key="key"
                class="ability-cell"
              >
                <span class="ab-label">{{ ABILITY_LABELS[key] }}</span>
                <span class="ab-value">{{ (m as Record<string, unknown>)[key] as number }}</span>
                <span class="ab-mod">{{ mod((m as Record<string, unknown>)[key] as number) }}</span>
              </div>
            </div>

            <!-- Stats rápidos -->
            <div class="quick-stats">
              <div class="qs-item">
                <span class="qs-label">Bono competencia</span>
                <span class="qs-value">+{{ profBonus(m.level) }}</span>
              </div>
              <div class="qs-item">
                <span class="qs-label">XP actual</span>
                <span class="qs-value">{{ m.experience }}</span>
              </div>
              <div class="qs-item">
                <span class="qs-label">XP siguiente nv</span>
                <span class="qs-value">{{ xpToNext(m.level) }}</span>
              </div>
              <div class="qs-item" v-if="m.inspiration_points">
                <span class="qs-label">Inspiración</span>
                <span class="qs-value">✦ {{ m.inspiration_points }}</span>
              </div>
              <div class="qs-item" v-if="m.concentrating_on">
                <span class="qs-label">Concentrando</span>
                <span class="qs-value conc-val">{{ m.concentrating_on }}</span>
              </div>
            </div>

            <!-- Trasfondo -->
            <div v-if="m.personality_ideals || m.personality_bonds || m.personality_flaws" class="personality-block">
              <div v-if="m.personality_ideals" class="personality-row">
                <span class="pers-label">Ideales</span>
                <span class="pers-text">{{ m.personality_ideals }}</span>
              </div>
              <div v-if="m.personality_bonds" class="personality-row">
                <span class="pers-label">Vínculos</span>
                <span class="pers-text">{{ m.personality_bonds }}</span>
              </div>
              <div v-if="m.personality_flaws" class="personality-row">
                <span class="pers-label">Defectos</span>
                <span class="pers-text">{{ m.personality_flaws }}</span>
              </div>
            </div>

            <!-- Acciones DM -->
            <div class="member-actions">
              <button type="button" class="btn-arc btn-sm" @click="goToPlaySession(m.id)">
                ▶ En partida
              </button>
              <button type="button" class="btn-ghost btn-sm" @click="goToSheet(m.id)">
                Ver ficha completa
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.party-main { padding: 1.5rem; max-width: 980px; margin: 0 auto; width: 100%; }

.party-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.back-btn { margin-bottom: 0.5rem; padding: 0; color: var(--text-muted); }
.page-title { font-family: var(--font-title); font-size: 1.6rem; margin: 0 0 0.2rem 0; }
.page-sub { color: var(--text-muted); margin: 0; font-family: var(--font-data); font-size: 0.9rem; }

.party-summary { display: flex; gap: 1.5rem; }
.summary-stat { text-align: center; }
.summary-num { display: block; font-family: var(--font-title); font-size: 1.6rem; color: var(--arcane); line-height: 1; }
.summary-label { font-family: var(--font-data); font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

.empty-party { padding: 2rem; text-align: center; color: var(--text-muted); }

/* Grid de miembros */
.party-grid { display: flex; flex-direction: column; gap: 0.75rem; }

.member-card { overflow: hidden; }
.member-card.dead { border-color: rgba(216,64,64,0.25); }

.member-header {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.1rem;
  cursor: pointer;
  transition: background var(--ease-quick);
}
.member-header:hover { background: rgba(255,255,255,0.02); }

.member-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  background: var(--arcane-dim);
  border: 1px solid var(--border-arcane);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-title);
  font-size: 1rem;
  color: var(--arcane);
  flex-shrink: 0;
}
.member-card.dead .member-avatar { border-color: rgba(216,64,64,0.3); color: var(--danger); background: var(--danger-dim); }

.member-info { flex: 1; min-width: 0; }
.member-name-row { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-bottom: 0.15rem; }
.member-name { font-family: var(--font-title); font-size: 1rem; color: var(--text-primary); }
.dead-badge { font-family: var(--font-data); font-size: 0.7rem; color: var(--danger); }
.conc-badge { cursor: help; }
.member-class-race { font-family: var(--font-data); font-size: 0.82rem; color: var(--text-muted); }
.sep { opacity: 0.4; margin: 0 0.15rem; }
.member-owner { margin-top: 0.1rem; }
.owner-tag { font-family: var(--font-data); font-size: 0.75rem; color: var(--text-faint); }

/* HP */
.hp-col { min-width: 100px; text-align: right; }
.hp-numbers { display: flex; align-items: baseline; justify-content: flex-end; gap: 0.15rem; font-family: var(--font-data); }
.hp-current { font-size: 1.1rem; font-weight: 600; }
.hp-slash, .hp-max { font-size: 0.82rem; color: var(--text-muted); }
.hp-good { color: var(--nature); }
.hp-warn { color: var(--gold-bright); }
.hp-crit { color: var(--danger); }
.hp-bar-bg { height: 4px; background: var(--border-subtle); border-radius: 2px; margin-top: 0.3rem; overflow: hidden; }
.hp-bar-fill { height: 100%; border-radius: 2px; transition: width 0.4s ease; }
.hp-bar-fill.hp-good { background: var(--nature); }
.hp-bar-fill.hp-warn { background: var(--gold-bright); }
.hp-bar-fill.hp-crit { background: var(--danger); }
.gold-line { font-family: var(--font-data); font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem; }

.expand-arrow { font-size: 0.65rem; color: var(--text-faint); flex-shrink: 0; margin-left: 0.5rem; }

/* Condiciones */
.conditions-row { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0 1.1rem 0.6rem; }
.condition-chip { font-size: 0.65rem; }

/* Panel expandido */
.member-detail { padding: 0 1.1rem 1rem; }

.abilities-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.4rem;
  margin: 0.75rem 0;
}
@media (max-width: 520px) { .abilities-grid { grid-template-columns: repeat(3, 1fr); } }

.ability-cell {
  display: flex; flex-direction: column; align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  padding: 0.4rem 0.2rem;
  gap: 0.05rem;
}
.ab-label { font-family: var(--font-data); font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.ab-value { font-family: var(--font-data); font-size: 1rem; font-weight: 600; color: var(--text-primary); line-height: 1; }
.ab-mod { font-family: var(--font-data); font-size: 0.72rem; color: var(--arcane); }

.quick-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.qs-item {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 5px;
  padding: 0.3rem 0.65rem;
  display: flex; flex-direction: column; gap: 0.05rem;
}
.qs-label { font-family: var(--font-data); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); }
.qs-value { font-family: var(--font-data); font-size: 0.88rem; font-weight: 600; color: var(--text-primary); }
.conc-val { color: var(--magic); }

.personality-block { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.75rem; }
.personality-row { display: flex; gap: 0.5rem; font-size: 0.85rem; }
.pers-label { color: var(--text-muted); font-family: var(--font-data); font-size: 0.78rem; min-width: 60px; flex-shrink: 0; }
.pers-text { color: var(--text-primary); line-height: 1.4; }

.member-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
</style>
