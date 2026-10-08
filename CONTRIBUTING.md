# Contributing

Thanks for helping improve LinkedIn Outreach Assistant.

## Before you start

- Search existing issues before opening a new one.
- Use a bug report for reproducible defects and a feature request for proposed behavior.
- Keep the project local-first and preserve explicit human approval for every send.
- Do not submit real contact data, LinkedIn session files, screenshots with personal information, or credentials.
- Do not add features intended to bypass platform controls, verification, rate limits, or recipient consent.

## Local development

```bash
npm install
npm run dev
```

The application detects installed Brave, Chrome, Edge, and Chromium browsers. A browser download is not required for normal development when one of those browsers is already installed.

## Pull requests

1. Create a focused branch from `main`.
2. Keep changes scoped and document any user-visible behavior.
3. Add or update tests for logic changes.
4. Run the complete verification suite:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

5. Confirm screenshots, fixtures, and logs contain only synthetic data.

LinkedIn selectors belong in `src/lib/linkedin/selectors.ts`. Browser discovery belongs in `src/lib/linkedin/browserExecutable.ts`.

By contributing, you agree that your contribution is licensed under the repository’s MIT License.
