# Debugging Is Developer Experience

*Why the quality of your worst moment — not your best demo — defines a platform's DevX, and what that means for backend development on Critical Manufacturing MES.*

---

I've spent most of two decades building, architecting, and teaching people to extend a Manufacturing Execution System. In that time I've watched hundreds of developers meet the platform for the first time: internal teams, customer engineers, partner integrators. And I've noticed something uncomfortable.

Nobody's opinion of a platform is formed while things are working.

The demo goes well, the tutorial compiles, the first action runs. Then — inevitably, usually on a Thursday — something doesn't. And *that* moment, the one where a developer stares at behavior they can't explain, is where developer experience is actually decided. Documentation, API design, and CLI ergonomics all matter. But the tightest correlation I've seen between "developers who thrive on the platform" and "developers who quietly give up" is this: **how long it takes to see what the code is really doing.**

## The MES backend is not a normal backend

To understand why debugging deserves special attention in our world, look at what makes MES backend development structurally different from, say, building a web API.

When you customize Critical Manufacturing MES, your business logic takes two main forms. There are **DEE Actions** — C# that the platform compiles and executes *inside a running MES host*, wired into the lifecycle of business operations. And there are **custom business assemblies** — your `Cmf.Custom.*` libraries, loaded into that same host process.

Notice what both have in common: *the code you write executes inside someone else's process, at a distance from where you wrote it.*

That distance keeps growing. The host is no longer a service on your workstation; it's a container in a local Docker stack, a devcontainer inside a devcontainer, a pod on Kubernetes or OpenShift, a remote dev environment three networks away. Meanwhile the environment your code will ultimately serve — a factory — is one where "just try it in production" is not a joke, it's a firing offense. A production MES must never stop, which means the *only* place you can truly observe your logic is a development or test instance.

So the everyday reality of an MES backend developer is: code written *here*, executed *there*, inside a live system, behind a container boundary, with production categorically off-limits. Every one of those facts is correct and necessary. Together, they conspire against the most important loop in software development.

## The anatomy of a broken inner loop

The inner loop — edit, run, observe, repeat — is the heartbeat of development. Everything a developer learns about a system, they learn one iteration at a time. Which means iteration time isn't a convenience metric. It's the *learning rate*.

Here's what the loop looks like when the tooling doesn't reach where the code runs:

1. **Observation degrades to archaeology.** You can't watch the code execute, so you instrument it: log lines, temporary writes, a message here, a counter there. Then you trigger the operation, go find the logs, and reconstruct what *probably* happened. Print debugging isn't wrong — but as your only instrument, it turns every question into an expedition.
2. **Editing splits from executing.** The code's home is the server; your editor only ever holds a copy. Change it locally and it's fiction until it's uploaded; change it on the server and your local copy is stale. Every iteration pays a synchronization tax, and every desynchronization is a future bug report.
3. **Errors arrive without an address.** A compile failure inside the host comes back as a message from a distant machine, referencing code you can't quite line up with the file in front of you. The feedback exists — it's just not *where you are*, and not on the line where you need it.
4. **Minutes replace seconds.** Add up the round trips and a single hypothesis — "I think the input dictionary is missing a key" — costs five, ten, fifteen minutes to test. A developer with a fifteen-second loop will test forty ideas in the time another tests one. They're not forty times smarter. They just get forty times the feedback.

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

---

*João Moreira has spent 17+ years building Critical Manufacturing MES — as engineer, technical manager, architect, and developer advocate. He currently focuses on documentation and tools for the MES developer ecosystem.*
