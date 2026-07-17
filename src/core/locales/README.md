## How to contribute

Please do not contribute changes directly to these files, as we manage them with Crowdin. Instead:

- to request a new translation, [open an issue](https://github.com/drawink/drawink/issues/new/choose).
- to update existing translations, [edit them on Crowdin](https://crowdin.com/translate/drawink/10) and we should have them included in the app soon!

## Completion of translation

[percentages.json](./percentages.json) records the completion percentage for each
language and controls which locales are exposed by the application.

The previous locale-coverage workflow is no longer present, and
[`scripts/build-locales-coverage.ts`](../../../scripts/build-locales-coverage.ts)
still targets the removed `packages/drawink/locales` path. Update that script to
`src/core/locales` and restore a CI check before treating the percentages as
automatically maintained.

We only make a language available in the app if it exceeds the configured
completion threshold.
