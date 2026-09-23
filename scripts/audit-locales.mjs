import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import ts from 'typescript';
import { parse } from '@vue/compiler-sfc';
import { parse as parseTemplate } from '@vue/compiler-dom';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const arg = process.argv.indexOf('--output');
const output = resolve(arg >= 0 ? process.argv[arg + 1] : join(root, 'node_modules/.cache/locale-audit.json'));
console.log(JSON.stringify({ event: 'locale.audit_started', timestamp: new Date().toISOString() }));
try {
const compiled = ts.transpileModule(readFileSync(join(root, 'src/locales/pt-PT.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { portugueseMessages: catalog } = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const keys = new Map();
const dynamicCalls = [];
const unwrappedText = [];
const errors = new Map();
function add(map, key, location) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(location);
}
function scan(code, file, lineOffset = 0) {
  const ast = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  const location = node => `${file}:${lineOffset + ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}`;
  function literal(node, where) {
    if (ts.isStringLiteralLike(node)) add(keys, node.text, where);
    else if (ts.isParenthesizedExpression(node)) literal(node.expression, where);
    else if (ts.isConditionalExpression(node)) { literal(node.whenTrue, where); literal(node.whenFalse, where); }
    else dynamicCalls.push({ expression: node.getText(ast), location: where });
  }
  function visit(node) {
    if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === 't') || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 't')) && node.arguments[0]) literal(node.arguments[0], location(node));
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && /Error$/.test(node.expression.text) && node.arguments?.[0] && ts.isStringLiteralLike(node.arguments[0])) add(errors, node.arguments[0].text, location(node));
    ts.forEachChild(node, visit);
  }
  visit(ast);
}
function template(node, file, offset) {
  const location = `${file}:${offset + node.loc.start.line}`;
  if (node.type === 5) scan(`(${node.content.content})`, file, offset + node.loc.start.line - 1);
  if (node.type === 2 && /[A-Za-z]{2}/.test(node.content.trim())) unwrappedText.push({ text: node.content.trim(), location });
  for (const prop of node.props ?? []) {
    if (prop.type === 7 && prop.exp) scan(`(${prop.exp.content})`, file, offset + prop.loc.start.line - 1);
    if (prop.type === 6 && ['title', 'aria-label', 'placeholder', 'alt'].includes(prop.name) && /[A-Za-z]{2}/.test(prop.value?.content || '')) unwrappedText.push({ attribute: prop.name, text: prop.value.content, location });
  }
  for (const child of node.children ?? []) template(child, file, offset);
}
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (['__tests__', 'demo', 'locales', 'types'].includes(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else if (/\.(vue|ts)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      const file = relative(root, path).replaceAll('\\', '/');
      const source = readFileSync(path, 'utf8');
      if (entry.name.endsWith('.vue')) {
        const { descriptor } = parse(source);
        for (const block of [descriptor.script, descriptor.scriptSetup]) if (block) scan(block.content, file, block.loc.start.line - 1);
        if (descriptor.template) template(parseTemplate(descriptor.template.content), file, descriptor.template.loc.start.line - 1);
      } else scan(source, file);
    }
  }
}
visit(join(root, 'src'));
const absent = map => [...map].filter(([key]) => key && !Object.hasOwn(catalog, key)).map(([key, locations]) => ({ key, locations: [...locations] }));
const report = { timestamp: new Date().toISOString(), catalogEntries: Object.keys(catalog).length, staticKeys: keys.size, missingStaticKeys: absent(keys), dynamicCalls, unwrappedText, untranslatedInternalErrors: absent(errors), limitations: 'Source audit: dynamic labels, host/provider messages, generated prose, and source-mode strings require contextual review. This report does not establish complete localization.' };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ event: 'locale.audit_completed', output, catalogEntries: report.catalogEntries, staticKeys: report.staticKeys, missingStaticKeys: report.missingStaticKeys.length, dynamicCalls: dynamicCalls.length, unwrappedText: unwrappedText.length, untranslatedInternalErrors: report.untranslatedInternalErrors.length }));
process.exitCode = report.missingStaticKeys.length || report.untranslatedInternalErrors.length ? 1 : 0;
} catch (error) {
  console.error(JSON.stringify({ event: 'locale.audit_failed', timestamp: new Date().toISOString(), message: String(error) }));
  process.exitCode = 1;
}
