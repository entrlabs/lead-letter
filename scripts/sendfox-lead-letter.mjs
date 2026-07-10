import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SITE_URL = 'https://letters.entr.cc';
const DEFAULT_BRAND_URL = DEFAULT_SITE_URL;
const DEFAULT_ENTR_URL = 'https://entr.cc';
const DEFAULT_AUTHOR_URL = 'https://www.josephiesue.com';
const DEFAULT_LOGO_URL = `${DEFAULT_SITE_URL}/assets/entr-icon-lead-letter-blue-email.png`;
const DEFAULT_PREHEADER = '"This publication helps you cut through the noise and improve your awareness to benefit your career and professional development." -Joseph E. Iesue';
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
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function firstParagraph(markdown) {
  return markdownToPlainText(markdown)
    .split(/\n\s*\n/)
    .find((paragraph) => paragraph.length > 0);
}

function emailDescription(value) {
  return value
    .replace(/^A public weekly Signals Brief about\s+/i, "This week's Signals Brief is about ")
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

function preheaderText() {
  return DEFAULT_PREHEADER;
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

function preheaderHtml() {
  const text = '"This publication helps you cut through the noise and improve your awareness to benefit your career and professional development."';
  const authorUrl = htmlEscape(process.env.LEAD_LETTER_AUTHOR_URL || DEFAULT_AUTHOR_URL);

  return `${htmlEscape(text)} -<a href="${authorUrl}" style="color: ${BRAND.azureDeep}; text-decoration: underline;">Joseph E. Iesue</a>`;
}

function subjectLine(data, title) {
  const activeDate = formatDate(data.date) || 'This Week';
  return `${activeDate} Lead Letter: ${title}`;
}

function ctaHtml(url) {
  const safeUrl = htmlEscape(url);

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0 8px;">
      <tr>
        <td bgcolor="${BRAND.ink}" style="border-radius: 0; box-shadow: 0 0 0 7px rgba(91, 140, 255, 0.13);">
          <a href="${safeUrl}" style="display: inline-block; padding: 14px 22px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff; text-decoration: none;">Read the Brief</a>
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

function readerPathHtml({ signalMapUrl, fieldNotesUrl }) {
  return `
    <tr>
      <td style="padding: 0 34px 30px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border: 1px solid ${BRAND.line}; background: #ffffff;">
          <tr>
            <td style="padding: 20px 20px 18px; border-bottom: 1px solid ${BRAND.line};">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Daily Field Notes</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">Daily Field Notes are short public lessons from The Lead Letter, updated each day. Read the archive when you want a quick signal, lesson, or prompt between weekly briefs.</p>
              <a href="${htmlEscape(fieldNotesUrl)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; font-weight: 700; color: ${BRAND.azureDeep}; text-decoration: underline;">Read Daily Field Notes</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 20px 18px;">
              <p style="margin: 0 0 8px; font-family: Arial, Helvetica, sans-serif; font-size: 11px; line-height: 1.4; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: ${BRAND.azureDeep};">Weekly Signal Map</p>
              <p style="margin: 0 0 10px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">Use the weekly Signal Map to see which information is important and useful now, then evaluate that information accordingly. Scores reflect how many articles and discussions are happening online and within companies this week around each topic.</p>
              <a href="${htmlEscape(signalMapUrl)}" style="font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.6; font-weight: 700; color: ${BRAND.azureDeep}; text-decoration: underline;">View the Signal Map</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function buildHtmlEmail({ title, description, url, data, siteUrl }) {
  const brandUrl = trimTrailingSlash(process.env.ENTR_BRAND_URL || DEFAULT_BRAND_URL);
  const entrUrl = trimTrailingSlash(process.env.ENTR_URL || DEFAULT_ENTR_URL);
  const date = formatDate(data.date);
  const meta = [issueLabel(data), date].filter(Boolean).join(' / ');
  const preheader = preheaderText();
  const signalMapUrl = `${siteUrl}/#latest-signal-map`;
  const fieldNotesUrl = `${siteUrl}/fieldnotes/`;

  return `<body style="margin: 0; padding: 0; background: ${BRAND.paperAlt}; color: ${BRAND.ink};">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent; mso-hide: all;">${htmlEscape(preheader)}</div>
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
                ${ctaHtml(url)}
              </td>
            </tr>
            <tr>
              <td style="padding: 24px 34px 32px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-top: 1px solid ${BRAND.line}; border-bottom: 1px solid ${BRAND.line}; background: #f7f9ff;">
                  <tr>
                    <td style="padding: 18px 18px; font-family: Arial, Helvetica, sans-serif; font-size: 13px; line-height: 1.7; color: ${BRAND.raise};">
                      ${preheaderHtml()}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${readerPathHtml({ signalMapUrl, fieldNotesUrl })}
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

function buildTextEmail({ title, description, url, data, siteUrl }) {
  const signalMapUrl = `${siteUrl}/#latest-signal-map`;
  const fieldNotesUrl = `${siteUrl}/fieldnotes/`;
  const lines = [
    'The Lead Letter',
    issueLabel(data),
    formatDate(data.date),
    '',
    title,
    '',
    description,
    '',
    'Read the brief:',
    url,
    '',
    DEFAULT_PREHEADER,
    '',
    'Daily Field Notes:',
    'Short public lessons from The Lead Letter, updated each day.',
    fieldNotesUrl,
    '',
    'Weekly Signal Map:',
    'Use the weekly Signal Map to see which information is important and useful now, then evaluate that information accordingly. Scores reflect how many articles and discussions are happening online and within companies this week around each topic.',
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
  const subject = process.env.SENDFOX_SUBJECT_PREFIX
    ? `${process.env.SENDFOX_SUBJECT_PREFIX}: ${title}`
    : subjectLine(letter.data, title);
  const preview = preheaderText();
  const text = buildTextEmail({ title, description, url, data: letter.data, siteUrl });
  const html = buildHtmlEmail({ title, description, url, data: letter.data, siteUrl });

  return {
    title: `Lead Letter - ${title}`,
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

    const result = await postToSendFox(payload);
    console.log(`Created SendFox draft for ${email.url}`);
    if (result?.id) {
      console.log(`SendFox id: ${result.id}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
