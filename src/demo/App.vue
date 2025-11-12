<template>
  <div class="demo-app">
    <header class="demo-header">
      <div class="header-content">
        <div class="header-badge">✨ Open Source • MIT Licensed • Vue 3</div>
        <h1 class="header-title">
          <span class="gradient-text">Next Level</span>
          <span class="highlight-text">Editor</span>
        </h1>
        <p class="header-subtitle">
          A <strong>professional-grade</strong> WYSIWYG editor for Vue.js 3 with
          modern features.
          <br>
          Inspired by <span class="brand">CKEditor</span>,
          <span class="brand">Notion</span>, and
          <span class="brand">Medium</span>.
        </p>

        <!-- CTA Buttons -->
        <div class="header-ctas">
          <button class="cta-primary" @click="scrollToEditor">
            <span class="cta-icon">🚀</span>
            Try Live Demo
          </button>
          <a
            href="https://github.com/andrecj93/next-level-editor"
            target="_blank"
            class="cta-secondary"
          >
            <span class="cta-icon">⭐</span>
            Star on GitHub
          </a>
          <button class="cta-outline" @click="activeTab = 'docs'">
            <span class="cta-icon">📚</span>
            Documentation
          </button>
        </div>

        <!-- Feature Pills -->
        <div class="header-badges">
          <span class="badge">🎨 Modern UI</span>
          <span class="badge">💻 22 Languages</span>
          <span class="badge">🌓 Dark Mode</span>
          <span class="badge">📱 Responsive</span>
          <span class="badge">⚡ 265+ Tests</span>
          <span class="badge">🔒 Zero CVEs</span>
        </div>

        <!-- Stats -->
        <div class="header-stats">
          <div class="stat-item">
            <div class="stat-value">224KB</div>
            <div class="stat-label">Gzipped</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">81%</div>
            <div class="stat-label">Coverage</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">50+</div>
            <div class="stat-label">Features</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">TS</div>
            <div class="stat-label">TypeScript</div>
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="demo-nav">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['nav-tab', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <main class="demo-main">
      <!-- Editor Tab -->
      <div v-if="activeTab === 'editor'" class="tab-content">
        <div class="editor-section">
          <div class="demo-header-row">
            <div>
              <h2>🎯 Interactive Demo</h2>
              <p class="section-description">
                Try all the features! Type <code>/</code> for slash commands,
                select text to see the floating toolbar, or press
                <kbd>Ctrl+F</kbd> to search. Click the theme toggle to switch to
                dark mode.
              </p>
            </div>
            <button
              class="config-toggle-btn"
              :class="{ active: showConfigPanel }"
              @click="showConfigPanel = !showConfigPanel"
            >
              <span class="config-icon">⚙️</span>
              {{ showConfigPanel ? "Hide" : "Show" }} Settings
            </button>
          </div>

          <!-- Template Selector -->
          <div class="template-selector">
            <label for="template-select">📋 Choose a Template:</label>
            <select
              id="template-select"
              v-model="selectedTemplate"
              class="template-dropdown"
              @change="loadTemplate"
            >
              <optgroup label="📝 Getting Started">
                <option value="empty">📄 Empty Document</option>
                <option value="simple">✏️ Simple Start</option>
                <option value="showcase">🎨 Feature Showcase</option>
              </optgroup>

              <optgroup label="💼 Business & Professional">
                <option value="newsletter">📧 Newsletter</option>
                <option value="meeting-notes">📋 Meeting Notes</option>
                <option value="case-study">📊 Case Study</option>
              </optgroup>

              <optgroup label="🚀 Marketing & Sales">
                <option value="landing-page">🚀 Landing Page</option>
                <option value="blog-post">📝 Blog Post</option>
              </optgroup>

              <optgroup label="👨‍💻 Personal & Career">
                <option value="portfolio">💼 Portfolio</option>
                <option value="resume">📄 Resume/CV</option>
              </optgroup>

              <optgroup label="📚 Technical & Documentation">
                <option value="documentation">📚 API Documentation</option>
              </optgroup>
            </select>
            <button
              class="template-preview-btn"
              @click="showTemplateGallery = !showTemplateGallery"
            >
              👁️ Browse All Templates
            </button>
          </div>

          <!-- Template Gallery Modal -->
          <div
            v-if="showTemplateGallery"
            class="template-gallery-overlay"
            @click="showTemplateGallery = false"
          >
            <div class="template-gallery-modal" @click.stop>
              <div class="gallery-header">
                <h3>📚 Template Gallery</h3>
                <button
                  class="close-gallery"
                  @click="showTemplateGallery = false"
                >
                  ✕
                </button>
              </div>

              <div class="gallery-grid">
                <div
                  v-for="template in templates"
                  :key="template.id"
                  class="gallery-card"
                  :class="{ active: selectedTemplate === template.id }"
                  @click="selectTemplateFromGallery(template.id)"
                >
                  <div class="card-icon">
                    {{ template.icon }}
                  </div>
                  <h4 class="card-title">
                    {{ template.name }}
                  </h4>
                  <p class="card-description">
                    {{ template.description }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuration Panel -->
          <div v-if="showConfigPanel" class="config-panel">
            <h3 class="config-title">⚙️ Editor Configuration</h3>

            <!-- Width Control -->
            <div class="config-group">
              <label class="config-label">
                📏 Width: {{ editorConfig.width }}{{ editorConfig.widthUnit }}
              </label>
              <div class="slider-row">
                <input
                  v-model.number="editorConfig.width"
                  type="range"
                  min="50"
                  max="100"
                  class="config-slider"
                >
                <select v-model="editorConfig.widthUnit" class="unit-selector">
                  <option value="%">%</option>
                  <option value="px">px</option>
                  <option value="vw">vw</option>
                </select>
              </div>
            </div>

            <!-- Height Control -->
            <div class="config-group">
              <label class="config-label">
                📐 Height: {{ editorConfig.height
                }}{{ editorConfig.heightUnit }}
              </label>
              <div class="slider-row">
                <input
                  v-model.number="editorConfig.height"
                  type="range"
                  min="300"
                  max="1000"
                  step="50"
                  class="config-slider"
                >
                <select v-model="editorConfig.heightUnit" class="unit-selector">
                  <option value="px">px</option>
                  <option value="vh">vh</option>
                </select>
              </div>
            </div>

            <!-- Feature Toggles -->
            <div class="config-group">
              <label class="config-label">✨ Features</label>

              <div class="toggle-item">
                <label class="toggle-label">
                  <input
                    v-model="editorConfig.showWritingStats"
                    type="checkbox"
                    class="toggle-checkbox"
                  >
                  <span class="toggle-switch" />
                  <span class="toggle-text">📊 Writing Statistics</span>
                </label>
              </div>

              <div class="toggle-item">
                <label class="toggle-label">
                  <input
                    v-model="editorConfig.enableComments"
                    type="checkbox"
                    class="toggle-checkbox"
                  >
                  <span class="toggle-switch" />
                  <span class="toggle-text">💬 Comments System</span>
                </label>
              </div>

              <div class="toggle-item">
                <label class="toggle-label">
                  <input
                    v-model="editorConfig.enableVariables"
                    type="checkbox"
                    class="toggle-checkbox"
                  >
                  <span class="toggle-switch" />
                  <span class="toggle-text">🔤 Variable Autocomplete</span>
                </label>
              </div>
            </div>

            <!-- Placeholder -->
            <div class="config-group">
              <label class="config-label"> 💭 Placeholder Text </label>
              <input
                v-model="editorConfig.placeholder"
                type="text"
                class="config-input"
                placeholder="Enter placeholder text..."
              >
            </div>

            <!-- Reset Button -->
            <button class="reset-btn" @click="resetConfig">
              🔄 Reset to Defaults
            </button>
          </div>

          <NextLevelEditor
            v-model="content"
            :width="editorWidth"
            :height="editorHeight"
            :placeholder="editorConfig.placeholder"
            :show-writing-stats="editorConfig.showWritingStats"
            :enable-comments="editorConfig.enableComments"
            :enable-variables="editorConfig.enableVariables"
            @focus="handleFocus"
            @blur="handleBlur"
          />
        </div>

        <div class="output-grid">
          <div class="output-section">
            <h3>📄 HTML Output</h3>
            <div class="output-code">
              <pre><code>{{ content || 'No content yet...' }}</code></pre>
            </div>
          </div>

          <div class="preview-section">
            <h3>👁️ Live Preview</h3>
            <div
              class="preview-content"
              v-html="
                content ||
                '<p class=\'placeholder\'>Your preview will appear here...</p>'
              "
            />
          </div>
        </div>
      </div>

      <!-- Features Tab -->
      <div v-if="activeTab === 'features'" class="tab-content">
        <FeatureShowcase />
      </div>

      <!-- Documentation Tab -->
      <div v-if="activeTab === 'docs'" class="tab-content">
        <div class="docs-section">
          <h2>📚 Documentation</h2>

          <div class="doc-block">
            <h3>Installation</h3>
            <pre><code>npm install next-level-editor</code></pre>
          </div>

          <div class="doc-block">
            <h3>Basic Usage</h3>
            <pre><code>&lt;template&gt;
  &lt;NextLevelEditor v-model="content" /&gt;
&lt;/template&gt;

&lt;script setup&gt;
import { ref } from 'vue'
import { NextLevelEditor } from 'next-level-editor'
import 'next-level-editor/dist/style.css'

const content = ref('&lt;p&gt;Hello World!&lt;/p&gt;')
&lt;/script&gt;</code></pre>
          </div>

          <div class="doc-block">
            <h3>Props</h3>
            <table class="props-table">
              <thead>
                <tr>
                  <th>Prop</th>
                  <th>Type</th>
                  <th>Default</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>modelValue</code></td>
                  <td>String</td>
                  <td>''</td>
                  <td>The HTML content (v-model)</td>
                </tr>
                <tr>
                  <td><code>placeholder</code></td>
                  <td>String</td>
                  <td>'Start typing...'</td>
                  <td>Placeholder text when empty</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="doc-block">
            <h3>Events</h3>
            <table class="props-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Payload</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>update:modelValue</code></td>
                  <td>String</td>
                  <td>Emitted when content changes</td>
                </tr>
                <tr>
                  <td><code>focus</code></td>
                  <td>Event</td>
                  <td>Emitted when editor gains focus</td>
                </tr>
                <tr>
                  <td><code>blur</code></td>
                  <td>Event</td>
                  <td>Emitted when editor loses focus</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="doc-block">
            <h3>Features Overview</h3>
            <ul class="feature-list">
              <li>
                ✅ Modern CKEditor-inspired horizontal toolbar with dropdowns
              </li>
              <li>✅ Syntax highlighting for 22 programming languages</li>
              <li>✅ Image upload with preview and alt text</li>
              <li>✅ YouTube & Vimeo video embeds</li>
              <li>✅ Table insertion with custom rows/columns</li>
              <li>✅ Find & Replace with case-sensitive options</li>
              <li>✅ Auto-save with visual indicator</li>
              <li>✅ Dark mode with localStorage persistence</li>
              <li>✅ Emoji picker with 100+ emojis</li>
              <li>✅ Floating toolbar on text selection</li>
              <li>✅ 14+ slash commands for quick actions</li>
              <li>✅ Export to HTML and Markdown</li>
              <li>✅ Full-screen distraction-free mode</li>
              <li>✅ Color pickers for text and background</li>
              <li>✅ Word and character count</li>
            </ul>
          </div>
        </div>
      </div>
    </main>

    <footer class="demo-footer">
      <p>
        Made with ❤️ by Next Level Editor Team |
        <a href="https://github.com/andrecj93/next-level-editor" target="_blank"
          >GitHub</a
        >
        |
        <a
          href="https://www.npmjs.com/package/next-level-editor"
          target="_blank"
          >npm</a
        >
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import NextLevelEditor from "../components/NextLevelEditor.vue";
import FeatureShowcase from "./FeatureShowcase.vue";
import {
  getAllTemplates,
  getTemplateById,
  getDefaultTemplate,
} from "./examples/exampleTemplates";
import { smoothScrollIntoView } from "../utils/scroll";

const activeTab = ref("editor");

const tabs = [
  { id: "editor", label: "Editor", icon: "✏️" },
  { id: "features", label: "Features", icon: "✨" },
  { id: "docs", label: "Documentation", icon: "📚" },
];

// Use the showcase template as default, unless 'empty' query param is present
const templates = getAllTemplates();
const selectedTemplate = ref("showcase");
const showTemplateGallery = ref(false);
const showConfigPanel = ref(false);
const urlParams = new URLSearchParams(window.location.search);
const startEmpty = urlParams.get("empty") === "true";
const content = ref(startEmpty ? "" : getDefaultTemplate().content);

// Editor configuration props
const editorConfig = ref({
  width: "100",
  widthUnit: "%",
  height: "600",
  heightUnit: "px",
  showWritingStats: true,
  enableComments: true,
  enableVariables: true,
  placeholder:
    "Start typing your content here... Try typing / for quick commands!",
});

// Computed property for width/height
const editorWidth = computed(
  () => `${editorConfig.value.width}${editorConfig.value.widthUnit}`
);
const editorHeight = computed(
  () => `${editorConfig.value.height}${editorConfig.value.heightUnit}`
);

const loadTemplate = () => {
  const template = getTemplateById(selectedTemplate.value);
  if (template) {
    content.value = template.content;
  }
};

const selectTemplateFromGallery = (templateId: string) => {
  selectedTemplate.value = templateId;
  loadTemplate();
  showTemplateGallery.value = false;
};

const resetConfig = () => {
  editorConfig.value = {
    width: "100",
    widthUnit: "%",
    height: "600",
    heightUnit: "px",
    showWritingStats: true,
    enableComments: true,
    enableVariables: true,
    placeholder:
      "Start typing your content here... Try typing / for quick commands!",
  };
};

const scrollToEditor = () => {
  activeTab.value = "editor";
  setTimeout(() => {
    const editorSection = document.querySelector(".editor-section");
    if (editorSection) {
      smoothScrollIntoView(editorSection as HTMLElement, {
        behavior: "smooth",
        block: "start",
      });
    }
  }, 100);
};

const handleFocus = () => {
  console.log("Editor focused");
};

const handleBlur = () => {
  console.log("Editor blurred");
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.demo-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.demo-header {
  text-align: center;
  color: white;
  padding: 80px 20px 60px;
  position: relative;
  overflow: hidden;
}

.demo-header::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(
      circle at 20% 50%,
      rgba(102, 126, 234, 0.3) 0%,
      transparent 50%
    ),
    radial-gradient(
      circle at 80% 80%,
      rgba(118, 75, 162, 0.3) 0%,
      transparent 50%
    );
  animation: pulse 8s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.header-content {
  position: relative;
  z-index: 1;
  max-width: 900px;
  margin: 0 auto;
}

.header-badge {
  display: inline-block;
  background: rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  letter-spacing: 0.5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.header-title {
  font-size: 4.5em;
  margin-bottom: 20px;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -2px;
}

.gradient-text {
  background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
  animation: shimmer 3s ease-in-out infinite;
}

@keyframes shimmer {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.highlight-text {
  display: inline-block;
  color: white;
  text-shadow: 0 0 40px rgba(255, 255, 255, 0.5),
    0 0 80px rgba(102, 126, 234, 0.3);
}

.header-subtitle {
  font-size: 1.3em;
  line-height: 1.6;
  opacity: 0.95;
  margin-bottom: 32px;
  max-width: 700px;
  margin-left: auto;
  margin-right: auto;
  font-weight: 400;
}

.header-subtitle strong {
  font-weight: 700;
  color: white;
}

.header-subtitle .brand {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.3);
  text-decoration-thickness: 2px;
  text-underline-offset: 4px;
}

.header-ctas {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 40px;
}

.cta-primary,
.cta-secondary,
.cta-outline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  font-family: inherit;
}

.cta-primary {
  background: white;
  color: #5568d3;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
}

.cta-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.cta-secondary {
  background: rgba(102, 126, 234, 0.4);
  backdrop-filter: blur(10px);
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  border: 2px solid rgba(255, 255, 255, 0.5);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.cta-secondary:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
}

.cta-outline {
  background: rgba(102, 126, 234, 0.3);
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  border: 2px solid rgba(255, 255, 255, 0.5);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.cta-outline:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  transform: translateY(-2px);
}

.cta-icon {
  font-size: 18px;
}

.header-stats {
  display: flex;
  gap: 32px;
  justify-content: center;
  margin-top: 48px;
  flex-wrap: wrap;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin-bottom: 4px;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;
  font-weight: 600;
}

.header-badges {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 24px;
}

.badge {
  background: rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.4);
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  transition: all 0.3s ease;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.badge:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.demo-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 0 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.nav-tab {
  background: rgba(102, 126, 234, 0.4);
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 12px 24px;
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.nav-tab:hover {
  background: rgba(102, 126, 234, 0.6);
  transform: translateY(-2px);
}

.nav-tab.active {
  background: white;
  color: #5568d3;
  border-color: white;
}

.tab-icon {
  font-size: 20px;
}

.demo-main {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 0 20px 40px;
}

.tab-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.editor-section {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  margin-bottom: 30px;
}

.demo-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 24px;
}

.editor-section h2 {
  margin-bottom: 12px;
  color: #333;
  font-size: 2em;
  font-weight: 700;
}

.section-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 0;
  font-size: 15px;
}

.config-toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.config-toggle-btn:hover {
  border-color: #667eea;
  background: #f8f9fb;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.config-toggle-btn.active {
  background: #667eea;
  color: white; /* Intentional design choice - adequate contrast on solid background */
  border-color: #667eea;
}

.config-icon {
  font-size: 18px;
}

/* Configuration Panel */
.config-panel {
  background: linear-gradient(135deg, #f8f9fb 0%, #fff 100%);
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.config-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid #e9ecef;
}

.config-group {
  margin-bottom: 20px;
}

.config-group:last-of-type {
  margin-bottom: 0;
}

.config-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.slider-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.config-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #e9ecef;
  outline: none;
  -webkit-appearance: none;
  appearance: none;
}

.config-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  transition: all 0.2s ease;
}

.config-slider::-webkit-slider-thumb:hover {
  background: #5568d3;
  transform: scale(1.2);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.config-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #667eea;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.config-slider::-moz-range-thumb:hover {
  background: #5568d3;
  transform: scale(1.2);
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
}

.unit-selector {
  padding: 8px 12px;
  border: 2px solid #d8dde6;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.unit-selector:hover,
.unit-selector:focus {
  border-color: #667eea;
}

.toggle-item {
  margin-bottom: 12px;
}

.toggle-item:last-child {
  margin-bottom: 0;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.toggle-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.toggle-switch {
  position: relative;
  width: 48px;
  height: 26px;
  background: #cbd5e0;
  border-radius: 13px;
  transition: background 0.3s ease;
  flex-shrink: 0;
}

.toggle-switch::after {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  background: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-checkbox:checked + .toggle-switch {
  background: #667eea;
}

.toggle-checkbox:checked + .toggle-switch::after {
  transform: translateX(22px);
}

.toggle-text {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.config-input {
  width: 100%;
  padding: 10px 14px;
  border: 2px solid #d8dde6;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  color: #333;
  transition: all 0.2s ease;
  outline: none;
}

.config-input:hover {
  border-color: #667eea;
}

.config-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.reset-btn {
  width: 100%;
  margin-top: 20px;
  padding: 12px 20px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  cursor: pointer;
  transition: all 0.3s ease;
}

.reset-btn:hover {
  background: #f8f9fb;
  border-color: #5568d3;
  color: #5568d3;
  transform: translateY(-2px);
}

.section-description code,
.section-description kbd {
  background: #dde4ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 13px;
  color: #4451b8;
  font-weight: 600;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fb 0%, #fff 100%);
  border-radius: 12px;
  border: 2px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.template-selector label {
  font-weight: 700;
  color: #333;
  font-size: 15px;
  white-space: nowrap;
}

.template-dropdown {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #d8dde6;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.template-dropdown:hover {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.05);
}

.template-dropdown:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.template-dropdown optgroup {
  font-weight: 700;
  color: #667eea;
  padding: 8px 0;
}

.template-dropdown option {
  padding: 10px;
  color: #333;
  font-weight: 500;
}

.template-preview-btn {
  padding: 12px 24px;
  background: #5568d3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.template-preview-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

/* Template Gallery Modal */
.template-gallery-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

.template-gallery-modal {
  background: white;
  border-radius: 16px;
  max-width: 1000px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.gallery-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 32px;
  border-bottom: 2px solid #e9ecef;
  position: sticky;
  top: 0;
  background: white;
  z-index: 1;
}

.gallery-header h3 {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  margin: 0;
}

.close-gallery {
  width: 36px;
  height: 36px;
  border: none;
  background: #f0f0f0;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
}

.close-gallery:hover {
  background: #c0392b;
  color: white;
  transform: rotate(90deg);
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 32px;
}

.gallery-card {
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.gallery-card:hover {
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.15);
  transform: translateY(-4px);
}

.gallery-card.active {
  border-color: #667eea;
  background: linear-gradient(135deg, #f5f7ff 0%, #fff 100%);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
}

.card-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.card-title {
  font-size: 18px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
}

.card-description {
  font-size: 13px;
  color: #666;
  line-height: 1.5;
}

.output-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
}

.output-section,
.preview-section {
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.output-section h3,
.preview-section h3 {
  margin-bottom: 16px;
  color: #333;
  font-size: 1.3em;
  font-weight: 600;
}

.output-code {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
  max-height: 400px;
  overflow-y: auto;
}

.output-code pre {
  margin: 0;
  font-family: "Courier New", monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
}

.output-code code {
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-content {
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  font-size: 16px;
  line-height: 1.6;
}

.preview-content .placeholder {
  color: #adb5bd;
  font-style: italic;
}

.preview-content h1,
.preview-content h2,
.preview-content h3,
.preview-content h4,
.preview-content h5,
.preview-content h6 {
  margin: 16px 0 8px;
  font-weight: 600;
  line-height: 1.3;
}

.preview-content h1 {
  font-size: 2em;
}

.preview-content h2 {
  font-size: 1.5em;
}

.preview-content h3 {
  font-size: 1.25em;
}

.preview-content p {
  margin: 8px 0;
}

.preview-content ul,
.preview-content ol {
  margin: 8px 0;
  padding-left: 24px;
}

.preview-content li {
  margin: 4px 0;
}

.preview-content a {
  color: #007bff;
  text-decoration: underline;
}

.preview-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 12px 0;
  border-radius: 4px;
}

.preview-content code {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  font-size: 14px;
}

.preview-content kbd {
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: "Courier New", monospace;
  font-size: 13px;
}

.docs-section {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.docs-section h2 {
  font-size: 2.5em;
  margin-bottom: 30px;
  color: #333;
  font-weight: 700;
}

.doc-block {
  margin-bottom: 40px;
}

.doc-block h3 {
  font-size: 1.5em;
  margin-bottom: 16px;
  color: #444;
  font-weight: 600;
}

.doc-block pre {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
  border: 1px solid #e9ecef;
}

.doc-block code {
  font-family: "Courier New", monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.props-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.props-table thead {
  background: #5568d3;
  color: white;
}

.props-table th,
.props-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

.props-table tbody tr:hover {
  background: #f8f9fa;
}

.props-table code {
  background: #dde4ff;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: "Courier New", monospace;
  color: #4451b8;
  font-weight: 600;
}

.feature-list {
  list-style: none;
  padding: 0;
}

.feature-list li {
  padding: 12px 0;
  border-bottom: 1px solid #e9ecef;
  font-size: 15px;
  line-height: 1.6;
}

.feature-list li:last-child {
  border-bottom: none;
}

.demo-footer {
  background: rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  padding: 20px;
  text-align: center;
  color: white; /* Intentional design choice - adequate contrast with text-shadow */
  margin-top: 40px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.demo-footer p {
  font-size: 14px;
}

.demo-footer a {
  color: white;
  text-decoration: underline;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.demo-footer a:hover {
  opacity: 0.8;
}

@media (max-width: 968px) {
  .output-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .demo-header {
    padding: 60px 20px 40px;
  }

  .header-title {
    font-size: 2.8em;
  }

  .header-subtitle {
    font-size: 1.1em;
  }

  .header-ctas {
    flex-direction: column;
    align-items: stretch;
  }

  .cta-primary,
  .cta-secondary,
  .cta-outline {
    width: 100%;
    justify-content: center;
  }

  .header-stats {
    gap: 20px;
  }

  .stat-value {
    font-size: 24px;
  }

  .badge {
    font-size: 11px;
    padding: 6px 12px;
  }

  .nav-tab {
    padding: 10px 16px;
    font-size: 14px;
  }

  .editor-section,
  .docs-section {
    padding: 24px;
  }

  .output-section,
  .preview-section {
    padding: 20px;
  }

  .demo-header-row {
    flex-direction: column;
    align-items: stretch;
  }

  .config-toggle-btn {
    width: 100%;
    justify-content: center;
  }

  .template-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .template-preview-btn {
    width: 100%;
  }

  .gallery-grid {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .config-panel {
    padding: 16px;
  }
}
</style>
