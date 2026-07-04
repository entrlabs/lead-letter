# The Lead Letter

**An EntrLabs publication by Joseph E. Iesue.**

The Lead Letter is a weekly publication on leadership, service, responsibility, learning culture, and meaningful work.

It is part of the EntrLabs ecosystem and sits alongside the frameworks, research, and applied systems developed through EntrLabs.

## Purpose

The Lead Letter exists to make the work public in a clear, direct, and useful form.

Each weekly note is published as a Signals Brief: a short reflection on one idea that matters for leadership, service, growth, culture, or work.

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

## Publication

New Signals Briefs are published weekly. Each brief is a Markdown file with public frontmatter used by the Astro website and publication automation.

Publication rule: callout labels should not be repeated inside the callout body. Use `[!LEADERS]` only when a draft callout would otherwise begin with `Leadership lesson:`; those render as `Leaders`. The first sentence inside the Markdown callout should begin with the actual idea, not with `This week's main idea:`, `Leadership lesson:`, or `Leaders:`.

## Weekly Signal Board

The homepage includes a living signal board. It updates automatically from the `signalBoard` frontmatter inside each weekly Markdown file.

Every new brief should include four industry lanes in this order:

```yaml
signalBoard:
  signal: "Short thesis for the week"
  micro: "One useful interpretation of the week."
  tension: "The pressure or conflict."
  move: "The practical response."
  question: "The question leaders should ask."
  flow:
    - First
    - Second
    - Third
    - Fourth
  motionWords:
    - Word
    - Word
    - Word
    - Word
  lanes:
    - label: Education
      state: "What changed in education this week."
      level: Rising
      score: 70
      direction: up
      brief: "One short interpretation, not a repeated sentence from the article."
    - label: Work
      state: "What changed in work this week."
      level: Active
      score: 66
      direction: steady
      brief: "One short interpretation."
    - label: Founders
      state: "What changed for founders this week."
      level: Strained
      score: 78
      direction: up
      brief: "One short interpretation."
    - label: Technology
      state: "What changed in technology this week."
      level: Watching
      score: 58
      direction: down
      brief: "One short interpretation."
```

`score` is a 0-100 pressure reading for the week. `direction` must be `up`, `down`, or `steady`. The site pools these values across all published briefs, so each new Markdown file extends the trend lines and changes the homepage visualization.

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
