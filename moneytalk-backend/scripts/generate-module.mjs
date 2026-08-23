#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const featureName = process.argv[2];

if (!featureName) {
  console.error('Usage: npm run generate:module <feature-name>');
  console.error('Example: npm run generate:module transactions');
  process.exit(1);
}

if (!/^[a-z][a-z0-9-]*$/.test(featureName)) {
  console.error('Feature name must be kebab-case (e.g. transactions, budget-categories)');
  process.exit(1);
}

const toPascalCase = (value) =>
  value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

const toCamelCase = (value) => {
  const pascal = toPascalCase(value);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

const Feature = toPascalCase(featureName);
const feature = toCamelCase(featureName);
const featureKebab = featureName;

const replacements = {
  __Feature__: Feature,
  __feature__: feature,
  __FEATURE_KEBAB__: featureKebab,
  __feature__Table: `${feature}Table`,
};

const replacePlaceholders = (content) => {
  let result = content;

  for (const [placeholder, replacement] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, replacement);
  }

  return result;
};

const templateDir = path.join(rootDir, 'templates', 'feature-module');
const moduleDir = path.join(rootDir, 'src', 'modules', featureKebab);
const schemaDir = path.join(rootDir, 'src', 'database', 'schema');

if (fs.existsSync(moduleDir)) {
  console.error(`Module already exists: src/modules/${featureKebab}`);
  process.exit(1);
}

const copyTemplate = (relativePath, targetRelativePath) => {
  const sourcePath = path.join(templateDir, relativePath);
  const targetPath = path.join(rootDir, targetRelativePath);
  const content = fs.readFileSync(sourcePath, 'utf8');
  const output = replacePlaceholders(content);

  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, output);
};

const moduleFiles = [
  ['__feature__.module.ts.template', `src/modules/${featureKebab}/${featureKebab}.module.ts`],
  ['__feature__.controller.ts.template', `src/modules/${featureKebab}/${featureKebab}.controller.ts`],
  ['__feature__.service.ts.template', `src/modules/${featureKebab}/${featureKebab}.service.ts`],
  ['index.ts.template', `src/modules/${featureKebab}/index.ts`],
  ['dto/create-__feature__.dto.ts.template', `src/modules/${featureKebab}/dto/create-${featureKebab}.dto.ts`],
  ['dto/update-__feature__.dto.ts.template', `src/modules/${featureKebab}/dto/update-${featureKebab}.dto.ts`],
];

for (const [source, target] of moduleFiles) {
  copyTemplate(source, target);
}

const schemaFile = path.join(schemaDir, `${featureKebab}.schema.ts`);
if (!fs.existsSync(schemaFile)) {
  copyTemplate('__feature__.schema.ts.template', `src/database/schema/${featureKebab}.schema.ts`);

  const schemaIndexPath = path.join(schemaDir, 'index.ts');
  const exportLine = `export * from './${featureKebab}.schema';\n`;

  if (!fs.readFileSync(schemaIndexPath, 'utf8').includes(exportLine.trim())) {
    fs.appendFileSync(schemaIndexPath, exportLine);
  }
}

console.log(`Created module: src/modules/${featureKebab}`);
console.log(`Created schema: src/database/schema/${featureKebab}.schema.ts`);
console.log('');
console.log('Next steps:');
console.log(`  1. Update schema in src/database/schema/${featureKebab}.schema.ts`);
console.log(`  2. Update DTOs in src/modules/${featureKebab}/dto/`);
console.log(`  3. Import ${Feature}Module in src/app.module.ts`);
console.log('  4. npm run db:generate && npm run db:migrate');
