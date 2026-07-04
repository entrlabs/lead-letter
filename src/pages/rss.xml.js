import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { formatLetterTitle } from '../utils/format';

export async function GET(context) {
  const letters = (await getCollection('letters')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );

  return rss({
    title: 'EntrLabs — The Lead Letter',
    description: 'A weekly letter on leadership, service, and the discipline of helping people rise.',
    site: context.site,
    items: letters.map((entry) => ({
      title: formatLetterTitle(entry.data.title),
      description: entry.data.description,
      pubDate: entry.data.date,
      link: `/${entry.slug}/`,
    })),
  });
}
