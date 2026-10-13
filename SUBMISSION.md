# Submission

Start time: 13:43 CDT, 13 October 2026
End time: 14:58 CDT, 13 October 2026

## Opportunities, ranked

1. **Reps can complete their teammates' tasks.** The docs say reps see only their own tasks and anything else is "not found", but `POST /api/tasks/:taskId/complete` checks the task's team instead of its assignee (`src/api/domain/taskService.ts`). This is an access-control hole. **Fixed.**
2. **The Overdue view ignores the rep filter.** `GET /api/tasks/overdue?repId=...` returns the whole team, and asking for a rep outside your visibility returns `200` instead of `403`. Managers use this view before their weekly check-in, so the filter silently shows the wrong people. The cause is that the overdue query does not accept `repId` (`src/api/domain/taskQueries/definitions.ts`). **Fixed.**
3. **No HTTP-level tests.** The README says the API tests call the Express app with Supertest, but none exist. Sign-in checks, the error format, and the `400`, `401`, `403`, `404` and `409` responses have no tests, and neither do completing an already completed task, `/api/me` or `/api/team/reps`. **Done:** `src/api/app.test.ts` adds 21 contract tests, so the README's claim is now true.
4. **Task visibility is written twice:** once for lists (`src/api/domain/taskQueries/scope.ts`) and once for completing a task (`TaskService.canAccess`). That duplication is how item 1 crept in. Logged, not fixed: merging them is a refactor beyond the bug fix.
5. **The README lists `npm run lint`, but there is no lint script or ESLint setup.** **Fixed in the docs:** I removed the row from the README, because adding ESLint would mean new dependencies.
6. **A malformed JSON request body returns `500 internal_error`** and is logged as an unexpected error. It should be a `400`. **Fixed:** it now returns `400 invalid_request`, and the error table in `docs/api.md` says so.
7. **Completing a task blanks the whole list to "Loading tasks…"** while it reloads. Logged, not fixed: `docs/domain.md` says each view shows a loading message while it fetches, so changing this is a product decision rather than a bug fix.
8. **The rep filter disappears without a message if loading the team's reps fails** (`src/web/App.tsx`). **Fixed:** managers now see "Could not load your reps." with a Try again button.
9. **The bearer scheme is case-sensitive:** `bearer demo-dana` gets `401`, although HTTP treats the scheme name as case-insensitive. **Fixed**, and `docs/api.md` notes it.
10. **An unknown `/api` route without a token returns `401`, not `404`,** because the sign-in check runs first. Logged, not fixed: defensible as it is.
11. **The demo account list shows only the first team for a manager who leads several.** Logged, not fixed: the demo data has one team per manager.
12. **`formatDate` in `src/web/format.ts` is never used.** Logged, not fixed: harmless dead code.
13. **Other request-body errors still return a logged `500`:** a body over 100 kB (the JSON parser reports `413`) and an unsupported charset such as `charset=latin1` (`415`). The review after the JSON fix found this. Logged, not fixed: it is outside the agreed scope, and `docs/api.md` would need new status codes.
14. **Managers had no quick view of who is falling behind** before their weekly check-in. By value this ranks just after items 1 and 2. **Built:** a Team summary (see below).

## What you changed

- **New feature: Team summary for managers**, built in a separate worktree and merged into `main`.
  - `GET /api/tasks/summary` returns open, overdue and due-soon counts (due within the next 24 hours), plus the reps with overdue work. It uses the same visibility rules as the task lists.
  - A Team summary tab shows those counts, with a "View overdue" link per rep that opens the Overdue tab filtered to that rep.
  - Managers now land on Team summary. Reps see no change.
  - `docs/api.md` and `docs/domain.md` are updated, and no dependencies were added.
- **Reps can no longer complete their teammates' tasks** (`src/api/domain/taskService.ts`). For reps, the completion check now compares the task's assignee with the signed-in rep, the same rule that decides which tasks a rep can list. Acting on someone else's task now returns `404`, as `docs/api.md` describes.
- **The Overdue view's rep filter works** (`src/api/domain/taskQueries/definitions.ts`). The overdue query now accepts `repId`, so the filter narrows the list, and asking for a rep outside your visibility returns `403`, the same as `GET /api/tasks`.
- **Five tests in `src/api/domain/taskService.test.ts` pin both rules.** Four of them failed before the fixes. The fifth checks that reps can still complete their own tasks, so the fix cannot quietly over-restrict them.
- **Added HTTP contract tests** (`src/api/app.test.ts`, 21 tests) using the Supertest package that was already installed. They pin sign-in, the error format, the filters, and the `400`, `401`, `403`, `404` and `409` responses described in `docs/api.md`.
- **A malformed JSON body now gets `400 invalid_request`** instead of `500` (`src/api/http/errors.ts`), and it is no longer logged as an unexpected error.
- **The `Bearer` scheme name is no longer case-sensitive** (`src/api/auth/authenticate.ts`), as HTTP specifies.
- **Managers see a message with a Try again button when the rep list fails to load** (`src/web/App.tsx`), instead of the rep filter silently disappearing.
- **Removed the `lint` script from the README's table**, because it does not exist.
- **Added `CLAUDE.md`** with the working rules for AI agents in this repository, plus this file.
- The visibility fixes restore what the docs already said. The JSON and `Bearer` changes are deliberate API changes, so `docs/api.md` is updated alongside them.

## What you decided not to do

- Left the `engine.test.ts` test "ignores filters the query does not accept" unchanged. Its name did not match the overdue query, which listed `status` as accepted, but its assertion is correct, and the fix for item 2 makes the name accurate.
- Items 4, 7, 10, 11, 12 and 13 above, for the reasons given there.

## Verification

- Baseline before any change: `npm test` passed 17 of 17 tests in 4 files.
- Each fix was test-first. The rep-completion test failed before its fix (Marcus's call completed Alicia's task) and passed after. The three overdue-filter tests failed before their fix (the whole team came back, and the calls succeeded instead of being refused) and passed after.
- After both fixes, `npm test` passed 22 of 22 and `npm run typecheck` was clean.
- I also called the API in process with Supertest:
  - Marcus completing Alicia's task gets `404`; his own task gets `200`; Dana completing a team task gets `200`.
  - Dana's overdue list filtered to Alicia returns only Alicia's task; filtered to Sam (another team) it gets `403`; unfiltered it is unchanged.
  - Marcus asking for Alicia's overdue tasks gets `403`.
- In the browser (`npm run dev`), signed in as Dana, the Overdue tab filtered to Alicia Chen shows only "Collect signed utility authorization".
- The 21 contract tests passed against the code before the smaller fixes, so they describe existing behaviour rather than new behaviour.
- The smaller fixes were test-first too. Before the fixes, the `Bearer` test got `401` instead of `200`, the JSON test got `500` instead of `400`, and the app test found no error message. All three passed after the fixes.
- After the smaller fixes, `npm test` passed 46 of 46 tests in 8 files.
- The review then found that the new `Bearer` check also accepted a tab after the scheme. I tightened it test-first: the new test got `200` before and `401` after. Final run: `npm test` passed 47 of 47 tests in 8 files, and `npm run build` (type-check plus production build) was clean.
- The rep-list message is covered by a component test (`src/web/App.test.tsx`). I chose to do the browser check for it myself instead of having the AI drive the browser, to save time.
- Team summary has unit, service, HTTP and component tests: the due-soon edges at exactly now and at 24 hours, the manager's and the rep's counts, the counts after completing a task, and the landing tab for each role.
  - To land managers on Team summary, one existing App test had to open Tasks first. I approved that change, and its checks are unchanged.
  - The feature session checked it in the browser: Dana lands on Team summary with 6 open, 3 overdue and 1 due soon.
- Final state of `main` (`d91fb8a`): `npm test` passed 62 of 62 tests in 9 files, and `npm run typecheck` was clean.

## Working with AI

- **How I directed it.** I used two Claude Code sessions: one for review and bug fixes on `main`, and one for the feature in a git worktree. Both followed a `CLAUDE.md` with my rules:
  - plan first, and wait for my approval;
  - for bug fixes, show the failing test before the fix;
  - no new dependencies;
  - keep the API as `docs/` describe it;
  - never weaken tests;
  - log unrelated problems instead of fixing them.

  After each significant change, a subagent reviewed the diff.
- **Verified carefully.** Before any fix, I had the AI map every rule in `docs/` to the code and tests, and reproduce the two visibility bugs against the running API.
- **Accepted.** The review found that my new `Bearer` check also accepted a tab after the scheme. I had it tightened, test-first.
- **Changed.** The feature plan advised against changing what managers see first, as too big for the timebox. I overrode that and had managers land on Team summary, in its own commit with the docs updated.
- **Rejected.** A "Due soon" label on every task row, because it would change the task object that `docs/api.md` documents.
- I stopped AI browser automation partway through to save time.

## Future: deploying to production

I did not do this in the exercise, because the project rules rule out new dependencies and outside services. This is the simplest route I would take.

**Flow:** browser → Vercel (web app) → Railway (API) → Supabase (database and sign-in)

1. **Supabase holds the data and handles sign-in.**
   - A Postgres database with users, teams and tasks, in the same shapes the API already uses, seeded with today's demo data.
   - Supabase Auth signs people in. Each account links to a user record that carries its role (manager or rep) and its team.
2. **Railway runs the API.**
   - The Express API runs as a Node service. It already reads its port from `PORT`, which Railway sets.
   - The Supabase project URL and key live in Railway's environment settings, never in the repository.
   - Two parts change. The in-memory fixture repositories are replaced by Supabase-backed ones behind the same repository interfaces. The sign-in check verifies Supabase access tokens instead of the demo tokens. Routes, services and the visibility rules stay as they are.
   - The demo accounts endpoint and the generated fixture data are removed.
   - The API currently starts through `tsx`, a development dependency, so Railway must either keep development dependencies installed or run a build step first.
3. **Vercel serves the web app.**
   - Vercel builds the React app with `npm run build` and serves the static files.
   - A Vercel rewrite forwards `/api/*` to the Railway API, so the web app keeps its current paths and needs no cross-origin setup.
   - Supabase sign-in replaces the demo account switcher. The web app sends the Supabase access token as the bearer token, the same way it sends the demo token today.
4. **Check it.** `/api/health` answers on Railway. Signing in as a manager and as a rep shows each person only the tasks they are allowed to see.
