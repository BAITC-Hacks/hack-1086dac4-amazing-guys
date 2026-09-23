# Competition rules

Source: [official event page](https://edu.astanahub.com/hackathons/df4743f5-c492-415c-b45a-1f13adb78e06?tab=regulations), with supporting public API information. [Source extract](official-site.md) contains all regulation sections, public track observations, partners and FAQ. Technical clause 7.4 matches the user's earlier excerpt. Obtain the actual task, published evaluation methodology and newer official announcements; saved source information does not guarantee that rules remain unchanged.

## Development and submission

- 6.1–6.3: work within the announced task/track/direction; required materials, format, technical requirements and deadline arrive through official channels. Late submissions may be rejected.
- 6.4–6.5: disclose prior code, third-party libraries, open models, templates, datasets and other external materials. Organizers may inspect history, metadata, functionality and individual contribution.
- 6.6: each hour from official competition start requires demonstrable substantive progress. Code, functionality, prototype, design, architecture, model setup, testing and prepared data may qualify. Missing, merely formal or false evidence can lead to disqualification. The excerpt does not specify an exact upload cadence or reporting form; hourly evidence pushes are our operational recommendation.
- 6.8: platform team repository is the sole primary working project repository from competition start; preserve verifiable history.
- 6.9: any AI development tools/agents are allowed. Codex is not mandatory unless expressly required by the specific task.
- 6.10–6.11: platform creates the repository and closes changes at competition end. Frozen contents are the competition version for all stages, including Demo Day. Later changes do not count.
- 6.12: experts may request setup/run explanations, but these cannot change frozen code, dependencies, data or algorithms.
- 3.5: captain handles organizer communication, timely submission and required documents.
- 3.7: continuous on-site presence after check-in through the announced competition end, except organizer-approved departure or emergencies reported when possible. Mention when logistics are relevant; do not repeatedly interrupt development with attendance reminders.

## Technical selection: 100 points

| Criterion | Points | Practical acceptance evidence |
| --- | ---: | --- |
| Case alignment and functionality | 20 | Mandatory case requirements met; full input-to-result scenario actually works. |
| Technical implementation | 25 | Claimed functionality in code, connected components, understandable structure; key functions not prerecorded answers or imitation. Five-hour constraint considered. |
| README and technical documentation | 20 | README substitutes for preliminary presentation: implemented scope, architecture, technologies/data, install/run/check instructions, limitations. Substance over appearance. |
| Reproducibility and deployment readiness | 20 | Independent clean-environment startup with dependencies, configuration, environment variables and needed data. Deployment is advantageous but does not replace repository startup. |
| Baseline reliability and security | 15 | Correct inputs complete successfully; obvious invalid requests handled. |

- 7.1: before competition, organizers publish scoring methodology, admission conditions and case checks.
- 7.2: common criteria/maxima apply across projects; task popularity and number of competing teams alone do not affect scores.
- 7.3: case defines outcome and evidence; methodology connects them to scores. Admission conditions are separate from deductions. Extra features cannot compensate for failure of mandatory admission conditions. New criteria, weight changes or additional disqualification-for-admission grounds cannot be introduced after start according to this clause.

## Authority and remaining unknowns

User-reported task count: ten tasks, one per track, superseding the earlier 30/three-per-track plan. Public API confirms ten tracks: Energy, Finance, Management, Telecommunications, Logistics, Creative Industries, Education, Innovation, Communications and Trade. However, downloaded clause 10.1 still says 30 tasks, and public cases/stages endpoints return empty lists for every track. Thus the new task count is user-reported; the public site does not yet resolve the discrepancy. Empty lists do not establish that there are no planned tasks. Work from actual released briefs, without insisting on the obsolete three-per-track count.

Team preference: humans choose favorite tracks and provide each selected track's published brief (expect one per track per latest update); compare only that set. Do not request every track or a prior favorite-task shortlist. Track switching remains user-reported; exact permission/procedure/deadline requires current official instructions. Finance being selected in an earlier UI is not a final project decision.

Confirm official competition start and repository closure through official instructions. Public configuration flags do not override regulation requirements such as check-in.

1.3 lists hackalem.ai, the edu.astanahub.com event page, the official Telegram chat/channel provided in the regulation, and email from team@baitc.org. 1.5 permits additional official instructions, forms, technical requirements and access rules; reconcile with the scoring restrictions above. Never invent unseen criteria or assume case freedom from 6.1 alone.

Still obtain: actual case and methodology; official start/closure timezone; submission materials and evaluated branch; hourly reporting mechanism if any; credentials/integration access; any more specific conditions on pre-event materials. Disclosure of reused materials alone is not proof that unlimited pre-event implementation is permitted.

## Selection and AI judging: section 8

- 8.3–8.5: AI judges may support preliminary evaluation, analysis, ranking and comparison. Experts still participate; the organizer defines how AI results count. No numeric AI/human weighting was found in these clauses. An enabled page flag is not proof of an AI-only process.
- 8.7–8.9: repository materials must support independent deployment/run/check; a current step-by-step README is expressly required. Failure of independent startup is a ground for non-admission only where published admission conditions establish it.
- 8.10: one technical ranking, with no task quotas. Ties are resolved by functionality, then implementation, then reproducibility; remaining qualifying ties go to a three-expert commission. Technical scores select finalists and are NOT added to Demo Day scores. The number of finalists and detailed selection procedure still need the organizer's announcement.

## Demo Day: separate 100 points (9.4)

| Criterion | Points | Evidence to prepare |
| --- | ---: | --- |
| Value | 25 | Clear real problem, beneficiary and visible usefulness. |
| Result and solution quality | 20 | Coherent working scenario and quality of the user result; not a repeat code audit. |
| Innovation | 15 | Defensible difference from obvious alternatives or a nonstandard approach. |
| Development and scaling potential | 20 | Plausible further use, additional users, organizations or scenarios. Distinguish plans from implemented features. |
| Presentation, demo and answers | 20 | Explain problem, solution and advantage; demonstrate result and answer questions. |

9.5: at least three non-conflicted judges; final score is the mean of their totals, using the unrounded value for ranking. 9.6: ties prioritize mean result/quality, then value, then presentation/demo/Q&A; unresolved ties go to a three-judge commission. These are separate from technical-selection tie-breaks.

## Main prizes and other relevant provisions

- 10.1–10.3: ten main prize places in one overall Demo Day ranking, not one winner per task. Multiple winners may solve the same task; being alone or best in a task grants no main-prize entitlement. Partner special prizes have separate terms. Detailed prize allocations require the prize-fund annex; do not treat the advertised combined prize/resources total as cash awards.
- 11.2–11.5: default author ownership has task-specific exceptions; inspect any special rights conditions before selecting a task. Disclose reuse and respect applicable licenses. The organizer/partners receive the stated nonexclusive rights for event-related display/publication uses.
- 14.3–14.6: no ordinary internal re-evaluation for disagreement with judging; confirmed arithmetic/transfer/display errors can be corrected. Do not plan to remedy weak submission evidence through a later appeal or revised product.
- 4.8: bring laptop, charger, accounts/software and a compatible LAN adapter. Attendance/check-in rules remain in force. The page description also says capacity is limited and entry is first come, first served; arrive with time for check-in.

Partners on the downloaded page include Freedom Holding, Kaspi.kz, Samruk-Kazyna, Kazakhtelecom, Halyk Bank, Firebird, Beeline and Freedom Telecom Operations as well as the previously discussed organizers/technology partners. The list is not an official partner-to-track mapping and must not be used to invent task authorship.
