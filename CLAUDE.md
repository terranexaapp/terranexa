# terranexa — Claude Code preferences

## Development workflow

- Branch: `claude/*` → merge direto para `main`, sem PR review
- Validation gate before merge: `npm run build` + lint must pass
- Merge via GitHub API (programmatic, no manual review)
- Vercel auto-deploys to production on every push to `main`
- No staging environment — merge = production deploy
