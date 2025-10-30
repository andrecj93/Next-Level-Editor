<template>
  <div class="demo-app">
    <header class="demo-header">
      <h1>Next Level Editor</h1>
      <p>A beautiful WYSIWYG editor for Vue.js</p>
    </header>
    
    <main class="demo-main">
      <div class="editor-section">
        <h2>Try the Editor</h2>
        <NextLevelEditor
          v-model="content"
          placeholder="Start typing your content here..."
          @focus="handleFocus"
          @blur="handleBlur"
        />
      </div>
      
      <div class="output-section">
        <h2>HTML Output</h2>
        <div class="output-code">
          <pre><code>{{ content || 'No content yet...' }}</code></pre>
        </div>
      </div>
      
      <div class="preview-section">
        <h2>Preview</h2>
        <div
          class="preview-content"
          v-html="content || 'No content yet...'"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import NextLevelEditor from '../components/NextLevelEditor.vue'

const content = ref('<h2>Welcome to Next Level Editor!</h2><p>This is a <strong>powerful</strong> and <em>beautiful</em> WYSIWYG editor for Vue.js.</p><p>Features:</p><ul><li>Rich text formatting</li><li>Headings and paragraphs</li><li>Lists (ordered and unordered)</li><li>Links and images</li><li>And much more!</li></ul>')

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
  padding: 20px;
}

.demo-header {
  text-align: center;
  color: white;
  margin-bottom: 40px;
  padding: 40px 20px;
}

.demo-header h1 {
  font-size: 3em;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.demo-header p {
  font-size: 1.3em;
  opacity: 0.95;
}

.demo-main {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  gap: 30px;
}

.editor-section,
.output-section,
.preview-section {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.editor-section h2,
.output-section h2,
.preview-section h2 {
  margin-bottom: 20px;
  color: #333;
  font-size: 1.5em;
}

.output-code {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 20px;
  overflow-x: auto;
}

.output-code pre {
  margin: 0;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
}

.output-code code {
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-content {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  min-height: 100px;
  font-size: 16px;
  line-height: 1.6;
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

@media (max-width: 768px) {
  .demo-header h1 {
    font-size: 2em;
  }
  
  .demo-header p {
    font-size: 1em;
  }
}
</style>
