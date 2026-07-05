# The Lead Letter

**An EntrLabs publication by Joseph E. Iesue.**

The Lead Letter is the public editorial publication of EntrLabs. It publishes weekly Signals Briefs on leadership, service, judgment, learning, work, and the discipline of helping people rise.

Website: https://letters.entr.cc

## What Lives Here

- The Astro site for `letters.entr.cc`
- The published Markdown source files for each Signals Brief
- The automation and structure needed to publish new briefs cleanly

Published briefs live in:

```text
src/content/signals/
```

Use clear date-title filenames:

```text
src/content/signals/2026-w26-make-your-work-easy-to-trust.md
```

## Writing Standard

The writing should be public, direct, and useful.

- Write in Joseph's voice and the EntrLabs brand voice.
- Keep the reading level clear and accessible without sounding flat.
- Let callout labels do their job. Do not repeat the label in the first sentence of the callout body.
- Use `[!LEADERS]` when the note is speaking directly to people responsible for others, teams, or institutions.

## Signal Metadata

Signals Briefs may include an optional `signalInsight` block in frontmatter to shape the homepage visualization and signal map.

This block can define:

- `primaryTheme`
- `signal`
- `micro`
- `concepts`
- `lanes`

If it is not provided, the site derives a fallback signal read from the title, description, tags, and body of the note.

## Publishing Flow

```text
add Markdown file to src/content/signals/ -> push to main -> GitHub Actions builds Astro -> GitHub Pages publishes letters.entr.cc
```

No manual site editing should be required after the Markdown file is pushed.

## Related Work

- EntrLabs: https://entr.cc/entrlabs
- EntrLabs Frameworks: https://github.com/entrlabs/frameworks
- Service Leadership Field Guide: https://github.com/josephiesue/service-leadership-field-guide
- Joseph E. Iesue: https://josephiesue.com
