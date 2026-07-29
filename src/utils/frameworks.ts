import type { CollectionEntry } from 'astro:content';

export function frameworkUrl(entry: CollectionEntry<'frameworks'>) {
  return `/frameworks/${entry.slug}/`;
}

export function frameworkNumber(entry: CollectionEntry<'frameworks'>) {
  const match = entry.data.edition.match(/#(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function sortFrameworks(
  frameworks: CollectionEntry<'frameworks'>[],
) {
  return frameworks.filter((entry) => !entry.data.draft).sort(
    (a, b) => frameworkNumber(b) - frameworkNumber(a),
  );
}

export function frameworkFormLabel(entry: CollectionEntry<'frameworks'>) {
  return entry.data.form.replaceAll('-', ' ');
}

export function frameworkDescription(entry: CollectionEntry<'frameworks'>) {
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

  return `A ${entry.data.type} ${frameworkFormLabel(entry)} drawn from ${entry.data.source}.`;
}
