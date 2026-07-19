import { readdir, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const fieldNoteDirectory = new URL('../src/content/fieldnotes/', import.meta.url);
const distDirectory = new URL('../dist/', import.meta.url);

function requireMatch(value, pattern, message) {
  const match = value.match(pattern);
  if (!match) throw new Error(message);
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function wordCount(value) {
  return value.replace(/[^A-Za-z0-9' -]/g, '').split(/\s+/).filter(Boolean).length;
}

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

function parseEntry(filename, source) {
  const frontmatter = requireMatch(source, /^---\s*\n([\s\S]*?)\n---/, `${filename}: missing frontmatter.`);
  return {
    filename,
    source,
    title: requireMatch(frontmatter, /^title:\s*(.+)$/m, `${filename}: missing title.`),
    description: requireMatch(frontmatter, /^description:\s*(.+)$/m, `${filename}: missing description.`),
    date: requireMatch(frontmatter, /^date:\s*(.+)$/m, `${filename}: missing date.`),
    author: requireMatch(frontmatter, /^author:\s*(.+)$/m, `${filename}: missing author.`),
    publication: requireMatch(frontmatter, /^publication:\s*(.+)$/m, `${filename}: missing publication.`),
    sourceBrief: requireMatch(frontmatter, /^sourceBrief:\s*(.+)$/m, `${filename}: missing sourceBrief.`),
  };
}

function validateIdentity(entry) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) throw new Error(`${entry.filename}: date must use YYYY-MM-DD.`);
  if (entry.filename !== `${entry.date}-daily-field-note.md`) {
    throw new Error(`${entry.filename}: filename must match the publication date.`);
  }
  if (entry.author !== 'Joseph E. Iesue') throw new Error(`${entry.filename}: author must be Joseph E. Iesue.`);
  if (entry.publication !== 'EntrLabs - The Lead Letter') throw new Error(`${entry.filename}: publication metadata is incorrect.`);
  if (entry.sourceBrief !== `${entry.date} - Daily Business Intelligence Brief`) {
    throw new Error(`${entry.filename}: sourceBrief must identify the same-date Daily Business Intelligence Brief.`);
  }
}

function validateReaderFacingCopy(entry, previousEntries) {
  const actionVerb = /^(ask|build|check|choose|connect|create|decide|design|explain|find|focus|give|keep|learn|make|match|measure|move|name|notice|plan|practice|prepare|protect|prove|put|read|reduce|set|show|start|strengthen|support|test|treat|turn|use|watch|work|write)\b/i;
  const titleWords = wordCount(entry.title);
  if (titleWords < 4 || titleWords > 9 || !actionVerb.test(entry.title)) {
    throw new Error(`${entry.filename}: title must be a direct 4-9 word reader action.`);
  }
  const descriptionWords = wordCount(entry.description);
  if (descriptionWords < 10 || descriptionWords > 28 || !actionVerb.test(entry.description)) {
    throw new Error(`${entry.filename}: description must be a direct 10-28 word reader promise.`);
  }
  const recentTitles = new Set(previousEntries.slice(0, 7).map((item) => normalize(item.title)));
  if (recentTitles.has(normalize(entry.title))) {
    throw new Error(`${entry.filename}: title repeats a recent Field Note reader promise.`);
  }
  if (/\b(will|is becoming|is increasingly)\b/i.test(entry.title)) {
    throw new Error(`${entry.filename}: title reads like an internal forecast instead of a reader action.`);
  }
}

function validateStructure(entry) {
  const required = [
    '> [!quote] Field Note',
    '> [!summary] The Reader Promise',
    '## The Field Note',
    '> [!example]',
    '## Mental Model Lens',
    '> [!tip] Thinking Tool',
    '**Mental model:** [',
    '**Useful idea:**',
    '**Use today:**',
    '## Use It Today',
    '> [!question] For Students',
    '> [!question] For Managers And Founders',
    '> [!question] For Educators And Advisors',
    '## Useful Copy',
    '### Signal Text',
    '> [!abstract] Social Copy',
    '> [!sponsor] Sponsor Field Note',
    '## Sources',
  ];
  for (const marker of required) {
    if (!entry.source.includes(marker)) throw new Error(`${entry.filename}: missing required Field Note design marker "${marker}".`);
  }
  if (!/^## Vantage Circle(?:'|’|‘)s Lens$/m.test(entry.source)) {
    throw new Error(`${entry.filename}: missing the designed Vantage Circle’s Lens section.`);
  }
  if (!entry.source.includes('[Explore the AIRe Framework (created by Vantage Circle)](https://www.vantagecircle.com/services/aire-consultation/)')) {
    throw new Error(`${entry.filename}: missing the approved AIRe sponsor link sentence.`);
  }
  if (!/\b(does not|cannot|leaves? out|limit|boundary|partial|not prove)\b/i.test(entry.source)) {
    throw new Error(`${entry.filename}: the public note must state an evidence limit.`);
  }
  if (!/\b(ask|check|choose|decide|measure|practice|test|try|use|watch|write)\b/i.test(entry.source)) {
    throw new Error(`${entry.filename}: the public note must give the reader a next action.`);
  }
  if (/<details>|source trace|readwise|candidate source|automation|vault path|\[\[[^\]]+\]\]/i.test(entry.source)) {
    throw new Error(`${entry.filename}: public Field Note contains private workflow or vault material.`);
  }
  if (/\b(One clear, concrete|One sentence explaining|Primary source\]\(URL|Mental model:\s*\[Title\]\(URL)\b/i.test(entry.source)) {
    throw new Error(`${entry.filename}: public Field Note still contains template placeholder text.`);
  }
  if (/^\s*\|/m.test(entry.source)) throw new Error(`${entry.filename}: public Field Notes cannot use tables.`);

  const sourceSection = requireMatch(entry.source, /^## Sources\s*\n([\s\S]*)$/m, `${entry.filename}: Sources section is missing.`);
  const linkedSources = sourceSection.match(/^[-*]\s+\[[^\]]+\]\(https:\/\//gm) ?? [];
  if (linkedSources.length < 2) throw new Error(`${entry.filename}: Sources must include at least two public HTTPS links.`);
}

function validateReadability(entry) {
  const body = entry.source
    .replace(/^---\s*\n[\s\S]*?\n---/, '')
    .replace(/^## Sources[\s\S]*$/m, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*[>#-].*$/gm, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/[*_`]/g, ' ');
  const sentences = body.split(/[.!?]+(?:\s|$)/).map((item) => item.trim()).filter(Boolean);
  const words = body.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const longSentences = sentences.filter((sentence) => (sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length > 28);
  const averageSentenceWords = words.length / Math.max(sentences.length, 1);
  const averageWordLength = words.reduce((total, word) => total + word.length, 0) / Math.max(words.length, 1);
  if (averageSentenceWords > 18 || longSentences.length / Math.max(sentences.length, 1) > 0.12 || averageWordLength > 5.8) {
    throw new Error(`${entry.filename}: misses the ninth-grade plain-language gate (${averageSentenceWords.toFixed(1)} words/sentence, ${longSentences.length} long sentences, ${averageWordLength.toFixed(1)} letters/word).`);
  }
  return { averageSentenceWords, longSentences: longSentences.length };
}

async function validateRendered(entry) {
  const slug = basename(entry.filename, '.md');
  const article = await readFile(new URL(`fieldnotes/${slug}/index.html`, distDirectory), 'utf8');
  const index = await readFile(new URL('fieldnotes/index.html', distDirectory), 'utf8');
  const homepage = await readFile(new URL('index.html', distDirectory), 'utf8');
  const pageTemplate = await readFile(new URL('../src/pages/fieldnotes/[slug].astro', import.meta.url), 'utf8');
  if (!article.includes('class="letter-page field-note-page"') || !article.includes(`<h1>${entry.title}</h1>`)) {
    throw new Error(`${entry.filename}: rendered Field Note route is missing its established page design or exact title.`);
  }
  if ((article.match(/<blockquote>/g) ?? []).length < 8) {
    throw new Error(`${entry.filename}: rendered Field Note is missing the established callout rhythm.`);
  }
  if (!pageTemplate.includes('calloutLabels') || !pageTemplate.includes("sponsor: 'Presented with Vantage Circle'")) {
    throw new Error(`${entry.filename}: rendered Field Note is missing callout or sponsor design behavior.`);
  }
  const href = `/fieldnotes/${slug}/`;
  if (!index.includes(`href="${href}"`) || !index.includes(entry.title)) {
    throw new Error(`${entry.filename}: Field Notes index is not bound to the latest note.`);
  }
  if (!homepage.includes(`href="${href}"`) || !homepage.includes(entry.title)) {
    throw new Error(`${entry.filename}: homepage Field Notes rail is not bound to the latest note.`);
  }
}

const files = (await readdir(fieldNoteDirectory)).filter((filename) => filename.endsWith('.md'));
const entries = await Promise.all(files.map(async (filename) => parseEntry(filename, await readFile(new URL(filename, fieldNoteDirectory), 'utf8'))));
const sorted = entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
const latest = sorted[0];
if (!latest) throw new Error('No public Field Notes were found.');

validateIdentity(latest);
validateReaderFacingCopy(latest, sorted.slice(1));
validateStructure(latest);
const readability = validateReadability(latest);
await validateRendered(latest);

console.log(`Validated ${latest.filename}: forward-facing copy, evidence limits, required design sections, rendered route/index binding, and ${readability.averageSentenceWords.toFixed(1)} words per sentence.`);
