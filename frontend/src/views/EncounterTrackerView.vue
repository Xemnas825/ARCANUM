<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../api/client';
import { useCampaignStore } from '../stores/campaigns';
import type {
  CampaignCharacterDto,
  EncounterActionType,
  EncounterDetailDto,
  EncounterDto,
  EncounterEventDto,
  EncounterSnapshotDto,
  EncounterTemplateDto,
  MonsterDto,
} from '../types/api';
import AppHeader from '../components/AppHeader.vue';
import { useToastStore } from '../stores/toasts';

const route = useRoute();
const router = useRouter();
const campaignsStore = useCampaignStore();
const toasts = useToastStore();

const campaignId = computed(() => route.params.id as string);
const encounters = ref<EncounterDto[]>([]);
const currentEncounterId = ref('');
const encounterDetail = ref<EncounterDetailDto | null>(null);
const campaignCharacters = ref<CampaignCharacterDto[]>([]);
const monsters = ref<MonsterDto[]>([]);
const loading = ref(true);
const loadingDetail = ref(false);
const creatingEncounter = ref(false);
const addingCombatant = ref(false);
const error = ref('');

const newEncounterName = ref('');
const addMode = ref<'character' | 'monster' | 'custom'>('character');
const selectedCharacterId = ref('');
const selectedMonsterId = ref('');
const customName = ref('');
const customHp = ref(10);
const customAc = ref(10);
const customInitiative = ref(10);
const showAddPanel = ref(true);
const hideDefeated = ref(false);
const initiativeEdits = ref<Record<string, number>>({});
const encounterEvents = ref<EncounterEventDto[]>([]);
const templates = ref<EncounterTemplateDto[]>([]);
const selectedTemplateId = ref('');
const newTemplateName = ref('');
const applyingTemplate = ref(false);
const creatingTemplate = ref(false);
const snapshots = ref<EncounterSnapshotDto[]>([]);
const snapshotTitle = ref('');
const snapshotNote = ref('');
const creatingSnapshot = ref(false);
const actionActorId = ref('');
const actionTargetId = ref('');
const actionType = ref<EncounterActionType>('attack');
const actionAmount = ref(5);
const actionDc = ref(10);
const actionCondition = ref('');
const actionSuccess = ref(true);
const actionNote = ref('');
const actionDurationRounds = ref(2);
const actionConcentratingOn = ref('');

const uiPrefsKey = computed(() => `arcanum:encounter-ui:${campaignId.value}`);

const sortedCombatants = computed(() => encounterDetail.value?.combatants ?? []);
const visibleCombatants = computed(() => {
  if (!hideDefeated.value) return sortedCombatants.value;
  return sortedCombatants.value.filter((c) => c.hp_current > 0);
});
const activeCombatantId = computed(() => {
  if (!encounterDetail.value) return null;
  return sortedCombatants.value[encounterDetail.value.active_index]?.id ?? null;
});
const isMaster = computed(() => campaignsStore.current?.role === 'master');
const encounterStatusLabel = computed(() => {
  const status = encounterDetail.value?.status;
  if (status === 'paused') return 'Pausado';
  if (status === 'finished') return 'Finalizado';
  return 'Activo';
});

async function loadEncounters() {
  encounters.value = await api.get<EncounterDto[]>(`/campaigns/${campaignId.value}/encounters`);
  if (!currentEncounterId.value && encounters.value.length) {
    currentEncounterId.value = encounters.value[0]?.id ?? '';
  } else if (currentEncounterId.value && !encounters.value.some((e) => e.id === currentEncounterId.value)) {
    currentEncounterId.value = encounters.value[0]?.id ?? '';
  }
}

async function loadEncounterDetail() {
  if (!currentEncounterId.value) {
    encounterDetail.value = null;
    return;
  }
  loadingDetail.value = true;
  try {
    encounterDetail.value = await api.get<EncounterDetailDto>(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}`);
  } finally {
    loadingDetail.value = false;
  }
}

async function loadEncounterEvents() {
  if (!currentEncounterId.value) {
    encounterEvents.value = [];
    return;
  }
  encounterEvents.value = await api.get<EncounterEventDto[]>(
    `/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/events`
  );
}

async function loadMeta() {
  const [chars, mons] = await Promise.all([
    api.get<CampaignCharacterDto[]>(`/campaigns/${campaignId.value}/characters`),
    api.get<MonsterDto[]>(`/monsters?campaignId=${encodeURIComponent(campaignId.value)}`),
  ]);
  campaignCharacters.value = chars;
  monsters.value = mons;
  if (!selectedCharacterId.value && chars.length) selectedCharacterId.value = chars[0]?.id ?? '';
  if (!selectedMonsterId.value && mons.length) selectedMonsterId.value = mons[0]?.id ?? '';
}

async function loadTemplates() {
  templates.value = await api.get<EncounterTemplateDto[]>(`/campaigns/${campaignId.value}/encounter-templates`);
  if (!selectedTemplateId.value && templates.value.length) {
    selectedTemplateId.value = templates.value[0]?.id ?? '';
  } else if (selectedTemplateId.value && !templates.value.some((t) => t.id === selectedTemplateId.value)) {
    selectedTemplateId.value = templates.value[0]?.id ?? '';
  }
}

async function loadSnapshots() {
  if (!currentEncounterId.value) {
    snapshots.value = [];
    return;
  }
  snapshots.value = await api.get<EncounterSnapshotDto[]>(
    `/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/snapshots`
  );
}

onMounted(async () => {
  loading.value = true;
  error.value = '';
  try {
    const rawPrefs = localStorage.getItem(uiPrefsKey.value);
    if (rawPrefs) {
      const prefs = JSON.parse(rawPrefs) as { showAddPanel?: boolean; hideDefeated?: boolean };
      if (typeof prefs.showAddPanel === 'boolean') showAddPanel.value = prefs.showAddPanel;
      if (typeof prefs.hideDefeated === 'boolean') hideDefeated.value = prefs.hideDefeated;
    }
    await campaignsStore.fetchCampaign(campaignId.value);
    await Promise.all([loadEncounters(), loadMeta(), loadTemplates()]);
    await Promise.all([loadEncounterDetail(), loadEncounterEvents(), loadSnapshots()]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Error cargando combate';
  } finally {
    loading.value = false;
  }
});

watch(currentEncounterId, () => {
  loadEncounterDetail();
  loadEncounterEvents();
  loadSnapshots();
});
watch(
  [showAddPanel, hideDefeated],
  () => {
    localStorage.setItem(
      uiPrefsKey.value,
      JSON.stringify({
        showAddPanel: showAddPanel.value,
        hideDefeated: hideDefeated.value,
      })
    );
  },
  { deep: true }
);
watch(
  sortedCombatants,
  (list) => {
    const next: Record<string, number> = {};
    list.forEach((c) => {
      next[c.id] = c.initiative;
    });
    initiativeEdits.value = next;
  },
  { immediate: true }
);

async function createEncounter() {
  if (!newEncounterName.value.trim()) return;
  creatingEncounter.value = true;
  try {
    const created = await api.post<EncounterDto>(`/campaigns/${campaignId.value}/encounters`, {
      name: newEncounterName.value.trim(),
    });
    newEncounterName.value = '';
    await loadEncounters();
    currentEncounterId.value = created.id;
    toasts.push('Encuentro creado', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo crear el encuentro', 'error');
  } finally {
    creatingEncounter.value = false;
  }
}

async function createTemplateFromCurrent() {
  if (!currentEncounterId.value || !newTemplateName.value.trim()) return;
  creatingTemplate.value = true;
  try {
    await api.post(`/campaigns/${campaignId.value}/encounter-templates`, {
      name: newTemplateName.value.trim(),
      sourceEncounterId: currentEncounterId.value,
    });
    newTemplateName.value = '';
    await loadTemplates();
    toasts.push('Plantilla guardada', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo guardar la plantilla', 'error');
  } finally {
    creatingTemplate.value = false;
  }
}

async function applyTemplate() {
  if (!currentEncounterId.value || !selectedTemplateId.value) return;
  applyingTemplate.value = true;
  try {
    await api.post(
      `/campaigns/${campaignId.value}/encounter-templates/${selectedTemplateId.value}/apply/${currentEncounterId.value}`,
      {}
    );
    await Promise.all([loadEncounterDetail(), loadEncounterEvents(), loadEncounters()]);
    toasts.push('Plantilla aplicada al encuentro', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo aplicar la plantilla', 'error');
  } finally {
    applyingTemplate.value = false;
  }
}

async function deleteTemplate() {
  if (!selectedTemplateId.value) return;
  try {
    await api.delete(`/campaigns/${campaignId.value}/encounter-templates/${selectedTemplateId.value}`);
    await loadTemplates();
    toasts.push('Plantilla eliminada', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo eliminar plantilla', 'error');
  }
}

async function createSnapshot() {
  if (!currentEncounterId.value) return;
  creatingSnapshot.value = true;
  try {
    await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/snapshots`, {
      title: snapshotTitle.value.trim() || undefined,
      note: snapshotNote.value.trim() || undefined,
    });
    snapshotTitle.value = '';
    snapshotNote.value = '';
    await loadSnapshots();
    toasts.push('Snapshot de sesión guardado', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo guardar snapshot', 'error');
  } finally {
    creatingSnapshot.value = false;
  }
}

async function addCombatant() {
  if (!currentEncounterId.value) return;
  addingCombatant.value = true;
  try {
    if (addMode.value === 'character') {
      if (!selectedCharacterId.value) return;
      await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants`, {
        kind: 'character',
        refId: selectedCharacterId.value,
        initiative: customInitiative.value,
      });
    } else if (addMode.value === 'monster') {
      if (!selectedMonsterId.value) return;
      await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants`, {
        kind: 'monster',
        refId: selectedMonsterId.value,
        initiative: customInitiative.value,
      });
    } else {
      if (!customName.value.trim()) return;
      await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants`, {
        kind: 'custom',
        name: customName.value.trim(),
        initiative: customInitiative.value,
        hpMax: customHp.value,
        hpCurrent: customHp.value,
        ac: customAc.value,
      });
      customName.value = '';
    }
    await loadEncounterDetail();
    toasts.push('Combatiente añadido', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo añadir combatiente', 'error');
  } finally {
    addingCombatant.value = false;
  }
}

async function updateHp(combatantId: string, delta: number) {
  if (!currentEncounterId.value || !encounterDetail.value) return;
  const current = encounterDetail.value.combatants.find((c) => c.id === combatantId);
  if (!current) return;
  const ev = await api.post<EncounterEventDto>(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/actions`, {
    actorCombatantId: activeCombatantId.value ?? combatantId,
    targetCombatantId: combatantId,
    actionType: delta < 0 ? 'damage' : 'heal',
    amount: Math.abs(delta),
    note: 'Ajuste rápido',
  });
  await Promise.all([loadEncounterDetail(), loadEncounterEvents()]);
  const check = ev.payload?.concentrationCheck;
  if (check?.required) {
    startAction(combatantId, 'concentration');
    actionTargetId.value = combatantId;
    actionDc.value = Number(check.dc || 10);
    actionConcentratingOn.value = String(check.spell || '');
    toasts.push(`Tirada de concentración requerida (CD ${actionDc.value})`, 'info');
  }
}

async function removeCombatant(combatantId: string) {
  if (!currentEncounterId.value) return;
  await api.delete(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants/${combatantId}`);
  await loadEncounterDetail();
}

async function setInitiative(combatantId: string) {
  if (!currentEncounterId.value) return;
  const nextValue = Math.floor(Number(initiativeEdits.value[combatantId] ?? 0));
  await api.patch(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants/${combatantId}`, {
    initiative: nextValue,
  });
  await loadEncounterDetail();
}

async function moveCombatant(combatantId: string, direction: 'up' | 'down') {
  if (!currentEncounterId.value) return;
  const list = sortedCombatants.value;
  const idx = list.findIndex((c) => c.id === combatantId);
  if (idx < 0) return;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= list.length) return;
  const current = list[idx];
  const target = list[targetIdx];
  if (!current || !target) return;
  const nextInitiative = direction === 'up' ? target.initiative + 1 : target.initiative - 1;
  await api.patch(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants/${current.id}`, {
    initiative: nextInitiative,
  });
  await loadEncounterDetail();
}

async function toggleHidden(combatantId: string, currentHidden: boolean) {
  if (!currentEncounterId.value) return;
  await api.patch(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants/${combatantId}`, {
    isHidden: !currentHidden,
  });
  await loadEncounterDetail();
}

async function nextTurn() {
  if (!currentEncounterId.value) return;
  try {
    await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/next-turn`, {});
    await Promise.all([loadEncounterDetail(), loadEncounterEvents()]);
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo avanzar turno', 'error');
  }
}

function startAction(actorId: string, preset: EncounterActionType = 'attack') {
  actionActorId.value = actorId;
  actionTargetId.value = '';
  actionType.value = preset;
  actionAmount.value = 5;
  actionDc.value = 10;
  actionCondition.value = '';
  actionSuccess.value = true;
  actionNote.value = '';
  actionDurationRounds.value = 2;
  actionConcentratingOn.value = '';
  if (preset === 'concentration') actionTargetId.value = actorId;
}

function clearAction() {
  actionActorId.value = '';
}

async function submitAction() {
  if (!currentEncounterId.value || !actionActorId.value) return;
  try {
    await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/actions`, {
      actorCombatantId: actionActorId.value,
      targetCombatantId: actionTargetId.value || null,
      actionType: actionType.value,
      amount: actionAmount.value,
      dc: actionDc.value,
      condition: actionCondition.value.trim() || undefined,
      durationRounds: actionDurationRounds.value,
      concentratingOn: actionConcentratingOn.value.trim() || undefined,
      success: actionSuccess.value,
      note: actionNote.value.trim() || undefined,
    });
    await Promise.all([loadEncounterDetail(), loadEncounterEvents()]);
    toasts.push('Acción registrada', 'success');
    clearAction();
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo registrar la acción', 'error');
  }
}

async function removeCondition(combatantId: string, conditionId: string) {
  if (!currentEncounterId.value) return;
  try {
    await api.delete(
      `/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/combatants/${combatantId}/conditions/${conditionId}`
    );
    await Promise.all([loadEncounterDetail(), loadEncounterEvents()]);
    toasts.push('Condición eliminada', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo eliminar la condición', 'error');
  }
}

function eventSummary(ev: EncounterEventDto) {
  const actor = ev.actor_name || '—';
  const target = ev.target_name || '—';
  const p = ev.payload ?? {};
  switch (ev.action_type) {
    case 'attack':
      return `${actor} ataca a ${target}${p.note ? ` (${p.note})` : ''}`;
    case 'damage':
      return `${actor} causa ${p.amount ?? 0} de daño a ${target} (${p.hpBefore ?? '?'} -> ${p.hpAfter ?? '?'})`;
    case 'heal':
      return `${actor} cura ${p.amount ?? 0} a ${target} (${p.hpBefore ?? '?'} -> ${p.hpAfter ?? '?'})`;
    case 'save':
      return `${target} tirada de salvación CD ${p.dc ?? '?'}: ${p.success ? 'superada' : 'fallada'}`;
    case 'condition':
      if (p.expired) return `${target} pierde condición "${p.condition ?? '—'}"`;
      return `${actor} aplica condición "${p.condition ?? '—'}" a ${target} (${p.durationRounds ?? 1} rondas)`;
    case 'concentration':
      if (p.cleared || p.success === false) return `${target} pierde concentración`;
      if (p.spell) return `${target} empieza a concentrar "${p.spell}"`;
      return `${target} concentración: ${p.success ? 'mantenida' : 'perdida'}`;
    default:
      return p.note ? `${actor}: ${p.note}` : `${actor} registra nota`;
  }
}

async function setEncounterStatus(status: 'active' | 'paused' | 'finished') {
  if (!currentEncounterId.value) return;
  try {
    await api.patch(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}`, { status });
    await loadEncounters();
    await loadEncounterDetail();
    toasts.push(`Encuentro ${status === 'active' ? 'activado' : status === 'paused' ? 'pausado' : 'finalizado'}`, 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo actualizar estado', 'error');
  }
}

async function resetEncounter() {
  if (!currentEncounterId.value) return;
  try {
    await api.post(`/campaigns/${campaignId.value}/encounters/${currentEncounterId.value}/reset`, {});
    await loadEncounters();
    await loadEncounterDetail();
    toasts.push('Encuentro reiniciado', 'success');
  } catch (e) {
    toasts.push(e instanceof Error ? e.message : 'No se pudo reiniciar', 'error');
  }
}

function back() {
  router.push(`/campanas/${campaignId.value}`);
}
</script>

<template>
  <div class="page">
    <AppHeader>
      <template #actions>
        <button type="button" class="btn-ghost btn-sm" @click="back">← Campaña</button>
      </template>
    </AppHeader>
    <main class="main">
      <h2 class="title">Combat Tracker</h2>
      <p class="subtitle">Gestiona iniciativa y vida de PJ/monstruos en una sola vista.</p>

      <div v-if="loading" class="loader-wrap">
        <div class="loader"></div>
        <p>Cargando combate...</p>
      </div>
      <p v-else-if="error" class="error-banner">{{ error }}</p>
      <template v-else>
        <section class="dark-card panel">
          <div class="row">
            <div class="field">
              <label>Encuentro activo</label>
              <select v-model="currentEncounterId">
                <option v-if="encounters.length === 0" value="">Sin encuentros</option>
                <option v-for="e in encounters" :key="e.id" :value="e.id">
                  {{ e.name }} · Ronda {{ e.round }}
                </option>
              </select>
            </div>
            <div v-if="isMaster" class="field">
              <label>Nuevo encuentro</label>
              <div class="inline">
                <input v-model="newEncounterName" type="text" placeholder="Ej. Emboscada del puente" />
                <button type="button" class="btn-arc btn-sm" :disabled="creatingEncounter || !newEncounterName.trim()" @click="createEncounter">
                  {{ creatingEncounter ? '...' : 'Crear' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section v-if="isMaster" class="dark-card panel">
          <h3 class="section-title">Plantillas de encuentro</h3>
          <div class="row">
            <div class="field">
              <label>Plantilla guardada</label>
              <select v-model="selectedTemplateId">
                <option value="">Seleccionar plantilla</option>
                <option v-for="t in templates" :key="t.id" :value="t.id">
                  {{ t.name }} ({{ t.items.length }})
                </option>
              </select>
            </div>
            <div class="field">
              <label>Nueva plantilla desde encuentro actual</label>
              <div class="inline">
                <input v-model="newTemplateName" type="text" placeholder="Ej. Emboscada goblins" />
                <button
                  type="button"
                  class="btn-ghost btn-sm"
                  :disabled="creatingTemplate || !currentEncounterId || !newTemplateName.trim()"
                  @click="createTemplateFromCurrent"
                >
                  {{ creatingTemplate ? '...' : 'Guardar' }}
                </button>
              </div>
            </div>
          </div>
          <div class="inline">
            <button
              type="button"
              class="btn-gold btn-sm"
              :disabled="applyingTemplate || !currentEncounterId || !selectedTemplateId"
              @click="applyTemplate"
            >
              {{ applyingTemplate ? 'Aplicando...' : 'Aplicar al encuentro actual' }}
            </button>
            <button type="button" class="btn-danger btn-sm" :disabled="!selectedTemplateId" @click="deleteTemplate">
              Eliminar plantilla
            </button>
          </div>
        </section>

        <section class="dark-card panel">
          <h3 class="section-title">Cierre de sesión (snapshot)</h3>
          <div v-if="isMaster" class="row">
            <div class="field">
              <label>Título (opcional)</label>
              <input v-model="snapshotTitle" type="text" placeholder="Ej. Sesión 12 - Asedio al puente" />
            </div>
            <div class="field">
              <label>Nota rápida (opcional)</label>
              <input v-model="snapshotNote" type="text" placeholder="Resumen de loot, cliffhanger, etc." />
            </div>
          </div>
          <div v-if="isMaster" class="inline">
            <button type="button" class="btn-gold btn-sm" :disabled="creatingSnapshot || !currentEncounterId" @click="createSnapshot">
              {{ creatingSnapshot ? 'Guardando...' : 'Guardar snapshot' }}
            </button>
          </div>
          <p v-if="snapshots.length === 0" class="empty-note">Sin snapshots guardados aún.</p>
          <ul v-else class="snapshot-list">
            <li v-for="s in snapshots" :key="s.id" class="snapshot-item">
              <strong>{{ s.title }}</strong>
              <span class="snapshot-meta">
                R{{ s.summary.round }} · {{ s.summary.status }} · {{ s.summary.combatantsTotal }} combatientes · {{ new Date(s.created_at).toLocaleString() }}
              </span>
              <span v-if="s.note" class="snapshot-note">{{ s.note }}</span>
            </li>
          </ul>
        </section>

        <section v-if="currentEncounterId && isMaster" class="dark-card panel">
          <div class="toolbar">
            <h3 class="section-title">Añadir combatiente</h3>
            <button type="button" class="btn-ghost btn-sm" @click="showAddPanel = !showAddPanel">
              {{ showAddPanel ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <template v-if="showAddPanel">
          <div class="row">
            <div class="field">
              <label>Tipo</label>
              <select v-model="addMode">
                <option value="character">Personaje</option>
                <option value="monster">Monstruo</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            <div class="field">
              <label>Iniciativa</label>
              <input v-model.number="customInitiative" type="number" />
            </div>
          </div>
          <div v-if="addMode === 'character'" class="field">
            <label>Personaje</label>
            <select v-model="selectedCharacterId">
              <option v-for="ch in campaignCharacters" :key="ch.id" :value="ch.id">
                {{ ch.name_es || ch.name_en }} (Nv {{ ch.level }})
              </option>
            </select>
          </div>
          <div v-else-if="addMode === 'monster'" class="field">
            <label>Monstruo</label>
            <select v-model="selectedMonsterId">
              <option v-for="m in monsters" :key="m.id" :value="m.id">
                {{ m.nameEs || m.nameEn }} (HP {{ m.hp }}, AC {{ m.ac }})
              </option>
            </select>
          </div>
          <div v-else class="row">
            <div class="field">
              <label>Nombre</label>
              <input v-model="customName" type="text" placeholder="NPC / Esbirro / Boss" />
            </div>
            <div class="field">
              <label>HP/AC</label>
              <div class="inline">
                <input v-model.number="customHp" type="number" min="1" />
                <input v-model.number="customAc" type="number" min="1" />
              </div>
            </div>
          </div>
          <button
            v-if="isMaster"
            type="button"
            class="btn-gold btn-sm"
            :disabled="addingCombatant"
            @click="addCombatant"
          >
            {{ addingCombatant ? 'Añadiendo...' : 'Añadir al combate' }}
          </button>
          </template>
        </section>

        <section class="dark-card panel">
          <div class="toolbar">
            <h3 class="section-title">Lista de combate</h3>
            <div class="inline">
              <span v-if="encounterDetail" class="status-badge" :class="`status-${encounterDetail.status}`">
                {{ encounterStatusLabel }}
              </span>
              <label class="compact-toggle">
                <input v-model="hideDefeated" type="checkbox" />
                Ocultar derrotados
              </label>
              <button
                v-if="isMaster && encounterDetail"
                type="button"
                class="btn-gold btn-sm"
                :disabled="encounterDetail.status !== 'active'"
                @click="nextTurn"
              >
                Siguiente turno
              </button>
              <button
                v-if="isMaster && encounterDetail"
                type="button"
                class="btn-ghost btn-sm"
                :disabled="encounterDetail.status === 'active'"
                @click="setEncounterStatus('active')"
              >
                Reanudar
              </button>
              <button
                v-if="isMaster && encounterDetail"
                type="button"
                class="btn-ghost btn-sm"
                :disabled="encounterDetail.status === 'paused'"
                @click="setEncounterStatus('paused')"
              >
                Pausar
              </button>
              <button
                v-if="isMaster && encounterDetail"
                type="button"
                class="btn-danger btn-sm"
                :disabled="encounterDetail.status === 'finished'"
                @click="setEncounterStatus('finished')"
              >
                Finalizar
              </button>
              <button v-if="isMaster && encounterDetail" type="button" class="btn-ghost btn-sm" @click="resetEncounter">
                Reiniciar
              </button>
            </div>
          </div>
          <p v-if="loadingDetail" class="empty-note">Actualizando encuentro...</p>
          <p v-else-if="!encounterDetail || visibleCombatants.length === 0" class="empty-note">Sin combatientes aún.</p>
          <ul v-else class="combat-list">
            <li
              v-for="(c, idx) in visibleCombatants"
              :key="c.id"
              class="combat-item"
              :class="{ active: c.id === activeCombatantId }"
            >
              <div class="left">
                <strong>{{ c.name }}</strong>
                <span class="meta">
                  Ini {{ c.initiative }} · AC {{ c.ac ?? '—' }}
                  <span v-if="c.concentrating_on" class="concentration-chip">Concentrando: {{ c.concentrating_on }}</span>
                  <span v-if="c.is_hidden" class="hidden-badge">Oculto</span>
                </span>
                <div v-if="c.conditions?.length" class="condition-list">
                  <span v-for="cond in c.conditions" :key="cond.id" class="condition-chip">
                    {{ cond.condition_name }} ({{ cond.rounds_remaining }})
                    <button
                      v-if="isMaster"
                      type="button"
                      class="cond-remove"
                      @click="removeCondition(c.id, cond.id)"
                      aria-label="Eliminar condición"
                    >
                      ×
                    </button>
                  </span>
                </div>
              </div>
              <div class="right">
                <span class="hp">{{ c.hp_current }} / {{ c.hp_max }}</span>
                <div v-if="isMaster" class="hp-actions">
                  <button type="button" class="btn-gold btn-sm" @click="startAction(c.id, 'attack')">Acción</button>
                  <button type="button" class="btn-ghost btn-sm" @click="startAction(c.id, 'concentration')">Concentración</button>
                  <button type="button" class="btn-ghost btn-sm" :disabled="idx === 0" @click="moveCombatant(c.id, 'up')">↑</button>
                  <button type="button" class="btn-ghost btn-sm" :disabled="idx === visibleCombatants.length - 1" @click="moveCombatant(c.id, 'down')">↓</button>
                  <input v-model.number="initiativeEdits[c.id]" class="ini-input" type="number" />
                  <button type="button" class="btn-ghost btn-sm" @click="setInitiative(c.id)">Ini</button>
                  <button type="button" class="btn-ghost btn-sm" @click="toggleHidden(c.id, c.is_hidden)">
                    {{ c.is_hidden ? 'Revelar' : 'Ocultar' }}
                  </button>
                  <button type="button" class="btn-danger btn-sm" @click="updateHp(c.id, -10)">-10</button>
                  <button type="button" class="btn-danger btn-sm" @click="updateHp(c.id, -5)">-5</button>
                  <button type="button" class="btn-ghost btn-sm" @click="updateHp(c.id, 5)">+5</button>
                  <button type="button" class="btn-ghost btn-sm" @click="updateHp(c.id, 10)">+10</button>
                  <button type="button" class="btn-danger btn-sm" @click="removeCombatant(c.id)">✕</button>
                </div>
              </div>
            </li>
          </ul>
        </section>

        <section v-if="isMaster && actionActorId" class="dark-card panel">
          <h3 class="section-title">Registrar acción</h3>
          <div class="row">
            <div class="field">
              <label>Tipo</label>
              <select v-model="actionType">
                <option value="attack">Ataque</option>
                <option value="damage">Daño</option>
                <option value="heal">Curación</option>
                <option value="save">Salvación</option>
                <option value="condition">Condición</option>
                <option value="concentration">Concentración</option>
                <option value="note">Nota</option>
              </select>
            </div>
            <div class="field">
              <label>Objetivo</label>
              <select v-model="actionTargetId">
                <option value="">(sin objetivo)</option>
                <option v-for="c in sortedCombatants" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="row">
            <div v-if="actionType === 'damage' || actionType === 'heal'" class="field">
              <label>Cantidad</label>
              <input v-model.number="actionAmount" type="number" min="1" />
            </div>
            <div v-if="actionType === 'save'" class="field">
              <label>CD</label>
              <input v-model.number="actionDc" type="number" min="1" />
            </div>
            <div v-if="actionType === 'condition'" class="field">
              <label>Condición</label>
              <input v-model="actionCondition" type="text" placeholder="Ej. Envenenado" />
            </div>
            <div v-if="actionType === 'condition'" class="field">
              <label>Duración (rondas)</label>
              <input v-model.number="actionDurationRounds" type="number" min="1" />
            </div>
            <div v-if="actionType === 'save' || actionType === 'concentration'" class="field">
              <label>Resultado</label>
              <select v-model="actionSuccess">
                <option :value="true">Superada / mantenida</option>
                <option :value="false">Fallada / perdida</option>
              </select>
            </div>
            <div v-if="actionType === 'concentration'" class="field">
              <label>Hechizo/efecto (opcional)</label>
              <input v-model="actionConcentratingOn" type="text" placeholder="Ej. Bendición" />
            </div>
          </div>
          <div class="field">
            <label>Nota (opcional)</label>
            <input v-model="actionNote" type="text" placeholder="Detalle breve de la acción" />
          </div>
          <div class="inline">
            <button type="button" class="btn-gold btn-sm" @click="submitAction">Registrar</button>
            <button type="button" class="btn-ghost btn-sm" @click="clearAction">Cancelar</button>
          </div>
        </section>

        <section class="dark-card panel">
          <h3 class="section-title">Registro de acciones</h3>
          <p v-if="encounterEvents.length === 0" class="empty-note">Aún no hay acciones registradas.</p>
          <ul v-else class="event-list">
            <li v-for="ev in encounterEvents" :key="ev.id" class="event-item">
              <span class="event-time">{{ new Date(ev.created_at).toLocaleTimeString() }}</span>
              <span class="event-text">{{ eventSummary(ev) }}</span>
            </li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.main { max-width: 980px; margin: 0 auto; width: 100%; padding: 1.25rem; }
.title { margin: 0 0 0.35rem 0; }
.subtitle { margin: 0 0 1rem 0; color: var(--text-muted); }
.panel { padding: 1rem; margin-bottom: 0.9rem; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.field { display: flex; flex-direction: column; gap: 0.25rem; }
.field label { font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-data); }
.inline { display: flex; gap: 0.45rem; align-items: center; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; }
.combat-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.45rem; }
.combat-item { display: flex; justify-content: space-between; gap: 0.6rem; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 0.55rem; }
.combat-item.active { border-color: var(--border-gold); background: var(--gold-dim); }
.left { display: flex; flex-direction: column; }
.meta { color: var(--text-muted); font-size: 0.8rem; }
.right { display: flex; align-items: center; gap: 0.6rem; }
.hp { min-width: 88px; text-align: right; font-family: var(--font-data); }
.hp-actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.ini-input { width: 60px; }
.hidden-badge {
  margin-left: 0.35rem;
  border: 1px solid var(--border-subtle);
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}
.concentration-chip {
  margin-left: 0.35rem;
  border: 1px solid var(--border-arcane);
  border-radius: 4px;
  padding: 0.05rem 0.32rem;
  font-size: 0.72rem;
  color: var(--arcane-blue);
}
.condition-list {
  margin-top: 0.3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
}
.condition-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  border: 1px solid var(--border-gold);
  border-radius: 999px;
  padding: 0.06rem 0.42rem;
  font-size: 0.72rem;
  color: var(--gold-light);
  background: rgba(192, 84, 40, 0.07);
}
.cond-remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}
.compact-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-size: 0.82rem;
}
.status-badge {
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  padding: 0.1rem 0.5rem;
  font-size: 0.76rem;
  font-family: var(--font-data);
}
.status-active { border-color: var(--border-success); color: var(--success); }
.status-paused { border-color: var(--border-gold); color: var(--gold); }
.status-finished { border-color: var(--border-danger); color: var(--danger); }
.empty-note { color: var(--text-muted); font-style: italic; margin: 0; }
.snapshot-list { list-style: none; margin: 0.45rem 0 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.snapshot-item {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.45rem 0.55rem;
}
.snapshot-meta { color: var(--text-muted); font-size: 0.8rem; font-family: var(--font-data); }
.snapshot-note { color: var(--text-primary); font-size: 0.84rem; }
.event-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.event-item {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: 0.5rem;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 0.45rem 0.5rem;
}
.event-time { color: var(--text-muted); font-family: var(--font-data); font-size: 0.78rem; }
.event-text { color: var(--text-primary); font-size: 0.86rem; }
@media (max-width: 720px) {
  .row { grid-template-columns: 1fr; }
  .combat-item { flex-direction: column; }
  .right { justify-content: space-between; width: 100%; }
  .event-item { grid-template-columns: 1fr; }
}
</style>
