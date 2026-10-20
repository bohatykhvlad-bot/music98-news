# music98 — Editorial operating canon

Version: 2026-10-20. **Single source of truth** for Music98 editorial AI work.
Priority: owner's latest instruction > this file > desk conventions > editorial judgment.
**Goal: the first owner-facing draft should already be close to publishable.** Do internal research, edits and checks before showing it. Never confuse a script's PASS with a good story.

## 1. Decide whether there is a story (before writing)

- State the actual news in one sentence: **artist + verified action + consequence/reader interest**. Check whether it is an announcement, teaser, rumor, release or completed event **as of the publication date**.
- Identify the unique angle and enough substantiated material to report it. Do not pad a thin announcement into 400 words. If insufficient, research further, change angle, or report the limitation.
- Make a small fact list with **claim → original source URL → verified wording/date → certainty**. Verify spelling, affiliations, titles, quotes, chronology, charts, records, collaborators and first/only/biggest claims. Primary sources first; use independent corroboration for disputed details.
- Distinguish direct fact, attributed statement and interpretation. A teaser is not a confirmed release; an announced event has not occurred. Do not make claims from assumptions or memory.
- Pick the best source photo **during research**, not after the copy is finished.

## 2. Plan before prose

- Define one clear reason this article matters and a short paragraph outline. Each paragraph must have **one different editorial job**: news, meaningful detail, verified context, consequence or compelling reported observation.
- Put background where the reader needs it. No biography dump, chronological news list, press-release outline, generic anticipation or mechanical recap.
- Prioritize facts. Remove marginal dates, tour-city rolls, tracklists, producer/engineer credits, CD/vinyl/format details and platform enumerations unless central to the story.
- Design an **ENDING** around a strong reported detail or new, grounded implication. Do not reserve the last paragraph for a summary, bare date, sales link, slogan or vague "what comes next."

## 3. Write the complete private first draft

- Natural, idiomatic **American English** for an independent music publication. No first-person editor voice. Specific reporting beats hype and abstract commentary.
- News lede starts immediately with **artist + actual news**, usually one substantial sentence. Release lede identifies artist and release. Don't open with scene-setting or metadata.
- Title: real news, artist, no colon, no unproven superlatives. Excerpt: literal first 1–2 **complete sentences of the final body**, not a new teaser.
- **News and Releases: minimum 400 substantive prose words. Longreads: minimum 1300.** Never use filler to reach the number. If reporting cannot support the required length, the piece is not ready.
- Song titles in quotation marks. Album titles follow site style. Full public names on first mention. Vary pronouns, surnames and sentence structure naturally, without unexplained references. Avoid semicolons, repetitive wording, unnatural transitions and exaggerated adjectives.
- No Billboard chart news. No links to other publications in the article body; use sources privately for verification. Ticketmaster ticket buttons use the site's existing affiliate mechanism when appropriate, never a pasted unsanctioned affiliate/disclosure sentence.

## 4. HUMAN QUALITY BARRIER (before any mechanical gate)

Evaluate the whole article against these four questions:

1. **New information:** Does every paragraph add a fact, relevant context, evidence or worthwhile interpretation? Cut tautology, explanatory padding, reworded repeats and material without a clear reason to exist.
2. **Natural voice:** Does each sentence sound like a professional human reporter? Replace AI/PR constructions ("new chapter," "this marks," "the result is," "broader direction," "this tells the story") **when they replace evidence**, not by blindly banning innocent words.
3. **Flow:** Does the second paragraph follow the lede naturally? Can every referent be understood on first reading? Do the paragraph openings, endings, transitions and name frequency vary without forced variation? No micro-paragraph patches or uninterrupted walls of text. Paragraph length is a diagnostic, not a reason to add filler.
4. **ENDING:** Does the final paragraph add substance rather than repeating the headline, ending on sales details, or delivering fake profundity?

**Fail** if the copy reads like AI, a press release, research notes, a tour schedule, a tracklist or a recap. Automatic pattern-matching can flag suspects but cannot decide whether prose is good.

## 5. Private editorial passes before the owner sees the article

Do these in order on the **actual text**, not just as a checklist claimed after the fact:

1. **Reporting pass:** Compare each checkable assertion with the source list; question timelines, numbers, names, quotes, attribution, comparisons and tense. Qualify/remove unsupported assertions.
2. **Substance and structure pass:** Read end-to-end as someone who has not seen the research. Remove redundant paragraphs, missing context and weak transitions. Check that the lede, story angle and ending deliver on the same news.
3. **Line edit:** Check each sentence for idiomatic English, clarity, unnecessary abstraction, repetition, grammar, apostrophes and title styling. Preserve strong sentences; no gratuitous rewrites.
4. **Global echo pass:** Inspect pairs of adjacent paragraphs; then read every paragraph's first sentence in sequence and every last sentence in sequence. Detect repeated ideas, names and formulaic connectors.
5. **Two final full reads:** Read the complete revised headline/excerpt/body from beginning to end twice; the second read must assess the **exact final version**. Reverse-scan paragraphs for repetitions, loose references and a weak ending. Any subsequent body edit invalidates the final verification.

**Regression rule:** Every change must fix a named defect. Compare before/after for fact accuracy, reader clarity, neighboring sentences, excerpt, media and overall flow. If the new sentence is worse, restore the old one. Do not start another wholesale stylistic pass once the piece is clean. Never claim independent reviewers, external models or manual inspection you did not actually use.

## 6. Photo and embedded media

- Prefer official high-resolution original press/promotional imagery; target at least **1920 px**, preferably 2500–8000. Confirm authentic source, subject, time period, photographer and legitimate photographer credit URL (official site, portfolio or profile). Do not invent a photo credit or use "Courtesy" by default.
- Inspect the **actual image and rendered crop**: optical center, square card, no cut-off faces, no text/watermark, credible quality. A successful HTTP response or large resolution alone is insufficient.
- Place media where relevant; no adjacent embeds without intervening prose. Do not duplicate Apple Music and YouTube for the same track without a real editorial reason. Preserve original embed proportions and established mobile behavior.
- For a text-only update, do **not** change existing cover, crop or media unless explicitly asked. Where visual verification is unavailable, report it as unverified, not PASS.

## 7. Apply the real automation, not imaginary checks

Use repo script interfaces as implemented. For an **existing post**, load exact current desk body and confirm a full **PRE_EDIT** read before editing. For a **new post**, build a source-backed staged draft. After the final edit, record **POST_EDIT** read on the exact body.

Then, on that same version:
- Run `scripts/editorial_readthrough.py`: heuristic warnings and hard findings on article quality; it does not read or understand the story for you.
- Run `scripts/gate.py`: mechanical claims, repetition, phrasing and media safety.
- Run `scripts/preflight.py`: payload, fields, draft status, min word count, cover, excerpts and mutation regressions.
- Inspect all findings. A human editorial defect blocks READY **even when all scripts pass**. A script warning needs judgment, not automatic filler.
- Mutate the desk **only** via `scripts/post.py` (`create`, `set`, `replace-draft`, `publish`). Never directly POST to the desk.
- Read back the saved draft and compare **title, excerpt, body, photo, credits, media and status** against the reviewed version. Changes invalidate earlier checks.

Only report a script PASS if it actually executed successfully. If tool access is unavailable, label the check **NOT RUN**. Do not claim a command was run just because its logic was inspected. A `--confirm-full-read` stamp attests a read; it cannot technically prove human-quality review.

## 8. Release boundary and truthful handoff

**READY** means: material facts verified; editorial passes on exact body complete; no substantive prose defect; available automated checks passed; photo/media verified where applicable; saved draft read back accurately.

- **BLOCKED**: critical facts, essential media, editorial quality or required checks fail.
- **INCOMPLETE / NOT VERIFIED**: clearly state which check could not be run; do not pretend the article passed it.
- Provide a **short status report** to owner: editorial verdict, unresolved facts, photo/credit/crop, automation (PASS/FAIL/NOT RUN), saved draft ID/link. No inflated 9/10 scores or "perfect" promises.
- Publish only on explicit owner authorization. Reopen LIVE page and reread/render-check title, excerpt, body, media, crop, credits and links after publication. Do not say "live verified" unless it actually happened.
- If the owner finds an error, locate its root cause, fix the smallest thing needed, protect already-correct material and add one narrowly scoped prevention mechanism. Do not respond by piling on generic rules.

## 9. Guardrails for future maintenance

Keep **this file short and authoritative**. Do not duplicate these rules in AGENTS/CLAUDE/GEMINI, tests or older canons. Automated rules should catch measurable issues with few false positives; stylistic heuristics should normally be review notes, not inflexible word-count constraints. Changes to scripts require matching test updates. No site/app code or live posts change as a side effect of rewriting editorial rules.
