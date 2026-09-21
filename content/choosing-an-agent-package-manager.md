---
title: Choosing an Agent Package Manager
date: 2026-09-21
type: article
description: I tried Sentry's dotagents and Microsoft's APM to share skills, prompts and MCP servers across a team. Here's why APM won.
lede: Skills, prompts, instructions and MCP servers are now dependencies. I tried Sentry's dotagents and Microsoft's APM to manage them across a team using Copilot, Claude Code and Codex — and why APM won.
---

Somewhere in the last year, the files that shape how an AI coding agent behaves in a repository stopped being a curiosity and became infrastructure. `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, a `skills/` folder, a handful of prompts, an `.mcp.json` — every team I work with now has a pile of these, and the pile is growing.

And we were managing that pile the way we managed JavaScript dependencies in 2009: copy it in, hope it doesn't drift.

Our own version of this was a devcontainer post-create script that cloned a shared skills repository into each project. It worked, in the sense that a `git clone` in a shell script always works. It also meant nobody knew which version of which skill a given repo was actually running, updates were "re-create your container", and anything beyond skills — prompts, instructions, MCP servers — still had to be hand-copied per tool. Three agents, three folder layouts, three copies of the same intent.

This is a dependency management problem. It deserves a dependency manager. So I tried two.

## The two candidates

**[dotagents](https://dotagents.sentry.dev/)** is Sentry's answer. You declare skills, MCP servers, hooks, subagents and plugins in an `agents.toml`, run `npx @sentry/dotagents install`, and it materializes a `.agents/` directory and symlinks or generates the right thing into `.claude/`, `.cursor/`, `.codex/`, `.opencode/` and friends. It has a lockfile (`agents.lock`) with commit pins and integrity hashes, a `--frozen` mode for CI, and a trust policy that restricts which GitHub orgs you'll pull from. Sentry dogfoods it across their own repositories, which is always a good sign.

**[APM](https://microsoft.github.io/apm/)** — Agent Package Manager — is Microsoft's. Same shape of idea: one manifest (`apm.yml`), one `apm install`, a lockfile (`apm.lock.yaml`), and per-harness output. But it goes further on what it considers a dependency. APM manages eight primitive types — instructions, skills, prompts, agents, hooks, commands, plugins and MCP servers — and it *compiles* them into harness-native files rather than only linking them. It targets GitHub Copilot, Claude Code, Codex, Cursor, OpenCode, Gemini, Windsurf, Kiro and a growing tail of others.

Both are MIT. Both are young. Both are honest about being young — dotagents says "beta" on its docs page; APM has a public roadmap and a changelog that moves weekly.

A minimal manifest for each, to make the shape concrete:

```toml
# agents.toml (dotagents)
version = 1
agents = ["claude", "codex", "copilot"]

[trust]
github_orgs = ["my-org"]

[[skills]]
name = "find-bugs"
source = "my-org/skills"
```

```yaml
# apm.yml (APM)
name: my-service
version: 1.0.0
targets:
  - copilot
  - claude
  - codex
dependencies:
  apm:
    - my-org/agent-skills#v2.1.0
  mcp:
    - io.github.github/github-mcp-server
```

## Why I started with Claude

I'll be upfront about the thing that actually tipped me, because it's less noble than a feature matrix.

Claude Code is where I do most of my own agentic work, and it is also the harness with the richest set of configuration surfaces: skills, subagents, slash commands, hooks, plugins with marketplaces, and `CLAUDE.md` itself. A package manager that only handles the skills part handles the part I could already solve with a symlink.

dotagents covers Claude well for what it declares — skills get symlinked into `.claude/skills/`, MCP servers land in `.mcp.json`, hooks and subagents are generated. But its model is *skills-first*. Prompts and instructions — the things that turn into slash commands and `CLAUDE.md` content — aren't primitives it manages. That is exactly the material a team most needs to share consistently, and it was the material I was still copying by hand.

APM treats instructions and prompts as first-class. `apm install` deploys them into `.claude/`, skills into the harness-neutral `.agents/skills/`, and `apm compile` produces the instruction files each harness reads (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`) from one source. You can pack your own package as a Claude Code plugin bundle, and you can reference plugins from a marketplace directly in the manifest (`name@marketplace#ref`). The first time I cloned a repo, ran one command, and had Claude Code, Copilot and Codex all wired with the *same* instructions, prompts and MCP servers — not three approximations of them — was the moment I stopped evaluating.

## What else tipped it

Once I was in, a few things kept me there. In rough order of how much they matter to a team rather than to me:

**Breadth of harness support, without favouritism.** Microsoft owns Copilot, so you'd expect APM to be Copilot-first. It isn't, in practice: Claude Code and Codex are proper targets with their own output paths, not afterthoughts. dotagents supports Claude, Cursor, Codex, VS Code and OpenCode well, but its Copilot story is thinner — and for a team where most people live in VS Code with Copilot and a few of us live in a Claude Code terminal, both halves have to work.

**A real lockfile discipline.** Both tools have lockfiles; APM's behaves like `npm ci`. `apm install --frozen` refuses anything not in the lock, `apm audit --ci` re-hashes what was actually deployed and fails the build on drift, and there's a [GitHub Action](https://github.com/microsoft/apm-action) that does exactly this in a workflow. Semver ranges on git dependencies (`^1.2.0`) mean you can be deliberate about which updates you take.

**Security that assumes the packages are hostile.** This one surprised me. Every install scans the files it's about to deploy for hidden Unicode, tag characters and bidi overrides — the tricks that make a prompt say one thing to a human and another to a model. Transitive MCP servers are blocked unless declared or trusted. There's SBOM export. And there's `apm-policy.yml`: organisation-level policy that repos can only *tighten*, never relax. If you've ever had to explain to a security team why an agent config repo is "fine", you'll appreciate someone having done the thinking.

**Community gravity.** At the time of writing the [APM repository](https://github.com/microsoft/apm) sits around 3.9k stars with a few hundred forks; [dotagents](https://github.com/getsentry/dotagents) is in the low hundreds. Stars are a vanity metric — until you need a package. Azure, Power Platform and a growing set of vendor skill packs ship as APM packages, so "install the thing that knows about the platform" is already a one-liner for a lot of platforms. The more that's true, the less each team writes from scratch.

**Distribution.** `brew install apm`, `pip install apm-cli`, WinGet, Scoop, a curl script. Being able to put it in a devcontainer `Dockerfile` without a Node toolchain is a small thing that removes a surprising number of support conversations.

## Where dotagents is better

I don't want this to read as a takedown, because dotagents gets things right that APM doesn't.

Its **global mode** is genuinely nicer. `~/.agents/` as your personal setup, one `agents.toml` for the tools you carry from project to project, `--project` when you want a committed team config. APM has global installs too, but the mental model is project-first and it shows.

**Symlinks over copies.** dotagents links skills from `.agents/skills/` into each harness's folder. One file on disk, no drift by construction. APM's newer harness-neutral `.agents/skills/` path moves in the same direction, but there's still more generated output in a repo than I'd like.

**Simplicity.** `agents.toml` is short and readable and does exactly what it says. APM's manifest, policy file, lock file, `.apm/` authoring folder and compile step are more to learn. If your problem is "share five skills across two tools", dotagents is the right size for it.

And Sentry's **trust policy** — a list of GitHub orgs you'll accept sources from, checked before any network call — is a simple, well-placed guardrail that APM expresses in a heavier way.

## The comparison, compressed

| | dotagents | APM |
|---|---|---|
| Manifest | `agents.toml` | `apm.yml` |
| Lockfile / frozen installs | `agents.lock`, `--frozen` | `apm.lock.yaml`, `--frozen`, `apm audit --ci` |
| Skills | ✓ (symlinked) | ✓ |
| MCP servers | ✓ | ✓ (with transitive trust gating) |
| Subagents / hooks | ✓ | ✓ |
| Prompts / slash commands | — | ✓ |
| Instructions → `CLAUDE.md` / `AGENTS.md` / Copilot | — | ✓ (`apm compile`) |
| Plugins | ✓ | ✓ (pack + marketplace refs) |
| Claude Code · Codex | ✓ · ✓ | ✓ · ✓ |
| GitHub Copilot | partial | ✓ |
| Content scanning / policy | trust list by org | Unicode scanning, SBOM, `apm-policy.yml` |
| Install | `npx` | brew · pip · winget · scoop · curl |
| Maturity | beta | active, weekly releases |

## What I'd tell a team

If you are one person keeping your own agent setup in sync across tools, or a small team whose shared material is skills and an MCP server or two, dotagents is lighter and will make you happy.

If you're a platform team — if the point is that *twenty repositories* run the *same* instructions, prompts and tools across Copilot, Claude Code and Codex, and you need to prove it in CI — pick APM. The manifest is heavier because the problem is heavier, and the parts that feel like ceremony now (lockfiles, audit, policy) are the parts you'll be grateful for the first time a skill in a transitive package changes underneath you.

The bigger point stands regardless of which you choose: agent configuration is code, it has dependencies, and copying it around by hand is the same mistake we already learned not to make with everything else. Pick a package manager. Commit the lockfile. Move on to the interesting problems.
