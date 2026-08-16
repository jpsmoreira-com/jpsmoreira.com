---
title: Debugging Is Developer Experience
date: 2026-08-16
type: article
description: Why the quality of your worst moment — not your best demo — defines a platform's DevX.
lede: Why the quality of your worst moment — not your best demo — defines a platform's DevX, and what that means for backend development on Critical Manufacturing MES.
---

I've spent most of two decades building, architecting, and teaching people to extend a Manufacturing Execution System. In that time I've watched hundreds of developers meet the platform for the first time: internal teams, customer engineers, partner integrators. And I've noticed something uncomfortable.

Nobody's opinion of a platform is formed while things are working.

The demo goes well, the tutorial compiles, the first action runs. Then — inevitably, usually on a Thursday — something doesn't. And *that* moment, the one where a developer stares at behavior they can't explain, is where developer experience is actually decided. Documentation, API design, and CLI ergonomics all matter. But the tightest correlation I've seen between "developers who thrive on the platform" and "developers who quietly give up" is this: **how long it takes to see what the code is really doing.**

## The MES backend is not a normal backend

To understand why debugging deserves special attention in our world, look at what makes MES backend development structurally different from, say, building a web API.

When you customize Critical Manufacturing MES, your business logic takes two main forms. There are **DEE Actions** — C# that the platform compiles and executes *inside a running MES host*, wired into the lifecycle of business operations. And there are **custom business assemblies** — your `Cmf.Custom.*` libraries, loaded into that same host process.

Notice what both have in common: *the code you write executes inside someone else's process, at a distance from where you wrote it.*

<figure>
  <svg viewBox="0 0 760 300" role="img" aria-label="A developer's editor on a dev machine sends code across container and network boundaries into the MES host process that compiles and executes it; the production MES is off-limits to debugging.">
    <defs>
      <marker id="arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/>
      </marker>
    </defs>
    <rect x="20" y="95" width="180" height="120" rx="10" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <text x="110" y="122" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Your editor</text>
    <rect x="45" y="140" width="130" height="28" rx="6" fill="none" stroke="currentColor" stroke-width="1"/>
    <text x="110" y="159" text-anchor="middle" font-size="12" font-family="monospace" fill="currentColor">MyAction.cs</text>
    <text x="110" y="196" text-anchor="middle" font-size="11" fill="var(--text-muted)">where you write</text>
    <rect x="280" y="35" width="300" height="240" rx="14" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="6 5" opacity="0.55"/>
    <text x="430" y="57" text-anchor="middle" font-size="11" fill="var(--text-muted)">remote machine · cluster · network</text>
    <rect x="305" y="72" width="250" height="180" rx="12" fill="none" stroke="currentColor" stroke-width="1" stroke-dasharray="6 5" opacity="0.75"/>
    <text x="430" y="92" text-anchor="middle" font-size="11" fill="var(--text-muted)">container · pod</text>
    <rect x="330" y="108" width="200" height="118" rx="10" fill="none" stroke="var(--accent)" stroke-width="1.8"/>
    <text x="430" y="135" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">MES host process</text>
    <text x="430" y="160" text-anchor="middle" font-size="12" fill="currentColor">compiles &amp; executes</text>
    <text x="430" y="177" text-anchor="middle" font-size="12" fill="currentColor">your DEE Actions</text>
    <text x="430" y="201" text-anchor="middle" font-size="12" font-family="monospace" fill="var(--text-muted)">Cmf.Custom.* DLLs</text>
    <line x1="200" y1="150" x2="322" y2="160" stroke="var(--accent)" stroke-width="2" marker-end="url(#arr1)"/>
    <text x="258" y="138" text-anchor="middle" font-size="11" fill="var(--accent)">code travels</text>
    <rect x="620" y="95" width="120" height="120" rx="10" fill="none" stroke="var(--danger)" stroke-width="1.5"/>
    <text x="680" y="125" text-anchor="middle" font-size="13" font-weight="600" fill="var(--danger)">Production</text>
    <text x="680" y="143" text-anchor="middle" font-size="13" font-weight="600" fill="var(--danger)">MES</text>
    <circle cx="680" cy="178" r="14" fill="none" stroke="var(--danger)" stroke-width="2"/>
    <line x1="670" y1="188" x2="690" y2="168" stroke="var(--danger)" stroke-width="2"/>
    <text x="680" y="238" text-anchor="middle" font-size="11" fill="var(--danger)">never debug here</text>
    <line x1="580" y1="155" x2="612" y2="155" stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="4 4"/>
  </svg>
  <figcaption>MES backend code is written in one place and executed inside a live host process behind container and network boundaries — and the one environment that matters most is off-limits.</figcaption>
</figure>

That distance keeps growing. The host is no longer a service on your workstation; it's a container in a local Docker stack, a devcontainer inside a devcontainer, a pod on Kubernetes or OpenShift, a remote dev environment three networks away. Meanwhile the environment your code will ultimately serve — a factory — is one where "just try it in production" is not a joke, it's a firing offense. A production MES must never stop, which means the *only* place you can truly observe your logic is a development or test instance.

So the everyday reality of an MES backend developer is: code written *here*, executed *there*, inside a live system, behind a container boundary, with production categorically off-limits. Every one of those facts is correct and necessary. Together, they conspire against the most important loop in software development.

## The anatomy of a broken inner loop

The inner loop — edit, run, observe, repeat — is the heartbeat of development. Everything a developer learns about a system, they learn one iteration at a time. Which means iteration time isn't a convenience metric. It's the *learning rate*.

Here's what the loop looks like when the tooling doesn't reach where the code runs:

1. **Observation degrades to archaeology.** You can't watch the code execute, so you instrument it: log lines, temporary writes, a message here, a counter there. Then you trigger the operation, go find the logs, and reconstruct what *probably* happened. Print debugging isn't wrong — but as your only instrument, it turns every question into an expedition.
2. **Editing splits from executing.** The code's home is the server; your editor only ever holds a copy. Change it locally and it's fiction until it's uploaded; change it on the server and your local copy is stale. Every iteration pays a synchronization tax, and every desynchronization is a future bug report.
3. **Errors arrive without an address.** A compile failure inside the host comes back as a message from a distant machine, referencing code you can't quite line up with the file in front of you. The feedback exists — it's just not *where you are*, and not on the line where you need it.
4. **Minutes replace seconds.** Add up the round trips and a single hypothesis — "I think the input dictionary is missing a key" — costs five, ten, fifteen minutes to test. A developer with a fifteen-second loop will test forty ideas in the time another tests one. They're not forty times smarter. They just get forty times the feedback.

<figure>
  <svg viewBox="0 0 820 330" role="img" aria-label="Two circular loops compared: without proper tooling the cycle is edit a copy, upload and trigger, dig through logs, reconstruct and guess, costing about fifteen minutes per hypothesis; with tooling that reaches the host the cycle is edit the real file, save and hot-reload, breakpoint hits, observe real state, costing seconds.">
    <defs>
      <marker id="arrGrey" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
      </marker>
      <marker id="arrBlue" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto">
        <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/>
      </marker>
    </defs>
    <text x="200" y="30" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Tooling stops at the boundary</text>
    <g stroke="currentColor" stroke-width="1.6" fill="none" opacity="0.85">
      <path d="M200,90 A85,85 0 0 1 285,175" marker-end="url(#arrGrey)"/>
      <path d="M285,175 A85,85 0 0 1 200,260" marker-end="url(#arrGrey)"/>
      <path d="M200,260 A85,85 0 0 1 115,175" marker-end="url(#arrGrey)"/>
      <path d="M115,175 A85,85 0 0 1 200,90" marker-end="url(#arrGrey)"/>
    </g>
    <text x="200" y="75" text-anchor="middle" font-size="12" fill="currentColor">edit a copy</text>
    <text x="297" y="179" text-anchor="start" font-size="12" fill="currentColor">upload &amp; trigger</text>
    <text x="200" y="285" text-anchor="middle" font-size="12" fill="currentColor">dig through logs</text>
    <text x="103" y="179" text-anchor="end" font-size="12" fill="currentColor">guess</text>
    <text x="200" y="170" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor">≈ 15 min</text>
    <text x="200" y="190" text-anchor="middle" font-size="11" fill="var(--text-muted)">per hypothesis</text>
    <text x="620" y="30" text-anchor="middle" font-size="13" font-weight="600" fill="var(--accent)">Tooling reaches the host</text>
    <g stroke="var(--accent)" stroke-width="1.8" fill="none">
      <path d="M620,90 A85,85 0 0 1 705,175" marker-end="url(#arrBlue)"/>
      <path d="M705,175 A85,85 0 0 1 620,260" marker-end="url(#arrBlue)"/>
      <path d="M620,260 A85,85 0 0 1 535,175" marker-end="url(#arrBlue)"/>
      <path d="M535,175 A85,85 0 0 1 620,90" marker-end="url(#arrBlue)"/>
    </g>
    <text x="620" y="75" text-anchor="middle" font-size="12" fill="currentColor">edit the real file</text>
    <text x="717" y="179" text-anchor="start" font-size="12" fill="currentColor">save → hot reload</text>
    <text x="620" y="285" text-anchor="middle" font-size="12" fill="currentColor">breakpoint hits</text>
    <text x="523" y="179" text-anchor="end" font-size="12" fill="currentColor">observe</text>
    <text x="620" y="170" text-anchor="middle" font-size="15" font-weight="700" fill="var(--accent)">≈ 15 s</text>
    <text x="620" y="190" text-anchor="middle" font-size="11" fill="var(--text-muted)">per hypothesis</text>
    <text x="410" y="322" text-anchor="middle" font-size="12" fill="var(--text-muted)">same hour of work: 4 hypotheses tested — or 40</text>
  </svg>
  <figcaption>Iteration time is a learning rate: when tooling reaches the host, the same hour of work tests ten times the hypotheses.</figcaption>
</figure>

None of this makes the platform's logic wrong. The MES executes exactly what it should. But the developer's *understanding* of it is starved, and starved understanding is where defects, frustration, and "let's just work around it" decisions come from.

## What "proper" actually means

It's easy to say "we need better debugging tools." It's more useful to say precisely what a debugging story must do for this kind of platform. After years of watching where the loop breaks, I'd argue the requirements are these:

**Debug the truth, not a simulation.** Breakpoints and stepping must happen in the code the host is *actually executing* — the real process, with the real inputs, in the real lifecycle. A local approximation of the platform tells you how the approximation behaves.

**Reach the code wherever it runs.** Local process, Docker, devcontainer, WSL, Kubernetes, OpenShift — topology is an operations decision, and it should be invisible to the developer pressing F5. A debugging story that only works for one host layout is a demo, not a tool.

**Make the loop measured in seconds.** An edit should be running in the host moments after you save it — no package, no redeploy ceremony between a hypothesis and its answer.

**Bring errors to the developer, not the developer to the errors.** A compile error in server-side code should appear in the editor, on the correct line, the way developers experience errors in every other part of their toolchain.

**Treat customization code as real code.** Files on disk. Full IntelliSense against the platform's actual contracts. Diffable, reviewable, committable to source control — because code that can't be reviewed can't be trusted, and code that can't be versioned can't be maintained.

**Be safe by construction.** Everything above is a privileged capability, so the boundaries must be explicit: development and test instances only, changes isolated per developer until deliberately persisted, credentials in the operating system's secure storage rather than in files, and no quiet phoning home. Power tools earn trust through their guardrails.

**Meet developers where they already live.** In their editor, in their existing project layout, alongside the CLI and workflows they already use. Every context switch a tool demands is a tax on the loop it's supposed to shorten.

## Why this is a business requirement, not a developer luxury

If you own a platform, here's the uncomfortable arithmetic: your ecosystem's capacity is (number of developers) × (their iteration rate). Documentation and training grow the first term. Debugging tooling grows the second — and the second compounds. Faster loops mean faster onboarding, earlier defect detection (in the dev instance, not the factory), bolder customizations, and partners who *want* to build on you because building on you feels good.

Industry 4.0 strategies love to talk about data, connectivity, and AI. But every one of those capabilities arrives at a factory as *software someone had to develop* — and the pace at which your ecosystem can deliver them is set, day after day, by that unglamorous little loop: edit, run, observe, repeat.

The requirements above are not a wish list. Treat them as what they are — a specification. And specifications, as any engineer will tell you, have a way of eventually meeting an implementation.

More on that soon.
