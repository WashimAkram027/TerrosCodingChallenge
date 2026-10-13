# CLAUDE.md

How AI coding agents work in this repository. The project rules and facts come first. The general rules after them are copied from my global `~/.claude/CLAUDE.md` so they travel with the repository. Where the two conflict, the project rules win.

## Project rules

- Do not add new dependencies or outside services, including when adding features.
- When you find an existing bug or an unrelated problem, record it in `SUBMISSION.md` instead of fixing it right away.
- For every bug fix, show the test failing before the fix and passing after it.
- Do not change how the API behaves: keep it the way `docs/` describes it. If we change it on purpose, update `docs/` in the same commit.
- Never weaken, skip or delete a test to make it pass. If a test looks wrong, stop, explain why, and wait for my decision before changing it.

## Project facts

- This is a 75-minute timeboxed exercise (see `BRIEF.md`). Leave the last 10 minutes for `SUBMISSION.md` and the final commit.
- Stack: TypeScript. Express 5 API in `src/api`, backed by in-memory fixture data. React + Vite web app in `src/web`. Response types shared by both in `src/shared`.
- Commands: `npm test` (Vitest), `npm run typecheck`, `npm run build`, `npm run dev` (web app on http://localhost:5173, API on http://localhost:3001). There is no `lint` script, although the README lists one.
- Server request flow: route → `authenticate` builds the request context → service → repository.
- Task visibility is enforced in two places that must stay in step: `src/api/domain/taskQueries/scope.ts` (listing tasks) and `TaskService.canAccess` in `src/api/domain/taskService.ts` (completing a task).
- Product rules are in `docs/domain.md`. The HTTP API is in `docs/api.md`.

## General rules for agentic coding

How an AI coding agent works with me, in any codebase. Project facts (stack, commands, how to run things) belong in the project's own CLAUDE.md or my task instructions, which win where they conflict with these rules.

### 1. Understand before acting

- Read before you write. Explore the relevant code until you can state the current behaviour, where it lives, what "done" means, and what could go wrong.
- Never rely on memory for an API, library or tool you have not verified. Check the current docs.
- Ask one question when the ambiguity would change the work. Otherwise make a reasonable call and state the assumption.
- If the request looks wrong or underspecified, say so before building it.

### 2. Plan, then wait

- Plan before any change that alters behaviour or touches more than one file, and wait for my approval before editing. If you can describe the whole change in one sentence, skip the plan and make it.
- A plan covers what changes, file by file; how it will be verified (which test, and what it proves); risks and side effects; and open questions or assumptions.
- Keep plans short and concrete. Recommend one approach rather than surveying every option.
- Split large work into pieces that can ship independently.
- If the approved plan proves wrong mid-task, stop and re-plan. Do not improvise around it.

### 3. Build in the codebase's style

- Before designing anything new, find the closest existing implementation and follow it: same structure, same layers, same naming. Consistency beats a cleaner design that diverges.
- Do not move logic between layers or add new patterns, abstractions or dependencies without approval.
- Match the surrounding code: naming, comment density, idioms, error-handling style.
- Make the smallest change that fully solves the problem. No speculative features, no drive-by refactors.
- Stay in scope. Mention unrelated problems you notice; do not fix them in the same change.
- When logic is duplicated, change every copy together and list them in the plan. Search the whole repository, not just the obvious module.
- Leave no debris: unused imports, dead code or temporary debugging output.
- Do not change build config, lockfiles or toolchain versions as a side effect of other work.
- User-facing text uses plain words. Avoid jargon and symbols a user could mistake for a typo or a rendering bug.

### 4. Security baseline

- Treat all external input as untrusted and validate it at the boundary.
- Never show users internal details (raw exception messages, stack traces, config names). Log them and return a generic message.

### 5. Errors: diagnose, don't suppress

- Fix the cause. Never silence an error by catching broadly, lowering its log level or retrying blindly.
- Reproduce a bug with a failing test first. Run it and show the failure, then fix the code until it passes; the test stays behind as proof. Add diagnostic logging only when a test cannot capture the problem.
- Logs carry full context: the upstream error details and the stack trace.
- Users get a clear, actionable message (retry, go back), never infrastructure details. Developers get the specifics in the logs.
- Every retry or polling loop has a limit and a visible end state.

### 6. Verify before calling it done

- Run the tests and the build for everything you touched, and show the result.
- Never weaken, skip or delete a test to make it pass. If a test looks wrong, stop and explain why.
- A change to critical logic comes with a test that pins the new behaviour.
- If tests were already failing before your change, compare the set of failures against that baseline, not the count.
- Exercise UI changes in a browser; compiling is not enough.
- Report exactly what happened: what passed, what failed, what you skipped, which requirements are not met. Never claim a success you did not observe.
- If you are stuck after two or three attempts, stop and report what you tried, the exact error and your best hypothesis.

### 7. Review

- After each significant change, run one review pass (a code-review subagent) against the diff and the approved plan.
- Ask it to report only real bugs and missed requirements, not style or speculative concerns.
- Bring the findings to me; I decide which to fix. Do not repeat the review in a loop.

### 8. Git

- Commit and push only when I ask.
- Commit messages follow `type(scope): imperative summary`, under 72 characters, with a body explaining what changed and why.
- Stage specific files. Never sweep unrelated changes into a commit.
