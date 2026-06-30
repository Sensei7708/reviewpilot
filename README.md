# ReviewPilot

**AI-powered code review that runs 100% on your machine.**  
Your code never leaves your computer. No API costs. No data leaks.

```
npx @sensei7708/reviewpilot pr https://github.com/user/repo/pull/42
```

[![npm version](https://img.shields.io/npm/v/@sensei7708/reviewpilot)](https://www.npmjs.com/package/@sensei7708/reviewpilot)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-0078d7)](https://marketplace.visualstudio.com/items?itemName=reviewpilot.reviewpilot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/Sensei7708/reviewpilot/pulls)
[![Buy Pro](https://img.shields.io/badge/Buy-Pro-238636)](https://reviewpilot.dev)

---

## 🔥 Why ReviewPilot?

| Feature | ReviewPilot | GitHub Copilot | CodeRabbit |
|---------|-------------|---------------|------------|
| 100% Local & Private | ✅ | ❌ | ❌ |
| Zero API Costs | ✅ | ❌ | ❌ |
| PR Review | ✅ | ✅ | ✅ |
| VS Code Annotations | ✅ (Pro) | ✅ | ❌ |
| GitHub Action | ✅ (Pro) | ❌ | ✅ |
| Custom Rules | ✅ (Pro) | ✅ | ✅ |
| **Price** | **Free / $199 once** | $10-39/mo | $12-48/mo |

---

## ⚡ Quick Start

```bash
# 1. Install Ollama and pull a code model
ollama pull codellama

# 2. Review any GitHub PR (no sign-up required)
npx @sensei7708/reviewpilot pr https://github.com/expressjs/express/pull/5678
```

---

## 📦 Commands

| Command | Description |
|---------|-------------|
| `reviewpilot pr <url>` | Analyze a GitHub/GitLab PR |
| `reviewpilot diff <file>` | Analyze a diff file or stdin |
| `reviewpilot local` | Review local uncommitted changes |
| `reviewpilot check [branch]` | Compare current branch vs main |
| `reviewpilot init` | Set up ReviewPilot in current repo |
| `reviewpilot license activate <key>` | Activate a Pro license |
| `reviewpilot license status` | Check license status |

---

## 👀 Demo

```bash
$ npx reviewpilot pr https://github.com/expressjs/express/pull/5678

  Fetching PR #5678 from expressjs/express...
  12 hunk(s) in 4 file(s)

  ┌──────────┬──────────────────────┬──────┬──────────────────────────────────────┐
  │ Severity │ File                 │ Line │ Issue                                │
  ├──────────┼──────────────────────┼──────┼──────────────────────────────────────┤
  │ HIGH     │ lib/application.js   │  142 │ Unhandled promise rejection in route  │
  │ MEDIUM   │ lib/request.js       │   67 │ Missing input validation on params    │
  │ HIGH     │ lib/response.js      │   89 │ Insecure HTTP header concatenation    │
  │ LOW      │ test/app.test.js     │   23 │ Missing edge case test for empty body │
  └──────────┴──────────────────────┴──────┴──────────────────────────────────────┘

  🔴 Critical: 0  🟠 High: 2  🟡 Medium: 1  🔵 Low: 1

✅ Review complete — 4 issues found
```

---

## 💰 Pricing

| Feature | Free | Pro | Team |
|---------|------|-----|------|
| **Price** | **$0** | **$199** once | **$499**/yr |
| Reviews | 5/day | Unlimited | Unlimited |
| Repositories | 1 | Unlimited | Unlimited |
| Output formats | Table | JSON, Markdown, Table | All |
| VS Code annotations | ❌ | ✅ | ✅ |
| GitHub Action | ❌ | ✅ | ✅ |
| Custom rules | ❌ | ✅ | ✅ |
| Team dashboard | ❌ | ❌ | ✅ |
| Priority support | ❌ | ✅ | ✅ |

**[Buy Pro →](https://reviewpilot.dev)** | 
**[Buy Team →](https://reviewpilot.dev)** | 
**[Try Free →](https://www.npmjs.com/package/@sensei7708/reviewpilot)**

---

## 🔧 VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=reviewpilot.reviewpilot).

- Inline code annotations
- Review current file or workspace changes
- Auto-review on save (Pro feature)

## 🤖 GitHub Action

Add to `.github/workflows/review.yml`:

```yaml
name: ReviewPilot
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - name: Review PR
        uses: Sensei7708/reviewpilot/action@main
        with:
          model: codellama
          format: markdown
```

> **Note**: The GitHub Action requires a **Pro license** to post PR comments.

---

## 🏗 Architecture

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   CLI CLI   │───▶│  Diff Parser │───▶│  Ollama LLM │
│ (commander) │    │  (git diff)  │    │  (local AI)  │
└─────────────┘    └──────────────┘    └──────────────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│  Reporter   │    │   Analyzer   │    │   License    │
│  (output)   │    │  (findings)  │    │  (validator) │
└─────────────┘    └──────────────┘    └──────────────┘
```

---

## 📝 License

MIT — see [LICENSE](LICENSE).

Built with [Ollama](https://ollama.ai) — local, private, free AI.
