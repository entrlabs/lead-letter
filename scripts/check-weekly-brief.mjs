import { readdir, readFile } from 'node:fs/promises';
import { basename } from 'node:path';

const signalDirectory = new URL('../src/content/signals/', import.meta.url);
const distDirectory = new URL('../dist/', import.meta.url);

function requireMatch(value, pattern, message) {
  const match = value.match(pattern);
  if (!match) throw new Error(message);
  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function expectedPlacement(importance, usefulness) {
  const importanceBand = importance >= 82 ? 'high' : 'low';
  const timingBand = usefulness >= 60 ? 'now' : 'later';
  return {
    timeframe: timingBand,
    quadrant: `${importanceBand}-${timingBand}`,
  };
}

function wordCount(value) {
  return value.replace(/[^A-Za-z0-9' -]/g, '').split(/\s+/).filter(Boolean).length;
}

function requireReaderFacingName(value, context) {
  const name = value.replace(/^##\s+[1-4]\.\s+/, '').trim();
  const directAction = /^(ask|build|check|choose|connect|create|decide|design|explain|find|focus|give|help|keep|know|lead|learn|make|match|measure|move|name|plan|practice|prepare|protect|prove|put|read|reduce|set|show|start|strengthen|support|teach|test|treat|turn|use|work|write)\b/i;
  if (!directAction.test(name)) {
    throw new Error(
      `${context} must begin with a direct reader action and point to the next decision; found "${value}".`,
    );
  }
  if (/\b(will|becoming|increasingly)\b/i.test(name)) {
    throw new Error(`${context} reads like internal trend analysis. Use a direct reader action instead; found "${value}".`);
  }
}

function parseLatestMetadata(filename, source) {
  const frontmatter = requireMatch(source, /^---\s*\n([\s\S]*?)\n---/, `${filename}: missing YAML frontmatter.`);
  const date = requireMatch(frontmatter, /^date:\s*(.+)$/m, `${filename}: missing date.`);
  const issue = Number(requireMatch(frontmatter, /^issue:\s*(\d+)$/m, `${filename}: missing numeric issue.`));
  const title = requireMatch(frontmatter, /^title:\s*(.+)$/m, `${filename}: missing title.`);
  const slug = frontmatter.match(/^slug:\s*(.+)$/m)?.[1].trim().replace(/^['"]|['"]$/g, '') ?? basename(filename, '.md');
  return { filename, source, frontmatter, date, issue, title, slug };
}

function validateSignalMap(entry) {
  const board = requireMatch(
    entry.frontmatter,
    /^signalBoard:\s*\n([\s\S]*?)^signalInsight:/m,
    `${entry.filename}: signalBoard is required and must appear before signalInsight.`,
  );
  const boardSignal = requireMatch(board, /^signal:\s*(.+)$/m, `${entry.filename}: signalBoard.signal is required.`);
  const insight = requireMatch(
    entry.frontmatter,
    /^signalInsight:\s*\n([\s\S]*)$/m,
    `${entry.filename}: signalInsight is required because it drives the homepage Signal Map.`,
  );
  const mapSignal = requireMatch(
    insight,
    /^  signal:\s*(.+)$/m,
    `${entry.filename}: signalInsight.signal is required.`,
  );
  const mapSignalWords = wordCount(mapSignal);
  if (mapSignalWords < 4 || mapSignalWords > 9) {
    throw new Error(`${entry.filename}: signalInsight.signal must be a compact 4-9 words for the Signal Map; found ${mapSignalWords}.`);
  }
  if (wordCount(entry.title) < 4 || wordCount(entry.title) > 9) {
    throw new Error(`${entry.filename}: title must be a compact 4-9 word reader promise.`);
  }
  requireReaderFacingName(entry.title, `${entry.filename}: title`);
  requireReaderFacingName(mapSignal, `${entry.filename}: signalInsight.signal`);
  if (boardSignal !== mapSignal) {
    throw new Error(`${entry.filename}: signalBoard.signal and signalInsight.signal must match exactly.`);
  }
  const boardLaneBlock = requireMatch(
    board,
    /^  lanes:\s*\n([\s\S]*)$/m,
    `${entry.filename}: signalBoard.lanes is required.`,
  );
  const boardLanes = boardLaneBlock.split(/^\s{0,4}- label:\s*/m).slice(1).map((lane, index) => ({
    field: requireMatch(lane, /^      field:\s*(.+)$/m, `${entry.filename}: signalBoard lane ${index + 1} is missing field.`),
    state: requireMatch(lane, /^      state:\s*(.+)$/m, `${entry.filename}: signalBoard lane ${index + 1} is missing state.`),
    score: Number(requireMatch(lane, /^      score:\s*(\d+)$/m, `${entry.filename}: signalBoard lane ${index + 1} is missing score.`)),
  }));
  if (boardLanes.length !== 4) {
    throw new Error(`${entry.filename}: expected exactly four signalBoard lanes; found ${boardLanes.length}.`);
  }
  const laneBlock = requireMatch(
    insight,
    /^  lanes:\s*\n([\s\S]*)$/m,
    `${entry.filename}: signalInsight.lanes is required.`,
  );
  const lanes = laneBlock.split(/^\s{0,4}- label:\s*/m).slice(1);

  if (lanes.length !== 4) {
    throw new Error(`${entry.filename}: expected exactly four signalInsight lanes; found ${lanes.length}.`);
  }

  const parsedLanes = lanes.map((lane, index) => {
    const label = lane.split(/\r?\n/, 1)[0].trim().replace(/^['"]|['"]$/g, '');
    const field = requireMatch(lane, /^      field:\s*(.+)$/m, `${entry.filename}: lane ${index + 1} is missing field.`);
    const state = requireMatch(lane, /^      state:\s*(.+)$/m, `${entry.filename}: ${field} lane is missing state.`);
    const meaning = requireMatch(lane, /^      meaning:\s*(.+)$/m, `${entry.filename}: ${field} lane is missing meaning.`);
    const importance = Number(requireMatch(lane, /^      importance:\s*(\d+)$/m, `${entry.filename}: ${field} lane is missing importance.`));
    const usefulness = Number(requireMatch(lane, /^      usefulness:\s*(\d+)$/m, `${entry.filename}: ${field} lane is missing usefulness.`));
    const timeframe = requireMatch(lane, /^      timeframe:\s*(now|later)$/m, `${entry.filename}: ${field} lane is missing timeframe.`);
    const quadrant = requireMatch(lane, /^      quadrant:\s*(high-now|high-later|low-now|low-later)$/m, `${entry.filename}: ${field} lane is missing quadrant.`);
    const expected = expectedPlacement(importance, usefulness);

    requireReaderFacingName(state, `${entry.filename}: ${field} state`);
    if (boardLanes[index]?.field !== field || boardLanes[index]?.state !== state) {
      throw new Error(`${entry.filename}: signalBoard and signalInsight must use the same ordered ${field} lane and state.`);
    }
    if (boardLanes[index]?.score !== importance) {
      throw new Error(`${entry.filename}: signalBoard.score and signalInsight.importance must match for ${field}.`);
    }

    if (timeframe !== expected.timeframe || quadrant !== expected.quadrant) {
      throw new Error(
        `${entry.filename}: ${field} scores require timeframe=${expected.timeframe} and quadrant=${expected.quadrant}; found ${timeframe}/${quadrant}.`,
      );
    }
    if (state.split(/\s+/).length < 5 || meaning.split(/\s+/).length < 9) {
      throw new Error(`${entry.filename}: ${field} state and meaning must explain the signal in plain language.`);
    }

    return { label, field, state, importance, usefulness };
  });

  return { mapSignal, lanes: parsedLanes };
}

function extractScoreVector(entry) {
  const insight = requireMatch(entry.frontmatter, /^signalInsight:\s*\n([\s\S]*)$/m, `${entry.filename}: signalInsight is required.`);
  const laneBlock = requireMatch(insight, /^  lanes:\s*\n([\s\S]*)$/m, `${entry.filename}: signalInsight.lanes is required.`);
  return laneBlock.split(/^\s{0,4}- label:\s*/m).slice(1).map((lane, index) => ({
    importance: Number(requireMatch(lane, /^      importance:\s*(\d+)$/m, `${entry.filename}: lane ${index + 1} is missing importance.`)),
    usefulness: Number(requireMatch(lane, /^      usefulness:\s*(\d+)$/m, `${entry.filename}: lane ${index + 1} is missing usefulness.`)),
  }));
}

function validateWeekOverWeekScores(latest, previous, latestLanes) {
  if (!previous) return;
  const previousScores = extractScoreVector(previous);
  const identical = latestLanes.length === previousScores.length && latestLanes.every((lane, index) => (
    lane.importance === previousScores[index].importance && lane.usefulness === previousScores[index].usefulness
  ));
  if (identical) {
    throw new Error(`${latest.filename}: the full Signal Map score set exactly repeats ${previous.filename}; recalculate from this week's evidence.`);
  }
}

function estimateReadability(source) {
  const body = source
    .replace(/^---\s*\n[\s\S]*?\n---/, '')
    .replace(/## Sources[\s\S]*$/i, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^\s*[|>#-].*$/gm, ' ')
    .replace(/\[[^\]]+\]\([^\)]+\)/g, ' ')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[*_`]/g, ' ');
  const sentences = body.split(/[.!?]+(?:\s|$)/).map((item) => item.trim()).filter(Boolean);
  const words = body.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [];
  const longSentences = sentences.filter((sentence) => (sentence.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? []).length > 28);
  const averageSentenceWords = words.length / Math.max(sentences.length, 1);

  if (averageSentenceWords > 21 || longSentences.length / Math.max(sentences.length, 1) > 0.18) {
    throw new Error(
      `Latest brief misses the ninth-grade plain-language gate: ${averageSentenceWords.toFixed(1)} words per sentence and ${longSentences.length} sentences over 28 words.`,
    );
  }

  return { averageSentenceWords, longSentences: longSentences.length };
}

function validateEditorialStructure(entry) {
  const requiredSections = [
    '## What To Do Next',
    '## Leaders',
    '## Use This Week',
    '## Questions Worth Asking',
    '## What To Watch Next',
    '## Sources',
  ];

  for (const heading of requiredSections) {
    if (!entry.source.includes(heading)) throw new Error(`${entry.filename}: missing required section "${heading}".`);
  }
  if (!entry.source.includes(`> [!NOTE] Signal: ${entry.title}`)) {
    throw new Error(`${entry.filename}: the opening Signal callout must match the public title exactly.`);
  }
  const mainSignalHeadings = entry.source.match(/^## [1-4]\. .+$/gm) ?? [];
  if (mainSignalHeadings.length !== 4) {
    throw new Error(`${entry.filename}: expected four numbered public signal sections; found ${mainSignalHeadings.length}.`);
  }
  for (const heading of mainSignalHeadings) {
    requireReaderFacingName(heading, `${entry.filename}: main signal heading`);
  }
  if ((entry.source.match(/\*\*Next question:\*\*/g) ?? []).length !== 4) {
    throw new Error(`${entry.filename}: each of the four main signals needs one next question.`);
  }
  if (!entry.source.includes('<div class="editorial-panel-list role-panel-list">')) {
    throw new Error(`${entry.filename}: Use This Week must use the designed role-panel list.`);
  }
  if (!entry.source.includes('<div class="editorial-panel-list watch-panel-list">')) {
    throw new Error(`${entry.filename}: What To Watch Next must use the designed watch-panel list, not plain bullets.`);
  }
  if ((entry.source.match(/<article class="editorial-panel watch-panel">/g) ?? []).length < 3) {
    throw new Error(`${entry.filename}: What To Watch Next needs at least three designed watch panels.`);
  }
  const articleBeforeSources = entry.source.split(/^## Sources$/m, 1)[0];
  if (/^\s*\|/m.test(articleBeforeSources) || /<table\b/i.test(articleBeforeSources)) {
    throw new Error(`${entry.filename}: body tables are not allowed; use prose, lists, callouts, or editorial panels before Sources.`);
  }
  if ((entry.source.match(/https:\/\//g) ?? []).length < 4) {
    throw new Error(`${entry.filename}: fewer than four linked public sources were found.`);
  }
}

async function validateRenderedDesign(entry, mapSignal, lanes) {
  const homepage = await readFile(new URL('index.html', distDirectory), 'utf8');
  const article = await readFile(new URL(`${entry.slug}/index.html`, distDirectory), 'utf8');

  if (!homepage.includes(`href="/${entry.slug}/"`)) {
    throw new Error(`Homepage does not identify ${entry.slug} as the latest Signals Brief.`);
  }
  if (!homepage.includes(`Signal map for ${entry.title}`)) {
    throw new Error(`Homepage Signal Map is not bound to the latest brief, "${entry.title}".`);
  }
  if (!homepage.includes(mapSignal)) {
    throw new Error(`Homepage Signal Map does not show the latest signal, "${mapSignal}".`);
  }
  for (const lane of lanes) {
    if (!new RegExp(`<em[^>]*>${escapeRegExp(lane.field)}</em>`).test(homepage)) {
      throw new Error(`Homepage Signal Map is missing the ${lane.field} lane.`);
    }
    if (!homepage.includes(lane.state)) {
      throw new Error(`Homepage Signal Map does not show the latest ${lane.field} signal state, "${lane.state}".`);
    }
  }

  const rolePanelCount = (article.match(/<article class="editorial-panel">/g) ?? []).length;
  const watchPanelCount = (article.match(/<article class="editorial-panel watch-panel">/g) ?? []).length;
  if (!article.includes('class="editorial-panel-list role-panel-list"') || rolePanelCount < 4) {
    throw new Error(`Latest brief must render Use This Week as designed role panels; found ${rolePanelCount}.`);
  }
  if (!article.includes('class="editorial-panel-list watch-panel-list"') || watchPanelCount < 3) {
    throw new Error(`Latest brief must render What To Watch Next as designed watch panels; found ${watchPanelCount}.`);
  }
  const renderedTables = (article.match(/<table\b/g) ?? []).length;
  if (renderedTables !== 1) {
    throw new Error(`Latest brief must render only the established Sources table; found ${renderedTables} tables.`);
  }
}

const files = (await readdir(signalDirectory)).filter((filename) => filename.endsWith('.md'));
const entries = await Promise.all(files.map(async (filename) => {
  const source = await readFile(new URL(filename, signalDirectory), 'utf8');
  return parseLatestMetadata(filename, source);
}));
const sortedEntries = entries.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || b.issue - a.issue);
const latest = sortedEntries[0];
const previous = sortedEntries[1];

if (!latest) throw new Error('No Signals Brief files were found.');

const { mapSignal, lanes } = validateSignalMap(latest);
validateWeekOverWeekScores(latest, previous, lanes);
validateEditorialStructure(latest);
const readability = estimateReadability(latest.source);
await validateRenderedDesign(latest, mapSignal, lanes);

console.log(
  `Validated ${latest.filename}: four Signal Map lanes, ${lanes.length} rendered lanes, designed role and watch panels, and ${readability.averageSentenceWords.toFixed(1)} words per sentence.`,
);
