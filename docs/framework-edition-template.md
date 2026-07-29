# Framework Markdown Template

Save each published edition as its own Markdown file in:

```text
src/content/frameworks/
```

Use a stable, descriptive filename such as:

```text
framework-014-service-leadership.md
```

Copy the structure below. The Astro content schema validates the four required
frontmatter fields. The editorial limits remain visible here for authors.

```md
---
type: internal
form: framework
edition: "Framework #014"
title: Service Leadership
source: ENTR Exclusive Framework
draft: false
---

## Intro

Cover-slide copy. Aim for 45 words; do not exceed 65.

## Overview

Architecture-slide copy. Aim for 35 words; do not exceed 50.

## Principles

### 1. Principle Name

*A five-to-nine-word subtitle*

A 45-word body paragraph; do not exceed 60 words.

<!-- Add 6 to 10 principles; 8 is typical. -->

## Stories

- "A 15-word pull-quote; do not exceed 22 words." — A three-to-six-word attribution
- "A 15-word pull-quote; do not exceed 22 words." — A three-to-six-word attribution
- "A 15-word pull-quote; do not exceed 22 words." — A three-to-six-word attribution

## Sources

- [A three-to-twelve-word source label](https://example.com)
- A plain-text source label

## Caption

Optional Instagram caption and hashtags. Aim for 60 words; do not exceed 150.
```

Frontmatter limits:

- `type`: `internal` or `external`
- `form`: `framework`, `model`, `theory`, `methodology`,
  `management-system`, `doctrine`, or `structured-work`
- `edition`: `Framework #` plus three digits
- `title`: 2–8 words
- `source`: 2–10 words
- `draft`: optional; set to `true` to keep a working edition off the public site
