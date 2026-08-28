/**
 * CI gate for screener definitions.
 *
 * Every file in screeners/ must satisfy BOTH contracts:
 *   1. the published JSON Schema (docs/schema/screener.schema.json) — the contract for
 *      hand-authored and exported definitions;
 *   2. the zod schema in @allstocks/core plus the semantic checks — registry keys, sector
 *      applicability, expression grammar, parameter wiring, ranking coherence.
 *
 * Requiring both catches the two failure modes that matter: a definition that the app would
 * reject, and a drift between the schema we publish and the schema we actually enforce.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { validateScreener } from '../packages/core/src/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const screenerDir = join(root, 'screeners');
const schemaPath = join(root, 'docs', 'schema', 'screener.schema.json');

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateJsonSchema = ajv.compile(JSON.parse(readFileSync(schemaPath, 'utf8')));

const files = readdirSync(screenerDir).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error('no screener definitions found in screeners/');
  process.exit(1);
}

let failed = 0;
const seenIds = new Map<string, string>();

for (const file of files) {
  const raw = JSON.parse(readFileSync(join(screenerDir, file), 'utf8')) as Record<string, unknown>;
  const problems: string[] = [];

  if (!validateJsonSchema(raw)) {
    for (const e of validateJsonSchema.errors ?? []) {
      problems.push(`json-schema  ${e.instancePath || '(root)'} ${e.message ?? ''}`);
    }
  }

  const result = validateScreener(raw);
  for (const issue of result.issues) {
    problems.push(`${issue.code.padEnd(12)} ${issue.path} — ${issue.message}`);
  }

  const id = typeof raw['id'] === 'string' ? raw['id'] : '';
  if (id && seenIds.has(id)) problems.push(`duplicate id "${id}" (also in ${seenIds.get(id)})`);
  if (id) seenIds.set(id, file);
  if (id && `${id}.json` !== file) problems.push(`id "${id}" does not match filename ${file}`);

  if (problems.length > 0) {
    failed++;
    console.error(`\n✗ ${file}`);
    for (const p of problems) console.error(`    ${p}`);
  } else {
    console.log(`✓ ${file.padEnd(26)} ${result.metricsUsed.length} metrics`);
  }
}

console.log(`\n${files.length - failed}/${files.length} screener definitions valid`);
process.exit(failed === 0 ? 0 : 1);
