import type { CollectionEntry } from 'astro:content';

export function codexUrl(entry: CollectionEntry<'codex'>) {
  return `/codex/${entry.slug}/`;
}

export function codexEditionNumber(entry: CollectionEntry<'codex'>) {
  const match = entry.data.edition.match(/#(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function sortCodexEditions(
  editions: CollectionEntry<'codex'>[],
) {
  return editions.filter((entry) => !entry.data.draft).sort(
    (a, b) => codexEditionNumber(b) - codexEditionNumber(a),
  );
}

export function codexDescription(entry: CollectionEntry<'codex'>) {
  const intro = entry.body.match(
    /(?:^|\n)##\s+Intro\s*\n+([\s\S]*?)(?=\n##\s+|$)/i,
  )?.[1];

  if (intro) {
    return intro
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/[*_>#`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return `A ${entry.data.type} Codex Edition drawn from ${entry.data.source}.`;
}
