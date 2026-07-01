# Changelog

## v1.2.0 (2026-06-30)

### 🚀 Infrastructure & Performance
- **Native HTTP**: Replaced all `execSync`+`curl` calls with native `fetch()` across LLM client, GitHub API, GitLab API, and sales researcher
- **Fix**: `getAvailableModels()` now respects configured Ollama host instead of hardcoding `127.0.0.1:11434`
- **Fix**: `ollama-check.ts` passes the configured host to `getAvailableModels`
- **Fix**: Removed `require()` calls in sales command handler, replaced with proper ESM imports

### 🎨 New Features
- **New `text` output format**: Plain-text view with emoji severity icons, available on free tier
- **Integration tests**: End-to-end CLI tests covering all commands and help output

### 📦 Developer Experience
- Added `.env.example` documenting all supported environment variables
- Added tests for `ollama-check.ts`
- Added tests for sales CLI action handlers

### 🚀 Performance
- **Concurrent hunk analysis**: Hunks are now processed in parallel (configurable concurrency, default 3) for faster reviews
- **Ignore patterns**: Config `ignorePatterns` is now respected — locked files, minified bundles, etc. are skipped automatically

### 🔧 Internal
- All HTTP calls use `AbortSignal.timeout()` for consistent timeout handling
- Fixed Jest configuration to handle ESM-only dependencies (chalk, cli-table3) with CJS mocks — full test suite now 111/111 passing
- Added integration test suite (11 tests) covering CLI help and --version for all commands
- Build verified: `tsc` passes with zero errors

---

## v1.1.0 (2026-06-29)

### 🚀 New Sales & Conversion Features
- **Feature gating**: 5 free reviews/day, format restrictions, VS Code gating
- **Upgrade prompts**: Strategic nudges when hitting free limits or using pro features
- **Review tracking**: Per-repo and daily usage counting for smart upsell triggers

### 🌐 Website
- Complete redesign with dark theme and conversion-focused layout
- Feature comparison table (vs Copilot, CodeRabbit)
- Interactive pricing cards with "Most Popular" highlight
- FAQ accordion, email capture, live demo terminal
- Schema.org structured data for rich search results

### 🤖 Sales Automation
- AI sales agent swarm: lead-researcher, outreach-agent, nurture-agent
- Sales coordinator pipeline with metrics tracking
- A/B testing framework for messaging optimization
- Automated lead scoring and follow-up sequences

### 📦 Distribution
- 22 npm keywords (up from 6) for better discoverability
- VS Code gallery banner and additional categories
- GitHub FUNDING.yml for sponsor button
- Updated homepage to reviewpilot.dev

### 🔧 Internal
- Usage analytics system (local, opt-in tracking)
- License validator extended with format/feature gating
- All CLI commands enforce daily review limits
- Build verified: `tsc` passes with zero errors

---

## v1.0.0 (2026-03-xx)

- Initial release
- PR review, diff review, local changes, branch comparison
- Gumroad license activation (Pro $199, Team $499/yr)
- VS Code extension with inline annotations
- GitHub Action for CI/CD
