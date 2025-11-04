<template>
  <transition name="modal-fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content template-modal">
        <div class="modal-header">
          <h3>📄 Choose a Template</h3>
          <button
            class="close-btn"
            aria-label="Close"
            @click="$emit('close')"
          >
            ✕
          </button>
        </div>

        <div class="modal-body">
          <!-- Category Tabs -->
          <div class="template-categories">
            <button
              v-for="cat in categories"
              :key="cat.value"
              :class="['category-btn', { active: selectedCategory === cat.value }]"
              @click="selectedCategory = cat.value"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>

          <!-- Template Grid -->
          <div class="template-grid">
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-card"
              @click="selectTemplate(template)"
            >
              <div class="template-icon">{{ template.icon }}</div>
              <div class="template-info">
                <h4>{{ template.name }}</h4>
                <p>{{ template.description }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getTemplates, type Template } from '../utils/templates'

interface Props {
  show: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
  select: [template: Template]
}>()

const selectedCategory = ref<'all' | Template['category']>('all')

const categories = [
  { value: 'all' as const, label: 'All', icon: '📚' },
  { value: 'document' as const, label: 'Documents', icon: '📄' },
  { value: 'email' as const, label: 'Email', icon: '📧' },
  { value: 'blog' as const, label: 'Blog', icon: '✍️' },
  { value: 'marketing' as const, label: 'Marketing', icon: '📢' },
]

const templates = getTemplates()

const filteredTemplates = computed(() => {
  if (selectedCategory.value === 'all') {
    return templates
  }
  return templates.filter((t) => t.category === selectedCategory.value)
})

function selectTemplate(template: Template) {
  emit('select', template)
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.template-modal {
  background: var(--editor-bg, #ffffff);
  border-radius: var(--border-radius, 8px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  max-width: 900px;
  width: 100%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--editor-border, #d8dde6);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--content-color, #1f2937);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--toolbar-text, #1f2937);
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: var(--toolbar-bg, #f8f9fb);
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.template-categories {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.category-btn {
  padding: 8px 16px;
  border: 1px solid var(--editor-border, #d8dde6);
  background: var(--editor-bg, #ffffff);
  color: var(--toolbar-text, #1f2937);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.category-btn:hover {
  background: var(--toolbar-bg, #f8f9fb);
}

.category-btn.active {
  background: var(--toolbar-accent, #3b82f6);
  color: white;
  border-color: var(--toolbar-accent, #3b82f6);
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.template-card {
  border: 1px solid var(--editor-border, #d8dde6);
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--editor-bg, #ffffff);
}

.template-card:hover {
  border-color: var(--toolbar-accent, #3b82f6);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
  transform: translateY(-2px);
}

.template-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.template-info h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: var(--content-color, #1f2937);
}

.template-info p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--toolbar-text, #6b7280);
  line-height: 1.4;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

/* Dark mode */
.theme-dark .modal-overlay {
  background-color: rgba(0, 0, 0, 0.7);
}

.theme-dark .template-card:hover {
  box-shadow: 0 4px 12px rgba(96, 165, 250, 0.2);
}
</style>
