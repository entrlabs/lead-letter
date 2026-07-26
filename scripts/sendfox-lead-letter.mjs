import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SITE_URL = 'https://letters.entr.cc';
const DEFAULT_BRAND_URL = DEFAULT_SITE_URL;
const DEFAULT_ENTR_URL = 'https://entr.cc';
const DEFAULT_YES_WAY_URL = 'https://josephiesue.com/join';
const DEFAULT_LOGO_URL = `${DEFAULT_SITE_URL}/assets/entr-icon-lead-letter-blue-email.png`;
const DEFAULT_FROM_NAME = 'The Lead Letter';
const DEFAULT_FROM_EMAIL = 'letters@entr.cc';
const UNSUBSCRIBE_URL = '{{unsubscribe_url}}';
const BRAND = {
  ink: '#0a0f1c',
  raise: '#131c32',
  muted: '#6b7a99',
  paper: '#f7f9ff',
  paperAlt: '#eef1fb',
  surface: '#ffffff',
  line: '#d6e0fb',
  border: '#b9c9f5',
  azure: '#5b8cff',
  azureDeep: '#2e5bd0',
  indigo: '#6e74f0',
  violet: '#a06cf0',
  gold: '#c9a35e',
  goldDeep: '#8c6526',
};

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeEndpoint(value) {
  if (/^https?:\/\//.test(value)) return value;
  return `/${value.replace(/^\/+/, '')}`;
}

function stripQuotes(value) {
  return value.replace(/^['"]|['"]$/g, '');
}

function parseFrontmatter(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) {
    throw new Error('Expected YAML frontmatter at the top of the letter file.');
  }

  const data = {};

  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    if (!rawValue || rawValue === '|') continue;
    data[key] = stripQuotes(rawValue.trim());
  }

  return {
    data,
    frontmatter: match[1],
    body: source.slice(match[0].length).trim(),
  };
}

function slugFromFile(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function htmlEscape(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function markdownToPlainText(markdown) {
  return markdown
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s*\[![A-Z]+\]\s*/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function markdownBlocks(markdown) {
  return markdown
    .split(/\n\s*\n/)
    .map((block) => markdownToPlainText(block))
    .filter(Boolean);
}

function sectionBody(body, headingPattern) {
  const match = body.match(new RegExp(
    `^##\\s+${headingPattern}\\s*$\\n([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`,
    'mi',
  ));
  return match?.[1]?.trim() || '';
}

function extractSignalBoard(frontmatter) {
  const block = frontmatter.match(/^signalBoard:\s*\n([\s\S]*?)^signalInsight:/m)?.[1] || '';
  const signal = stripQuotes(block.match(/^  signal:\s*(.+)$/m)?.[1]?.trim() || '');
  const micro = stripQuotes(block.match(/^  micro:\s*(.+)$/m)?.[1]?.trim() || '');
  const lanesBlock = block.match(/^  lanes:\s*\n([\s\S]*)$/m)?.[1] || '';
  const lanes = lanesBlock
    .split(/^\s{4}- label:\s*/m)
    .slice(1)
    .map((lane) => {
      const [labelLine] = lane.split(/\r?\n/, 1);
      return {
        label: stripQuotes(labelLine.trim()),
        state: stripQuotes(lane.match(/^      state:\s*(.+)$/m)?.[1]?.trim() || ''),
        level: stripQuotes(lane.match(/^      level:\s*(.+)$/m)?.[1]?.trim() || ''),
        score: Number(lane.match(/^      score:\s*(\d+)$/m)?.[1] || 0),
      };
    })
    .filter((lane) => lane.label && lane.state);

  return { signal, micro, lanes };
}

function extractBriefContent(letter) {
  const signalBoard = extractSignalBoard(letter.frontmatter);
  const opening = letter.body.split(/^>\s*\[!NOTE\]/m, 1)[0];
  const intro = markdownBlocks(opening)
    .filter((paragraph) => paragraph !== '---')
    .slice(0, 4);
  const callout = letter.body.match(
    /^>\s*\[!NOTE\]\s*(?:Signal:\s*)?([^\n]+)\n(?:>\s*\n)?(?:>\s*)?([^\n]+)/m,
  );
  const signal = markdownToPlainText(callout?.[2] || signalBoard.micro || intro.at(-1) || '');

  const frameworkMatch = letter.body.match(
    /^##\s+(.+)\s*$\n([\s\S]*?)(?=^---\s*$|^##\s+)/mi,
  );
  const frameworkTitle = markdownToPlainText(frameworkMatch?.[1] || 'A Test for This Week');
  const frameworkItems = [...(frameworkMatch?.[2] || '').matchAll(
    /^\d+\.\s+\*\*([^*]+)\*\*\s*(.+)$/gm,
  )].map((match) => ({
    label: markdownToPlainText(match[1]),
    text: markdownToPlainText(match[2]),
  })).slice(0, 6);

  const actions = markdownBlocks(sectionBody(
    letter.body,
    '(?:What To Do Next|What This Looks Like|Use This(?: This)? Week)',
  ))
    .filter((paragraph) => paragraph !== '---')
    .slice(0, 4);

  return {
    intro,
    signal,
    frameworkTitle,
    frameworkItems,
    actions,
    lanes: signalBoard.lanes,
    preview: signalBoard.micro || signal,
  };
}

function previewText(content, title) {
  const base = content.preview || `A practical reading of this week's signal: ${title}.`;
  const suffix = ' Read the four signals and one move for this week.';
  const maxBaseLength = Math.max(40, 150 - suffix.length);
  const clipped = base.length > maxBaseLength
    ? `${base.slice(0, maxBaseLength - 1).trimEnd()}…`
    : base;
  return `${clipped}${suffix}`;
}

function paragraphHtml(text, style = '') {
  return `<p style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; line-height: 1.65; color: ${BRAND.raise}; ${style}">${htmlEscape(text)}</p>`;
}

function listItemHtml({ label, text }) {
  return `
    <tr>
      <td valign="top" style="width: 22px; padding: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.55; font-weight: 800; color: ${BRAND.azureDeep};">•</td>
      <td style="padding: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: ${BRAND.raise};"><strong>${htmlEscape(label)}</strong>${text ? ` ${htmlEscape(text)}` : ''}</td>
    </tr>
  `;
}

function plainTextLines(content) {
  return [
    ...content.intro,
    '',
    'THE SIGNAL',
    content.signal,
    '',
    content.frameworkTitle.toUpperCase(),
    ...content.frameworkItems.map((item, index) => `${index + 1}. ${item.label} ${item.text}`),
    '',
    'THIS WEEK’S SIGNAL MAP',
    ...content.lanes.map((lane) => `${lane.label} (${lane.level}, ${lane.score}): ${lane.state}`),
    '',
    'WHAT TO DO NEXT',
    ...content.actions.map((action) => `• ${action}`),
  ].filter((line, index, lines) => line || lines[index - 1]);
}

function bodyWordCount(content) {
  return markdownToPlainText(plainTextLines(content).join(' '))
    .split(/\s+/)
    .filter(Boolean)
    .length;
}

function assertBriefContent(content, filePath) {
  if (!content.signal) throw new Error(`${filePath}: email could not extract the weekly signal.`);
  if (content.intro.length < 2) throw new Error(`${filePath}: email needs at least two opening paragraphs.`);
  if (content.frameworkItems.length < 3) throw new Error(`${filePath}: email could not extract the weekly decision framework.`);
  if (content.lanes.length !== 4) throw new Error(`${filePath}: email requires exactly four Signal Map lanes.`);
  if (content.actions.length < 2) throw new Error(`${filePath}: email could not extract next actions.`);

  const words = bodyWordCount(content);
  if (words < 180 || words > 600) {
    throw new Error(`${filePath}: extracted email core must be 180-600 words; found ${words}.`);
  }
}

function firstParagraph(markdown) {
  return markdownToPlainText(markdown)
    .split(/\n\s*\n/)
    .find((paragraph) => paragraph.length > 0);
}

function emailDescription(value) {
  return value
    .replace(/^A public weekly Signals Brief about\s+/i, "This week's Signals Brief is about ")
    .replace(/^A weekly Signals Brief about\s+/i, "This week's Signals Brief is about ")
    .replace(/^A public weekly letter about\s+/i, "This week's Lead Letter is about ");
}

function formatDate(value) {
  if (!value) return undefined;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.valueOf())) return value;

  return new Intl.DateTimeFormat('en', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function issueLabel(data) {
  const parts = [];
  if (data.series) parts.push(data.series);
  if (data.week) parts.push(data.week);
  if (data.issue) parts.push(`Issue ${data.issue}`);
  return parts.join(' / ');
}

function senderName() {
  return process.env.SENDFOX_FROM_NAME || DEFAULT_FROM_NAME;
}

function senderEmail() {
  return process.env.SENDFOX_FROM_EMAIL || DEFAULT_FROM_EMAIL;
}

function listIds() {
  if (!process.env.SENDFOX_LIST_ID) return [];
  const id = Number(process.env.SENDFOX_LIST_ID);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('SENDFOX_LIST_ID must be a positive numeric SendFox list ID.');
  }

  return [id];
}

function subjectLine(data, title) {
  const activeDate = formatDate(data.date) || 'This Week';
  return `${activeDate} Signals Brief: ${title}`;
}

function ctaHtml(url) {
  const safeUrl = htmlEscape(url);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 8px;">
      <tr>
        <td bgcolor="${BRAND.ink}" style="border-radius: 0; box-shadow: 0 0 0 7px rgba(91, 140, 255, 0.13);">
          <a href="${safeUrl}" style="display: inline-block; padding: 14px 22px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; text-decoration: none;">Read the Complete Signals Brief</a>
        </td>
      </tr>
    </table>
  `;
}

function leadLetterMarkHtml() {
  const logoUrl = htmlEscape(process.env.LEAD_LETTER_LOGO_URL || DEFAULT_LOGO_URL);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td style="width: 30px;">
          <img src="${logoUrl}" width="30" height="30" alt="ENTR" style="display: block; width: 30px; height: 30px; border: 0; outline: none; text-decoration: none;">
        </td>
        <td style="padding-left: 14px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.4; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.ink};">The Lead Letter</td>
      </tr>
    </table>
  `;
}

function coreBriefHtml(content) {
  const intro = content.intro.map((paragraph) => paragraphHtml(paragraph)).join('');
  const framework = content.frameworkItems.map(listItemHtml).join('');
  const lanes = content.lanes.map((lane) => `
    <tr>
      <td style="padding: 14px 16px; border-bottom: 1px solid ${BRAND.line};">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
          <tr>
            <td style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: ${BRAND.azureDeep};">${htmlEscape(lane.label)}</td>
            <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; color: ${BRAND.muted};">${htmlEscape(lane.level)} / ${lane.score}</td>
          </tr>
          <tr>
            <td colspan="2" style="padding-top: 5px; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.55; font-weight: 700; color: ${BRAND.ink};">${htmlEscape(lane.state)}</td>
          </tr>
        </table>
      </td>
    </tr>
  `).join('');
  const actions = content.actions.map((action) => listItemHtml({ label: action, text: '' })).join('');

  return `
    <tr>
      <td style="padding: 12px 34px 4px;">
        ${intro}
      </td>
    </tr>
    <tr>
      <td style="padding: 12px 34px 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-left: 4px solid ${BRAND.azure}; background: #f7f9ff;">
          <tr>
            <td style="padding: 20px 20px 18px;">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">The Signal</p>
              <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 19px; line-height: 1.55; font-weight: 700; color: ${BRAND.ink};">${htmlEscape(content.signal)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 34px 30px;">
        <h2 style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.2; color: ${BRAND.ink};">${htmlEscape(content.frameworkTitle)}</h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${framework}</table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 34px 30px;">
        <h2 style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.2; color: ${BRAND.ink};">This Week’s Signal Map</h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid ${BRAND.line};">${lanes}</table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 34px 14px;">
        <h2 style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 24px; line-height: 1.2; color: ${BRAND.ink};">What To Do Next</h2>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${actions}</table>
      </td>
    </tr>
  `;
}

function readerPathHtml({ signalMapUrl, fieldNotesUrl, yesWayUrl }) {
  return `
    <tr>
      <td style="padding: 0 34px 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid ${BRAND.line}; background: #ffffff;">
          <tr>
            <td style="padding: 20px 20px 18px; border-bottom: 1px solid ${BRAND.line};">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Come Back Daily: Field Notes</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">Field Notes are short public lessons drawn from the daily brief—focused on leadership, service, work, learning, and better judgment. Visit the archive each day for one useful signal or question between weekly briefings.</p>
              <a href="${htmlEscape(fieldNotesUrl)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; font-weight: 700; color: ${BRAND.azureDeep}; text-decoration: underline;">Visit the Field Notes archive</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 20px 18px; border-bottom: 1px solid ${BRAND.line};">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.goldDeep};">The Yes-Way</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">The Yes-Way is Joseph E. Iesue’s separate monthly publication on strength, service, and the long climb. It draws on Eastern and Western traditions, modern research, and checked sources to help readers become strong enough to be helpful.</p>
              <a href="${htmlEscape(yesWayUrl)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; font-weight: 700; color: ${BRAND.goldDeep}; text-decoration: underline;">Join The Yes-Way</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 20px 18px;">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Weekly Signal Map</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">Use the Signal Map to see the four public fields that matter now, their strength, and the decision each signal should improve.</p>
              <a href="${htmlEscape(signalMapUrl)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; font-weight: 700; color: ${BRAND.azureDeep}; text-decoration: underline;">View the current Signal Map</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildHtmlEmail({ title, description, url, data, siteUrl, content, preview }) {
  const brandUrl = trimTrailingSlash(process.env.ENTR_BRAND_URL || DEFAULT_BRAND_URL);
  const entrUrl = trimTrailingSlash(process.env.ENTR_URL || DEFAULT_ENTR_URL);
  const date = formatDate(data.date);
  const meta = [issueLabel(data), date].filter(Boolean).join(' / ');
  const signalMapUrl = `${siteUrl}/#latest-signal-map`;
  const fieldNotesUrl = `${siteUrl}/fieldnotes/`;
  const yesWayUrl = process.env.YES_WAY_URL || DEFAULT_YES_WAY_URL;

  return `<body style="margin: 0; padding: 0; background: ${BRAND.paperAlt}; color: ${BRAND.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${htmlEscape(preview)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.paperAlt};">
      <tr>
        <td align="center" style="padding: 28px 16px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 640px; background: ${BRAND.surface}; border: 1px solid ${BRAND.border}; box-shadow: 0 0 0 1px rgba(255,255,255,0.72) inset;">
            <tr>
              <td style="padding: 28px 34px 20px; border-bottom: 1px solid ${BRAND.line}; background: linear-gradient(135deg, #ffffff 0%, #f2f6ff 100%);">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                  <tr>
                    <td>${leadLetterMarkHtml()}</td>
                    <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Latest Signals Brief</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 38px 34px 10px;">
                <p style="margin: 0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${BRAND.azureDeep};">Signals Brief</p>
                <h1 style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; line-height: 1.02; font-weight: 900; color: ${BRAND.ink};">${htmlEscape(title)}</h1>
                ${meta ? `<p style="margin: 16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; color: ${BRAND.muted};">${htmlEscape(meta)}</p>` : ''}
              </td>
            </tr>
            <tr>
              <td style="padding: 16px 34px 4px;">
                <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 19px; line-height: 1.65; color: ${BRAND.raise};">${htmlEscape(description)}</p>
              </td>
            </tr>
            ${coreBriefHtml(content)}
            <tr>
              <td style="padding: 0 34px 38px;">
                ${ctaHtml(url)}
                <p style="margin: 16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.7; color: ${BRAND.muted};">The website is the canonical brief, with the full evidence, limits, source links, and updated Signal Map.</p>
              </td>
            </tr>
            ${readerPathHtml({ signalMapUrl, fieldNotesUrl, yesWayUrl })}
            <tr>
              <td style="padding: 0 34px 34px;">
                <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.7; color: ${BRAND.muted};">Weekly Signals Briefs on leadership, service, work, learning, and the discipline of helping people rise.</p>
                <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.7; color: ${BRAND.muted};">
                  <a href="${htmlEscape(brandUrl)}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">letters.entr.cc</a>
                  <span style="color: ${BRAND.line};"> / </span>
                  <a href="${htmlEscape(url)}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">Read online</a>
                  <span style="color: ${BRAND.line};"> / </span>
                  <a href="${htmlEscape(entrUrl)}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">entr.cc</a>
                </p>
                <p style="margin: 16px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.7; color: ${BRAND.muted};">
                  No longer want to receive The Lead Letter?
                  <a href="${UNSUBSCRIBE_URL}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">Unsubscribe here</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>`;
}

function buildTextEmail({ title, description, url, data, siteUrl, content }) {
  const signalMapUrl = `${siteUrl}/#latest-signal-map`;
  const fieldNotesUrl = `${siteUrl}/fieldnotes/`;
  const yesWayUrl = process.env.YES_WAY_URL || DEFAULT_YES_WAY_URL;
  const lines = [
    'The Lead Letter',
    issueLabel(data),
    formatDate(data.date),
    '',
    title,
    '',
    description,
    '',
    ...plainTextLines(content),
    '',
    'READ THE COMPLETE SIGNALS BRIEF',
    url,
    '',
    'COME BACK DAILY: FIELD NOTES',
    'Field Notes are short public lessons drawn from the daily brief—focused on leadership, service, work, learning, and better judgment.',
    fieldNotesUrl,
    '',
    'THE YES-WAY',
    'Joseph E. Iesue’s separate monthly publication on strength, service, and the long climb, drawing on Eastern and Western traditions, modern research, and checked sources.',
    yesWayUrl,
    '',
    'WEEKLY SIGNAL MAP',
    'See the four public fields that matter now, their strength, and the decision each signal should improve.',
    signalMapUrl,
    '',
    'Weekly Signals Briefs on leadership, service, work, learning, and the discipline of helping people rise.',
    process.env.ENTR_BRAND_URL || DEFAULT_BRAND_URL,
    process.env.ENTR_URL || DEFAULT_ENTR_URL,
    '',
    `Unsubscribe: ${UNSUBSCRIBE_URL}`,
  ];

  return lines.filter((line, index, array) => line || array[index - 1]).join('\n');
}

function buildEmail(letter, filePath) {
  const siteUrl = trimTrailingSlash(process.env.LEAD_LETTER_SITE_URL || DEFAULT_SITE_URL);
  const slug = letter.data.slug || slugFromFile(filePath);
  const url = `${siteUrl}/${slug}/`;
  const title = letter.data.title || slug;
  const description = emailDescription(letter.data.description || firstParagraph(letter.body) || title);
  const content = extractBriefContent(letter);
  assertBriefContent(content, filePath);
  const subject = process.env.SENDFOX_SUBJECT_PREFIX
    ? `${process.env.SENDFOX_SUBJECT_PREFIX}: ${title}`
    : subjectLine(letter.data, title);
  const preview = previewText(content, title);
  const text = buildTextEmail({ title, description, url, data: letter.data, siteUrl, content });
  const html = buildHtmlEmail({
    title,
    description,
    url,
    data: letter.data,
    siteUrl,
    content,
    preview,
  });
  const campaignTitlePrefix = process.env.SENDFOX_CAMPAIGN_TITLE_PREFIX || 'Lead Letter Weekly';
  const campaignKey = letter.data.week || letter.data.date || slug;

  return {
    title: `${campaignTitlePrefix} - ${campaignKey} - ${title}`,
    subject,
    preview_text: preview,
    html,
    text,
    url,
    lists: listIds(),
    from_name: senderName(),
    from_email: senderEmail(),
  };
}

function buildPayload(email) {
  return {
    title: email.title,
    subject: email.subject,
    preview_text: email.preview_text,
    html: email.html,
    from_name: email.from_name,
    from_email: email.from_email,
    ...(email.lists.length > 0 ? { lists: email.lists } : {}),
  };
}

async function postToSendFox(payload) {
  const token = requiredEnv('SENDFOX_API_TOKEN');
  const baseUrl = trimTrailingSlash(process.env.SENDFOX_API_BASE || 'https://api.sendfox.com');
  const endpoint = normalizeEndpoint(process.env.SENDFOX_API_ENDPOINT || '/campaigns');
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    method: process.env.SENDFOX_API_METHOD || 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`SendFox API returned ${response.status}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

async function findExistingCampaign(campaignTitle) {
  if (process.env.SENDFOX_DEDUPLICATE_CAMPAIGNS !== 'true') return undefined;

  const token = requiredEnv('SENDFOX_API_TOKEN');
  const baseUrl = trimTrailingSlash(process.env.SENDFOX_API_BASE || 'https://api.sendfox.com');

  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${baseUrl}/campaigns?page=${page}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });
    const body = await response.text();

    if (!response.ok) {
      throw new Error(`SendFox campaign lookup returned ${response.status}: ${body}`);
    }

    const result = body ? JSON.parse(body) : {};
    const campaigns = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);
    const match = campaigns.find((campaign) => campaign.title === campaignTitle);
    if (match) return match;

    const currentPage = Number(result.current_page || page);
    const lastPage = Number(result.last_page || 0);
    if (campaigns.length === 0 || (lastPage > 0 && currentPage >= lastPage)) break;
  }

  return undefined;
}

async function sendCampaign(campaignId) {
  if (!campaignId) {
    throw new Error('SendFox did not return a campaign id to send.');
  }

  if (process.env.SENDFOX_TEST_SEND_ENABLED !== 'true') {
    throw new Error('Refusing to send campaign without SENDFOX_TEST_SEND_ENABLED=true.');
  }

  const token = requiredEnv('SENDFOX_API_TOKEN');
  const baseUrl = trimTrailingSlash(process.env.SENDFOX_API_BASE || 'https://api.sendfox.com');
  const url = `${baseUrl}/campaigns/${campaignId}/send`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  });

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`SendFox send returned ${response.status}: ${body}`);
  }

  return body ? JSON.parse(body) : {};
}

async function main() {
  const listFile = process.argv[2];
  if (!listFile) {
    throw new Error('Usage: node scripts/sendfox-lead-letter.mjs <file-with-added-letter-paths>');
  }

  const files = (await readFile(listFile, 'utf8'))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  if (files.length === 0) {
    console.log('No newly added Lead Letter files found.');
    return;
  }

  const sendEnabled = process.env.SENDFOX_SEND_ENABLED === 'true';
  if (sendEnabled) {
    requiredEnv('SENDFOX_LIST_ID');
  }

  for (const filePath of files) {
    const source = await readFile(filePath, 'utf8');
    const letter = parseFrontmatter(source);
    const email = buildEmail(letter, filePath);
    const payload = buildPayload(email);

    if (!sendEnabled) {
      console.log(`[dry run] ${email.subject}`);
      console.log(`[dry run] ${email.url}`);
      console.log(`[dry run] preview: ${email.preview_text}`);
      if (process.env.SENDFOX_DEBUG_PAYLOAD === 'true') {
        console.log(JSON.stringify(payload, null, 2));
      }
      continue;
    }

    const existing = await findExistingCampaign(payload.title);
    const existingStatus = String(existing?.status || '').toLowerCase();
    if (
      existing?.sent_at
      || existing?.scheduled_at
      || ['sent', 'scheduled', 'sending'].includes(existingStatus)
    ) {
      console.log(`Already sent or scheduled SendFox campaign ${existing.id} for ${email.url}; skipping duplicate.`);
      continue;
    }

    const result = existing || await postToSendFox(payload);
    if (existing) {
      console.log(`Reusing existing SendFox draft ${result.id} for ${email.url}`);
    } else {
      console.log(`Created SendFox draft for ${email.url}`);
      if (result?.id) console.log(`SendFox id: ${result.id}`);
    }

    if (process.env.SENDFOX_SEND_AFTER_CREATE === 'true') {
      await sendCampaign(result?.id);
      console.log(`Sent SendFox campaign ${result.id} to configured list.`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
