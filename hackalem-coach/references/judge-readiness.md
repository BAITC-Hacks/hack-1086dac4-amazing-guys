# Readiness against technical selection and Demo Day

This is our engineering checklist, not additional organizer requirements. Read with the actual case/methodology and competition-rules.md. Do not promise scores from this checklist. Apply checks only to features present in the app.

The source extract contains the technical scale below and a separate Demo Day scale at the end of this file. Do not combine the two totals. AI-assisted technical review is allowed, with experts participating; its weighting is unspecified. Provide ordinary clear evidence, not evaluator-directed instructions or unsupported claims.

## Case/functionality: 20

Extract every mandatory admission condition separately from scored requirements. For each requirement identify input, expected output/action and a runnable acceptance case. Demonstrate the whole workflow on a second varied input, not only a rehearsed example. Test the required result, not just generation of plausible text. Do not let optional features compensate for a missing mandatory scenario.

## Technical implementation: 25

Verify UI requests reach the actual backend, model output invokes implemented tools, and claimed state changes are actually stored or returned by the authoritative service. UI fixtures and prerecorded responses are development aids, not key final implementation. Trace a representative run through request, tool arguments/result and final outcome with secrets redacted. Keep code boundaries and run commands understandable. Show why model choice/actions are needed; do not impose multiple agents, vector databases or extra providers without a task need.

## README/documentation: 20

Draft early, check accuracy against final code. A judge should find:
1. Case, user and implemented result; brief mapping to required functionality.
2. What works, known limitations and every simulated integration.
3. Compact component/data flow and model/tool roles.
4. Exact prerequisites, runtime versions, install/configure/start commands, URL/ports and required environment variables.
5. Included example data, reproducible setup/seed steps and a walkthrough with input and expected observable result.
6. Check/test commands and actual results where recorded.
7. External API/network requirements and how an authorized evaluator configures their key; never commit a real key or imply included access when it is not provided. If evaluator credential provisioning is unclear, flag early for organizer clarification.
8. Reuse disclosures and sources for code, libraries, models, templates, datasets and prior materials.
Link detailed existing docs instead of duplicating them. A teammate should follow these instructions without asking for hidden setup steps.

## Reproducibility/deployment readiness: 20

At foundation choose the simplest supported launch path. Docker is optional unless required by the case. For multiple services, a tested Dockerfile/Compose setup can reduce setup variation; use it if the team can run and verify it within the budget. For a simple app, pinned runtime/dependencies plus a reliable start script may suffice. Never claim a container is tested just because configuration files exist; if Docker is unavailable, disclose the untested path and test a supported alternative. Avoid Kubernetes, extra services or multiple install routes without need.

Ship dependency lockfiles or equivalent reproducible specifications, .env.example with safe placeholders, necessary migrations/seed data and documented model/configuration. Ensure paths are portable, assets are present, frontend backend URL is configurable or same-origin, and browser calls work in the real demo environment. Container builds must not embed keys; supply secrets at runtime. Document network, external account and hardware prerequisites.

Use a fresh clone of the intended submission commit in a separate directory or the teammate's machine. Install using only documented steps and permitted credentials; initialize a fresh database; open UI and complete the live main scenario. Check one restart/persistence expectation if relevant. Missing data, undeclared dependency or undocumented setup is a release defect. A new folder is a fresh-clone test, not proof of a fully isolated OS; report the environment accurately. Do not delete user data or reuse a hidden developer cache/database to hide setup gaps. After material fixes, repeat affected checks on the final version and confirm files exist remotely before closure.

A deployed link is useful only after repository startup works. Check that deployed behavior corresponds to the submitted commit; public availability does not replace reproducibility.

## Baseline reliability/security: 15

The supplied rubric states correct-input stability and handling obvious invalid requests. The following are proportional engineering safeguards, not newly invented official scoring subcriteria:
- Validate mandatory fields, formats, lengths and tool arguments in server code; reject unsupported operations clearly. LLM instructions are not authorization checks.
- Keep provider keys server-side and out of source, browser bundles and logs. Check staged changes and relevant history; if exposure occurs, inform the user and arrange authorized revocation/rotation, not merely deletion of a current file.
- If multiple users/private records or an admin screen exist, enforce access on the backend; an arbitrary record ID or hidden UI button must not grant access. If the demo intentionally uses a single synthetic identity, state that limitation rather than claiming production authentication.
- Handle timeouts, missing configuration, malformed requests and unavailable providers without exposing raw secrets or claiming success. Preserve drafts where appropriate, bound input size, steps and retries, and prevent duplicate mutations.
- Treat uploaded/retrieved text as data, not instructions; enforce allowed tools and parameters in code. For apps reading external documents, test a simple instruction-in-document case for unauthorized action/data access.
- When uploads or model-generated markup exist, constrain uploads and render text safely; do not execute uploaded content or arbitrary generated commands. Avoid adding upload/security subsystems if no such feature exists.

Run a small meaningful set: valid completion, empty/invalid input, provider/tool failure, duplicate submission where relevant, and unauthorized record access where relevant. Record actual outcomes. Do not turn a five-hour project into a generic penetration test or claim full security certification.

## Two-person ownership and finish

Coordinator: rubric mapping, agent/tools, server safeguards, cost and combined acceptance. Teammate: UI states, then independent README-driven startup and usability checks. Both provide real hourly evidence; coordinator maintains global state and final submission commit. Reserve time for README and reproduction before cosmetic improvements. At first integration, report gaps in all five criteria in plain Russian. At the finish, report fulfilled/unverified/failed with evidence, not a fabricated total score.

## Demo Day preparation: separate 25/20/15/20/20

Consider these when choosing among technically feasible solutions; prepare the demonstration using the same frozen submission. Keep notes in existing SPEC/README or actual required presentation, not an additional compulsory document.

- Value (25): name the user and concrete problem; show how the outcome helps. If claiming time or cost savings, provide an actual comparable baseline and measured run, otherwise label the benefit qualitative or estimated.
- Result/quality (20): demonstrate one complete useful workflow from input to observable result. Be able to explain limitations and show a relevant variation/recovery. Do not substitute a prerecorded answer for the claimed implementation.
- Innovation (15): identify the closest obvious alternative (including asking a general chatbot, when relevant) and explain the actual difference: action, integration, validation, workflow or another demonstrated advantage. Do not assert no competitors without evidence.
- Development/scaling (20): describe a plausible next user group or organization, what can be reused, and what would need work. Cost per run or dependency constraints help where relevant; do not build hypothetical scale infrastructure or claim clients you lack.
- Presentation/demo/Q&A (20): rehearse a concise problem → workflow → result → advantage explanation within the organizer's actual presentation limit. Both teammates can explain their contribution, live versus simulated parts, limitations and next steps. Distinguish future plans from the frozen product.

Technical admission and missing mandatory behavior remain first priority during the five-hour build. No quotas by task means selecting an unpopular track is not a substitute for a stronger verified solution. Do not assume the number of finalist slots or an undocumented AI-judge weighting.
