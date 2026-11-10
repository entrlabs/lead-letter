import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Exercise the same gate used by publication without building the whole site.
const script = readFileSync(new URL('../scripts/check-field-note.mjs', import.meta.url), 'utf8');
const functions = script.slice(0, script.indexOf('function validateReadability')).replace(/^import .*;\n/gm, '').replace(/^const (fieldNoteDirectory|distDirectory) = .*;\n/gm, '');
const context = vm.createContext({});
vm.runInContext(functions, context);
const source = readFileSync(new URL('../src/content/fieldnotes/2026-11-10-daily-field-note.md', import.meta.url), 'utf8');
const entry = value => ({ date: '2026-11-10', filename: 'fixture.md', source: value });
const validate = value => context.validateReadingRoom(entry(value));

test('complete card passes', () => assert.doesNotThrow(() => validate(source)));
test('original regression: no Reading Room fails', () => assert.throws(() => validate(source.replace(/^## Reading Room[\s\S]*?(?=^## Useful Copy)/m, '')), /missing required Reading Room/));
test('heading-only filler fails', () => assert.throws(() => validate(source.replace(/(## Reading Room\s*\n)[\s\S]*?(?=^## Useful Copy)/m, '$1Ready.\n\n')), /DOI/));
test('missing research DOI fails', () => assert.throws(() => validate(source.replaceAll('https://doi.org/10.1177/13505084251350847', 'https://example.org/paper')), /DOI/));
test('unlabeled access fails', () => assert.throws(() => validate(source.replace('Based on the abstract', 'In the research paper')), /read depth/));
test('short filler card fails', () => assert.throws(() => validate(source.replace(/Based on the abstract[\s\S]*?(?=^## Useful Copy)/m, 'Based on the abstract, try this. It does not prove effects.\n\n')), /80-120/));
test('historical format remains outside prospective gate', () => assert.doesNotThrow(() => context.validateReadingRoom({date:'2026-11-08',filename:'old.md',source:''})));
