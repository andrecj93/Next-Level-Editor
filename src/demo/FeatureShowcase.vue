<template>
  <div class="feature-showcase">
    <div class="showcase-grid">
      <!-- Feature Cards -->
      <div
        v-for="feature in features"
        :key="feature.id"
        class="feature-card"
        :class="{ highlighted: feature.highlighted }"
      >
        <div class="feature-icon">
          {{ feature.icon }}
        </div>
        <h3 class="feature-title">
          {{ feature.title }}
        </h3>
        <p class="feature-description">
          {{ feature.description }}
        </p>
        <div
          v-if="feature.tags"
          class="feature-tags"
        >
          <span
            v-for="tag in feature.tags"
            :key="tag"
            class="feature-tag"
          >{{ tag }}</span>
        </div>
      </div>
    </div>

    <!-- Keyboard Shortcuts Section -->
    <div class="shortcuts-section">
      <h2>⌨️ Keyboard Shortcuts</h2>
      <div class="shortcuts-grid">
        <div
          v-for="shortcut in keyboardShortcuts"
          :key="shortcut.id"
          class="shortcut-item"
        >
          <div class="shortcut-keys">
            <kbd
              v-for="(key, index) in shortcut.keys"
              :key="index"
            >{{ key }}</kbd>
          </div>
          <span class="shortcut-description">{{ shortcut.description }}</span>
        </div>
      </div>
    </div>

    <!-- Slash Commands Section -->
    <div class="commands-section">
      <h2>⚡ Slash Commands</h2>
      <p class="section-subtitle">
        Type <code>/</code> in the editor to access quick actions
      </p>
      <div class="commands-grid">
        <div
          v-for="command in slashCommands"
          :key="command.command"
          class="command-item"
        >
          <code class="command-code">{{ command.command }}</code>
          <span class="command-description">{{ command.description }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const features = [
  {
    id: 'modern-toolbar',
    icon: '🎨',
    title: 'Modern Toolbar',
    description: 'CKEditor-inspired horizontal toolbar with dropdown menus and professional design',
    tags: ['New', 'UI'],
    highlighted: true
  },
  {
    id: 'syntax-highlighting',
    icon: '💻',
    title: 'Code Blocks',
    description: 'Syntax highlighting for 22 programming languages with Prism.js',
    tags: ['Prism.js', 'Code'],
    highlighted: true
  },
  {
    id: 'media',
    icon: '🖼️',
    title: 'Rich Media',
    description: 'Insert images with preview, embed YouTube/Vimeo videos, and add emojis',
    tags: ['Images', 'Videos', 'Emojis']
  },
  {
    id: 'tables',
    icon: '📊',
    title: 'Tables',
    description: 'Create custom tables with header rows and styled borders',
    tags: ['Tables', 'Data']
  },
  {
    id: 'find-replace',
    icon: '🔍',
    title: 'Find & Replace',
    description: 'Full-featured search with case-sensitive and whole-word options',
    tags: ['Search', 'Ctrl+F']
  },
  {
    id: 'auto-save',
    icon: '💾',
    title: 'Auto-Save',
    description: '2-second debounced auto-save with visual status indicator',
    tags: ['Auto', 'Save']
  },
  {
    id: 'dark-mode',
    icon: '🌓',
    title: 'Dark Mode',
    description: 'Beautiful dark theme with smooth transitions and localStorage persistence',
    tags: ['Theme', 'UI']
  },
  {
    id: 'export',
    icon: '📤',
    title: 'Export',
    description: 'Download content as HTML or Markdown with one click',
    tags: ['Export', 'Download']
  },
  {
    id: 'floating-toolbar',
    icon: '💬',
    title: 'Floating Toolbar',
    description: 'Medium-style context menu appears on text selection',
    tags: ['Selection', 'UI']
  },
  {
    id: 'slash-commands',
    icon: '⚡',
    title: 'Slash Commands',
    description: '14+ quick actions accessible by typing / in the editor',
    tags: ['Commands', 'Quick']
  },
  {
    id: 'colors',
    icon: '🎨',
    title: 'Color Pickers',
    description: 'Text and background colors with 25 presets plus custom selector',
    tags: ['Colors', 'Palette']
  },
  {
    id: 'fullscreen',
    icon: '⛶',
    title: 'Fullscreen Mode',
    description: 'Distraction-free writing mode with centered content',
    tags: ['Focus', 'Writing']
  }
]

const keyboardShortcuts = [
  { id: 1, keys: ['Ctrl', 'B'], description: 'Bold' },
  { id: 2, keys: ['Ctrl', 'I'], description: 'Italic' },
  { id: 3, keys: ['Ctrl', 'U'], description: 'Underline' },
  { id: 4, keys: ['Ctrl', 'K'], description: 'Insert Link' },
  { id: 5, keys: ['Ctrl', 'Z'], description: 'Undo' },
  { id: 6, keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo' },
  { id: 7, keys: ['Ctrl', 'F'], description: 'Find & Replace' },
  { id: 8, keys: ['Ctrl', 'Alt', '1'], description: 'Heading 1' },
  { id: 9, keys: ['Ctrl', 'Alt', '2'], description: 'Heading 2' },
  { id: 10, keys: ['Ctrl', 'Alt', '3'], description: 'Heading 3' },
  { id: 11, keys: ['Ctrl', 'Alt', '0'], description: 'Paragraph' },
  { id: 12, keys: ['/'], description: 'Open Slash Commands' }
]

const slashCommands = [
  { command: '/heading1', description: 'Large heading (H1)' },
  { command: '/heading2', description: 'Medium heading (H2)' },
  { command: '/heading3', description: 'Small heading (H3)' },
  { command: '/paragraph', description: 'Regular paragraph' },
  { command: '/bold', description: 'Bold text' },
  { command: '/italic', description: 'Italic text' },
  { command: '/bullet-list', description: 'Bulleted list' },
  { command: '/numbered-list', description: 'Numbered list' },
  { command: '/quote', description: 'Block quote' },
  { command: '/code', description: 'Code block with syntax highlighting' },
  { command: '/link', description: 'Insert link' },
  { command: '/image', description: 'Insert image' },
  { command: '/table', description: 'Insert table' },
  { command: '/divider', description: 'Horizontal rule' }
]
</script>

<style scoped>
.feature-showcase {
  padding: 40px 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 24px;
  margin-bottom: 60px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.feature-card.highlighted {
  border-color: #667eea;
  background: linear-gradient(135deg, #f5f7ff 0%, #fff 100%);
}

.feature-icon {
  font-size: 48px;
  margin-bottom: 16px;
  text-align: center;
}

.feature-title {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #333;
  text-align: center;
}

.feature-description {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 12px;
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.feature-tag {
  background: #667eea;
  color: white;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.shortcuts-section,
.commands-section {
  background: white;
  border-radius: 12px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
}

.shortcuts-section h2,
.commands-section h2 {
  font-size: 28px;
  margin-bottom: 24px;
  color: #333;
  text-align: center;
}

.section-subtitle {
  text-align: center;
  color: #666;
  margin-bottom: 24px;
  font-size: 16px;
}

.section-subtitle code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #667eea;
  font-weight: 600;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.shortcut-item:hover {
  background: #e9ecef;
}

.shortcut-keys {
  display: flex;
  gap: 4px;
}

.shortcut-keys kbd {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  min-width: 28px;
  text-align: center;
}

.shortcut-description {
  font-size: 14px;
  color: #495057;
}

.commands-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.command-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.2s ease;
  border-left: 3px solid transparent;
}

.command-item:hover {
  background: #e9ecef;
  border-left-color: #667eea;
}

.command-code {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 4px 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #667eea;
  white-space: nowrap;
}

.command-description {
  font-size: 14px;
  color: #495057;
}

@media (max-width: 768px) {
  .feature-showcase {
    padding: 20px 10px;
  }
  
  .showcase-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .shortcuts-section,
  .commands-section {
    padding: 24px 16px;
  }
  
  .shortcuts-grid,
  .commands-grid {
    grid-template-columns: 1fr;
  }
}
</style>
