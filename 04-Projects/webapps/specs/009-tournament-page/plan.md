# Implementation Plan: Tournament Page

**Branch**: `009-tournament-page` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-tournament-page/spec.md`

## Summary

Fill in the existing placeholder route `apps/web/app/(public)/game-caro/tournament/[tournamentId]/page.tsx`
("Full detail view coming soon") with the real tournament page: a countdown (to start, then to end),
a paginated score-descending standings list, a per-participant Pause control, and live
auto-matchmaking that navigates a present, unpaused participant straight into a new match's
gameboard, which auto-starts 5 seconds after opening (no manual Start click) and offers a "Back to
Tournament" action once it ends.

Research (see research.md) found that `04-Projects/api` already has a substantial tournament
vertical — entities, use-cases, a matchmaking service, a 10s scheduler, and a scoring engine — built
ahead of this spec. This materially changes the plan from "build tournament backend" to "extend an
existing one," and surfaced one real conflict plus four real gaps, each resolved during planning
rather than deferred:

1. **Scoring formula conflict.** Spec 009's FR-014 (drafted during `/speckit-clarify` before this
   plan) said "win=2/draw=1/loss=0, doubled from the 3rd consecutive win, any non-win resets the
   streak." The actual `tournament-score-calculator.ts` doubles from the **4th** consecutive win and
   gives draws a 2-point "streak-break bonus" when the prior streak was ≥3. Asked the user directly;
   they chose to **keep the existing engine's behavior** ("giữ cách tính hiện tại, tôi sẽ check và
   update api sau, nếu cần") rather than change it now. spec.md's FR-014, its Clarifications entry,
   Tournament Standing entity, and Assumptions were updated to describe the actual formula. No
   backend scoring code changes in this plan.
2. **No presence/pause concept exists.** `TournamentRegistrationStatus` is only `'idle' | 'in_match'`
   — no `paused` state, and nothing tracks whether a participant currently has the tournament page
   open. FR-004/005/005a/006/006a require a new `is_paused` column (migration), a new pause
   endpoint, and presence tracking in the realtime gateway.
3. **No 5-second pre-start phase.** `MatchTypeormRepository.createTournamentMatch` sets
   `status: 'in_progress'` immediately with a 30s per-move deadline ("auto-started, no lobby" per
   its own comment) — there's no waiting phase at all. FR-007/FR-008 need a new `auto_starting`
   match status with a 5s server deadline before the match becomes playable.
4. **Tournament-end cutoff not enforced.** `RecordTournamentMatchResultUseCase` awards
   tournament score/streak unconditionally on `match.completed`, never checking whether the
   tournament has already ended (FR-013). Small, isolated fix — Elo update itself is already
   unconditional and separate, matching the spec's assumption.
5. **`tournamentId` isn't exposed to the web client.** `Match` (domain) already carries
   `tournamentId: string | null`, but `MatchStateDto`/`packages/caro-service`'s `MatchState` don't
   surface it. Needed so the gameboard can conditionally render the tournament auto-start countdown
   (vs. spec 008's manual `StartCountdown`) and the "Back to Tournament" action.

See research.md for the full decision/rationale/alternatives on each of these plus standings
pagination, the realtime bridge extension, and the presence-triggered re-pairing mechanism.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS, React 19 (`apps/web`, unchanged)
— same as spec 008. Backend changes are TypeScript/NestJS in the sibling `04-Projects/api` app (same
monorepo, separate deployable service), extending its existing `caro-game` tournament vertical.

**Primary Dependencies**: Next.js (App Router) `apps/web`; Tailwind CSS with the constitution's fixed
CSS-custom-property palette; `packages/caro-service` (extended: standings pagination, pause,
`tournamentId`/`auto_starting` on `MatchState`); `socket.io-client` (already present, server-side use
only inside the realtime Route Handler). Backend: NestJS, TypeORM (Postgres, `caro_game` schema),
`@nestjs/schedule` (existing `TournamentSchedulerService`), `@nestjs/event-emitter` (existing handler
pattern, reused for the new presence-triggered re-pair path). No new dependency added anywhere.

**Storage**: PostgreSQL via TypeORM. One new migration adds `is_paused boolean NOT NULL DEFAULT
false` to `caro_game.tournament_registrations`. No other schema change (presence itself is
in-memory/socket-connection state, matching the existing match-viewer-tracking pattern — not
persisted).

**Testing**: `apps/web` continues the existing Vitest + `@testing-library/react`,
co-located `*.test.tsx` convention (confirmed still current in 008's `GameboardSidePanel.test.tsx`,
`StartCountdown.test.tsx`). `04-Projects/api` has no existing test suite at all (zero `*.spec.ts`
files in the repo) and the constitution's `Testing` section is an open `TODO(TESTING_PRINCIPLE)` —
consistent with current project practice, this plan does not introduce backend tests either.

**Target Platform**: Browser (Client Components: countdown, standings table, pause control,
tournament auto-start countdown, Back action) + Node.js server runtime (extended
`apps/web/app/api/caro/realtime/route.ts`) + NestJS backend (extended tournament vertical +
realtime gateway).

**Project Type**: web — existing `apps/web` app and existing `04-Projects/api` service. No new app,
no new package (Rule of Two — everything needed already exists and is already used elsewhere).

**Performance Goals**: Per spec.md's SC-001–SC-005 — standings/countdown visible within 2s of page
load; pairing → gameboard navigation and the 5s auto-start both driven by realtime push + a
server-authoritative `deadlineAt`, not polling; the 5s auto-start transition itself is scheduled
in-process (`setTimeout` at match-creation time) for sub-second precision, with the existing 10s
tournament-scheduler cron as a restart-safety sweep (research.md §4).

**Constraints**: Constitution Principles I–VII apply in full (see Constitution Check). Principle VI
is binding throughout: the tournament's start/end countdown and the gameboard's 5s auto-start
countdown both render from server `deadlineAt` values only; matchmaking eligibility and standings
updates are consumed via the existing WebSocket/SSE bridge (extended, not polled); the JWT never
leaves the server-side Route Handler.

**Scale/Scope**: One existing placeholder route filled in; ~8 new web components (countdown,
standings table + row, pause control, tournament auto-start countdown, "Back to Tournament" action,
pagination control) plus one new container/template; one realtime Route Handler extended
(`tournamentId` param + `TOURNAMENT_EVENTS` + always-on `match:started` listening); one backend
migration; ~6 backend use-case/repository/gateway changes; one Match DTO field addition. See Project
Structure below for the full file list.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new app/package. `apps/web` adds no new dependency. The backend changes stay within `04-Projects/api`'s own build/test pipeline, extending its existing `caro-game` module. |
| II. Next.js App Router with Route Groups | **PASS** | Tournament page lives in `(public)/game-caro/tournament/[tournamentId]/page.tsx` — already the correct guest-viewable group (matches the gameboard's `(public)/game-caro/[matchId]`). Page/component files only compose UI and call `packages/caro-service` functions or the extended SSE Route Handler; no business logic or direct `fetch` in route segment files. |
| III. Atomic Design Component Architecture | **PASS** | Reuses `atoms/Button`, `molecules/RequireSignIn`, `molecules/EmptyState`, and the gameboard's existing `PlayerCard`/countdown-rendering pattern (`StartCountdown`) as a template before adding new leaf components. New atoms/molecules/organisms each depend only on layers below them. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | Every REST call goes through `packages/caro-service` (extended, typed). The extended SSE Route Handler remains the sole realtime service-interface boundary. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | New components (standings table, pagination control, pause control) are added locally to `apps/web`, the only app needing them today. No new shared package. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | Tournament start/end countdown and the gameboard's 5s auto-start countdown both render from server `deadlineAt` only. Matchmaking pairing, standings updates, and pause state are all consumed through the existing SSE bridge, extended — no polling introduced anywhere. Access token handling is unchanged (server-side Route Handler only). |
| VII. Text-Only Feature & Layout Specifications | **PASS** | This plan is derived entirely from spec.md's prose; no design file is used as input. |

No Complexity Tracking entry is required — every row above is a PASS. The scoring-formula
discrepancy is not a constitution violation; it's a spec/implementation conflict resolved per
explicit user decision during this planning session (see Summary item 1 and research.md §1).

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
rows above still hold. The presence-tracking and pause additions to the realtime gateway (research.md
§2–§3) were the design decisions requiring real scrutiny against Principle VI, and both resolve the
same way the existing viewer-tracking/SSE bridge already does: in-memory server-side state, browser
only ever holds a same-origin `EventSource`, no client-side polling loop introduced.

## Project Structure

### Documentation (this feature)

```text
specs/009-tournament-page/
├── plan.md                                        # This file (/speckit-plan command output)
├── research.md                                     # Phase 0 output (/speckit-plan command)
├── data-model.md                                   # Phase 1 output (/speckit-plan command)
├── quickstart.md                                   # Phase 1 output (/speckit-plan command)
├── contracts/                                      # Phase 1 output (/speckit-plan command)
│   ├── tournament-endpoints-addendum.md
│   ├── realtime-tournament-addendum.md
│   └── match-tournament-fields-addendum.md
└── tasks.md                                        # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── (public)/
│   │   └── game-caro/
│   │       ├── tournament/
│   │       │   └── [tournamentId]/
│   │       │       ├── page.tsx                    # MODIFIED: real tournament page (was "Full detail view coming soon")
│   │       │       └── page.test.tsx               # NEW
│   │       └── [matchId]/
│   │           └── page.tsx                        # UNCHANGED — GameboardContainer already reads MatchState
│   └── api/
│       └── caro/
│           └── realtime/
│               ├── route.ts                        # MODIFIED: +tournamentId param, join tournament:{id} room,
│               │                                    #   forward TOURNAMENT_EVENTS, always listen for match:started
│               └── route.test.ts                    # MODIFIED
├── lib/
│   └── useCaroRealtime.ts                           # MODIFIED: acquireSharedSource(matchId?, tournamentId?)
├── components/
│   ├── molecules/
│   │   ├── TournamentCountdown.tsx                  # NEW — starts-in / ends-in countdown, deadlineAt-driven
│   │   ├── TournamentCountdown.test.tsx             # NEW
│   │   ├── TournamentStandingRow.tsx                # NEW — rank, username, score, streak, pause badge
│   │   ├── TournamentStandingRow.test.tsx           # NEW
│   │   ├── TournamentPauseControl.tsx               # NEW — Pause/Resume toggle, wraps RequireSignIn
│   │   ├── TournamentPauseControl.test.tsx          # NEW
│   │   ├── Pagination.tsx                           # NEW — page number control (standings list)
│   │   ├── Pagination.test.tsx                      # NEW
│   │   ├── TournamentAutoStartCountdown.tsx          # NEW — read-only "Game starts in Ns", no Start button
│   │   ├── TournamentAutoStartCountdown.test.tsx    # NEW
│   │   ├── BackToTournamentButton.tsx                # NEW — end-of-game action, only rendered when match.tournamentId is set
│   │   ├── BackToTournamentButton.test.tsx           # NEW
│   │   └── StartCountdown.tsx                        # UNCHANGED — reused as the non-tournament pattern reference
│   ├── organisms/
│   │   ├── TournamentStandingsList.tsx               # NEW — composes TournamentStandingRow rows + Pagination
│   │   ├── TournamentStandingsList.test.tsx          # NEW
│   │   ├── TournamentContainer.tsx                   # NEW — owns live tournament/standings state, subscribes to
│   │   │                                             #   tournament realtime events, navigates on tournament:match-created
│   │   ├── TournamentContainer.test.tsx              # NEW
│   │   ├── GameboardSidePanel.tsx                    # MODIFIED: state 2 branches on match.tournamentId to render
│   │   │                                             #   TournamentAutoStartCountdown instead of StartCountdown;
│   │   │                                             #   state 4 renders BackToTournamentButton when tournamentId is set
│   │   └── GameboardSidePanel.test.tsx               # MODIFIED
│   └── templates/
│       └── TournamentTemplate.tsx                    # NEW — countdown + pause header, standings list below
└── (TournamentTemplate.test.tsx)                      # NEW

packages/caro-service/src/
├── types.ts                                          # MODIFIED: +TournamentDetails, +TournamentStanding,
│                                                      #   +StandingsPage; MatchState +tournamentId
├── tournaments.ts                                     # MODIFIED: getTournament/listTournamentParticipants
│                                                      #   typed (were `unknown`); listTournamentParticipants
│                                                      #   takes {page, pageSize}; +setTournamentPause
└── tournaments.test.ts                                # MODIFIED

04-Projects/api/src/
├── database/migrations/
│   └── 175XXXXXXXXXX-CaroTournamentPause.ts          # NEW — ALTER TABLE tournament_registrations ADD is_paused
└── caro-game/
    ├── domain/
    │   ├── entities/
    │   │   ├── tournament-registration.ts            # MODIFIED: +isPaused: boolean
    │   │   └── match.ts                               # UNCHANGED — tournamentId already present
    │   └── ports/
    │       └── tournament-registration.repository.port.ts  # MODIFIED: +setPaused, claimTwoIdlePlayers takes
    │                                                        #   presentPlayerIds; findAllByTournament takes
    │                                                        #   {page, pageSize}
    ├── application/
    │   ├── commands/
    │   │   ├── set-tournament-pause.use-case.ts       # NEW
    │   │   └── record-tournament-match-result.use-case.ts  # MODIFIED: skip scoring if tournament already ended
    │   └── queries/
    │       └── get-tournament-participant-list.use-case.ts # MODIFIED: +page/pageSize, +total
    ├── infrastructure/
    │   ├── matchmaking/
    │   │   └── tournament-matchmaking.service.ts      # MODIFIED: pairNextTwo(tournamentId, presentPlayerIds)
    │   ├── persistence/
    │   │   ├── tournament-registration.typeorm-repository.ts  # MODIFIED: setPaused, presence-filtered claim, paged findAll
    │   │   └── match.typeorm-repository.ts             # MODIFIED: createTournamentMatch sets status 'auto_starting',
    │   │                                                #   deadlineAt = now+5s (was 'in_progress' immediately)
    │   ├── events/
    │   │   └── tournament-presence-joined.handler.ts   # NEW — @OnEvent('caro.tournament.presence-joined') → pair-idle-players
    │   └── scheduling/
    │       ├── tournament-scheduler.service.ts         # MODIFIED: +sweep for overdue 'auto_starting' matches (safety net)
    │       └── tournament-match-auto-start.service.ts   # NEW — setTimeout-based 5s transition + match:started push
    ├── interface/
    │   ├── http/
    │   │   ├── tournament.controller.ts                # MODIFIED: participants endpoint +page/pageSize query;
    │   │   │                                            #   +PATCH .../registrations/pause
    │   │   └── match.controller.ts                     # MODIFIED: MatchStateDto +tournamentId
    │   └── dto/
    │       └── tournament-registration.dto.ts          # MODIFIED: +SetTournamentPauseDto, +isPaused on response
    └── realtime/
        └── realtime.gateway.ts                         # MODIFIED: track tournament-room presence by playerId,
                                                           #   emit 'caro.tournament.presence-joined' on join,
                                                           #   clear presence + no-op on leave
```

**Structure Decision**: Single existing web app (`apps/web`) and single existing backend service
(`04-Projects/api`), no new package. The web side follows spec 008's precedent exactly:
`TournamentContainer` (organism) owns realtime-subscribed state and composes the pure
`TournamentTemplate`, the same split `GameboardContainer`/`GameboardTemplate` already established,
keeping the page/route segment file (Principle II) a thin server component. The backend side extends
the existing `caro-game` tournament vertical in place — no new bounded context, no new module —
since presence, pause, and the 5s auto-start are all refinements of matchmaking/match-creation logic
that already lives there. The realtime gateway gains one new room-presence concept (tournament rooms,
tracked by `playerId`) parallel to its existing one (match rooms, tracked by `viewerUsername`),
rather than a generalized abstraction over both — consistent with Principle V (no premature
abstraction; unify only if a third room-type needs the same shape).

## Complexity Tracking

*No entries — no Constitution Check violations.*
