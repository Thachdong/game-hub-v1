# Permission & Access-Control Requirements Checklist: Caro Match Gameboard Page

**Purpose**: Validate that spec.md's requirements for the guest/spectator/participant/creator
permission matrix are complete, unambiguous, internally consistent, measurable, and cover the
relevant scenarios — as a standard pre-implementation gate before `/speckit-tasks`.
**Created**: 2026-07-07
**Feature**: [spec.md](../spec.md)

**Note**: This checklist tests the requirements themselves (are they well-written?), not the
gameboard implementation. Items reference `spec.md` sections directly; `[Gap]` marks a missing
requirement, `[Ambiguity]`/`[Conflict]` mark wording that could be read more than one way.

## Requirement Completeness

- [ ] CHK001 Are requirements defined for every actor type (guest, signed-in non-participant
      spectator, match participant, match creator) crossed with every gated action (Start, Request
      Draw, Surrender, place a move, send chat, Report, kick/mute a viewer)? [Completeness, Spec
      §FR-013–FR-016]
- [ ] CHK002 Is the read-only viewing requirement explicitly stated for every one of the four match
      states, for every actor type, or only demonstrated via guest-focused examples? [Completeness,
      Spec §FR-012]
- [ ] CHK003 Is a requirement defined for what the non-creator participant's Start control looks
      like/does (disabled, hidden, or visible-but-inert), rather than only its outcome ("cannot
      start")? [Gap, Spec §FR-004]
- [ ] CHK004 Are requirements defined for the accept/decline side of a draw request — who sees the
      prompt and who is authorized to act on it? [Completeness, Spec §FR-007]
- [ ] CHK005 Is there a requirement covering whether a signed-in spectator can ever become a match
      participant during the same session (e.g., a vacated seat), or is that explicitly out of
      scope? [Gap]

## Requirement Clarity

- [ ] CHK006 Is "redirect to the login page" specified precisely enough (e.g., whether a callback
      back to the current match is included) to be implemented identically for every gated action,
      or does its precision vary by which FR states it? [Clarity, Spec §FR-013]
- [ ] CHK007 Is "no effect" (used for a non-creator's Start click in Edge Cases) distinguished from
      a disabled/inert control state clearly enough to be testable, or is it left to reader
      inference? [Ambiguity, Spec §Edge Cases]
- [ ] CHK008 Are "signed-in viewer," "match participant," and "match creator" each defined
      precisely enough that any given user can be classified into exactly one category without
      relying on surrounding narrative context? [Clarity]

## Requirement Consistency

- [ ] CHK009 Do FR-013 ("guests see the same controls a signed-in participant would see") and
      FR-014 (participant-only restriction, with Start further creator-only) agree on what a guest
      specifically sees for the Start control, given two participants themselves don't see
      identical Start behavior? [Consistency, Spec §FR-013/FR-014]
- [ ] CHK010 Are the kick/mute permission rules in FR-016 consistent with the Viewer List Key
      Entity's description and the Edge Cases entry about a kicked viewer's next chat attempt?
      [Consistency, Spec §FR-016/§Key Entities]
- [ ] CHK011 Is actor terminology ("participant," "creator," "spectator," "viewer") used
      consistently across User Scenarios, Requirements, Key Entities, and Assumptions, or do any
      sections use these terms interchangeably where the distinction matters? [Consistency]

## Acceptance Criteria Quality

- [ ] CHK012 Can SC-002 ("100% of guest or non-participant attempts... redirect") be objectively
      verified as a single metric, or does it bundle six distinct actions (Start, Draw, Surrender,
      Move, Report, kick) that each need their own pass/fail check? [Measurability, Spec §SC-002]
- [ ] CHK013 Is there a measurable success criterion specifically for the non-creator participant's
      Start experience (e.g., "0% of non-creator Start clicks start the match"), or is that case
      only covered qualitatively in Edge Cases without a matching Success Criterion? [Gap,
      Measurability]

## Scenario Coverage

- [ ] CHK014 Are requirements defined for whether the Start control is guest-visible in match
      states where a signed-in user wouldn't see it at all (states 1, 3, 4), or only for state 2
      where it's relevant? [Coverage, Spec §FR-013]
- [ ] CHK015 Is it explicitly stated whether the kick/mute control is rendered (and inert) for
      guests, per FR-013's list, or only asserted at the outcome level ("MUST NOT have this control
      produce any effect")? [Coverage, Spec §FR-013/FR-016]
- [ ] CHK016 Are requirements defined for two conflicting actions arriving at nearly the same time
      (e.g., one participant surrenders while the other sends a draw request)? [Gap, Edge Case]
- [ ] CHK017 Are requirements defined for how the permission matrix behaves when a participant's
      session expires mid-match — does an active participant's gated actions silently fall back to
      guest-like redirect behavior? [Gap]

## Dependencies & Assumptions

- [ ] CHK018 Is the assumption that Report is gated by sign-in only, not participant status
      (FR-015), cross-checked against whether a participant can report their own opponent
      specifically vs. any other viewer, or is the reportable target left unconstrained? [Assumption,
      Spec §Assumptions]
- [ ] CHK019 Is the dependency on the existing redirect-to-login convention (spec
      002-login-layout-nextauth FR-009; spec 007-caro-game-dashboard FR-008/FR-009/FR-013/FR-015)
      verified to actually cover the three actions this spec newly introduces (Start, Move, viewer
      kick/mute), or does it only demonstrate the convention for actions those earlier specs
      defined? [Dependency, Traceability]

## Ambiguities & Conflicts

- [ ] CHK020 Is it specified whether the non-creator participant's Start control is rendered as
      visibly disabled or entirely absent, given FR-004 only states the outcome ("cannot start the
      match themselves") without picking a presentation? [Ambiguity, Spec §FR-004]
- [ ] CHK021 Are "kick" and "mute" specified as the same action or two distinct actions (kick =
      remove from the viewer list/session, mute = block chat only while still viewing)? Spec.md's
      Key Entities and Requirements use "muted/kicked" interchangeably throughout. [Conflict, Spec
      §Key Entities/§FR-016]

## Notes

- Items marked `[Gap]` indicate a requirement this checklist did not find in spec.md — resolve by
  either adding the requirement or confirming its absence is an intentional scope boundary.
- Check items off as completed; add findings inline once reviewed against spec.md.
