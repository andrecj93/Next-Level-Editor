<template>
  <div class="demo-app">
    <header class="demo-header">
      <div class="header-content">
        <h1>Next Level Editor</h1>
        <p>A professional WYSIWYG editor for Vue.js with modern features</p>
        <div class="header-badges">
          <span class="badge">🎨 Modern UI</span>
          <span class="badge">💻 22 Languages</span>
          <span class="badge">🌓 Dark Mode</span>
          <span class="badge">📱 Responsive</span>
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
      <div
        v-if="activeTab === 'editor'"
        class="tab-content"
      >
        <div class="editor-section">
          <h2>🎯 Interactive Demo</h2>
          <p class="section-description">
            Try all the features! Type <code>/</code> for slash commands, select text to see the floating toolbar, 
            or press <kbd>Ctrl+F</kbd> to search. Click the theme toggle to switch to dark mode.
          </p>
          
          <!-- Template Selector -->
          <div class="template-selector">
            <label for="template-select">📋 Load Example:</label>
            <select
              id="template-select"
              v-model="selectedTemplate"
              class="template-dropdown"
              @change="loadTemplate"
            >
              <option
                v-for="template in templates"
                :key="template.id"
                :value="template.id"
              >
                {{ template.icon }} {{ template.name }} - {{ template.description }}
              </option>
            </select>
          </div>

          <NextLevelEditor
            v-model="content"
            placeholder="Start typing your content here... Try typing / for quick commands!"
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
              v-html="content || '<p class=\'placeholder\'>Your preview will appear here...</p>'"
            />
          </div>
        </div>
      </div>
      
      <!-- Features Tab -->
      <div
        v-if="activeTab === 'features'"
        class="tab-content"
      >
        <FeatureShowcase />
      </div>
      
      <!-- Documentation Tab -->
      <div
        v-if="activeTab === 'docs'"
        class="tab-content"
      >
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
              <li>✅ Modern CKEditor-inspired horizontal toolbar with dropdowns</li>
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
        <a
          href="https://github.com/andrecj93/next-level-editor"
          target="_blank"
        >GitHub</a> | 
        <a
          href="https://www.npmjs.com/package/next-level-editor"
          target="_blank"
        >npm</a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NextLevelEditor from '../components/NextLevelEditor.vue'
import FeatureShowcase from './FeatureShowcase.vue'
import { getAllTemplates, getTemplateById, getDefaultTemplate } from './examples/exampleTemplates'

const activeTab = ref('editor')

const tabs = [
  { id: 'editor', label: 'Editor', icon: '✏️' },
  { id: 'features', label: 'Features', icon: '✨' },
  { id: 'docs', label: 'Documentation', icon: '📚' }
]

// Use the showcase template as default, unless 'empty' query param is present
const templates = getAllTemplates()
const selectedTemplate = ref('showcase')
const urlParams = new URLSearchParams(window.location.search)
const startEmpty = urlParams.get('empty') === 'true'
const content = ref(startEmpty ? '' : getDefaultTemplate().content)

const loadTemplate = () => {
  const template = getTemplateById(selectedTemplate.value)
  if (template) {
    content.value = template.content
  }
}

const handleFocus = () => {
  console.log('Editor focused')
}

const handleBlur = () => {
  console.log('Editor blurred')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
  padding: 60px 20px 40px;
}

.header-content h1 {
  font-size: 3.5em;
  margin-bottom: 12px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  font-weight: 700;
}

.header-content p {
  font-size: 1.4em;
  opacity: 0.95;
  margin-bottom: 20px;
}

.header-badges {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 20px;
}

.badge {
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.3);
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
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border: 2px solid transparent;
  border-radius: 12px;
  padding: 12px 24px;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-tab:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

.nav-tab.active {
  background: white;
  color: #667eea;
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

.editor-section h2 {
  margin-bottom: 12px;
  color: #333;
  font-size: 2em;
  font-weight: 700;
}

.section-description {
  color: #666;
  line-height: 1.6;
  margin-bottom: 24px;
  font-size: 15px;
}

.section-description code,
.section-description kbd {
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #667eea;
  font-weight: 600;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fb;
  border-radius: 8px;
  border: 2px solid #e9ecef;
}

.template-selector label {
  font-weight: 600;
  color: #333;
  font-size: 14px;
  white-space: nowrap;
}

.template-dropdown {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid #d8dde6;
  border-radius: 8px;
  background: white;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #333;
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.template-dropdown:hover {
  border-color: #667eea;
}

.template-dropdown:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.template-dropdown option {
  padding: 10px;
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
  font-family: 'Courier New', monospace;
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
  font-family: 'Courier New', monospace;
  font-size: 14px;
}

.preview-content kbd {
  background: #e9ecef;
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: 'Courier New', monospace;
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
  font-family: 'Courier New', monospace;
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
  background: #667eea;
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
  background: #f0f0f0;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  color: #667eea;
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
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 20px;
  text-align: center;
  color: white;
  margin-top: 40px;
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
  .header-content h1 {
    font-size: 2.5em;
  }
  
  .header-content p {
    font-size: 1.1em;
  }
  
  .badge {
    font-size: 12px;
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
}
</style>
