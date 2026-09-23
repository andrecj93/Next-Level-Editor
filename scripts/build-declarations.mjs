import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const files = [];
function visit(path) {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) visit(child);
    else if (entry.name.endsWith('.d.ts')) files.push(child);
  }
}
console.log(JSON.stringify({ event: 'declarations.started', timestamp: new Date().toISOString() }));
try {
  visit(root);
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (source.includes('vue-minimum')) throw new Error(`Build-only Vue alias leaked into ${file}`);
    for (const [declarationExtension, moduleExtension] of [['.d.mts', '.mjs'], ['.d.cts', '.cjs']]) {
      const input = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const transformer = context => {
        const rewrite = node => {
          const parent = node.parent;
          const isModule = ts.isStringLiteral(node) && (
            ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) ||
            (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent))
          );
          if (isModule && node.text.startsWith('.')) {
            let specifier = node.text;
            if (/\.(?:mjs|cjs|js)$/.test(extname(specifier))) specifier = specifier.slice(0, -extname(specifier).length);
            if (existsSync(resolve(dirname(file), specifier + '.d.ts'))) return ts.factory.createStringLiteral(specifier + moduleExtension);
            if (existsSync(resolve(dirname(file), specifier, 'index.d.ts'))) return ts.factory.createStringLiteral(specifier + '/index' + moduleExtension);
            throw new Error(`Unresolved declaration import ${node.text} in ${file}`);
          }
          return ts.visitEachChild(node, rewrite, context);
        };
        return sourceFile => ts.visitNode(sourceFile, rewrite);
      };
      const transformed = ts.transform(input, [transformer]);
      try { writeFileSync(file.slice(0, -'.d.ts'.length) + declarationExtension, printer.printFile(transformed.transformed[0])); }
      finally { transformed.dispose(); }
    }
  }
  console.log(JSON.stringify({ event: 'declarations.completed', files: files.length, variants: ['legacy', 'esm', 'commonjs'], timestamp: new Date().toISOString() }));
} catch (error) {
  console.error(JSON.stringify({ event: 'declarations.failed', message: String(error), timestamp: new Date().toISOString() }));
  process.exitCode = 1;
}
