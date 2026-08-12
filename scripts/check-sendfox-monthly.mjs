import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['scripts/sendfox-monthly-roundup.mjs', '--as-of', '2026-08-10'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, SENDFOX_SEND_ENABLED: 'false', SENDFOX_DEBUG_PAYLOAD: 'true' },
  encoding: 'utf8',
});

if (result.status !== 0) throw new Error(result.stderr.trim() || result.stdout.trim());
const jsonStart = result.stdout.indexOf('{');
if (jsonStart < 0) throw new Error('Monthly generator did not return a debug payload.');
const payload = JSON.parse(result.stdout.slice(jsonStart));

if (payload.selections.signals.length !== 4) throw new Error('Monthly email must select four Signals Briefs.');
if (payload.selections.fieldNotes.length !== 2) throw new Error('Monthly email must select two Field Notes.');
if (!payload.selections.signals[0].includes('2026-w31-08-02.md')) throw new Error('Monthly email must start with the latest eligible Signals Brief.');
if ((payload.html.match(/Read this Signals Brief/g) || []).length !== 4) throw new Error('Monthly email must link each Signals Brief directly.');
if ((payload.html.match(/\/fieldnotes\//g) || []).length !== 2) throw new Error('Monthly email must link exactly two selected Field Notes.');
if (!payload.html.includes('{{unsubscribe_url}}')) throw new Error('Monthly email is missing the SendFox unsubscribe link.');
if (payload.preview_text.length < 60 || payload.preview_text.length > 160) throw new Error('Monthly preview must be 60-160 characters.');
if (/\[[^\]]+\]\([^)]+\)|>\s*\[!/.test(payload.html)) throw new Error('Monthly email contains unrendered Markdown.');

console.log('SendFox monthly email validation passed: four newest-to-oldest Signals Briefs, two Field Notes, direct links, and unsubscribe.');
