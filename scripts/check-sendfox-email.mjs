import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const signalDirectory = new URL('../src/content/signals/', import.meta.url);
const generatorPath = new URL('./sendfox-lead-letter.mjs', import.meta.url);

function requireMatch(value, pattern, message) {
  const match = value.match(pattern);
  if (!match) throw new Error(message);
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function requireIncludes(value, expected, message) {
  if (!value.includes(expected)) throw new Error(`${message}: ${expected}`);
}

const requestedFile = process.argv[2];
const filenames = (await readdir(signalDirectory))
  .filter((filename) => /^\d{4}-w\d{2}-.+\.md$/.test(filename))
  .sort();
const filename = requestedFile ? path.basename(requestedFile) : filenames.at(-1);

if (!filename) throw new Error('No weekly Signals Brief was found for email validation.');

const fileUrl = new URL(filename, signalDirectory);
const source = await readFile(fileUrl, 'utf8');
const frontmatter = requireMatch(source, /^---\s*\n([\s\S]*?)\n---/, `${filename}: missing frontmatter.`);
const title = requireMatch(frontmatter, /^title:\s*(.+)$/m, `${filename}: missing title.`);
const week = requireMatch(frontmatter, /^week:\s*(.+)$/m, `${filename}: missing week.`);
const slug = requireMatch(frontmatter, /^slug:\s*(.+)$/m, `${filename}: missing slug.`);
const framework = requireMatch(source, /^##\s+(.+)\s*$/m, `${filename}: missing weekly framework.`);
const laneBlock = requireMatch(
  frontmatter,
  /^signalBoard:\s*\n[\s\S]*?^  lanes:\s*\n([\s\S]*?)^signalInsight:/m,
  `${filename}: missing Signal Map lanes.`,
);
const laneStates = [...laneBlock.matchAll(/^      state:\s*(.+)$/gm)]
  .map((match) => match[1].trim().replace(/^['"]|['"]$/g, ''));

if (laneStates.length !== 4) {
  throw new Error(`${filename}: expected four Signal Map lane states; found ${laneStates.length}.`);
}

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'lead-letter-email-check-'));
const listPath = path.join(temporaryDirectory, 'signal-files.txt');

try {
  await writeFile(listPath, `${fileURLToPath(fileUrl)}\n`, 'utf8');
  const result = spawnSync(process.execPath, [fileURLToPath(generatorPath), listPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      LEAD_LETTER_SITE_URL: 'https://letters.entr.cc',
      SENDFOX_SEND_ENABLED: 'false',
      SENDFOX_DEBUG_PAYLOAD: 'true',
    },
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || result.stdout.trim() || 'Email generator failed.');
  }

  const jsonStart = result.stdout.indexOf('\n{');
  if (jsonStart < 0) throw new Error('Email generator did not return a debug payload.');
  const payload = JSON.parse(result.stdout.slice(jsonStart + 1));
  const expectedBriefUrl = `https://letters.entr.cc/${slug}/`;

  requireIncludes(payload.title, week, 'Campaign title is missing the issue week');
  requireIncludes(payload.title, title, 'Campaign title is missing the brief title');
  requireIncludes(payload.subject, title, 'Subject is missing the brief title');
  requireIncludes(payload.html, framework, 'Email is missing the weekly framework');
  requireIncludes(payload.html, expectedBriefUrl, 'Email is missing the canonical brief URL');
  requireIncludes(payload.html, 'https://letters.entr.cc/fieldnotes/', 'Email is missing the Field Notes archive');
  requireIncludes(payload.html, 'https://josephiesue.com/join', 'Email is missing The Yes-Way signup');
  requireIncludes(payload.html, '{{unsubscribe_url}}', 'Email is missing the SendFox unsubscribe link');
  requireIncludes(payload.html, 'Visit the archive each day', 'Email does not establish the daily Field Notes habit');
  requireIncludes(payload.html, 'separate monthly publication', 'Email does not explain The Yes-Way');

  for (const state of laneStates) {
    requireIncludes(payload.html, state, 'Email is missing an actual Signal Map lane');
  }

  const primaryCtaCount = payload.html.match(/Read the Complete Signals Brief/g)?.length || 0;
  if (primaryCtaCount !== 1) {
    throw new Error(`Email must have exactly one primary brief CTA; found ${primaryCtaCount}.`);
  }
  if (payload.preview_text.length < 60 || payload.preview_text.length > 160) {
    throw new Error(`Email preview must be 60-160 characters; found ${payload.preview_text.length}.`);
  }
  if (/\[!(?:NOTE|TIP|WARNING|QUOTE|LEADERS)\]|\*\*/.test(payload.html)) {
    throw new Error('Email contains unrendered Markdown or editorial callout syntax.');
  }
  if (payload.html.length > 100_000) {
    throw new Error(`Email HTML is unexpectedly large at ${payload.html.length} characters.`);
  }

  console.log(
    `SendFox email validation passed for ${week}: actual brief content, four Signal Map lanes, one primary CTA, Field Notes, and The Yes-Way.`,
  );
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
