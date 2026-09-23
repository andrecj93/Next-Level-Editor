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
async function verifyBrowser() {
  event('package.step_started', { step: 'consumer-browser' });
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
    await page.goto(`http://127.0.0.1:${address.port}`, { waitUntil: 'networkidle' });
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
    expect(errors).toEqual([]);
    await page.screenshot({ path: join(evidence, 'consumer-browser.png'), fullPage: true });
    event('package.step_finished', { step: 'consumer-browser', browser: browser.version(), exitCode: 0, checks: ['css', 'model-update', 'formatting', 'undo', 'lazy-document-tools', 'version-store', 'reactive-readonly'], errors });
  } catch (error) {
    if (page) await page.screenshot({ path: join(evidence, 'consumer-browser-failed.png'), fullPage: true }).catch(() => {});
    event('package.step_finished', { step: 'consumer-browser', exitCode: 1, errors, message: String(error) });
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
  writeFileSync(join(consumer, 'main.mjs'), `import {createApp,h,ref} from 'vue';
import plugin,{NextLevelEditor,createMemoryVersionStore} from 'next-level-editor';
import portuguese from 'next-level-editor/locales/pt-PT';
import 'next-level-editor/style.css';
createApp({setup(){const html=ref('<p>Installed package</p>');const readonly=ref(false);const documentOptions={id:'packed-consumer',store:createMemoryVersionStore(),localRecovery:false};return()=>h('main',[
  h('button',{onClick:()=>readonly.value=!readonly.value},'Toggle read-only'),
  h('output',{'data-testid':'host-model'},html.value),
  h(NextLevelEditor,{modelValue:html.value,'onUpdate:modelValue':value=>html.value=value,documentTools:true,locale:'pt-PT',messages:portuguese,readonly:readonly.value,documentOptions}),
]);}}).use(plugin).mount('#app');`);
  writeFileSync(join(consumer, 'vite.config.mjs'), 'export default {build:{emptyOutDir:true}};');
  run('consumer-build', [join(repository, 'node_modules/vite/bin/vite.js'), 'build', '--config', join(consumer, 'vite.config.mjs')]);
  await verifyBrowser();
  const result = { startedAt, finishedAt: new Date().toISOString(), status: 'passed', archive, sha256, workspace, consumer, vueVersion: '3.3.0', checks: ['esm', 'commonjs', 'ssr', 'plugin-registration', 'consumer-types', 'independent-locales', 'consumer-production-build', 'consumer-browser'] };
  writeFileSync(join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  event('package.verification_completed', result);
} catch (error) {
  const result = { startedAt, finishedAt: new Date().toISOString(), status: 'failed', workspace, message: String(error) };
  writeFileSync(join(evidence, 'result.json'), JSON.stringify(result, null, 2));
  event('package.verification_failed', result);
  process.exitCode = 1;
}
