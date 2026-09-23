import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { preview } from 'vite';
import { chromium, expect } from '@playwright/test';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const npmCli = process.env.npm_execpath;
if (!npmCli || !existsSync(npmCli)) throw new Error('Run this verifier with npm run verify:package.');
const arg = process.argv.indexOf('--evidence-dir');
const evidence = resolve(arg >= 0 ? process.argv[arg + 1] : join(repository, 'node_modules/.cache/package-verification'));
mkdirSync(evidence, { recursive: true });
const workspace = mkdtempSync(join(tmpdir(), 'nle-package-consumer-'));
const consumer = join(workspace, 'consumer');
mkdirSync(consumer);
const events = [];
const startedAt = new Date().toISOString();
function event(name, detail = {}) {
  const record = { timestamp: new Date().toISOString(), event: name, ...detail };
  events.push(record);
  console.log(JSON.stringify(record));
  writeFileSync(join(evidence, 'events.jsonl'), events.map(item => JSON.stringify(item)).join('\n') + '\n');
}
function run(name, arguments_, cwd = consumer) {
  event('package.step_started', { step: name });
  const result = spawnSync(process.execPath, arguments_, { cwd, encoding: 'utf8', timeout: 300000, maxBuffer: 8 * 1024 * 1024, env: { ...process.env, NODE_PATH: '' } });
  writeFileSync(join(evidence, name + '.log'), (result.stdout || '') + (result.stderr || ''));
  event('package.step_finished', { step: name, exitCode: result.status, signal: result.signal });
  if (result.error || result.status !== 0) throw new Error(`${name} failed: ${result.error?.message || (result.stderr || result.stdout || '').slice(-5000)}`);
  return result.stdout;
}
async function verifyBrowser(format = 'esm') {
  const step = format === 'umd' ? 'consumer-umd-browser' : 'consumer-browser';
  event('package.step_started', { step });
  const server = await preview({ root: consumer, configFile: join(consumer, 'vite.config.mjs'), preview: { host: '127.0.0.1', port: 0, strictPort: true, open: false } });
  let browser;
  let page;
  const errors = [];
  try {
    const address = server.httpServer.address();
    if (!address || typeof address === 'string') throw new Error('Consumer preview did not bind a TCP port.');
    browser = await chromium.launch();
    page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()}: ${new URL(response.url()).pathname}`); });
    await page.goto(`http://127.0.0.1:${address.port}/installed-editor/?format=${format}`, { waitUntil: 'networkidle' });
    const editor = page.getByRole('textbox', { name: 'Editor de texto', exact: true });
    await expect(editor).toContainText('Installed package');
    await expect(editor).toHaveCSS('font-family', /./);
    // A CSS import that silently disappeared must fail this consumer check.
    await expect(page.locator('.next-level-editor')).toHaveCSS('display', 'flex');
    await editor.fill('Fresh consumer works.');
    await expect(page.getByTestId('host-model')).toContainText('Fresh consumer works.');
    await editor.evaluate(element => {
      const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, 5);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    });
    await editor.press('ControlOrMeta+b');
    await expect(editor.locator('b, strong')).toHaveText('Fresh');
    await editor.press('ControlOrMeta+z');
    await expect(editor.locator('b, strong')).toHaveCount(0);
    await expect(editor).toHaveText('Fresh consumer works.');
    await page.getByRole('button', { name: 'Ferramentas do documento', exact: false }).click();
    await page.getByLabel('Nome da versão', { exact: true }).fill('Packed consumer');
    await page.getByRole('button', { name: 'Guardar versão', exact: true }).click();
    await expect(page.getByText('Packed consumer', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Toggle read-only', exact: true }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'false');
    await page.getByRole('button', { name: 'Toggle read-only', exact: true }).click();
    await expect(editor).toHaveAttribute('contenteditable', 'true');
    // The PDF viewer must load its deferred module/worker from the installed
    // tarball, including a host app deployed under a non-root base path.
    await page.getByRole('button', { name: 'Fechar', exact: true }).click();
    await page.getByRole('button', { name: 'Preview fixture', exact: true }).click();
    await expect(editor).toContainText('Second consumer page');
    await editor.locator('p').first().click();
    await editor.press('Home');
    await editor.press('ArrowRight');
    const selectedOffset = await editor.evaluate(root => {
      const selection = window.getSelection();
      return root.contains(selection.focusNode) ? selection.focusOffset : -1;
    });
    await page.getByRole('button', { name: 'Ferramentas do documento', exact: false }).click();
    await page.getByRole('tab', { name: 'Exportar e páginas', exact: true }).click();
    await page.getByRole('button', { name: 'Criar pré-visualização PDF', exact: true }).click();
    const pdf = page.getByRole('region', { name: 'Pré-visualização PDF', exact: true });
    await expect(pdf.getByRole('status')).toHaveText('Página 1 de 2', { timeout: 40000 });
    await pdf.getByRole('button', { name: 'Página seguinte', exact: true }).click();
    await expect(pdf.getByRole('status')).toHaveText('Página 2 de 2');
    await pdf.getByText('Texto da página', { exact: true }).click();
    await expect(pdf.locator('pre')).toContainText('Second consumer page');
    await pdf.locator('.pdf-canvas-container').scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(evidence, step + '-pdf-preview.png'), fullPage: true, caret: 'initial' });
    await pdf.getByRole('button', { name: 'Voltar à escrita', exact: true }).click();
    await expect(editor).toBeFocused();
    expect(await editor.evaluate(root => {
      const selection = window.getSelection();
      return root.contains(selection.focusNode) ? selection.focusOffset : -1;
    })).toBe(selectedOffset);
    await page.keyboard.type('!');
    await expect(editor.locator('p').first()).toHaveText('F!irst consumer page');
    expect(errors).toEqual([]);
    await page.screenshot({ path: join(evidence, step + '.png'), fullPage: true });
    event('package.step_finished', { step, format, browser: browser.version(), exitCode: 0, checks: ['css', 'model-update', 'formatting', 'undo', 'lazy-document-tools', 'version-store', 'reactive-readonly', 'nested-base-pdf-assets', 'pdf-page-navigation', 'return-caret'], errors });
  } catch (error) {
    if (page) await page.screenshot({ path: join(evidence, step + '-failed.png'), fullPage: true }).catch(() => {});
    event('package.step_finished', { step, format, exitCode: 1, errors, message: String(error) });
    throw error;
  } finally {
    await browser?.close();
    server.httpServer.closeAllConnections();
    await new Promise(resolve => server.httpServer.close(resolve));
  }
}
try {
  event('package.verification_started', { workspace, node: process.version });
  if (!existsSync(join(repository, 'dist/locales/pt-PT.mjs'))) throw new Error('Build the complete package before running verification.');
  const packed = JSON.parse(run('pack', [npmCli, 'pack', '--json', '--ignore-scripts', '--pack-destination', evidence], repository))[0];
  const archive = join(evidence, packed.filename);
  const sha256 = createHash('sha256').update(readFileSync(archive)).digest('hex');
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({ name: 'nle-package-consumer', version: '1.0.0', private: true, type: 'module' }));
  // Exercise the declared minimum peer version, not the repository's hoisted Vue.
  run('install', [npmCli, 'install', '--ignore-scripts', '--no-package-lock', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org', archive, 'vue@3.3.0']);
  const esm = `import assert from 'node:assert/strict';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import plugin, { NextLevelEditor, createMemoryVersionStore } from 'next-level-editor';
import pt from 'next-level-editor/locales/pt-PT';
import en from 'next-level-editor/locales/en';
import { createEditorLocaleFormatter } from 'next-level-editor/locale';
assert.equal(typeof createMemoryVersionStore, 'function');
assert.equal(createEditorLocaleFormatter(()=>'pt-PT',()=>pt).t('{count} words',{count:2}),'2 palavras');
assert.equal(createEditorLocaleFormatter(()=>'en',()=>en).t('{count} words',{count:1}),'1 word');
const app=createSSRApp({render:()=>h(NextLevelEditor,{modelValue:'<p>Consumer package</p>',locale:'pt-PT',readonly:true})});
app.use(plugin);
assert.equal(app.component('NextLevelEditor'),NextLevelEditor);
const html=await renderToString(app);
assert.match(html,/next-level-editor/);
assert.match(html,/lang="pt-PT"/);
console.log(JSON.stringify({esm:true,ssr:true,pluginInstalled:true,htmlBytes:html.length}));`;
  writeFileSync(join(consumer, 'esm.mjs'), esm);
  run('esm-ssr', [join(consumer, 'esm.mjs')]);
  writeFileSync(join(consumer, 'commonjs.cjs'), `const assert=require('node:assert/strict');
const editor=require('next-level-editor');
const pt=require('next-level-editor/locales/pt-PT');
const {createEditorLocaleFormatter}=require('next-level-editor/locale');
assert.equal(typeof editor.default.install,'function');
assert.ok(editor.NextLevelEditor);
assert.equal(createEditorLocaleFormatter(()=>'pt-PT',()=>pt.default).t('Save'),'Guardar');
console.log(JSON.stringify({commonjs:true,locales:true}));`);
  run('commonjs', [join(consumer, 'commonjs.cjs')]);
  writeFileSync(join(consumer, 'consumer.ts'), `import {createApp,h} from 'vue';
import plugin,{NextLevelEditor,type NextLevelEditorProps,type EditorMessages,type EditorPlugin} from 'next-level-editor';
import portuguese from 'next-level-editor/locales/pt-PT';
import {createEditorLocaleFormatter} from 'next-level-editor/locale';
const messages:EditorMessages={...portuguese,words:{one:'one',other:'many'}};
const extension:EditorPlugin={name:'consumer',install(context){context.getContent();}};
const props:NextLevelEditorProps={modelValue:'<p>Test</p>',messages,locale:'pt-PT',uiDirection:'auto',plugins:[extension]};
createApp({render:()=>h(NextLevelEditor,props)}).use(plugin);
createEditorLocaleFormatter(()=>'pt-PT',()=>messages).t('words',{count:2});`);
  writeFileSync(join(consumer, 'consumer-commonjs.cts'), `import library = require('next-level-editor');
import locale = require('next-level-editor/locale');
import pt = require('next-level-editor/locales/pt-PT');
import {createSSRApp,h} from 'vue';
createSSRApp({render:()=>h(library.NextLevelEditor,{modelValue:'<p>CommonJS types</p>'})}).use(library.default);
locale.createEditorLocaleFormatter(()=>'pt-PT',()=>pt.default).t('Save');`);
  writeFileSync(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2020', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, skipLibCheck: false, lib: ['ES2020', 'DOM', 'DOM.Iterable'] }, files: ['consumer.ts', 'consumer-commonjs.cts'] }));
  run('consumer-types', [join(repository, 'node_modules/typescript/bin/tsc'), '-p', join(consumer, 'tsconfig.json')]);
  const standalone = join(workspace, 'standalone');
  mkdirSync(join(standalone, 'node_modules'), { recursive: true });
  cpSync(join(consumer, 'node_modules/next-level-editor'), join(standalone, 'node_modules/next-level-editor'), { recursive: true });
  writeFileSync(join(standalone, 'catalogs.mjs'), `import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import en from 'next-level-editor/locales/en';
import pt from 'next-level-editor/locales/pt-PT';
import {createEditorLocaleFormatter} from 'next-level-editor/locale';
const require=createRequire(import.meta.url);
assert.throws(()=>require.resolve('vue'),{code:'MODULE_NOT_FOUND'});
assert.equal(createEditorLocaleFormatter(()=>'en',()=>en).t('{count} words',{count:1}),'1 word');
assert.equal(createEditorLocaleFormatter(()=>'pt-PT',()=>pt).t('Save'),'Guardar');
assert.equal(require('next-level-editor/locales/pt-PT').default.Save,'Guardar');
console.log(JSON.stringify({independentCatalogs:true,vueInstalled:false}));`);
  run('independent-catalogs', [join(standalone, 'catalogs.mjs')], standalone);
  writeFileSync(join(consumer, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Installed editor verification</title></head><body><div id="app"></div><script type="module" src="/main.mjs"></script></body></html>');
  writeFileSync(join(consumer, 'main.mjs'), `import * as Vue from 'vue';
import * as library from 'next-level-editor';
import portuguese from 'next-level-editor/locales/pt-PT';
import 'next-level-editor/style.css';
const {createApp,h,ref}=Vue;
function launch({default:plugin,NextLevelEditor,createMemoryVersionStore}){
createApp({setup(){const html=ref('<p>Installed package</p>');const readonly=ref(false);const documentOptions={id:'packed-consumer',store:createMemoryVersionStore(),localRecovery:false};return()=>h('main',[
  h('button',{onClick:()=>readonly.value=!readonly.value},'Toggle read-only'),
  h('button',{onClick:()=>html.value='<p data-nle-id="nle-first">First consumer page</p><div class="page-break" data-nle-id="nle-break"></div><p data-nle-id="nle-second">Second consumer page</p>'},'Preview fixture'),
  h('output',{'data-testid':'host-model'},html.value),
  h(NextLevelEditor,{modelValue:html.value,'onUpdate:modelValue':value=>html.value=value,documentTools:true,locale:'pt-PT',messages:portuguese,readonly:readonly.value,documentOptions}),
]);}}).use(plugin).mount('#app');}
if(new URL(location.href).searchParams.get('format')==='umd'){
 window.Vue=Vue;const script=document.createElement('script');script.src=import.meta.env.BASE_URL+'vendor/next-level-editor.umd.js';
 script.onload=()=>launch(window.NextLevelEditor);script.onerror=()=>{throw new Error('UMD script load failed');};document.head.append(script);
}else launch(library);`);
  const vendor = join(consumer, 'public/vendor');
  mkdirSync(vendor, { recursive: true });
  for (const name of ['next-level-editor.umd.js', 'pdf.min.mjs', 'pdf.worker.min.mjs']) {
    cpSync(join(consumer, 'node_modules/next-level-editor/dist', name), join(vendor, name));
  }
  writeFileSync(join(consumer, 'vite.config.mjs'), 'export default {base:"/installed-editor/",build:{emptyOutDir:true}};');
  run('consumer-build', [join(repository, 'node_modules/vite/bin/vite.js'), 'build', '--config', join(consumer, 'vite.config.mjs')]);
  await verifyBrowser();
  await verifyBrowser('umd');
  const result = { startedAt, finishedAt: new Date().toISOString(), status: 'passed', archive, sha256, workspace, consumer, vueVersion: '3.3.0', checks: ['esm', 'commonjs', 'ssr', 'plugin-registration', 'consumer-types', 'independent-locales', 'consumer-production-build', 'consumer-browser', 'consumer-umd-browser'] };
  writeFileSync(join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  event('package.verification_completed', result);
} catch (error) {
  const result = { startedAt, finishedAt: new Date().toISOString(), status: 'failed', workspace, message: String(error) };
  writeFileSync(join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  event('package.verification_failed', result);
  process.exitCode = 1;
}
