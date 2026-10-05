# Pull request checks

[Check](../.github/workflows/check.yml) runs on every pull request, pushes to
`main`, merge-queue groups and manual dispatch. There are no path filters, so
documentation-only PRs still produce the required result. New commits cancel
older runs for the same PR.

| Job | What it verifies |
| --- | --- |
| Typecheck, lint, tests and build | Frozen-lockfile install, then `pnpm check` (`tsc --noEmit`, `eslint`, `vitest run`, `next build`) |
| Workflow validation | All GitHub Actions workflow files with actionlint 1.7.12 |
| `check` | Both jobs succeeded; failures, cancellations and skipped jobs cannot produce a passing result |

Jobs use Ubuntu 24.04, the Node version in `.node-version` and the pnpm version
in `package.json`. Dependency installation uses the committed lockfile and the
pnpm store cache. Action references are pinned to commit SHAs; the actionlint
release archive is checked against its pinned SHA-256 checksum. Updating these
pins requires reviewing the upstream release and its matching SHA/checksum.

The workflow needs only `contents: read`, disables checkout credential
persistence and uses `pull_request`, so it does not require repository secrets
or elevated permissions to execute fork code. `next build` fetches Geist from
Google Fonts; runners have network access, local sandboxes may not.

## What CI does not run

- `pnpm sim` (agent behavior across model configs) needs `AI_GATEWAY_API_KEY`
  and spends money. Run it locally for signoff and record the tested SHA, model
  config and game count in the PR's Validation section.
- Human play on a phone against the deployed URL.

## Reproduce locally

```sh
pnpm install --frozen-lockfile
pnpm check
# With actionlint 1.7.12 installed:
actionlint
```

## Merge enforcement

To make these results mandatory, configure a GitHub branch rule or ruleset for
`main` that requires the `check` status from the Check workflow. Workflow files
publish statuses; they do not enable branch protection themselves.

References: [GitHub workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax),
[actionlint usage](https://github.com/rhysd/actionlint/blob/main/docs/usage.md).
