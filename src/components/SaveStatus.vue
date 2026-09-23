<template>
  <div
    v-if="saveStatus === 'error' || saveStatus === 'conflict' || (ownsFixedChrome && (isSaving || lastSaved || hasPendingChanges))"
    class="auto-save-indicator"
    :class="{
      'is-saving': isSaving,
      'is-error': saveStatus === 'error',
      'is-saved': saveStatus === 'saved' || (!saveStatus && !isSaving && lastSaved),
    }"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <!-- Error wins even when a PRIOR save left lastSaved set, so a silent
         failure never reads as 'Saved'. #r20-2 -->
    <span v-if="saveStatus === 'error'" class="save-error">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M12 8v5M12 16.5v.5M10.3 3.9 2.4 18a1.9 1.9 0 0 0 1.7 2.9h15.8a1.9 1.9 0 0 0 1.7-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0Z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ t("Couldn't save changes") }}
      <button type="button" class="save-retry" @click="$emit('retry-save')">{{ t("Retry") }}</button>
    </span>
    <span v-else-if="saveStatus === 'conflict'" class="save-error">{{ t("Save conflict — review your changes") }}</span>
    <span v-else-if="isSaving" class="saving">
      <svg
        class="asi-spinner"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M21 12a9 9 0 1 1-6.219-8.56"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
        />
      </svg>
      {{ t(persistentSave ? 'Saving…' : 'Updating…') }}
    </span>
    <span v-else-if="hasPendingChanges" class="save-pending">{{ t(persistentSave ? 'Unsaved changes' : 'Updating…') }}</span>
    <span v-else-if="lastSaved" :key="lastSaved.getTime()" class="saved">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 6 9 17l-5-5"
          stroke="currentColor"
          stroke-width="2.6"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      {{ t(persistentSave ? 'Saved' : 'Updated') }} {{ t("at") }} {{ date(lastSaved, { hour: 'numeric', minute: '2-digit', second: '2-digit' }) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useEditorLocale } from "../composables/useEditorLocale";
const { t, date } = useEditorLocale();
withDefaults(defineProps<{
  saveStatus?: "saving" | "conflict" | "error" | "saved" | "unsaved";
  ownsFixedChrome?: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasPendingChanges?: boolean;
  persistentSave?: boolean;
}>(), { ownsFixedChrome: true, saveStatus: undefined, hasPendingChanges: false, persistentSave: true });
defineEmits<{ "retry-save": [] }>();
</script>
