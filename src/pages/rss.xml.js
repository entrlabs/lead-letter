import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { formatLetterTitle } from '../utils/format';

function publicSlug(entry) {
  return entry.data.slug ?? entry.slug.replace(/^signals-/, '');
}

export async function GET(context) {
  const signals = (await getCollection('signals')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'EntrLabs — The Lead Letter',
    description: 'Weekly Signals Briefs on leadership, service, and the discipline of helping people rise.',
    site: context.site,
    items: signals.map((entry) => ({
      title: formatLetterTitle(entry.data.title),
      description: entry.data.description,
      pubDate: entry.data.date,
      link: `/${publicSlug(entry)}/`,
    })),
  });
}
