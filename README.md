# The Lead Letter

**An EntrLabs publication by Joseph E. Iesue.**

The Lead Letter is a weekly publication on leadership, service, responsibility, learning culture, and meaningful work.

It is part of the EntrLabs ecosystem and sits alongside the frameworks, research, and applied systems developed through EntrLabs.

## Purpose

The Lead Letter exists to make the work public in a clear, direct, and useful form.

Each Signals Brief is a short reflection on one idea that matters for leadership, service, growth, culture, or work.

The center remains the same:

```text
Strength Through Service
```

## Website

This repository powers the static site for:

https://letters.entr.cc

Published Signals Briefs live in:

```text
src/content/signals/
```

Use clean date-title filenames:

```text
src/content/signals/2026-w26-make-your-work-easy-to-trust.md
```

Do not prefix public filenames with `signals-`. The folder already identifies the content type.

## Publication

New Signals Briefs are published weekly. Each brief is a Markdown file with public frontmatter used by the Astro website and future publication automation.

Publication rule: callout labels should not be repeated inside the callout body. Use `[!LEADERS]` only when a draft callout would otherwise begin with `Leadership lesson:`; those render as `Leaders`. The first sentence inside the Markdown callout should begin with the actual idea, not with `This week's main idea:`, `Leadership lesson:`, or `Leaders:`.

For the homepage visual, future automation may add an optional `signalInsight` frontmatter block with:

```yaml
signalInsight:
  primaryTheme: "Trust"
  signal: "Trust needs visible proof."
  micro: "One clear sentence explaining the pattern."
  concepts:
    - label: "Proof"
      type: "service"
  lanes:
    - label: "Education"
      level: "Rising"
      state: "Why this theme is active."
      importance: 82
```

If this block is missing, the site derives a fallback from the title, description, tags, and Markdown body.

## Deployment Automation

GitHub Actions deploys the site automatically when files change in `src/**`, `public/**`, `astro.config.mjs`, `package.json`, `package-lock.json`, `tsconfig.json`, or `.github/workflows/deploy.yml`.

The intended publishing path is:

```text
add Markdown file to src/content/signals/ -> push to main -> GitHub Actions builds Astro -> GitHub Pages publishes letters.entr.cc
```

No manual website edit should be needed after the Markdown file is pushed.

## Related Work

- EntrLabs: https://entr.cc/entrlabs
- EntrLabs Frameworks: https://github.com/entrlabs/frameworks
- Service Leadership Field Guide: https://github.com/josephiesue/service-leadership-field-guide
- Joseph E. Iesue: https://josephiesue.com
