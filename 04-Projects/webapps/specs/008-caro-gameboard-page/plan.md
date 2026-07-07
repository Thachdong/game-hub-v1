# Implementation Plan: Caro Match Gameboard Page

**Branch**: `008-caro-gameboard-page` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-caro-gameboard-page/spec.md`

## Summary

Replace the placeholder match-detail page (`apps/web/app/(public)/game-caro/[matchId]/page.tsx`,
currently "Coming soon" with a stub `MatchActionButtons`) with the real gameboard: a board on the
left sized to the match's configured board size, and a right column whose contents switch across
the match's four lifecycle states (waiting for opponent → pre-start countdown → in progress →
ended), per spec.md. Every read-only surface is guest-viewable in every state; the participant-only
actions (Start, Request Draw, Surrender, placing a move, kicking/muting a viewer) and the
sign-in-only actions (chat send, Report) are all visible to every visitor but redirect a
signed-out/ineligible click to `/login` or simply have no effect, reusing the existing
`RequireSignIn` molecule and the app's already-ratified guest-gating convention (spec 002's
FR-009, spec 007's FR-008/FR-009/FR-013/FR-015).

`packages/caro-service` already exposes every REST call this feature needs (`getMatch`,
`startMatch`, `submitMove`, `surrenderMatch`, `requestDraw`, `respondToDrawRequest`,
`listMatchChat`, `sendMatchChat`, `muteMatchViewer`) and `packages/profiles-service` already
exposes Report (`listReportTypes`, `submitReport`) — no new service package or function is added.
The genuinely new work is UI composition (~13 new components across atoms/molecules/organisms/
template) plus extending the existing SSE bridge (`apps/web/app/api/caro/realtime/route.ts`,
introduced by spec 007) to also join a per-match Socket.IO room and relay its events.

Planning surfaced four real discrepancies between the spec and the current `04-Projects/api`
backend, each resolved rather than by adjusting the spec around them:

1. **Start is creator-only.** `StartMatchUseCase` only allows the match's creator to start it
   (`NotMatchCreatorError` otherwise). spec.md was corrected (FR-004/FR-006/FR-014, US3, edge
   cases, assumptions) to reflect creator-only Start rather than "either participant."
2. **Pre-start countdown was 30s, not 15s.** `JoinMatchUseCase.START_WINDOW_SECONDS` was `30`;
   changed to `15` to match the spec, since the countdown must render from the server-provided
   `deadlineAt` (constitution Principle VI) and the spec's number is the intended product behavior.
3. **Guest read-access to match/chat wasn't actually wired up.** Despite spec 006's assumption that
   the backend guard for lobby/match-state/move-list had already been removed, `MatchController`
   and `ChatController` were still class-level `JwtAuthGuard`-gated (401 for anonymous requests).
   Both were split into per-route guards (`OptionalJwtGuard` on the three read routes,
   `ChatController.history()`; `JwtAuthGuard` re-applied per-route on every mutation), using the
   `OptionalJwtGuard` convention already established elsewhere in the API
   (`account-social/interface/http/games.controller.ts`). Without this, this feature's
   top-priority guest-spectating story (US1) would not work against a real backend.

4. **Mute/kick had no way to resolve a UUID.** `muteMatchViewer` requires a UUID `viewerId`, but
   `match:viewer_joined`/`match:viewer_left` only carried `viewerUsername`. Found while remediating
   `/speckit-analyze`'s coverage-gap finding G1 (tasks.md never wired the mute/kick action at all).
   `realtime.gateway.ts` now also emits `viewerId: client.userId` on both events.

See research.md §4–§6 for the full detail on these four, and §3 for two remaining backend
response-shape gaps (placeholder username/Elo, no REST-level viewer list) this plan designs around
defensively rather than fixing now, matching the precedent spec 007 already set for its own gaps.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS, React 19 — unchanged from the
rest of `apps/web`. The four backend fixes above are TypeScript/NestJS changes in the sibling
`04-Projects/api` app (same monorepo, separate deployable service).

**Primary Dependencies**: Next.js (App Router) `apps/web`; Tailwind CSS (existing, CSS custom
properties per constitution); `packages/caro-service` and `packages/profiles-service` (both
existing, unchanged); `socket.io-client` (already added to `apps/web` by spec 007, server-side use
only inside the realtime Route Handler — no new dependency needed here).

**Storage**: N/A — no persistence introduced; this feature only reads/writes through existing
backend endpoints.

**Testing**: Vitest + `@testing-library/react`, matching every existing `apps/web`
component/page's co-located `*.test.ts(x)` pattern.

**Target Platform**: Browser (Client Components: board, cards, viewer list, chat, countdown,
replay) + Node.js server runtime (the existing `api/caro/realtime` Route Handler, extended; no new
Route Handlers).

**Project Type**: web — existing `apps/web` app. No new app, no new package (Rule of Two — both
service packages this feature needs already exist and are already used elsewhere).

**Performance Goals**: Per spec.md's SC-003/SC-004/SC-006 — opponent-joined/move/chat propagation
within a few seconds via the realtime bridge (no polling); the 15s countdown auto-ends within 1s of
its `deadlineAt`, driven by the same server-timestamp-diffing approach already used for the
existing per-move `deadlineAt` countdown.

**Constraints**: Constitution Principles I–VII apply in full (see Constitution Check below).
Principle VI is binding for both the pre-start countdown and the realtime bridge extension: the
JWT is read from the httpOnly cookie only inside the server-side Route Handler and is never
exposed to or held by browser JS; the countdown always renders from `MatchState.deadlineAt`, never
a client-side timer started at render time.

**Scale/Scope**: One existing placeholder route rewritten, one existing Route Handler extended
(query param + wider forwarded-event set), one existing lib file (`proxy.ts`) gains one allowlist
entry, ~13 new components across atoms/molecules/organisms/template composed into one new
template, plus the four backend fixes in `04-Projects/api` described above. See Project Structure
below for the full file list.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Turborepo Monorepo Structure | **PASS** | No new app/package; `apps/web` adds no new dependency (reuses spec 007's `socket.io-client`). The four `04-Projects/api` fixes stay within that app's own build/test pipeline. |
| II. Next.js App Router with Route Groups | **PASS** | Gameboard lives in `(public)/game-caro/[matchId]/page.tsx` — already the correct guest-viewable group. Page/component files only compose UI and call `packages/caro-service`/`packages/profiles-service` functions or the extended SSE Route Handler; no business logic or direct `fetch` in route segment files. |
| III. Atomic Design Component Architecture | **PASS** | Reuses `atoms/Avatar`, `atoms/Button`, `atoms/Badge`, `atoms/ErrorMessage`, `molecules/RequireSignIn`, `molecules/Modal` before adding anything new. New atoms/molecules/organisms each depend only on layers below them; `MatchActionButtons.tsx` (the placeholder Chat/Report/Play buttons) is retired in favor of the real per-state action components. |
| IV. Webapp/API Boundary via Service Interfaces | **PASS** | Every REST call goes through existing `packages/caro-service`/`packages/profiles-service` functions, unchanged. The extended SSE Route Handler remains the sole service-interface boundary for realtime data. |
| V. Progressive Common Code Extraction (Rule of Two) | **PASS** | All new components are added locally to `apps/web`, the only app needing them today. No new shared package. |
| VI. Client-Side Auth & Realtime Contract | **PASS** | The pre-start countdown and per-move countdown both render from `MatchState.deadlineAt` only. Live match/chat/viewer updates are consumed through the existing SSE bridge, extended, not through a new client-held socket connection or polling. The access token is read from the httpOnly cookie only inside the server-side Route Handler. |
| VII. Text-Only Feature & Layout Specifications | **PASS** | This plan is derived entirely from spec.md's prose (left/right layout, per-state component lists); no design file is used as input. |

No Complexity Tracking entry is required — every row above is a PASS. The four backend fixes are
justified corrections to a different project's (`04-Projects/api`) already-stated intent (spec 006's
assumption, spec.md's explicit 15s requirement), made per explicit user decision during this
planning session, not undocumented scope creep — see this file's Summary and research.md §4–§6.

**Post-Phase 1 re-check**: Re-evaluated against data-model.md, contracts/, and quickstart.md — all
rows above still hold. The realtime bridge addendum (research.md §1,
contracts/realtime-bridge-addendum.md) was the one design decision requiring real scrutiny against
Principle VI, and it resolves the same way spec 007's original bridge did: server-side room
join/token handling, browser only ever holds a same-origin `EventSource`.

## Project Structure

### Documentation (this feature)

```text
specs/008-caro-gameboard-page/
├── plan.md                                   # This file (/speckit-plan command output)
├── research.md                               # Phase 0 output (/speckit-plan command)
├── data-model.md                             # Phase 1 output (/speckit-plan command)
├── quickstart.md                             # Phase 1 output (/speckit-plan command)
├── contracts/                                # Phase 1 output (/speckit-plan command)
│   ├── realtime-bridge-addendum.md
│   └── proxy-auth-policy-addendum.md
└── tasks.md                                  # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/web/
├── app/
│   ├── (public)/
│   │   └── game-caro/
│   │       └── [matchId]/
│   │           ├── page.tsx                  # MODIFIED: real gameboard (was "Coming soon")
│   │           └── page.test.tsx             # NEW
│   └── api/
│       └── caro/
│           └── realtime/
│               ├── route.ts                  # MODIFIED: +matchId param, join match room, forward match:*/chat events
│               └── route.test.ts             # MODIFIED
├── components/
│   ├── molecules/
│   │   ├── PlayerCard.tsx                    # NEW — own/opponent card (username, elo, turn/creator indicators)
│   │   ├── PlayerCard.test.tsx               # NEW
│   │   ├── WaitingForOpponentCard.tsx        # NEW — state-1 placeholder in place of the opponent card
│   │   ├── WaitingForOpponentCard.test.tsx   # NEW
│   │   ├── ViewerListItem.tsx                # NEW — one spectator row + optional mute/kick control
│   │   ├── ViewerListItem.test.tsx           # NEW
│   │   ├── ChatMessageItem.tsx               # NEW — one chat bubble
│   │   ├── ChatMessageItem.test.tsx          # NEW
│   │   ├── StartCountdown.tsx                # NEW — Start control + server-deadline-driven 15s countdown
│   │   ├── StartCountdown.test.tsx           # NEW
│   │   ├── InGameActions.tsx                 # NEW — Request Draw / Surrender / accept-decline-draw CTAs
│   │   ├── InGameActions.test.tsx            # NEW
│   │   ├── ReportPlayerForm.tsx              # NEW — report-type select + reason textarea, wraps RequireSignIn
│   │   ├── ReportPlayerForm.test.tsx         # NEW
│   │   ├── RequireSignIn.tsx                 # UNCHANGED — reused as-is
│   │   └── MatchActionButtons.tsx            # REMOVED — superseded by the components above
│   ├── organisms/
│   │   ├── GameBoard.tsx                     # NEW — grid sized to boardSize; live play + replay mode
│   │   ├── GameBoard.test.tsx                # NEW
│   │   ├── ViewerList.tsx                    # NEW — composes ViewerListItem rows
│   │   ├── ViewerList.test.tsx               # NEW
│   │   ├── ChatBox.tsx                       # NEW — message history + input, gated by RequireSignIn
│   │   ├── ChatBox.test.tsx                  # NEW
│   │   ├── MoveReplayControls.tsx            # NEW — "Review Moves" control + prev/next stepping
│   │   ├── MoveReplayControls.test.tsx       # NEW
│   │   ├── GameboardSidePanel.tsx            # NEW — composes cards + viewer list + state CTA area + chat
│   │   └── GameboardSidePanel.test.tsx       # NEW
│   └── templates/
│       ├── GameboardTemplate.tsx             # NEW — board left, GameboardSidePanel right
│       └── GameboardTemplate.test.tsx        # NEW
└── lib/
    ├── proxy.ts                              # MODIFIED: +1 OPTIONAL_AUTH_ROUTES entry (chat history GET)
    ├── proxy.test.ts                         # MODIFIED
    └── useCaroRealtimeEvent.ts               # UNCHANGED — shared EventSource hook, reused as-is

packages/caro-service/                        # UNCHANGED — getMatch, startMatch, submitMove,
                                               #   surrenderMatch, requestDraw, respondToDrawRequest,
                                               #   listMatchChat, sendMatchChat, muteMatchViewer
                                               #   already cover every REST call this feature needs.
packages/profiles-service/                    # UNCHANGED — listReportTypes, submitReport already
                                               #   cover the Report action.

04-Projects/api/src/caro-game/
├── application/use-cases/join-match.use-case.ts        # MODIFIED: START_WINDOW_SECONDS 30 → 15
├── interface/http/match.controller.ts                  # MODIFIED: per-route guard split (OptionalJwtGuard on reads)
└── interface/http/chat.controller.ts                    # MODIFIED: per-route guard split (OptionalJwtGuard on history)
04-Projects/api/src/realtime/
└── realtime.gateway.ts                                 # MODIFIED: match:viewer_joined/left now include viewerId
```

**Structure Decision**: Single existing web app (`apps/web`), no new package — the gameboard
replaces the existing placeholder in the already-correct `(public)/game-caro/[matchId]` route. New
UI is organized strictly by Atomic Design layer (Principle III); `GameboardSidePanel` is the one
organism responsible for switching between the four per-state layouts spec.md describes, keeping
that state-machine logic out of the page/template and out of individual leaf components. The
realtime bridge extension is isolated to the single existing Route Handler that already owns 100%
of the Principle VI-sensitive token/socket handling, so every new UI component stays free of any
auth/token concern. The four `04-Projects/api` fixes are the minimum-diff corrections needed for
this feature's spec to be achievable against the real backend, each scoped to exactly the
files/routes described in the Summary above — no other controller or use case in that app is
touched.

## Complexity Tracking

*No entries — no Constitution Check violations.*
