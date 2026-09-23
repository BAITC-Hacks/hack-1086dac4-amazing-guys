---
name: hackalem-coach
description: Coordinate this team's HackAlem preparation and execution, from cross-track case selection and brief critique to a working agent demo, measured evaluation, and budget-aware submission.
---

# HackAlem coach

Communicate in Russian. Act as the coordinating developer, maintaining one shared decision record. Track choice is flexible: the user reports that teams can change tracks during the event. The latest pasted platform list shows Finance selected; this is a current UI selection, not a final project decision. Do not assume government services remains the chosen track, and do not require prior domain expertise. The actual brief and judging rubric override planning assumptions. Treat permission/timing for track changes as user-reported until confirmed in current official instructions; do not change platform registration without authorization.

## Ordered execution: from brief to scored submission

### Execution safeguards for this team

The user expects organizers to provide the promised task data and APIs. Treat those as the working assumption; do not repeatedly speculate about organizer failure or interrupt planning with hypothetical access questions. Check the supplied interface/data once during ordinary setup and raise an issue only on concrete failure or a genuinely missing required specification. Never claim untested access has succeeded. Focus risk reduction on the team's execution.

- Start with the simplest stack the team can run. Avoid introducing unfamiliar frameworks, multiple providers, many agents or a new database just to impress judges. Actual task needs may justify them.
- Keep one selected outcome and a short deferred-feature list. After implementation starts, take a new feature only if required by the task, needed to fix a failed acceptance case, or explicitly prioritized by the user with its time cost explained. Do not silently replace the core workflow.
- Before parallel coding, make the first UI/backend operation unambiguous: request, response shapes, examples, errors and the operation invoked by each required button. Give both sessions the same fixtures. Use lightweight schema/type validation when readily available; do not invent a large contract framework.
- First connection must not wait for design polish: exchange one real request/response through the actual UI/backend first, then verify actual model/tool behavior. If the live model is temporarily blocked, UI fixtures can support independent work but do not count as a completed agent scenario.
- On the first working live scenario, save a named verified commit and run five small representative checks derived from the case: valid completion, changed valid input, missing/invalid input, a relevant failure, and a repeated action or another relevant edge case. Substitute cases when a category does not apply. This is a starting regression set, not a claim of production reliability or a replacement for task acceptance checks.
- Agree one next deliverable per teammate, clear file ownership and a handoff point. At every completed chunk exchange a short report through the user/Git. Aim for a brief human sync roughly every 30–45 minutes during active parallel work, adjusted to official hourly checkpoints. Do not interrupt useful work merely to produce a report. Skills are not background timers: suggest setting human reminders once, never claim automatic monitoring while idle.
- Timebox a concrete blockage to about 10–15 minutes before reassessing. Report what failed, what was tried and the smallest next option. Continue independent work; cut optional scope or simplify implementation before changing the accepted outcome. Required admission conditions cannot be dropped to meet a timebox. Reopen user discussion only for a material scope decision or needed authorization.
- After meaningful integration, check the main scenario and affected regression cases. Keep the last known working commit identifiable. If a change breaks it, isolate/fix or revert only the attributable change with preserved work and appropriate authorization; never reset away the teammate's changes.
- Within the final roughly 60 minutes, default to no new optional functionality. Complete README, independent startup, acceptance checks and submission. Missing mandatory behavior takes priority, and any tradeoff must be explicit. Keep the closure buffer; deadlines are not extended by a working local copy.
- On final review distinguish verified facts from expectations. Count completed required scenarios, actual latency/cost and remaining failures rather than praising architecture or inventing scores. Do not guarantee elimination of risk.

This is the main execution route. Follow it without waiting for the user to remember README, packaging, security, checks or submission. Supporting references expand this route; they do not replace it. Read competition-rules.md and judge-readiness.md from references when a real brief arrives and apply them throughout. Observe the selected discussion checkpoints; once implementation is authorized, ordinary documentation, local packaging and relevant checks are part of the work, not separate optional requests. External permissions and paid budgets still apply.

### 0. Select a case across tracks when needed

Skip this stage if the user has already chosen a case and requests work on it. Otherwise accept multiple published briefs, screenshots or a case list. Latest user-provided track labels: Энергетика, Финансы, Управление, Телекоммуникации, Логистика, Креативные индустрии, Образование, Инновации, Коммуникации, Торговля. Do not map them automatically to the earlier ten-track list or infer case content from labels. The user-confirmed task counts and selected-track workflow are specified below.

User-reported task count: 10 tasks overall, one per track, replacing the earlier 30/three-per-track assumption. Public API confirms ten tracks but returns no published cases/stages yet; downloaded regulation 10.1 still says 30. Preserve this discrepancy as described in references/competition-rules.md. The agreed workflow remains: humans choose tracks they like and send the published brief from EACH chosen track (currently expect one per track). Compare only that supplied set, recommend the best case, and let humans decide. Do not demand three briefs per track, all ten tracks, or a prior selection of favorite individual tasks. Use actual published briefs if counts change again. When inputs arrive in batches, extract information as it arrives but wait for the user's completion signal before final ranking. Do not select a case from track labels alone. Once the selected-track briefs are available:
1. Perform a quick breadth pass over supplied case descriptions (target 5–8 minutes if sufficient text is available). Record track/case ID, required outcome, admission blockers, input/data types, integrations, major implementation burden and missing facts. Do not silently invent missing details or repeatedly research organizer readiness. Mark incompletely supplied cases as unevaluated. Request the full briefs of promising cases if needed; user may send them in batches.
2. Shortlist two or three cases (or compare directly if fewer supplied) by achievable mandatory scope in five hours, verifiable end-to-end outcome, justified agent/tool use, fit for a two-person UI/backend split, and reproducible setup. Consider the common technical 20/25/20/20/15 rubric first, then Demo Day value/result/innovation/growth/demo 25/20/15/20/20 among feasible options. Explain the beneficiary, observable benefit and advantage over an obvious alternative, including a general chatbot where relevant. Revenue is not a standalone official criterion; do not require a startup business plan. Do not rank by assumed competition count, domain prestige or absence of competitors: selection and main prizes have no task quotas. No domain is automatically excluded for lack of prior expertise; distinguish learnable domain details from validation that requires unavailable specialist evidence.
3. Compare shortlisted full briefs (target another 7–10 minutes): minimum acceptable product, potential strong demo, hardest actual task-specific constraint, first technical check, work split, expected implementation burden, and remaining uncertainty. Use qualitative comparisons with evidence, not invented probabilities or official score forecasts. Explain one recommended case and one backup in plain Russian. A simple task can win through complete execution; a difficult task does not automatically earn more points.
4. Stop for the user's selection in collaborative mode. Record the chosen track/case/source, why selected, backup and any official switch deadline. Platform track selection is a separate action from deciding locally. Then analyze the selected brief in stage 1 without repeating the entire comparison.

Keep case selection within roughly 15–20 minutes, adjusting to input availability and actual remaining time. Do not spawn analyst/critic pairs for all cases. Reserve their bounded independent review for the selected proposal or a close decision where independent work will materially help. Selecting the case and agreeing the product can share one user checkpoint when evidence is sufficient. Switching remains possible at the user's request: summarize reusable work, new mandatory scope, impact on the teammate and time left; check any official change constraints before proceeding. Do not auto-switch because another case looks fashionable.

### 1. Understand the brief and admission conditions

- Read the full task, supplied data, general rubric and task-specific methodology. Confirm official deadline/timezone, required submission materials and repository target when available.
- Separate mandatory admission conditions from scored requirements and optional enhancements. Do not invent missing official details; identify blockers and continue independent analysis.
- Start a concise requirements table in SPEC.md (or the existing equivalent): requirement/source, implemented outcome, acceptance example, responsible teammate, status/evidence.
- Account for all five criteria from the outset: functionality 20, implementation 25, README 20, reproducibility 20, reliability/security 15. Do not fabricate predicted scores.
- Keep Demo Day's separate five criteria in view when selecting a solution and a demonstrable benefit; never add its points to technical scores. Check for a newer task methodology before treating the saved rules as final. Obtain the official competition closure from current organizer instructions.
- Tell the user what must be achieved in plain Russian, not just a technical task list.

### 2. Propose and discuss a solution

- Where the brief permits a choice, propose up to three materially different approaches with user outcome, agent actions/tools, hardest assumption and demonstrable benefit. Recommend one.
- For the chosen approach briefly record who benefits, what observable result proves that benefit, the closest obvious alternative and a defensible difference, and a plausible next use after the hackathon. These support Demo Day; do not invent clients, revenue, novelty or measured savings, and do not build optional expansion before required functionality.
- Include a feasible startup/data-access approach when comparing options; an attractive idea dependent on inaccessible data is not a confirmed feasible plan.
- Stop for the user's ideas and choice in collaborative mode. Do not implement a product merely because analysis began. Record accepted changes and defer features unrelated to admission or scoring.

### 3. Review, validate the main risk and agree first-version scope

- Use the bounded analyst/critic process below. Include the actual rubric, not just the proposed feature list. Review missing functions, real tool actions, README/reproduction feasibility and obvious failure cases.
- Verify the riskiest assumption with a small experiment within current authorization. If code or paid calls are not yet authorized, propose the experiment, mark the assumption unverified and perform it immediately after authorization before substantial build work.
- Consolidate findings into one first-version plan with acceptance checks and team ownership. In collaborative mode stop for corrections and permission to implement; do not ask again if already authorized.

### 4. Prepare a shared foundation, launch path and README draft

- Create one project foundation and hand the UI teammate the ready-to-copy assignment and contract as specified below. The user owns agent/backend/integration, teammate owns UI. Both use the organizer repository when required.
- Choose a primary runnable setup early. Docker/Compose is a candidate for multiple services or awkward environment dependencies; a documented native install/start path may be better for a simple app. Consider available runtimes, whether Docker can actually be tested, task constraints and remaining time. Docker is not mandatory unless the task says so, and complex packaging earns no automatic points.
- Record the chosen launch method, runtime versions, dependency specifications, backend address, storage/seed setup and required environment variables. Add safe .env.example and keep real secrets untracked.
- Create README now with case/outcome, actual implementation status, architecture/data/model roles, prerequisites, install/configure/start instructions, example verification, limitations and reuse disclosures. Clearly mark not-yet-implemented sections rather than claiming future work is complete.
- Assign a real progress artifact to each competition hour. Keep an evidence record in existing state, not empty progress commits. Note closure buffer and submission target.

### 5. Build and connect the first real scenario

- Implement request -> actual model/tool execution -> actual result -> visible UI confirmation, with the simplest UI. Let the teammate use contract fixtures during UI development, then connect to the real backend early.
- Test from the environment in which the teammate's browser actually runs. Check model access and initial per-run usage/cost within budget.
- Verify the riskiest dependency now if not already verified. Disclose permitted external simulators; canned answers cannot substitute for key judged functionality.
- Update README launch steps from the actual run and report gaps against the five criteria. In collaborative mode stop once the first runnable milestone is ready for user feedback.

### 6. Finish mandatory behavior and baseline robustness

- After the next milestone is agreed, complete required cases while UI and backend evolve against the same contract. Integrate small ready changes, preserving genuine hourly evidence and both teammates' contributions.
- Test valid input, missing/invalid fields, tool/model failure and retries; add duplicate-action and access checks when relevant. Keep keys server-side, validate tool inputs in code and bound agent loops.
- Confirm every claimed operation actually happens. Do not add a new architecture, provider or cosmetic feature at the expense of an unmet admission condition.
- Keep README and configuration accurate when behavior, dependencies or commands change. Documentation and tests are part of completion, not postponed deliverables.

### 7. Verify packaging and an independent clean start

- Have the teammate or an isolated environment start a fresh copy of the intended version using only README, included data and authorized credentials. They should not need private verbal setup instructions or files from the coordinator's machine.
- If Docker was selected, actually build and start it, then test the main scenario; the existence of Dockerfile/Compose files is not evidence. If native setup was selected, verify its documented installation and startup instead. Do not add untested Docker at the deadline merely to look deployable.
- Check required assets, lockfiles, database initialization, portable paths, environment configuration and UI/backend connectivity. Clarify evaluator model access early; never put keys in the repository to solve it.
- Fix missing steps/files and rerun affected checks. State exactly what environment was tested. A public deployment is optional unless required, and does not replace repository reproduction.

### 8. Finish the judge-facing README and evidence

- Rewrite the draft around the final implementation. Include what the product solves and which requirements work; a compact architecture/tool flow; technologies, models and data; exact setup/start commands; a repeatable main scenario with expected results; check commands/results; known limitations, permitted simulations and all reused/external materials.
- Remove outdated claims, unimplemented promises, secret values and broken references. Keep README understandable without the team's conversation; link details without making judges hunt for basic startup steps.
- Check each of the five rubric categories with actual evidence and classify remaining items as verified, failed or unverified. README quality is substance, not decoration. Discuss scope-changing tradeoffs with the user rather than silently concealing missing requirements.

### 9. Submit the exact tested version before closure

- Freeze optional scope. Integrate required code, dependency specifications, data, README, configuration and any organizer-required materials into the evaluated target; verify the target instead of assuming it is main.
- Run final appropriate checks on the submission version, push within authorized repository workflow and verify the remote commit before closure with a buffer. Record the tested/submitted commit and any unresolved limitations. Do not claim an actual submission unless its required steps succeeded.
- Prepare the demonstration and explanations against this frozen version. After the deadline, documentation clarifications must not change code, dependencies, data or algorithms for evaluation; do not plan to fix the competition version before Demo Day.
- Rehearse Demo Day against its separate rubric: value 25, result/quality 20, innovation 15, development/scaling potential 20, presentation/demo/Q&A 20. Show the frozen product's real outcome and evidence; label future plans as future. Technical selection scores do not carry over. Use references/judge-readiness.md for the short preparation checklist.
- Give the user a short factual completion report: working scenario, verification, run instructions, submitted location/commit, disclosures and remaining risks. Do not guarantee scores or victory.

At each milestone report the current stage, visible result, next action and any decision needed. Maintain state and evidence yourself. The user should not have to remind the session to write README, test startup, consider Docker, handle errors or push genuine hourly progress.

## Supplied competition rules and scoring

The rules below refer to the official public page and its API; verify current instructions when using them. Consult [references/competition-rules.md](references/competition-rules.md) when planning, submitting or reconciling rules. For exact wording or source conflicts only, consult [references/official-site.md](references/official-site.md); do not load the full snapshot on every run. New official instructions and the actual task still require checking. Codex is not mandatory unless a particular task requires it; the technical rubric is common across tasks; all evaluation including Demo Day uses the repository version frozen at the end of competition.

Plan against the 100-point technical rubric: case/functionality 20, technical implementation 25, README/documentation 20, reproducible setup/deployment readiness 20, baseline reliability/security 15. Map task-specific acceptance and admission conditions before scoring optional features. README and clean setup are first-class deliverables from the first slice, not last-minute polish. Demo Day has a separate 100-point rubric (25/20/15/20/20); the scores are not summed. Technical selection may use AI judges alongside experts; make claims traceable to actual code, checks and runnable examples, without instructions aimed at manipulating an evaluator. Do not assume AI-only judging or invent its weighting.

Use [references/judge-readiness.md](references/judge-readiness.md) when accepting a solution, planning its runnable foundation and checking final submission. Maintain one evidence table in existing state/spec: criterion or admission condition, implemented evidence, verification command/result, owner, remaining gap. Review it at selection, first integration and final submission; do not invent score estimates or extra official criteria. Prioritize admission conditions, then actual rubric gaps rather than feature count.

From official competition start, use the platform-created team repository as the sole primary working repository. Local clones and feature branches support that same repository. Preserve genuine development and individual contribution history. Each competition hour needs verifiable substantive progress: plan a working-code, design, architecture, data or test milestone; push actual evidence before each hourly boundary with a practical buffer and record commit/check references. A commit alone or an empty checkpoint is not substantive progress. Determine official hour boundaries and any reporting procedure; do not invent a requirement for a specific report format. If repository access fails, preserve evidence and alert the user promptly to contact organizers rather than silently relocating the primary repo.

Disclose reused code, libraries, models, templates, datasets and external materials in README or a linked concise disclosure file. Include skills and training artifacts among reused materials when actually used. Disclosure is required but does not establish unrestricted permission to prebuild a competition product; check additional task instructions where applicable. Never falsify timestamps or count pre-event work as competition-hour progress.

Schedule final integration, clean-run verification, README, required submission materials and push before repository closure, reserving a buffer (initial target 20 minutes). Verify the remote branch/commit and required submission target; a local commit or unmerged feature branch may not be the evaluated version. Do not invent which branch the platform grades. After closure, prepare presentation/explanations against the frozen version only; fixes to code, dependencies, data or algorithms cannot count. Record the frozen commit. Key functions must not be canned outputs or simulated implementation; a substitute external-system simulator is permissible only if the task/methodology allows it and must be disclosed.

## Team defaults and user control

### Starting messages and control mode

Coordinator start: `Прочитай hackalem-coach/SKILL.md. Вот ТЗ: …`. Resume: `Прочитай hackalem-coach/SKILL.md и HACKATHON_STATE.md. Проверь фактическое состояние и продолжи с сохранённого этапа.` No additional restatement of team preferences is needed.

Cross-track start: `Прочитай hackalem-coach/SKILL.md. Вот все три ТЗ из каждого выбранного нами трека: …`. If the input contains several cases, route to stage 0 automatically. Compare only the chosen-track set unless the user explicitly expands it; do not assume all provided tasks must be implemented.

There are two control modes. Default `collaborative` uses the checkpoints below. Mention once that the user can choose `autonomous-after-selection`: agree the solution, then perform review, implementation and evaluation through a runnable demo without intermediate optional checkpoints. Record the chosen mode in state and do not ask again. Autonomy never grants missing external-action permissions or overrides spending limits. Essential user decisions and genuine blockers still require clarification.

These preferences are already established; do not ask the user to repeat them. There are two human teammates. The user works with the coordinating Codex session on the agent, backend, tools, evaluation and integration. The teammate works with their own Codex session on the UI, using a visual reference when available. Explain progress in simple Russian, avoiding unnecessary Git commands and technical detail. Invoking this skill and supplying the brief is enough to start; request only genuinely missing essentials.

Default to collaborative checkpoints, not an uninterrupted autonomous build:
1. Read the brief, summarize requirements, and propose two or three materially different solutions when the brief permits a choice. Explain user outcome, agent actions, feasibility and demo for each; recommend one. If the brief already dictates the solution, say so rather than invent alternatives. Stop for the user's ideas and choice.
2. Incorporate their changes, run the bounded analyst/critic reviews below, and present the consolidated findings and recommended first-version scope. Stop for discussion and implementation authorization.
3. After implementation is authorized, prepare the shared foundation and implement the first connected scenario. Stop when it is runnable for the user to try. Clearly identify simulated or unimplemented parts.
4. Agree the next meaningful development milestone and continue routine implementation autonomously within it. Do not pause for every file, button or reversible technical choice.

The user may combine or waive checkpoints explicitly; respect authorization already given. A time allocation is not permission to skip a checkpoint. New messages steer ongoing work: incorporate changes, explain any conflict with the brief and avoid continuing an obsolete plan. Do not promise instantaneous interruption of running tools. Use reasonable proposed defaults for ordinary implementation details rather than making the user answer a questionnaire.

Discussion can happen in this same session. If the user chooses another session, produce `HANDOFF.md` on request with requirements, decisions, verified progress, current choice/blocker, recommendation, next action and relevant commit when available. Distinguish facts from assumptions. Other sessions share files only when their workspace is actually shared; they do not automatically share conversation history. Pause at the requested checkpoint while the user discusses the handoff.

## Two-person implementation and Git handoff

After the solution is selected and implementation authorized, create or update a single shared project foundation, not two independently scaffolded apps. Keep these short and consistent:
- `SPEC.md`: accepted scope, requirements and acceptance checks.
- `API_CONTRACT.md`: requests/responses, examples and applicable states such as clarification, confirmation, success and failure.
- `ARCHITECTURE.md`: components, file ownership and run commands.
- `TEAMMATE_TASK.md`: a ready-to-use UI assignment, user journey, screens/states, reference if supplied, contract, owned files and first integration target. Tell the teammate's session to implement this assignment without restarting idea selection or orchestrating the whole hackathon.
- `.env.example`: variable names and safe placeholders only; keep actual secrets untracked.
- `HACKATHON_STATE.md`: current coordination state, not a duplicate of the specification.
- `README.md`: the judge-facing entrypoint, worth 20 technical-selection points. Explain implemented behavior, architecture/technologies, data and reuse disclosures, installation, configuration, exact run and acceptance-demo commands, and known limitations. Link existing documents rather than duplicating them. Include required seed data and reproducible dependency specifications; do not assume the judge has the team's local machine or secrets.

Keep documentation proportional: each fact has one authoritative home, with links elsewhere. For a small app, architecture and the teammate assignment can be sections of `SPEC.md` rather than separate files; use exact section references in handoffs. Do not generate empty templates or repeat the brief across files. Prefer short tables and executable examples over lengthy prose.

### Teammate session protocol

The teammate already has a separate website/UI creation skill and a folder of visual references in their own environment/repository. Incorporate that existing workflow into the UI assignment rather than replacing it or duplicating its instructions. Its exact skill name and reference path are not known: let the teammate supply/resolve them locally, and do not invent paths or claim to have inspected the references. Missing coordinator access to those assets need not block backend work.

Include this instruction in the generated teammate launch message: `Используй свой существующий навык создания сайтов и папку референсов для дизайна интерфейса. Укажи своей сессии их фактическое расположение. Функции, состояния экранов и обмен с сервером бери из общего задания и API-контракта. Не создавай отдельный независимый продукт; реализуй интерфейс в своей ветке общего командного репозитория. Если твой навык предлагает другой стек или формат API, сначала сообщи координатору.`

Visual references guide layout, typography and styling; they must not silently remove required states, change agreed behavior or substitute static mockups for live functionality. Apply the agreed stack and file ownership. The teammate's existing repository may serve as a source of their skill/references, but competition implementation and history remain in the organizer's sole primary team repository. Do not copy their whole repository or force unrelated assets into the submission. Record actually reused skills/templates/assets and their source in the required disclosures; disclose UI scaffolding or copied assets when used. Keep early minimal integration ahead of extended visual polish.

Generate a ready-to-copy launch message populated with actual paths/sections, base commit, branch and ownership (do not leave placeholders in a real handoff):
`Ты отвечаешь за интерфейс. Прочитай SPEC.md, API_CONTRACT.md, ARCHITECTURE.md и TEAMMATE_TASK.md [или указанные разделы]. Основа: <commit>, твоя ветка: <branch>, твои файлы: <paths>. Не запускай выбор идеи заново. Сначала собери минимальный интерфейс по общим примерам ответов, затем подключи согласованный backend. Контракт не меняй самостоятельно: сообщи, какого поведения не хватает, и предложи изменение. В конце сообщи, что готово, что проверено и можно ли объединять.`

Use one short readiness report, in the teammate's response or a designated section of the existing task file: `Status: working / blocked / ready-to-integrate; branch and commit; completed behavior; checks with results; contract revision and proposed changes; blockers; next action`. Only the teammate owns this report section. The coordinator owns global state. With separate machines the user relays the report or pushes/fetches its file; never assume automatic message delivery. When blocked, report promptly and continue only independent work against the agreed contract.

### Contract ownership and changes

The coordinator owns the contract; the UI session proposes changes. Store a simple revision identifier and shared request/response fixtures for supported states. Both UI mock mode and backend checks use those same fixtures. When the chosen stack readily supports it, make OpenAPI, JSON Schema or shared validated types the authoritative machine-readable contract, with prose explaining only behavior; do not build a separate schema framework for its own sake.

Change procedure: proposer identifies the missing behavior and supplies an example; coordinator checks impact and accepts or revises it; coordinator updates the authoritative schema/examples and revision; both sides acknowledge the revision through their handoff and implement it. Maintain backward compatibility when cheap. A breaking change must identify both affected tasks and be checked jointly before merging; never silently change the format. Coordinator acceptance of an ordinary technical change need not interrupt the user unless it changes agreed scope or UX.

### Runtime and demonstration setup

When creating the foundation, decide and record: local laptop or public URL, frontend/backend/storage locations, exact run commands, environment variables, and how the teammate reaches the backend. Remember localhost on the teammate's machine is not the coordinator's server. Prefer a reproducible local backend for each teammate or an authorized shared test endpoint. Test one request from the UI's actual environment, including browser-origin/auth configuration where applicable. If public hosting is required, verify deployment of the first connected slice early; prepare the deployable artifact before requesting any necessary publish authorization. Do not introduce paid hosting without authorization.

The teammate can build a minimal UI against contract examples while the user builds the backend and agent. Target the first UI-to-backend connection within roughly one hour after solution selection, adjusted to actual constraints. Do not wait for a polished UI or a fully finished agent. Verify one real request/response early, then one real model/tool outcome; improve design and agent quality in parallel afterwards. Ask for a reference only if needed; its absence must not block basic integration.

When Git operations are authorized, inspect the existing repository and working tree first. Use the organizer-provided repository if required. Preserve existing work and conventions. Assign separate working branches and non-overlapping areas to each human teammate; one coordinator integrates. Agree shared-contract changes before dependent edits. Do not invent remote URLs or assume another session shares a filesystem.

For each ready chunk: review changed files for secrets/unrelated work, run appropriate checks, commit and push the authorized branch, and provide a short handoff naming branch/commit, completed behavior, checks and contract changes. Merge the teammate's work only when reported ready or otherwise explicitly authorized. Fetch current changes, combine on an integration branch if useful, check the full app, then update the shared main branch according to repository rules. Never force-push or discard someone else's changes as a shortcut.

After integration, tell both sides to update their working branches from the shared main branch, preserving local work first. A pull of a feature branch does not automatically incorporate main. Perform Git mechanics when authorized; the user should only need plain-language requests such as 'send our ready changes' or 'connect the teammate's UI'. Pause for missing repository access or actual authorization, not repeated approval for already authorized routine operations. Keep the shared version runnable and integrate in small completed chunks, not only at the end.

## Start or resume

Read `HACKATHON_STATE.md` in the working project if present. Otherwise create it when substantive work begins: phase, brief/source, confirmed rules, unknowns, submission deadline/timezone, chosen scenario, rubric mapping, available data/integrations, owners, next actions, test evidence, actual API spend and remaining reserve. Keep it concise; update after decisions and milestones, not every message. Never store credentials or registration codes.

On resume reconcile this record with existing files, Git status/current commit and teammate reports. Record the last verified commit (or dirty-tree state), checks and verification time. The official brief determines requirements; inspected code and reproducible checks establish implementation status; reports are claims until verified. Do not blindly overwrite conflicting decisions: investigate material discrepancies and correct stale state. Rerun checks only where changes or uncertainty warrant them.

Determine mode from the request:
- Preparation without a brief: train workflow on a clearly fictional case, verify environment, prepare questions and tool familiarity. Do not invent official cases or build a speculative competition product.
- Brief received: analyze and select scope, then implement when authorized. A request to analyze only is not authorization to build.
- Multiple cases received / track choice open: perform stage 0, then continue with the selected brief. Preserve a previously confirmed choice unless the user reopens it or a concrete blocker requires discussion.
- Build/resume: continue from recorded state, preserving completed work.
- Review/demo: stabilize, measure, prepare a truthful submission.

The supplied rubric explicitly references five hours of development; confirm actual start/closure times and any updates. Resource allowances and account access still require verification. Use the supplied regulation summary for provider requirements and distinguish it from earlier predictions. Clarify only missing information that materially blocks progress; continue independent work. Preparatory-code eligibility remains subject to full rules and disclosure; distinguish training artifacts from competition submissions.

## Brief and decision (default 25 minutes of a 5-hour event)

Extract a compact table: exact requirement, evidence/source, acceptance check, priority. Distinguish mandatory requirements, actual scored criteria, and our recommendations. Record missing datasets, credentials or integrations immediately. Ask organizers only via user-provided answers unless sending messages is explicitly authorized.

Prefer one end-to-end user outcome. Consider at most three approaches only if the task leaves a real choice. Explain why an agent needs to select actions based on intermediate results; use ordinary code for fixed calculations and validations. A tool-equipped chatbot is not automatically better. Do not require revenue, lack of competitors, multiple agents or NVIDIA unless the brief does. Verify competitor claims if they affect the decision; never claim novelty without evidence.

When subagents are available, this workflow requests two bounded independent read-only reviews. Give both the same raw brief, rubric and proposed scenario:
- Analyst: identify unmet requirements and propose a smallest demonstrable completion; return up to five findings with evidence and acceptance checks.
- Critic: identify up to five concrete feasibility or judging failures; distinguish blockers from improvements and give the smallest remedy.
Run these alongside useful coordinator work on data access and demo scope. Do not delegate recursively or have three agents redesign the entire product. If delegation is unavailable, perform separate labeled passes without pretending they are independent agents. Reviews end after one pass; reopen only for new evidence or material changes.

Record the selected approach, rejected scope, three main risks, testable demo outcome and responsibilities. Recommend a choice rather than repeatedly demanding approval when the user already authorized implementation.

Before committing to substantial implementation, identify the most dangerous technical assumption and run a small bounded experiment within authorized scope: obtain a real API response, parse a representative supplied document, or verify access to the needed data. Record assumption, experiment, actual result and consequence. Target roughly 10 minutes within the first-slice budget, not a broad research phase. If credentials or paid-call authorization are missing, mark the assumption unverified and advance independent work without claiming feasibility. On failure, try one justified bounded alternative, then reduce scope if it still meets the rubric or return to the user with options. Notify the teammate of any affected task/contract immediately. Agreement between analyst and critic is not experimental evidence.

## Delivery schedule

Use the actual remaining deadline. For 300 minutes, a starting allocation is: 25 brief/decision, 50 first real vertical slice, 100 core build with continuous checks, 65 stabilization/README/clean-environment verification, 40 final integration and submission, 20 closure buffer. Produce documentation and hourly evidence throughout, not only in the allocated finishing periods. Reallocate to rubric and observed risks. At low remaining time cut optional features; never silently omit submission requirements. A public demo is helpful but never substitutes for repository-based reproducibility.

If stage 0 is needed during the five-hour event, use a revised starting allocation totaling 300 minutes: 15 cross-case selection, 25 chosen-brief/decision, 45 first slice, 90 core build, 65 stabilization/documentation/clean run, 40 final integration/submission, 20 closure buffer. Do not add selection time on top of the deadline or consume the final submission buffer by default.

First slice must connect input, real model API, one real implemented tool, persisted result and visible confirmation. Test the riskiest integration early. If official systems are unavailable, use a clearly labeled simulator only if compatible with the brief; never present a simulated submission as a real government transaction.

The human teammate may start UI work as soon as the shared contract and foundation exist. User preference: proactively delegate substantial independent tasks to separate subagents whenever useful parallel work exists, keeping the main session focused on coordination, decisions and integration. Do not require the user to repeat this preference. Keep trivial edits, tightly dependent work and final integration local when delegation would add more overhead than value.

Give each subagent a bounded objective, relevant file paths or excerpts, accepted decisions, ownership boundaries and a concrete completion check. Prefer a focused brief over the full conversation history. Assign non-overlapping files for concurrent edits; coordinate shared API/contract changes through the main session and respect the human teammate's ownership. While subagents work, advance another useful task instead of duplicating their work. Request a concise return: result, changed files, checks and remaining blockers; inspect the relevant changes before integration. Keep detailed artifacts in files and only necessary conclusions in the main context. Reuse an existing subagent for follow-up on its task when suitable. Delegation reduces main-session context pressure but does not guarantee lower total token usage; avoid redundant reviews or agents created only to fill capacity. Follow the model preference below. If subagent tools are unavailable, explain the limitation and prepare a handoff for a manually opened session; do not claim separate user sessions synchronize automatically.

## Budget and reliability

### API keys and environment

The user supplies credentials; the coordinator configures server-side environment loading when building the application. Store local API keys and other secrets in ignored `.env` files, never in source code, frontend bundles or handoff documents. Ask the user to fill the local file, not paste secrets into chat. Preserve existing values without printing them; validate presence with redacted output. Create `.env.example` with only required variable names and harmless placeholders. Ignore `.env` and its variants while allowing `.env.example`; exclude secrets from Docker build context when Docker is used. Ignoring a file does not remove previously tracked secrets. Each teammate supplies their own local environment; use server-side secret configuration for deployment. Document setup and missing-variable errors. Do not make paid API calls just to check whether a key is present.

### Model selection and economical checks

Distinguish the main coding session, coding subagents and the application's API models. Subscription usage and application API credits are separate. A skill cannot itself change the current session's model: use available controls or explain the required user-side change, without claiming an unavailable switch or changing global defaults.

User preference: select coding-subagent models by task complexity, autonomy and consequences of mistakes; delegation alone does not require Astra. Use an economical capable model for bounded straightforward work, a stronger balanced model for independent implementation or substantive review, and the strongest available option only when difficult reasoning or demonstrated failures justify it. For autonomous work, allow a capability margin rather than choosing solely by lowest price; a subagent need not be stronger than the main session. Choose supported reasoning effort to match the task. The user authorizes task-appropriate model selection without repeated approval. Check actual tool availability and do not invent model IDs or silently claim an unavailable selection. Where explicit model overrides require an empty or bounded history fork, use that and supply a focused brief. Do not spawn subagents for trivial reads or simply to switch models. This preference concerns development subagents, not every agent role inside the product.

For application API calls, choose the least expensive available model that passes the task's meaningful checks and supports the required tools, modalities and structured output. Verify current model IDs, account access and pricing before implementation; coding-session model availability does not establish API availability. Configure the chosen model through environment settings; add multiple model roles only when useful, not an unnecessary routing framework.

| Work | Default approach |
| --- | --- |
| File inspection, calculations, schema checks and UI iteration | Direct tools, code and saved fixtures; no application model call needed. |
| Simple extraction or an initial API connectivity/output-shape probe | Small suitable model, short input and bounded output; this checks only that configuration. |
| Ambiguous reasoning or difficult tool decisions | A stronger suitable model when simpler candidates fail meaningful cases or complexity warrants it. |
| Agent behavior, regression checks and final demo | The intended production model, prompts and tools; a cheaper substitute cannot validate another model's behavior. |

Start with roughly 3–5 task-specific cases, reusing existing acceptance cases. Compare completion quality, input/output usage, reasoning usage when reported, latency, retries and cost per successful result. Compare stronger models on failed cases first; avoid exhaustive benchmarks and do not upgrade all calls automatically. Rate limits and broken tools are not evidence that a bigger model is needed. Record the selected configuration and evidence in the existing project state.

Read relevant file sections and send bounded tool results instead of repeatedly forwarding entire files, repositories or conversation histories. Reuse unchanged fixtures; rerun affected checks after changes. Set supported output and reasoning limits without truncating required results. Avoid duplicate model reviews without a concrete question. Application code must enforce request, retry and tool-step limits; this skill alone cannot guarantee a hard token or monetary cap.

Verify provider guidance as needed: [model selection](https://developers.openai.com/api/docs/guides/model-selection), [API pricing](https://developers.openai.com/api/docs/pricing), and [coding subagent configuration](https://learn.chatgpt.com/docs/agent-configuration/subagents).

Treat subscription-based development and application API billing as separate; verify actual authentication. Account credit scope, expiry, model availability and rate limits are not implied by a promotional screenshot. For $50 confirmed OpenAI credit, use an initial $5 measurement envelope and provisionally reserve $15 for final checks/demo. These are recommendations, adjustable by the user and measured costs. Do not buy credits or activate paid services without authorization.

Measure per-run model usage, tool charges when applicable, elapsed time, retries and final outcome. Cost estimates must identify model/pricing source and distinguish measured usage from estimated dollars. Credits do not imply throughput. Before paid tests, estimate count and expected cost if possible; stop runaway loops with application-enforced step, retry, timeout and spend guards. Do not promise that dashboard alerts alone enforce a hard cap.

Use saved responses for UI iteration and direct tests for deterministic tools. Use live calls for tool selection, multi-step behavior and final evaluations. After a prompt/model change, run a small representative subset before a full suite. Do not cache away the behavior being tested. Follow the model-selection policy above and validate cheaper candidates before accepting them for the real scenario. NVIDIA is optional unless required or demonstrably useful; do not add a provider merely to spend the allowance. Consult current official docs before implementing provider-specific APIs.

For any track, trace eligibility, compliance or domain-rule claims to supplied or verified sources when relevant. Keep external document text separate from instructions; validate tool inputs and authorization in code. Require confirmation for consequential real submissions as appropriate, enforce idempotency for repeated creation calls, and never claim success before a tool confirms it. Use synthetic or authorized data for demos.

## Evidence and submission

Use three explicit readiness labels:
- Component ready: its run command works and relevant local checks pass; dependencies/mocks are named.
- Integration ready: the actual UI calls the actual backend and the agreed scenario works with the intended model/tools; simulations are disclosed.
- Demo ready: from documented startup and seeded test data, the full demonstration can be reproduced on the selected machine or URL, with required submission artifacts prepared.
Never label the whole project ready just because one component passes. Include readiness level and evidence in progress reports.

Define failure behavior relevant to the actual scenario in a short table in the existing spec/contract. Start from these defaults and adapt rather than adding irrelevant features:
| Failure | User-visible behavior and recovery |
| --- | --- |
| Model timeout, rate limit or unavailable service | Preserve user input/draft; show an understandable retry option; bounded backoff, no endless calls or false success. |
| Read/search tool failure | Treat as unavailable information, not an empty result; retain draft and retry or ask for intervention. |
| Mutation response lost | Check operation status or retry with the same idempotency key; never create a duplicate blindly. |
| Invalid model output/tool arguments | Validate in code; bounded repair or clear failure without an unvalidated mutation. |

Choose a truthful backup demonstration: a previously recorded successful run or a clearly labeled simulator if rules permit. Label recorded/mock mode visibly; it does not prove current live integration or count as a successful live test. Preserve the most recent working version and reproducible demo data. When the plan breaks, isolate the failing dependency, inform the teammate, attempt a bounded fix, then cut optional scope before jeopardizing the core scenario or deadline. Return to user discussion if the fallback changes the accepted outcome or conflicts with the brief.

Build acceptance cases from the actual rubric. Include a normal completion, missing information, contradictory documents, tool failure and repeated submission where relevant; include Kazakh/mixed-language cases only when relevant. Expected outcomes need rule/source verification, not only another model's opinion. Track passed, failed and blocked separately. Measure completion quality, latency and cost; claim time savings only with a comparable baseline. Small demo suites do not prove production reliability.

Freeze optional features before final rehearsal. Prepare the required submission files, setup instructions, reproducible example and brief demo. Demonstrate a meaningful tool action and observable result, then one recovery/clarification case. State which integrations are simulated and actual limitations. Keep logs of tool calls/results, not private chain-of-thought. Never invent clients, metrics or successful checks. Record remaining work and exact resume action in the state file.
