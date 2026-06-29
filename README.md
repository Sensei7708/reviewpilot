# ReviewPilot

AI-powered code review that runs **entirely on your machine**.

```
npx reviewpilot pr https://github.com/user/repo/pull/42
```

Uses [Ollama](https://ollama.ai) for local, private, free AI code reviews. Your code never leaves your machine.

## Quick Start

```bash
# Install Ollama and pull a code model
ollama pull codellama

# Run a review
npx reviewpilot pr https://github.com/owner/repo/pull/123
```

## Commands

| Command | Description |
|---------|-------------|
| `reviewpilot pr <url>` | Analyze a GitHub/GitLab PR |
| `reviewpilot diff <file>` | Analyze a diff file |
| `reviewpilot local` | Analyze uncommitted changes |
| `reviewpilot check` | Analyze current branch vs main |
| `reviewpilot init` | Set up config in current repo |
| `reviewpilot license` | Activate a pro license |

## Pricing

| Edition | Price | Features |
|---------|-------|----------|
| Free | $0 | 1 repo, basic checks |
| Pro | $199 | Unlimited repos, advanced rules, GitHub Action |
| Team | $499/yr | Everything + team dashboard + priority support |

Buy a license at [reviewpilot.dev](https://reviewpilot.dev)

## Why ReviewPilot?

- **Private** — your code never leaves your machine
- **Free AI** — uses local Ollama models, no API costs
- **Fast** — reviews PRs in seconds
- **CI-ready** — works as a GitHub Action
- **Editor support** — VS Code extension included
