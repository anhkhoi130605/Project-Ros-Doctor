<!--
SecuritySkills — Pull Request
Installed at .github/PULL_REQUEST_TEMPLATE.md

Read before submitting:
- New skills are issue-first. Open an issue, wait for a maintainer to add the "approved" label,
  then open the PR and link it below. PRs without an approved linked issue are closed automatically.
- One open PR per contributor at a time.
- Every box below must be filled. The "Reproduction" section must be independently runnable by a
  maintainer — pasted text alone is not accepted.
-->

## What this PR does
<!-- One or two plain sentences: which skill, and what it adds or fixes. -->

## Linked approved issue (required for new skills)
<!-- The issue must already carry the "approved" label. New-skill PRs without one are auto-closed. -->
Closes #

## Type of change
- [ ] New skill
- [ ] Improvement to an existing skill
- [ ] Bug fix / documentation

## Reproduction — independently runnable (required)
<!-- This is the gate. A maintainer must be able to re-run this and get the same result.
     Pasted output with no reproducible source does not count. -->
- **Public link to the full run** (gist or repo with the complete transcript): <!-- URL -->
- **Target codebase** (public repo URL) **at a pinned commit SHA**: <!-- repo@<sha> -->
- **Exact command / tool invocation used:** <!-- e.g. the skill loaded in Claude Code + the prompt -->

## Discrimination evidence — true positive AND true negative (required)
<!-- A useful skill flags the vulnerable case and stays silent on the safe one.
     Reference the fixture pair (the repo ships vulnerable/ and benign/ examples). -->
- **True positive** (vulnerable case it correctly flagged), with `file:line`:
- **True negative** (safe case it correctly did NOT flag), with `file:line`:

## Framework grounding
<!-- Real, verifiable control IDs only — no invented identifiers. A reviewer will check these. -->
- Frameworks / control IDs used:

## Attestation & checklist
- [ ] The reproduction above is from a **real run I performed** (not hand-written), and the linked transcript is genuine.
- [ ] `SKILL.md` frontmatter is complete and `name:` matches the skill's directory.
- [ ] I searched `skills/` and existing open PRs — this is **not a duplicate** of a shipped or already-proposed skill.
- [ ] `author:` is my own GitHub handle (not `unitoneai`).
- [ ] This is my **only open PR** right now.

## Anything else for a reviewer
<!-- Optional context, trade-offs, open questions. -->

---
<sub>The paid bounty program is currently **paused**. Contributions are still welcome and will be credited.</sub>
