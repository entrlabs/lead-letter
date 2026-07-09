import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SITE_URL = 'https://letters.entr.cc';

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

function buildEmail(letter, filePath) {
  const siteUrl = trimTrailingSlash(process.env.LEAD_LETTER_SITE_URL || DEFAULT_SITE_URL);
  const slug = letter.data.slug || slugFromFile(filePath);
  const url = `${siteUrl}/${slug}/`;
  const title = letter.data.title || slug;
  const description = letter.data.description || firstParagraph(letter.body) || title;
  const subjectPrefix = process.env.SENDFOX_SUBJECT_PREFIX || 'The Lead Letter';
  const subject = `${subjectPrefix}: ${title}`;
  const text = [
    title,
    '',
    description,
    '',
    `Read it here: ${url}`,
  ].join('\n');

  const html = [
    `<h1>${htmlEscape(title)}</h1>`,
    `<p>${htmlEscape(description)}</p>`,
    `<p><a href="${htmlEscape(url)}">Read the full Lead Letter</a></p>`,
  ].join('\n');

  return {
    name: `Lead Letter - ${title}`,
    subject,
    preview_text: description,
    content_html: html,
    content_text: text,
    url,
    list_id: process.env.SENDFOX_LIST_ID,
  };
}

function buildPayload(email) {
  const style = process.env.SENDFOX_PAYLOAD_STYLE || 'campaign';

  if (style === 'broadcast') {
    return {
      list_id: email.list_id,
      subject: email.subject,
      html: email.content_html,
      text: email.content_text,
    };
  }

  return {
    name: email.name,
    subject: email.subject,
    preview_text: email.preview_text,
    list_id: email.list_id,
    content_html: email.content_html,
    content_text: email.content_text,
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
      console.log(JSON.stringify(payload, null, 2));
      continue;
    }

    const result = await postToSendFox(payload);
    console.log(`Created SendFox email for ${email.url}`);
    if (result?.id) {
      console.log(`SendFox id: ${result.id}`);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
