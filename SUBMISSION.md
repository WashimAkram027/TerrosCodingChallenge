# Submission

Start time: 13:43 CDT, 13 October 2026
End time: _to be filled in when the clock stops_

## Opportunities, ranked

1. **Reps can complete their teammates' tasks.** The docs say reps see only their own tasks and anything else is "not found", but `POST /api/tasks/:taskId/complete` checks the task's team instead of its assignee (`src/api/domain/taskService.ts`). This is an access-control hole. **Fixed.**
2. **The Overdue view ignores the rep filter.** `GET /api/tasks/overdue?repId=...` returns the whole team, and asking for a rep outside your visibility returns `200` instead of `403`. Managers use this view before their weekly check-in, so the filter silently shows the wrong people. The cause is that the overdue query does not accept `repId` (`src/api/domain/taskQueries/definitions.ts`). **Fixed.**
3. **No HTTP-level tests.** The README says the API tests call the Express app with Supertest, but none exist. Sign-in checks, the error format, and the `400`, `401`, `403`, `404` and `409` responses have no tests, and neither do completing an already completed task, `/api/me` or `/api/team/reps`. Proposed next.
4. **Task visibility is written twice:** once for lists (`src/api/domain/taskQueries/scope.ts`) and once for completing a task (`TaskService.canAccess`). That duplication is how item 1 crept in. Logged, not fixed: merging them is a refactor beyond the bug fix.
5. **The README lists `npm run lint`, but there is no lint script or ESLint setup.** Logged, not fixed: fixing it means adding dependencies.
6. **A malformed JSON request body returns `500 internal_error`** and is logged as an unexpected error. It should be a `400`. Logged, not fixed: low impact, since the only `POST` endpoint takes no body, and `docs/api.md` would need updating.
7. **Completing a task blanks the whole list to "Loading tasks…"** while it reloads. Logged, not fixed: UX polish.
8. **The rep filter disappears without a message if loading the team's reps fails** (`src/web/App.tsx`). Logged, not fixed.
9. **The bearer scheme is case-sensitive:** `bearer demo-dana` gets `401`. Logged, not fixed: the sign-in is demo-only.
10. **An unknown `/api` route without a token returns `401`, not `404`,** because the sign-in check runs first. Logged, not fixed: defensible as it is.
11. **The demo account list shows only the first team for a manager who leads several.** Logged, not fixed: the demo data has one team per manager.
12. **`formatDate` in `src/web/format.ts` is never used.** Logged, not fixed: harmless dead code.

## What you changed

- **Reps can no longer complete their teammates' tasks** (`src/api/domain/taskService.ts`). For reps, the completion check now compares the task's assignee with the signed-in rep, the same rule that decides which tasks a rep can list. Acting on someone else's task now returns `404`, as `docs/api.md` describes.
- **The Overdue view's rep filter works** (`src/api/domain/taskQueries/definitions.ts`). The overdue query now accepts `repId`, so the filter narrows the list, and asking for a rep outside your visibility returns `403`, the same as `GET /api/tasks`.
- **Five tests in `src/api/domain/taskService.test.ts` pin both rules.** Four of them failed before the fixes. The fifth checks that reps can still complete their own tasks, so the fix cannot quietly over-restrict them.
- **Added `CLAUDE.md`** with the working rules for AI agents in this repository, plus this file.
- No API behaviour changed beyond restoring what the docs already say, so `docs/` is unchanged.

## What you decided not to do

- Left the `engine.test.ts` test "ignores filters the query does not accept" unchanged. Its name did not match the overdue query, which listed `status` as accepted, but its assertion is correct, and the fix for item 2 makes the name accurate.
- Items 4 to 12 above, for the reasons given there.

## Verification

- Baseline before any change: `npm test` passed 17 of 17 tests in 4 files.
- Each fix was test-first. The rep-completion test failed before its fix (Marcus's call completed Alicia's task) and passed after. The three overdue-filter tests failed before their fix (the whole team came back, and the calls succeeded instead of being refused) and passed after.
- After both fixes, `npm test` passed 22 of 22 and `npm run typecheck` was clean.
- I also called the API in process with Supertest:
  - Marcus completing Alicia's task gets `404`; his own task gets `200`; Dana completing a team task gets `200`.
  - Dana's overdue list filtered to Alicia returns only Alicia's task; filtered to Sam (another team) it gets `403`; unfiltered it is unchanged.
  - Marcus asking for Alicia's overdue tasks gets `403`.
- In the browser (`npm run dev`), signed in as Dana, the Overdue tab filtered to Alicia Chen shows only "Collect signed utility authorization".

## Working with AI

_To be filled in._
