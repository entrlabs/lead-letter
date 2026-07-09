const token = process.env.SENDFOX_API_TOKEN;
const expectedListId = process.env.SENDFOX_LIST_ID;

if (!token) {
  console.error('Missing required secret: SENDFOX_API_TOKEN');
  process.exit(1);
}

if (!expectedListId) {
  console.error('Missing required secret: SENDFOX_LIST_ID');
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
  console.error(`SendFox token check failed with HTTP ${response.status}.`);
  process.exit(1);
}

const payload = body ? JSON.parse(body) : {};
const lists = Array.isArray(payload) ? payload : payload.data || payload.lists || [];
const match = lists.find((list) => String(list.id ?? list.list_id) === String(expectedListId));

if (!match) {
  console.error(`SendFox token works, but list ID ${expectedListId} was not found.`);
  process.exit(1);
}

const listName = match.name ?? match.title ?? '(untitled list)';
console.log(`SendFox token works and list ID ${expectedListId} was found: ${listName}`);
