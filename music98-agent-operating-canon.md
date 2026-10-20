# Music98 — AI editorial canon

Version: 2026-10-20. **Only authoritative editorial rule file.**
Priority: latest owner instruction > this canon > existing desk conventions.
**Objective: the FIRST article shown to the owner is already thoroughly edited, not an unfinished draft.** Quality beats checkbox compliance. Never claim a check happened unless it did.

## 1. Research BEFORE writing

1. Define the story in one sentence: **artist + verified action + why a reader should care**. Identify whether the news is *teased, announced, confirmed, released, completed or rumored* on the intended publication date. Never turn a future event into a past result.
2. Privately record **material claim → original source URL → exact evidence/date → verification status**. Check names, titles, collaborators, chronology, quotations, chart results, records and "first/only/biggest" claims. Primary sources first; corroborate disputed details. Unverified material must be qualified, replaced or omitted, never invented.
3. Determine whether enough genuine reporting exists for a full article. If not, research more or reject the angle. **Never inflate thin news to reach a word target.**
4. Find and verify an original press/promotional photo during research, not after writing. Check photographer and credit URL. Do not invent credits.

## 2. Design the story, then draft privately

1. Make a short paragraph plan. Every paragraph needs a **distinct purpose**: announcement, meaningful detail, grounded context, consequence or reported observation. Order information for reader comprehension, not by the order sources mention it.
2. **News lede:** artist + actual news immediately, in one clear strong sentence. **Releases:** identify artist and release. No general scene-setting, list of dates or abstract introduction.
3. Use natural **American-English music journalism** with no first-person narrator. News and Releases need **at least 400 substantive prose words**; longreads **at least 1300**. Facts, not padding, earn the length.
4. Headline: factual, specific, no colon or unverified hype. Excerpt: the literal first 1–2 complete sentences of the final body. Song titles and quoted phrases use straight ASCII double quotes (\"...\"), never curly (“...”), German-style („...“) or guillemets («...»). Apostrophes remain standard English single marks. Album styling follows site conventions; full names on first mention.
5. Exclude detached biography, tour-city/date walls, guest/producer/engineer roll calls, tracklist prose, physical-format details, platform lists and ticketing jargon unless essential to the actual story. No Billboard chart news; no external news-outlet links in the article body; no semicolons. For ticket buttons use the site's established Ticketmaster/Impact mechanism.
6. **ENDINGS:** Close on a strong reported fact or fresh grounded consequence, not a recap, slogan, bare date, presale detail or "new chapter" remark.

## 3. HUMAN QUALITY BARRIER — finish editing BEFORE showing the owner

Read the whole draft as an independent music editor, then complete these checks:

1. **Facts and logic:** challenge every checkable sentence against source notes. Are tense, timeline, quote, attribution, claims, comparison and implication accurate? No unsupported listening descriptions.
2. **Paragraph substance:** each paragraph adds something the reader did not already know; no disguised restatement of the headline, lede or neighbor. Does the story flow without gaps or unexplained pronouns?
3. **Human language:** inspect every sentence for natural English, meaning, cadence and specificity. Cut tautology, vague abstraction, hype, press-release diction and generic AI transitions ("this marks," "the result is," "new era," "that tells the story") **when they substitute for reporting**. Do not blindly ban ordinary words.
4. **Global repetition:** compare adjacent paragraphs; then read ONLY the first sentence of each paragraph in sequence, and ONLY the last sentence of each. Check repeated facts, artist names, sentence structures, titles and mechanical transitions. Avoid one-line patches and walls of text; **do not pad merely to satisfy paragraph-length heuristics**.
5. **Ending:** inspect the last two paragraphs against the story's premise. The last paragraph must add information or earn its insight, not summarize or abruptly stop on metadata.
6. **Two complete reads:** after editing, read title, excerpt and full body *top to bottom twice*, using the **exact final version** on the second read; then reverse-scan paragraphs for repetitions and missing references. An actual change afterward invalidates this final check.

**Regression lock:** edit the smallest span that fixes a specific defect. Compare before/after for facts, clarity, neighboring transitions, excerpt, media and overall rhythm. Restore the earlier wording when the revision makes prose worse. Never do another full rewrite just to increase a subjective score. A script PASS does not satisfy this barrier.

## 4. Photo, embeds and presentation

- Prefer verified authentic, high-resolution official/press originals: **at least 1920 px when possible**, ideally 2500–8000. Credit the **photographer**, with their official site, portfolio or legitimate profile, not the media outlet. No default "Courtesy."
- Actually inspect image and displayed crop: correct era, quality, optical centering, card framing, no cut-off faces, watermark or added text. Dimensions/HTTP status are not visual approval.
- Place media at useful editorial points; no adjacent embeds without prose. Avoid duplicate Apple + YouTube embeds for the same track. Verify format and desktop/mobile rendering where available.
- **Text-only changes must not alter existing cover, crop, credit or embeds** unless requested. Clearly report unavailable image/browser checks as **NOT VERIFIED**.

## 5. Save only through the real QA workflow

1. **Existing article:** load exact desk body and complete the `PRE_EDIT` read before touching it. **New article:** build a verified staged draft. After final changes, record `POST_EDIT` on the **exact final body**.
2. Run actual repo checks on that version: `editorial_readthrough.py` (heuristic wording/structure flags), `gate.py` (mechanical checks) and `preflight.py` (status, fields, excerpt, length, media and regression checks). Examine findings, not only PASS/FAIL. A heuristic warning calls for judgment, not automatic filler.
3. Script stamps attest that a read was confirmed and hashes detect stale text; **they cannot prove the human editorial check occurred**. Never report an unrun command as PASS. Any further body edit invalidates the final read and downstream checks.
4. Create/edit/publish only through supported `scripts/post.py` commands (`create`, `set`, `replace-draft`, `publish`). **Never bypass it with a direct desk write.**
5. Read back saved draft and match **title, excerpt, exact body, cover, credits, media, status** against the reviewed version. No automatic publication.

## 6. READY, blocked and published

- **READY:** all material facts verified, complete human reads passed, editorial defects fixed, real required scripts passed, visual checks performed when applicable, saved draft verified. Missing checks are never silently passed.
- **BLOCKED:** unresolved critical claims, poor prose, broken media or failed gates. **NOT VERIFIED:** name each unavailable check honestly.
- Handoff to owner is concise: **editorial verdict; unresolved facts; photo/credit/crop; actual check results (PASS/FAIL/NOT RUN); draft link/id**. Do not give reflexive 9/10 ratings or promise perfection.
- Only publish with explicit owner permission. After publication reopen the LIVE page, verify actual rendered content and media, and reread from beginning to end. Never claim live verification from source code inspection.
- When owner discovers a defect: fix root cause, preserve already-good copy, add **one narrowly targeted** prevention rule/test. No accumulating generic prohibitions.

## 7. Maintenance

This file is the single source of truth. Keep AGENTS.md, CLAUDE.md, GEMINI.md and other agent pointers short, without copying these rules. A test should block clear faults, not arbitrary stylistic preferences; review notes are appropriate for borderline rhythm/length. Keep tests synchronized with script changes. Never change site UI or live articles while editing the canon.
