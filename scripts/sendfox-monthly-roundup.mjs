import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIGNALS_DIRECTORY = path.join(ROOT, 'src/content/signals');
const FIELD_NOTES_DIRECTORY = path.join(ROOT, 'src/content/fieldnotes');
const DEFAULT_SITE_URL = 'https://letters.entr.cc';
const DEFAULT_FROM_NAME = 'The Lead Letter';
const DEFAULT_FROM_EMAIL = 'letters@entr.cc';
const DEFAULT_LOGO_URL = `${DEFAULT_SITE_URL}/assets/entr-icon-lead-letter-blue-email.png`;
const UNSUBSCRIBE_URL = '{{unsubscribe_url}}';
const BRAND = {
  ink: '#0a0f1c',
  raise: '#131c32',
  muted: '#6b7a99',
  paperAlt: '#eef1fb',
  surface: '#ffffff',
  line: '#d6e0fb',
  border: '#b9c9f5',
  azure: '#5b8cff',
  azureDeep: '#2e5bd0',
  goldDeep: '#8c6526',
};

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function stripQuotes(value = '') {
  return value.replace(/^['"]|['"]$/g, '');
}

function htmlEscape(value = '') {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function parseFrontmatter(source, filePath) {
  const match = source.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error(`${filePath}: expected YAML frontmatter.`);

  const data = {};
  for (const line of match[1].split('\n')) {
    const pair = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!pair || !pair[2] || pair[2] === '|') continue;
    data[pair[1]] = stripQuotes(pair[2].trim());
  }

  const signalBoardBlock = match[1].match(/^signalBoard:\s*\n([\s\S]*?)(?=^[A-Za-z0-9_-]+:|(?![\s\S]))/m)?.[1] || '';
  for (const key of ['signal', 'micro', 'move', 'question']) {
    data[key] = stripQuotes(signalBoardBlock.match(new RegExp(`^  ${key}:\\s*(.+)$`, 'm'))?.[1]?.trim() || '');
  }

  return data;
}

async function readEntries(directory, type) {
  const filenames = (await readdir(directory)).filter((filename) => filename.endsWith('.md'));
  return Promise.all(filenames.map(async (filename) => {
    const filePath = path.join(directory, filename);
    const data = parseFrontmatter(await readFile(filePath, 'utf8'), filePath);
    if (!data.title || !/^\d{4}-\d{2}-\d{2}$/.test(data.date || '')) {
      throw new Error(`${filePath}: monthly email requires title and YYYY-MM-DD date.`);
    }
    return {
      ...data,
      type,
      filename,
      filePath,
      slug: data.slug || path.basename(filename, '.md'),
    };
  }));
}

function asOfDate() {
  const argumentIndex = process.argv.indexOf('--as-of');
  const value = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : process.env.SENDFOX_MONTHLY_AS_OF;
  const date = value || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('--as-of must be YYYY-MM-DD.');
  return date;
}

function formatMonth(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`));
}

function selectSignals(entries, asOf) {
  const selected = entries
    .filter((entry) => entry.date <= asOf)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  if (selected.length !== 4) throw new Error(`Monthly email requires four Signals Briefs on or before ${asOf}.`);
  return selected;
}

function curatedFieldNoteFilenames() {
  return (process.env.SENDFOX_MONTHLY_FIELD_NOTE_FILES || '')
    .split(',')
    .map((value) => path.basename(value.trim()))
    .filter(Boolean);
}

function selectFieldNotes(entries, signals, asOf) {
  const eligible = entries
    .filter((entry) => entry.date <= asOf && entry.date >= signals.at(-1).date)
    .sort((a, b) => b.date.localeCompare(a.date));
  const curated = curatedFieldNoteFilenames();

  if (curated.length > 0) {
    if (curated.length !== 2) throw new Error('SENDFOX_MONTHLY_FIELD_NOTE_FILES must name exactly two files.');
    return curated.map((filename) => {
      const match = eligible.find((entry) => entry.filename === filename);
      if (!match) throw new Error(`Curated Field Note is missing or outside the four-week window: ${filename}`);
      return match;
    });
  }

  if (eligible.length < 2) throw new Error('Monthly email requires at least two eligible Field Notes.');
  return [eligible[0], eligible[Math.floor((eligible.length - 1) / 2)]];
}

function entryUrl(siteUrl, entry) {
  return entry.type === 'fieldnote'
    ? `${siteUrl}/fieldnotes/${entry.slug}/`
    : `${siteUrl}/${entry.slug}/`;
}

function previewText(signals) {
  const preview = `Four signals worth catching up on: ${signals.map((entry) => entry.title).join('; ')}.`;
  return preview.length <= 155 ? preview : `${preview.slice(0, 154).trimEnd()}…`;
}

function signalCardHtml(entry, index, siteUrl) {
  const url = entryUrl(siteUrl, entry);
  const insight = entry.micro || entry.description;
  const move = entry.move || entry.question;
  return `
    <tr>
      <td style="padding: ${index === 0 ? '4px' : '28px'} 34px 30px; border-bottom: 1px solid ${BRAND.line};">
        <p style="margin: 0 0 9px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${index === 0 ? BRAND.azureDeep : BRAND.muted};">${index === 0 ? 'Start Here · Latest Signals Brief' : `Then Go Back · ${formatDate(entry.date)}`}</p>
        <h2 style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: ${index === 0 ? '29px' : '24px'}; line-height: 1.16; color: ${BRAND.ink};">${htmlEscape(entry.title)}</h2>
        <p style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: 17px; line-height: 1.65; color: ${BRAND.raise};">${htmlEscape(insight)}</p>
        ${move ? `<p style="margin: 0 0 14px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.65; color: ${BRAND.raise};"><strong>One move:</strong> ${htmlEscape(move)}</p>` : ''}
        <a href="${htmlEscape(url)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; font-weight: 800; color: ${BRAND.azureDeep}; text-decoration: underline;">Read this Signals Brief →</a>
      </td>
    </tr>`;
}

function fieldNotesHtml(fieldNotes, siteUrl) {
  const rows = fieldNotes.map((entry) => `
    <tr>
      <td style="padding: 16px 0; border-top: 1px solid ${BRAND.line};">
        <a href="${htmlEscape(entryUrl(siteUrl, entry))}" style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; line-height: 1.35; font-weight: 800; color: ${BRAND.ink}; text-decoration: none;">${htmlEscape(entry.title)}</a>
        <p style="margin: 7px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.6; color: ${BRAND.muted};">${htmlEscape(entry.description)}</p>
      </td>
    </tr>`).join('');

  return `
    <tr>
      <td style="padding: 30px 34px; background: #f7f9ff;">
        <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.goldDeep};">Two Field Notes Worth Keeping</p>
        <p style="margin: 0 0 12px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.6; color: ${BRAND.raise};">Shorter reads for turning the month’s ideas into a question, test, or next move.</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">${rows}</table>
      </td>
    </tr>`;
}

function buildHtml({ asOf, signals, fieldNotes, siteUrl, preview }) {
  const logoUrl = process.env.LEAD_LETTER_LOGO_URL || DEFAULT_LOGO_URL;
  const archiveUrl = `${siteUrl}/archive/`;
  return `<body style="margin: 0; padding: 0; background: ${BRAND.paperAlt}; color: ${BRAND.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${htmlEscape(preview)}</div>
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background: ${BRAND.paperAlt};">
      <tr><td align="center" style="padding: 28px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="width: 100%; max-width: 640px; background: ${BRAND.surface}; border: 1px solid ${BRAND.border};">
          <tr><td style="padding: 28px 34px 20px; border-bottom: 1px solid ${BRAND.line}; background: linear-gradient(135deg, #ffffff 0%, #f2f6ff 100%);">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%"><tr>
              <td><img src="${htmlEscape(logoUrl)}" width="30" height="30" alt="ENTR" style="display: block; width: 30px; height: 30px; border: 0;"></td>
              <td style="padding-left: 14px; font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: ${BRAND.ink};">The Lead Letter</td>
              <td align="right" style="font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Monthly Catch-Up</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding: 38px 34px 24px;">
            <p style="margin: 0 0 12px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: ${BRAND.azureDeep};">${htmlEscape(formatMonth(asOf))}</p>
            <h1 style="margin: 0 0 16px; font-family: Georgia, 'Times New Roman', serif; font-size: 38px; line-height: 1.04; font-weight: 900; color: ${BRAND.ink};">Four signals worth catching up on</h1>
            <p style="margin: 0; font-family: Georgia, 'Times New Roman', serif; font-size: 18px; line-height: 1.65; color: ${BRAND.raise};">If a week moved too quickly, this is your way back in. Start with the newest signal, then follow the thread backward through the four most recent briefings.</p>
          </td></tr>
          ${signals.map((entry, index) => signalCardHtml(entry, index, siteUrl)).join('')}
          ${fieldNotesHtml(fieldNotes, siteUrl)}
          <tr><td style="padding: 30px 34px 34px;">
            <p style="margin: 0 0 14px; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; line-height: 1.65; color: ${BRAND.raise};">You do not need to read everything at once. Choose the signal closest to a decision you are carrying now.</p>
            <a href="${archiveUrl}" style="display: inline-block; padding: 14px 22px; background: ${BRAND.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; text-decoration: none;">Browse Every Signals Brief</a>
            <p style="margin: 24px 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.7; color: ${BRAND.muted};">No longer want to receive The Lead Letter? <a href="${UNSUBSCRIBE_URL}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">Unsubscribe here</a>.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>`;
}

function buildText({ asOf, signals, fieldNotes, siteUrl }) {
  const lines = [
    'THE LEAD LETTER — MONTHLY CATCH-UP',
    formatMonth(asOf),
    '',
    'FOUR SIGNALS WORTH CATCHING UP ON',
    'If a week moved too quickly, this is your way back in. Start with the newest signal, then follow the thread backward through the four most recent briefings.',
    '',
    ...signals.flatMap((entry, index) => [
      `${index + 1}. ${entry.title}`,
      entry.micro || entry.description,
      entry.move ? `One move: ${entry.move}` : '',
      entryUrl(siteUrl, entry),
      '',
    ]),
    'TWO FIELD NOTES WORTH KEEPING',
    ...fieldNotes.flatMap((entry) => [entry.title, entry.description, entryUrl(siteUrl, entry), '']),
    'Choose the signal closest to a decision you are carrying now.',
    `${siteUrl}/archive/`,
    '',
    `Unsubscribe: ${UNSUBSCRIBE_URL}`,
  ];
  return lines.filter((line, index) => line || lines[index - 1]).join('\n');
}

function listIds() {
  if (!process.env.SENDFOX_LIST_ID) return [];
  const id = Number(process.env.SENDFOX_LIST_ID);
  if (!Number.isInteger(id) || id <= 0) throw new Error('SENDFOX_LIST_ID must be a positive numeric SendFox list ID.');
  return [id];
}

async function postToSendFox(payload) {
  if (!process.env.SENDFOX_API_TOKEN) throw new Error('Missing required environment variable: SENDFOX_API_TOKEN');
  const baseUrl = trimTrailingSlash(process.env.SENDFOX_API_BASE || 'https://api.sendfox.com');
  const response = await fetch(`${baseUrl}/campaigns`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.SENDFOX_API_TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`SendFox API returned ${response.status}: ${body}`);
  return body ? JSON.parse(body) : {};
}

async function findExistingCampaign(campaignTitle) {
  if (process.env.SENDFOX_DEDUPLICATE_CAMPAIGNS !== 'true') return undefined;
  if (!process.env.SENDFOX_API_TOKEN) throw new Error('Missing required environment variable: SENDFOX_API_TOKEN');
  const baseUrl = trimTrailingSlash(process.env.SENDFOX_API_BASE || 'https://api.sendfox.com');

  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${baseUrl}/campaigns?page=${page}`, {
      headers: { Authorization: `Bearer ${process.env.SENDFOX_API_TOKEN}`, Accept: 'application/json' },
    });
    const body = await response.text();
    if (!response.ok) throw new Error(`SendFox campaign lookup returned ${response.status}: ${body}`);
    const result = body ? JSON.parse(body) : {};
    const campaigns = Array.isArray(result) ? result : (Array.isArray(result.data) ? result.data : []);
    const match = campaigns.find((campaign) => campaign.title === campaignTitle);
    if (match) return match;
    if (campaigns.length === 0 || (result.last_page && Number(result.current_page) >= Number(result.last_page))) break;
  }
  return undefined;
}

async function main() {
  const asOf = asOfDate();
  const siteUrl = trimTrailingSlash(process.env.LEAD_LETTER_SITE_URL || DEFAULT_SITE_URL);
  const signals = selectSignals(await readEntries(SIGNALS_DIRECTORY, 'signal'), asOf);
  const fieldNotes = selectFieldNotes(await readEntries(FIELD_NOTES_DIRECTORY, 'fieldnote'), signals, asOf);
  const month = formatMonth(asOf);
  const preview = previewText(signals);
  const payload = {
    title: `Lead Letter Monthly - ${month}`,
    subject: process.env.SENDFOX_MONTHLY_SUBJECT || `${month}: four signals worth catching up on`,
    preview_text: preview,
    html: buildHtml({ asOf, signals, fieldNotes, siteUrl, preview }),
    from_name: process.env.SENDFOX_FROM_NAME || DEFAULT_FROM_NAME,
    from_email: process.env.SENDFOX_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    ...(listIds().length ? { lists: listIds() } : {}),
  };
  const debugPayload = { ...payload, text: buildText({ asOf, signals, fieldNotes, siteUrl }), selections: {
    signals: signals.map((entry) => entry.filePath),
    fieldNotes: fieldNotes.map((entry) => entry.filePath),
  } };

  if (process.env.SENDFOX_SEND_ENABLED !== 'true') {
    console.log(`[dry run] ${payload.subject}`);
    console.log(`[dry run] preview: ${payload.preview_text}`);
    if (process.env.SENDFOX_DEBUG_PAYLOAD === 'true') console.log(JSON.stringify(debugPayload, null, 2));
    return;
  }

  if (!process.env.SENDFOX_LIST_ID) throw new Error('Missing required environment variable: SENDFOX_LIST_ID');
  const existing = await findExistingCampaign(payload.title);
  if (existing) {
    console.log(`Monthly SendFox campaign already exists for ${month}; skipping duplicate.`);
    return;
  }
  const result = await postToSendFox(payload);
  console.log(`Created SendFox monthly draft for ${month}.`);
  if (result?.id) console.log(`SendFox id: ${result.id}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
