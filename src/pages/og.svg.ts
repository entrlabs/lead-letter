function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(text: string, limit: number, maxLines: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > limit && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }

    if (lines.length === maxLines) break;
  }

  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

export async function GET({ url }: { url: URL }) {
  const title = url.searchParams.get('title') ?? 'EntrLabs - The Lead Letter';
  const description = url.searchParams.get('description') ?? 'A weekly letter on leadership, service, and the discipline of helping people rise.';
  const titleLines = wrap(title.replace(' — The Lead Letter', ''), 24, 3);
  const descLines = wrap(description, 56, 3);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="0.55" stop-color="#F7F9FF"/>
      <stop offset="1" stop-color="#EAF0FF"/>
    </linearGradient>
    <linearGradient id="azure" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5B8CFF"/>
      <stop offset="1" stop-color="#2E5BD0"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="26" stdDeviation="24" flood-color="#2E5BD0" flood-opacity=".18"/>
    </filter>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="#2E5BD0" stroke-opacity=".10"/>
    </pattern>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <circle cx="1050" cy="70" r="260" fill="#9DB8FF" opacity=".22"/>
  <circle cx="80" cy="545" r="250" fill="#5B8CFF" opacity=".10"/>
  <rect x="72" y="72" width="1056" height="486" rx="28" fill="#fff" fill-opacity=".72" stroke="#2E5BD0" stroke-opacity=".24" filter="url(#shadow)"/>
  <path d="M108 120h64m856 0h64M108 510h64m856 0h64" stroke="#5B8CFF" stroke-width="3" stroke-linecap="round" opacity=".65"/>
  <g transform="translate(112 116)">
    <rect x="-12" y="-16" width="78" height="86" rx="20" fill="#2E5BD0"/>
    <image href="/assets/entr-main-logo.png" x="14" y="-8" width="38" height="70" preserveAspectRatio="xMidYMid meet" opacity=".98"/>
    <text x="88" y="45" font-family="Archivo, Arial, sans-serif" font-size="38" font-weight="800" fill="#0A0F1C">ENTR</text>
    <line x1="200" y1="-12" x2="200" y2="62" stroke="#2E5BD0" stroke-opacity=".22" stroke-width="2"/>
    <text x="228" y="38" font-family="Cinzel, Georgia, serif" font-size="28" font-weight="800" fill="#0A0F1C">EntrLabs - The Lead Letter</text>
  </g>
  <text x="112" y="250" font-family="Archivo, Arial, sans-serif" font-size="18" font-weight="800" letter-spacing="4" fill="#2E5BD0">STRENGTH THROUGH SERVICE</text>
  ${titleLines.map((line, index) => `<text x="112" y="${330 + index * 66}" font-family="Cinzel, Georgia, serif" font-size="58" font-weight="900" fill="#0A0F1C">${escapeXml(line)}</text>`).join('')}
  ${descLines.map((line, index) => `<text x="112" y="${520 + index * 32}" font-family="Spectral, Georgia, serif" font-size="28" font-weight="400" fill="#42506B">${escapeXml(line)}</text>`).join('')}
  <g transform="translate(836 208)">
    <path d="M140 0 260 70v140l-120 70L20 210V70L140 0z" fill="#fff" fill-opacity=".58" stroke="#9DB8FF" stroke-width="2"/>
    <path d="M140 0v140l120 70V70L140 0z" fill="#5B8CFF" opacity=".76"/>
    <path d="M140 140v140L20 210V70l120 70z" fill="#2E5BD0" opacity=".82"/>
    <path d="M20 70l120 70 120-70-120-70L20 70z" fill="#DCE6FF" opacity=".9"/>
    <path d="M20 70l120 70 120-70M140 0v280" fill="none" stroke="#fff" stroke-opacity=".62" stroke-width="2"/>
  </g>
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
