const token = process.env.SENDFOX_API_TOKEN;

if (!token) {
  console.error('Missing required environment variable: SENDFOX_API_TOKEN');
  process.exit(1);
}

const baseUrl = (process.env.SENDFOX_API_BASE || 'https://api.sendfox.com').replace(/\/+$/, '');
const endpoint = process.env.SENDFOX_LISTS_ENDPOINT || '/lists';
const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}/${endpoint.replace(/^\/+/, '')}`;

const response = await fetch(url, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  },
});

const body = await response.text();

if (!response.ok) {
  console.error(`SendFox API returned ${response.status}: ${body}`);
  process.exit(1);
}

const payload = body ? JSON.parse(body) : {};
const lists = Array.isArray(payload) ? payload : payload.data || payload.lists || [];

if (lists.length === 0) {
  console.log('No lists found in the SendFox response.');
  process.exit(0);
}

for (const list of lists) {
  const id = list.id ?? list.list_id ?? '(missing id)';
  const name = list.name ?? list.title ?? '(untitled list)';
  console.log(`${id}\t${name}`);
}
