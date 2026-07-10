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

## SendFox Draft Flow

The SendFox workflow can create a draft campaign when a new Signals Brief is added. It does not call the SendFox send endpoint.

Required GitHub secrets:

- `SENDFOX_API_TOKEN`
- `SENDFOX_LIST_ID`

Useful GitHub variables:

- `SENDFOX_SEND_ENABLED`: set to `true` only when GitHub should create SendFox drafts
- `SENDFOX_FROM_NAME`: defaults to `The Lead Letter`
- `SENDFOX_FROM_EMAIL`: defaults to `letters@entr.cc`

The campaign payload uses SendFox's Lifetime-compatible body HTML shape: inline-styled `<body>...</body>` HTML, `from_name`, `from_email`, `lists`, and an unsubscribe link using `{{unsubscribe_url}}`.

### Test Send

Use the manual GitHub Actions workflow named `Test Send Lead Letter Email` to test a weekly email before sending to the real list.

Inputs:

- `signal_file`: the Signals Brief markdown file to test
- `test_list_id`: a SendFox list ID that should contain only the test recipient
- `send_to_test_list`: leave off to create a draft only; turn on to send that draft to the test list

The test workflow uses the normal SendFox token but replaces the audience with the provided test list ID. The send step is guarded by `SENDFOX_TEST_SEND_ENABLED=true` and only runs from that manual workflow.

## Related Work

- EntrLabs: https://entr.cc/entrlabs
- EntrLabs Frameworks: https://github.com/entrlabs/frameworks
- Service Leadership Field Guide: https://github.com/josephiesue/service-leadership-field-guide
- Joseph E. Iesue: https://josephiesue.com
