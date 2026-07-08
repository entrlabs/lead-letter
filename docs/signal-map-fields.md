# Signal Map Fields

The public Signal Map uses a two-layer signal system.

## Public field

`field` is the short public lane. Keep it one word and use this controlled vocabulary unless the site schema is intentionally changed:

- `Business`
- `Founders`
- `Managers`
- `Education`
- `Policy`
- `Market`
- `Community`
- `Global`
- `Work`
- `Tech`
- `Psych`
- `Society`

The visible `label` should normally match `field`. If a future brief needs a fuller internal label, keep `field` short so the map still displays cleanly.

Never use `School` in the Signal Map. Use `Education`.

## Actual signal

The actual signal belongs in `state`, `meaning`, and the brief body. It should be understandable as a real pattern, not just a broad topic.

Good:

```yaml
- label: "Education"
  field: "Education"
  classification: "Confirmed"
  strength: "High signal"
  state: "Student support is becoming decision infrastructure."
  meaning: "Students need help translating loan rules, costs, course access, and career signals into action."
  importance: 88
  usefulness: 82
  timeframe: "now"
  quadrant: "high-now"
```

Weak:

```yaml
- label: "Education"
  state: "Education is changing."
```

## Weekly brief metadata

For public Lead Letter briefs, include fields in both places when available:

- `signalBoard.lanes[].field`
- `signalInsight.lanes[].field`

`signalInsight.primaryTheme` should also use the controlled vocabulary when practical.

Each `signalInsight.lanes` item should also include decision-matrix metadata:

- `importance`: 0-100 score for practical stakes and signal strength
- `usefulness`: 0-100 score where higher means useful now and lower means useful later
- `timeframe`: `now` or `later`
- `quadrant`: `high-now`, `high-later`, `low-now`, or `low-later`

Multiple signals may share the same quadrant when the evidence supports it. Do not force one signal into each quadrant.

## Display behavior

Astro accepts `field` in `src/content/config.ts`. The Signal Map renders `field` first and falls back to `label` when `field` is missing. Generated fallback lanes in `src/utils/signalInsight.ts` also use the same controlled vocabulary.
