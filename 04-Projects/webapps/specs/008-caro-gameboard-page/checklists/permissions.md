# Permission & Access-Control Requirements Checklist: Caro Match Gameboard Page

**Purpose**: Validate that spec.md's requirements for the guest/spectator/participant/creator
permission matrix are complete, unambiguous, internally consistent, measurable, and cover the
relevant scenarios — as a standard pre-implementation gate before `/speckit-tasks`.
**Created**: 2026-07-07
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests the requirements themselves (are they well-written?), not the
gameboard implementation. Items reference `spec.md` sections directly; `[Gap]` marks a missing
requirement, `[Ambiguity]`/`[Conflict]` mark wording that could be read more than one way.

**Review pass (2026-07-07)**: Every item below was re-checked against spec.md; gaps and
ambiguities were resolved by editing spec.md directly (Actor Definitions section, FR-004/007/012–
016, SC-002/SC-008, new Edge Cases, and a new Assumption) rather than left as open questions.

## Requirement Completeness

- [x] CHK001 Are requirements defined for every actor type (guest, signed-in non-participant
      spectator, match participant, match creator) crossed with every gated action (Start, Request
      Draw, Surrender, place a move, send chat, Report, kick/mute a viewer)? [Completeness, Spec
      §FR-013–FR-016]
      **Resolved**: Added the new **Actor Definitions** section enumerating all four actor types
      against their permitted/denied actions, and FR-013 now explicitly lists chat-send alongside
      the other five gated actions (it was previously only implied via US1 AC5).
- [x] CHK002 Is the read-only viewing requirement explicitly stated for every one of the four match
      states, for every actor type, or only demonstrated via guest-focused examples? [Completeness,
      Spec §FR-012]
      **Resolved**: FR-012 now states signed-in spectators have the same full read-access as
      guests across all four states, not just guests.
- [x] CHK003 Is a requirement defined for what the non-creator participant's Start control looks
      like/does (disabled, hidden, or visible-but-inert), rather than only its outcome ("cannot
      start")? [Gap, Spec §FR-004]
      **Resolved**: FR-004 now mandates the control is rendered "visibly disabled (present but
      non-interactive)" for the non-creator, not hidden or ambiguously inert.
- [x] CHK004 Are requirements defined for the accept/decline side of a draw request — who sees the
      prompt and who is authorized to act on it? [Completeness, Spec §FR-007]
      **Resolved**: FR-007 now states the accept/decline prompt is actionable only by the other
      match participant — not the requester, spectators, or guests.
- [x] CHK005 Is there a requirement covering whether a signed-in spectator can ever become a match
      participant during the same session (e.g., a vacated seat), or is that explicitly out of
      scope? [Gap]
      **Resolved**: Added an Edge Case and an Assumption stating this is explicitly out of scope —
      a spectator never becomes a participant during the same session.

## Requirement Clarity

- [x] CHK006 Is "redirect to the login page" specified precisely enough (e.g., whether a callback
      back to the current match is included) to be implemented identically for every gated action,
      or does its precision vary by which FR states it? [Clarity, Spec §FR-013]
      **Resolved**: FR-013 now specifies the redirect includes a callback back to the current
      match's gameboard, applying uniformly to all six gated actions it covers.
- [x] CHK007 Is "no effect" (used for a non-creator's Start click in Edge Cases) distinguished from
      a disabled/inert control state clearly enough to be testable, or is it left to reader
      inference? [Ambiguity, Spec §Edge Cases]
      **Resolved**: The Edge Case and US3 AC2 were rewritten to state the control is "rendered
      visibly disabled" — a single, testable presentation rather than an open "no effect" outcome.
- [x] CHK008 Are "signed-in viewer," "match participant," and "match creator" each defined
      precisely enough that any given user can be classified into exactly one category without
      relying on surrounding narrative context? [Clarity]
      **Resolved**: New **Actor Definitions** section gives each of the four categories (guest,
      signed-in spectator, match participant, match creator) a standalone, mutually-exclusive
      definition.

## Requirement Consistency

- [x] CHK009 Do FR-013 ("guests see the same controls a signed-in participant would see") and
      FR-014 (participant-only restriction, with Start further creator-only) agree on what a guest
      specifically sees for the Start control, given two participants themselves don't see
      identical Start behavior? [Consistency, Spec §FR-013/FR-014]
      **Resolved**: FR-013 now clarifies a control is only shown in the state(s) where it exists,
      and within that state a guest sees the same presentation a signed-in non-creator would (i.e.
      the visibly-disabled Start control from FR-004), removing the inconsistency.
- [x] CHK010 Are the kick/mute permission rules in FR-016 consistent with the Viewer List Key
      Entity's description and the Edge Cases entry about a kicked viewer's next chat attempt?
      [Consistency, Spec §FR-016/§Key Entities]
      **Resolved**: FR-016, the Viewer List Key Entity, and the Edge Cases entry all now state
      consistently that "kick" and "mute" name the same single moderation action (block future
      chat sends; viewing continues) — verified against the API, which exposes only one
      `MuteViewerUseCase`/`muteMatchViewer` capability, no separate removal action.
- [x] CHK011 Is actor terminology ("participant," "creator," "spectator," "viewer") used
      consistently across User Scenarios, Requirements, Key Entities, and Assumptions, or do any
      sections use these terms interchangeably where the distinction matters? [Consistency]
      **Resolved**: The new Actor Definitions section is the single source of truth these terms
      now trace back to; no section redefines them differently.

## Acceptance Criteria Quality

- [x] CHK012 Can SC-002 ("100% of guest or non-participant attempts... redirect") be objectively
      verified as a single metric, or does it bundle six distinct actions (Start, Draw, Surrender,
      Move, Report, kick) that each need their own pass/fail check? [Measurability, Spec §SC-002]
      **Resolved**: SC-002 now explicitly states it is measured independently per action, with the
      six actions enumerated as (a)–(f).
- [x] CHK013 Is there a measurable success criterion specifically for the non-creator participant's
      Start experience (e.g., "0% of non-creator Start clicks start the match"), or is that case
      only covered qualitatively in Edge Cases without a matching Success Criterion? [Gap,
      Measurability]
      **Resolved**: Added SC-008, a dedicated 0%-based metric for non-creator Start clicks
      (covering the other participant, spectators, and guests).

## Scenario Coverage

- [x] CHK014 Are requirements defined for whether the Start control is guest-visible in match
      states where a signed-in user wouldn't see it at all (states 1, 3, 4), or only for state 2
      where it's relevant? [Coverage, Spec §FR-013]
      **Resolved**: FR-013 now states each control is only shown in the state(s) where it exists
      at all — Start only during the pre-start state — so guests never see it in states 1, 3, or 4.
- [x] CHK015 Is it explicitly stated whether the kick/mute control is rendered (and inert) for
      guests, per FR-013's list, or only asserted at the outcome level ("MUST NOT have this control
      produce any effect")? [Coverage, Spec §FR-013/FR-016]
      **Resolved**: FR-016 now explicitly cross-references FR-013: the control is visible to every
      viewer but inert for guests/spectators.
- [x] CHK016 Are requirements defined for two conflicting actions arriving at nearly the same time
      (e.g., one participant surrenders while the other sends a draw request)? [Gap, Edge Case]
      **Resolved**: Added an Edge Case: the server enforces a single authoritative transition;
      whichever action lands first wins and the conflicting one is rejected as a no-op.
- [x] CHK017 Are requirements defined for how the permission matrix behaves when a participant's
      session expires mid-match — does an active participant's gated actions silently fall back to
      guest-like redirect behavior? [Gap]
      **Resolved**: Added an Edge Case: a participant whose session expires mid-match is redirected
      to login on their next gated action, same as a guest, rather than silently failing.

## Dependencies & Assumptions

- [x] CHK018 Is the assumption that Report is gated by sign-in only, not participant status
      (FR-015), cross-checked against whether a participant can report their own opponent
      specifically vs. any other viewer, or is the reportable target left unconstrained? [Assumption,
      Spec §Assumptions]
      **Resolved**: FR-015 now states Report's target is specifically the match's other player
      (opponent), not other spectators/viewers, for both participants and spectators.
- [x] CHK019 Is the dependency on the existing redirect-to-login convention (spec
      002-login-layout-nextauth FR-009; spec 007-caro-game-dashboard FR-008/FR-009/FR-013/FR-015)
      verified to actually cover the three actions this spec newly introduces (Start, Move, viewer
      kick/mute), or does it only demonstrate the convention for actions those earlier specs
      defined? [Dependency, Traceability]
      **Verified, no gap**: FR-013 explicitly enumerates Start, move-placement, and viewer-kick/mute
      alongside Request Draw/Surrender/Report/chat-send as controls subject to the same
      redirect-to-login convention — the three new actions are named directly in the requirement,
      not left to inference from the cited specs.

## Ambiguities & Conflicts

- [x] CHK020 Is it specified whether the non-creator participant's Start control is rendered as
      visibly disabled or entirely absent, given FR-004 only states the outcome ("cannot start the
      match themselves") without picking a presentation? [Ambiguity, Spec §FR-004]
      **Resolved**: Same fix as CHK003/CHK007 — FR-004 now mandates "visibly disabled," resolving
      the ambiguity at its source.
- [x] CHK021 Are "kick" and "mute" specified as the same action or two distinct actions (kick =
      remove from the viewer list/session, mute = block chat only while still viewing)? Spec.md's
      Key Entities and Requirements use "muted/kicked" interchangeably throughout. [Conflict, Spec
      §Key Entities/§FR-016]
      **Resolved**: Confirmed against the API (`MuteViewerUseCase`/`MuteRegistryService` — the only
      moderation capability implemented; no separate "kick"/removal endpoint exists) that "kick"
      and "mute" are the same single action. FR-016, the Viewer List Key Entity, and the Edge Cases
      section were all aligned to say so explicitly, replacing the prior ambiguous interchangeable
      usage. This also resolves tasks.md's T059 note asking the same question.

## Notes

- Items marked `[Gap]` indicate a requirement this checklist did not find in spec.md — resolve by
  either adding the requirement or confirming its absence is an intentional scope boundary.
- Check items off as completed; add findings inline once reviewed against spec.md.
- All 21 items resolved via direct spec.md edits on 2026-07-07 (see per-item notes above); no items
  were deferred or accepted as intentional gaps without a corresponding spec change or explicit
  out-of-scope statement.
