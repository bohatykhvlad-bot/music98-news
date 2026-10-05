# music98 — Agent Operating Canon

Version: 2026-10-05 (full-read-first revision)  
Purpose: machine-oriented working rules for ChatGPT when researching, writing, editing, checking, or preparing music98 desk posts.

This file is intentionally operational. Historical notes and examples are secondary. The rules below are the execution order.

---

# 0. PRIORITY ORDER

When rules conflict, use this order:

1. Owner's latest explicit instruction in the current conversation.
2. This operating canon.
3. `site/_style-memory.md`.
4. Existing music98 desk conventions.
5. General writing judgment.

Never silently override a higher-priority rule with a lower-priority one.

---

# 1. NON-NEGOTIABLE RULES

## 1.0 Full-read-first rule — highest editorial rule
For any existing post, draft, longread, teaser, or article supplied for correction, review, improvement, fact-checking, or final approval, **the exact current text must be read completely from beginning to end before the first edit is proposed or applied**.

This rule outranks local-fix convenience. A request such as "fix this sentence", "expand this paragraph", or "check this fact" does not permit tunnel vision. The named issue is the trigger, not the scope of the read. Read the entire current body first, understand its structure and argument, then make the requested change in context. If the owner explicitly limits the edit to one location, still read the whole text but change only the permitted location.

Before editing an existing body, the workflow must establish a `PRE_EDIT_FULL_READ` stamp for the exact source hash. No pre-edit stamp means: **do not edit, do not rewrite, do not return a supposedly corrected version**.

After the last body edit, the entire resulting text must be read again from top to bottom as a reader, not as a patch reviewer. The final `POST_EDIT_FULL_READ` stamp must match the exact body hash handed to the owner or saved to the desk. Any body edit, even one word or punctuation mark, invalidates the final stamp.

The two reads have different purposes:
- pre-edit read: understand the whole story and build a complete problem map before changing anything;
- post-edit read: detect regressions, awkward joins, repetitions, factual drift, list-like prose, weak endings, and problems introduced by the fixes themselves.

No automated check, search result, diff, paragraph-only reread, or memory of an earlier version substitutes for either full read.

## 1.1 Quality over speed
There is no self-imposed deadline.

If uncertain:
- stop,
- verify,
- then continue.

Do not trade verification for speed.

## 1.2 One post at a time
Complete the full pipeline for post N before researching or drafting post N+1.

Full pipeline means:
research → fact registry → draft → media → checks → gate → preflight → verify → report.

Do not batch multiple posts unless the owner explicitly asks for batching.

## 1.3 Owner correction interrupts the workflow
If the owner corrects anything:
1. stop the current task,
2. convert the correction into a reusable rule,
3. apply it to the current post,
4. continue only after the correction is incorporated.

Never ignore a correction because the draft is almost finished.

## 1.4 Never claim a check was run unless it was actually run
A checklist item is complete only after the corresponding real check or command produced output.

Forbidden:
- "gate passed" when `gate.py` was not executed,
- "preflight clean" when `preflight.py` was not executed,
- "verified" when the relevant desk state was not actually checked.

If a required tool/script is unavailable, say exactly:
`NOT RUN — unavailable in current environment`

Then perform the strongest manual equivalent possible, but do not rename that manual check as gate/preflight/verify.

## 1.5 Report errors proactively
If an error is discovered, report it immediately. Do not wait for the owner to notice.

---

# 2. WORKFLOW STATE MACHINE

For an **existing text being reviewed or edited**, states are mandatory and ordered:

`BODY_LOADED`
→ `PRE_EDIT_FULL_READ`
→ `ISSUE_MAP_BUILT`
→ `EDIT`
→ `POST_EDIT_FULL_READ`
→ `REGRESSION_CHECKED`
→ `GATE_PASSED`
→ `PREFLIGHT_PASSED`
→ `VERIFIED`
→ `READY`

For a **newly researched post**, the research path precedes the same final barrier:

`RESEARCH`
→ `FACTS_LOCKED`
→ `DRAFT`
→ `MEDIA_READY`
→ `POST_EDIT_FULL_READ`
→ `REGRESSION_CHECKED`
→ `GATE_PASSED`
→ `PREFLIGHT_PASSED`
→ `VERIFIED`
→ `READY`

Never skip a state.

`ISSUE_MAP_BUILT` means the complete read has considered the whole article, not merely the owner's highlighted problem. At minimum, inspect:
- story logic and paragraph order;
- whether every paragraph adds new information;
- repeated ideas, repeated names, repeated titles, and repeated sentence openings;
- unnecessary names, credits, dates, numbers, formats, cities, track lists, and other research residue;
- calendar/list prose that should be compressed into narrative;
- factual claims that became stronger than their sources;
- unclear referents and missing context for a general reader;
- AI-like bridges, over-explanation, canned summary language, and mechanical transitions;
- paragraph rhythm, tiny patches, slabs, and text walls;
- media placement and the lead-in/out around media;
- whether the ending actually closes the story.

If a later edit changes body text after `POST_EDIT_FULL_READ`, immediately invalidate `POST_EDIT_FULL_READ`, `REGRESSION_CHECKED`, gate, preflight, verify, and READY. Perform another complete top-to-bottom read of the new exact body.

If the source body changes after `PRE_EDIT_FULL_READ` but before the intended edit is saved, the pre-edit stamp is stale. Reload the body and read it again before editing.

Example:
one-word body edit after final read → full post-edit read again → gate/preflight again.

---

# 3. RESEARCH RULES

## 3.1 Fact registry first
Every named or checkable detail must exist in the fact registry before it appears in prose.

Examples:
- release title,
- artist name,
- collaborator,
- producer,
- label,
- venue,
- city,
- date,
- chart position,
- nomination count,
- quote,
- tour stop,
- release format,
- factual comparison.

Each registry item must contain:
- detail,
- source URL,
- note/context,
- status.

No registry entry → do not write the detail.

## 3.2 No memory-filling
Never write a factual detail from memory if it is not verified for this post.

Forbidden:
- probably,
- likely,
- apparently,
- assumed context,
- inferred release history presented as fact.

## 3.3 Primary-source preference
Use primary sources whenever possible for:
- quotes,
- release announcements,
- dates,
- tracklists,
- credits,
- artist naming/styling,
- tour details.

Secondary sources may provide context, but must not strengthen a claim beyond the primary source.

## 3.4 Claim strength must match source strength
Never upgrade:
- "two songs she likes" → "two finished songs",
- rumor → confirmation,
- teaser → release,
- announcement → completed event.

---

# 4. WRITING STYLE

## 4.1 Language
Use natural journalistic American English.

Write original prose based on verified facts.

Never copy source phrasing unless using a short attributed quote.

Avoid:
- PR voice,
- hype clichés,
- generic AI transitions,
- canned conclusions,
- fake press-release language,
- over-explaining obvious facts.

## 4.2 Punctuation
In prose:
- avoid colons,
- avoid semicolons.

Use simple sentence structures unless complexity is genuinely useful.

## 4.3 Names
Verify official artist styling every time.

Examples:
- MILEY if officially styled that way,
- ROSÉ, not Rose.

Do not normalize official styling for convenience.

Name rhythm rules:
- On first mention, use the artist's full public name unless the official stage name is one word.
- For the main artist of the article, surname-only references may be used naturally after the first full mention. Prefer pronouns or sentence restructuring when repeating the surname would become monotonous.
- Never use the main artist's first name alone in journalistic prose unless that is the official stage name.
- For guest artists with a multi-word public name, do not shorten them casually to only the first name or only the surname. Use the full public name when the guest must be named again, or use a pronoun / restructure the sentence when the referent is clear.
- Avoid name echoes. If the same artist name or surname opens several nearby sentences or paragraphs, rewrite for rhythm rather than mechanically repeating it.

## 4.4 Dates
Use full month names.

Correct:
`September 17`

Avoid:
`Sept. 17`

Prefer absolute dates.

Avoid relative time language such as:
- today,
- yesterday,
- just,
- this fall,
- soon,
unless the timing is essential and verified at publication time.

A weekday must not appear alone.

Wrong:
`on Sunday`

Correct:
`on Sunday, September 27`

Better when possible:
`opens the VMAs on September 27`

## 4.5 Context
At first mention, identify a person sufficiently for a reader with no fan context.

Example:
`her husband, Chiefs tight end Travis Kelce`

The reader should not need to search for basic relationship or role context.

## 4.6 Quotes
Direct quotations should remain a minority of the article.

Target:
≤15% of total text.

Every quote must have:
- source,
- attribution,
- verified wording.

## 4.7 Paragraphs
Avoid tiny one-line paragraphs.

House targets:
- ordinary paragraph: preferably ≥25 words,
- paragraph before media: preferably ≥35 words,
- stronger target before media: ~90 words when natural.

Do not create text walls.

## 4.8 Endings
End with factual, calm prose.

Avoid:
- aphorisms,
- slogan-like closers,
- "signature" punchlines,
- forced metaphors,
- AI-sounding summary flourishes.

Before writing the ending, inspect the last 2–3 recent posts when available and avoid repeating the same kicker structure.

Retired / overused constructions include:
- `That is a X, not a Y`
- `map` as album metaphor
- `argument` as album metaphor
- `the part that stays`

---

# 5. NEWS LEDE CANON

For `type=news`, sentence 1 must be:

`ARTIST + ACTION + NEWS`

Examples:
- `Tove Lo has announced...`
- `Gnarls Barkley is returning...`

Do not begin news with:
- `Out today`
- a date,
- a weekday,
- a fragment,
- a quote fragment,
- scene-setting without the news,
- detached context.

The news must be understandable from sentence 1.

Producer information normally does not belong in the news lede unless specifically important to the story.

Labels normally do not belong in the lede or teaser unless the label itself is materially part of the news.

---

# 6. RELEASE LEDE CANON

For releases:
- subject first,
- release status may follow naturally.

Acceptable pattern:
`Artist has released X. It is out on Label...`

Do not let release metadata replace the actual subject/action structure.

## 6.1 Physical-format details

CD, vinyl, cassette, deluxe packaging, disc count, poster/inserts, color variants, and other physical-edition details belong in prose **only when they are genuinely editorially interesting or materially connected to the story**.

Do not include routine store metadata merely because it is available or verified.

Examples of details that may justify inclusion:
- a format has exclusive music or a materially different track sequence,
- the physical edition is central to the release concept,
- an unusual format or packaging has real cultural/editorial relevance,
- the artist specifically discusses the format as part of the project.

Normally omit:
- ordinary CD/vinyl availability,
- disc count,
- posters/inserts,
- color variants,
- standard packaging language,
- obvious buyer guidance.

A release post is an editorial story, not a product listing. If removing the physical-format detail makes the article no less informative or interesting, remove it.

---

# 7. LONGREAD EXCEPTION

A feature or longread may begin with a cinematic scene when it serves the story.

This exception does not apply to ordinary news posts.

---

# 8. EXCERPT / TEASER RULE

The body is the source of truth.

The excerpt must be copied verbatim from the opening of the first body paragraph.

Preferred:
- first 1–2 complete sentences,
- roughly 85–170 characters when natural.

Never:
- rewrite the excerpt separately,
- strengthen the excerpt beyond the body/source,
- cut a sentence mid-thought,
- silently drop sentence 2 only to satisfy a character cap.

Required check:
`excerpt` must be a literal substring of the first body paragraph.

If it does not fit:
edit the body opening first, then regenerate the excerpt from it.

The excerpt must end with proper terminal punctuation.

Title and excerpt may repeat key names or album titles when clarity requires it. Structural correctness is more important than forced variation.

---

# 9. TITLE RULES

The title must state only verified facts.

Do not put disputed or weakly sourced numbers in the headline.

For news:
- do not use a bare track title as the entire headline,
- include artist(s) and the actual news angle.

If an album is unreleased but singles have been revealed:
the title must not imply the album itself is already out.

---

# 10. ALBUM / ARTIST REFERENTS

Avoid awkward repetition.

Prefer:
`her album Confessions II`
or
`off Confessions II`

Avoid:
`Madonna ... from Madonna's album Confessions II`

Also avoid a bare album reference when a reader could reasonably not know what it is.

---

# 11. TOUR ROUTES

Do not overload a sentence with city lists.

Use at most 2–3 cities per normal sentence.

Compress the middle of long routes.

---

# 12. COMPILATIONS

For a multi-artist compilation with no single lead artist:

`artist = ""`

Do not use:
`Various Artists`

Let the renderer omit the artist prefix.

---

# 13. MEDIA RULES

## 13.1 Photos
Use HQ source files.

Avoid web thumbnails around ~600×400.

Preferred processing:
- JPEG,
- quality around q88,
- width around 1920–2600 px.

Abort or recompress if file size exceeds approximately 2.9 MB.

## 13.2 Credit
`credit` should contain:
- photographer name,
or
- label/entity only if no photographer name is available.

A slash `/` in credit is a failure.

`creditUrl` must point to:
- photographer site,
- photographer portfolio,
- legitimate agency profile.

Do not use:
- article scrape page,
- unrelated publication page,
- URL for the wrong member of a duo/entity.

Credit name and URL must refer to the same entity.

## 13.3 Embeds
YouTube embed:
- no separate photo-style caption by default.

Instagram / TikTok:
- caption may be used when renderer supports it.

Avoid two media items back-to-back without text between them.

## 13.4 Original photos, crop ownership and editor parity (owner correction, October 4, 2026)

**Hard rule: the owner chooses the crop. The agent must never replace that decision with its own.**

- Keep the exact original, highest-available source photo in storage. Do not destructively crop, pre-cut, replace with a lower-resolution derived image, or reframe it to "improve" the composition unless the owner explicitly requests that particular change. A responsive display crop is not a new source file.
- Never silently change an inline photo's framing, position, scale, orientation, aspect ratio, or placement. In particular, do not introduce photo-specific CSS overrides or force a wide 16:9 frame over a portrait merely to make it fit. First determine the owner's intended presentation and preserve its editable parameters.
- **One source of truth:** photo framing selected in the admin desk (frame aspect, focus x/y and zoom, when available) must render identically in the public article. If a layout change alters the crop, fix the editor and public renderer together; do not hard-code one side while leaving the other inconsistent. Existing owner-selected crops have priority.
- Preserve the ability to adjust each inline photo in the admin desk after publication, including zoom and dragging when the image is larger than its display window. A full photo at exact fit has no spare pixels to drag; zoom must remain available so the owner can choose a tighter crop and move it. Do not call this a broken drag control or pretend the image can be panned at exact fit without cropping.
- The agent may suggest a framing but must not treat that suggestion as permission to apply it. Do not modify the photo's saved crop metadata during editorial text revisions unless the owner specifically approves that photo change.
- **Mandatory visual gate before claiming completion:** load the real article and desk preview in a browser at desktop and mobile widths, capture and inspect screenshots of the entire relevant image (not merely verify dimensions or HTTP status), compare both views at the same saved settings, and confirm the focal subject and limbs have not been unintentionally cut. Test zoom and drag in the editor, save, reload and confirm the public crop matches. If direct desk visual access is unavailable, explicitly mark it NOT RUN and do not claim the photo is fixed.
- The Ella Langley live photo incident is a permanent negative example: do not create a "fix" in public CSS that changes photo aspect/fit but makes the editor's preview or movement inconsistent. Restore editor control first and verify visually before reporting success.

---

# 14. DESK WRITE SAFETY

When desk access is available:

1. Fresh GET `/api/desk`.
2. Modify only the target post.
3. POST the complete `posts` array.
4. Serialize with:
   `json.dumps(..., ensure_ascii=True).encode("ascii")`
5. Fresh GET again.
6. Confirm target fields.
7. Confirm byte-stability of all pre-existing non-target posts.

Never publish or rewrite neighboring posts as a side effect.

---

# 15. REQUIRED AUTOMATED CHECKS

## 15.1 gate.py
Run after every relevant edit.

Command pattern:
`python gate.py --post <postId> --ids`

A post may advance only after:
`PASS`
or equivalent clean output.

Soft warnings must either:
- be fixed,
or
- be explicitly reported to the owner with a reason for leaving them.

## 15.2 preflight.py
Run before handoff or publish.

Command:
`python scripts/preflight.py <postId>`

Not clean → not ready.

## 15.3 verify
Verify at minimum:
- title,
- excerpt,
- body,
- status,
- publishAt,
- date,
- type,
- artist,
- cover src,
- credit,
- creditUrl,
- stability of pre-existing posts.

If the actual scripts or desk are unavailable:
mark each unavailable check as `NOT RUN`.
Do not claim the post is production-ready.

---

# 16. KNOWN GATE FAILURES

Treat these as hard failures when detected:

- media-pair,
- empty photo credit,
- slash in credit,
- dead credit URL,
- wrong entity behind credit URL,
- dead cover/photo/embed URL,
- excerpt not literal substring of body,
- invalid excerpt length under current house rules,
- vague time,
- unverified date,
- 3+ negatives in one sentence when flagged,
- excessive repeated 4-grams,
- excessive colons in prose,
- quote without attribution,
- superlative without source,
- false English form,
- scheduled publish time dangerously close/past,
- loss of an approved line.

Warnings requiring judgment:
- thin lead-in before media,
- short paragraph,
- one-sentence paragraph,
- slab paragraph,
- text wall,
- thin finale,
- vague referent.

---

# 17. HUMAN EDITORIAL READS — BEFORE AND AFTER EDITING

Automation does not replace editorial reading. Full reading is the primary editorial control; automation is secondary evidence.

## 17.1 PRE-EDIT FULL READ BARRIER
For any existing body, run the pre-edit barrier on the exact source before changing text:

`python scripts/editorial_readthrough.py --post <postId> --phase pre-edit --confirm-full-read`

The read is complete only after the entire text has been read in order. Do not jump directly to the paragraph named by the owner. During this read, build the issue map across these axes:
- purpose: what is the story actually about?
- progression: does each paragraph move the story forward?
- necessity: what can be removed without loss?
- names: are guest names/credits accumulating into a list?
- dates/numbers: are verified details crowding out prose?
- repetition: is the same fact, interpretation, title, or name being re-explained?
- context: can a non-fan understand relationships, roles, and chronology?
- evidence: does claim strength still match source strength?
- voice: does any sentence sound like source notes, PR, or generic AI connective tissue?
- rhythm: do paragraph lengths and sentence openings vary naturally?
- ending: does the final paragraph close the article rather than summarize administration, dates, counts, or release logistics?

A mechanical finding is not permission to edit before the read is complete. Finish the read first, then edit.

## 17.2 POST-EDIT FULL READ + REGRESSION BARRIER
After the last intended edit, read the **entire resulting body again** from sentence one to the end. Do not review only the diff. Run:

`python scripts/editorial_readthrough.py --post <postId> --body-file <file> --phase post-edit --confirm-full-read`

For an already saved body, omit `--body-file`.

This pass must explicitly look for regressions caused by editing:
- a fix that duplicates a fact already stated elsewhere;
- a newly awkward transition or pronoun/reference;
- a sentence that now repeats the next or previous sentence;
- unnecessary proper names, production credits, track lists, city lists, dates, or format metadata;
- paragraphs that became patchwork after insertions/deletions;
- a lede or excerpt that no longer matches the article's center;
- a conclusion weakened by moving or adding information;
- factual tense/date inconsistencies introduced by rewriting.

Hard rule:
- no corrected body may be handed to the owner, saved through `scripts/post.py set`, published, or described as clean/ready unless both the required pre-edit stamp (for an existing source) and the post-edit stamp are valid for their respective hashes;
- any body edit invalidates the post-edit stamp;
- `gate.py` and `preflight.py` never substitute for either read.

The script stores separate content-hash stamps. `scripts/post.py set` must verify that the pre-edit stamp matches the current desk source and the post-edit stamp matches the staged replacement body.

## 17.3 FACT PASS
During the final full read, manually verify:
- every number;
- every date;
- every quote;
- every event tense;
- every named role;
- every chart/ranking claim.

If wording says an event `won`, `took place`, `opened`, etc., confirm the event date has actually passed.

## 17.4 DENSITY / LISTINESS PASS
Verified facts can still make bad prose. Treat the following as editorial defects unless the story genuinely requires them:
- three or more secondary names packed into one sentence;
- a paragraph functioning mainly as a list of names, dates, tracks, cities, formats, or credits;
- multiple exact dates when chronology can be expressed with one anchor date;
- producer/engineer/mixer/mastering names without narrative importance;
- track-by-track inventory where a representative example would do;
- repeating a number merely to restate the previous sentence.

Do not confuse factual completeness with editorial completeness. The goal is the smallest set of facts that tells the story accurately and interestingly.

## 17.5 VOICE AND REPETITION PASS
Remove:
- empty bridges;
- predictable topic-sentence patterns;
- symmetrical AI phrasing;
- repetitive sentence lengths;
- explanatory filler;
- press-release mimicry;
- generic `this marks...` sentences unless factually useful;
- paragraphs whose only job is to prove research was done.

Check:
- artist name echoes;
- album-title echoes;
- repeated sentence openings;
- repeated facts expressed with synonyms;
- repeated final-paragraph structures;
- repeated metaphors from recent posts.

---

# 18. FINAL READY CHECK

Before saying `READY`, every item below must be true:

- [ ] current owner corrections incorporated
- [ ] one-post-at-a-time rule respected
- [ ] all factual details registered
- [ ] primary sources checked where required
- [ ] title factually safe
- [ ] lede follows type canon
- [ ] excerpt is literal body substring
- [ ] excerpt ends cleanly
- [ ] names use official styling
- [ ] dates are absolute and formatted correctly
- [ ] no unsupported PR language
- [ ] no unverified quote/number
- [ ] paragraphs are structurally sound
- [ ] media placement is valid
- [ ] photo source is HQ
- [ ] credit and creditUrl refer to same entity
- [ ] gate actually run and clean
- [ ] preflight actually run and clean
- [ ] verify actually run
- [ ] non-target posts stable
- [ ] pre-edit full read completed on the exact source hash before any correction (existing-text edits)
- [ ] issue map covered the whole article, not only the reported defect
- [ ] post-edit full read completed on the exact final body hash after the last change
- [ ] regression pass checked the whole article rather than only the diff
- [ ] human fact pass complete
- [ ] human voice / anti-AI pass complete
- [ ] names/dates/numbers/credits/tracks/cities checked for editorial necessity, not merely factual accuracy
- [ ] no source-proof language, unnecessary technical credits, routine physical-format metadata, calendar dumps, list-like name/date payloads, obvious restatements, weak one-sentence patches, or bare-number ending remain

If any required executable check is unavailable:
status is not `READY`.

Use:
`DRAFT — automated production checks not run`

---

# 19. REPORT FORMAT TO OWNER

After each post, report only concrete status.

Example:

`Post <id>`
- Research: PASS
- Fact registry: PASS
- Draft/style: PASS
- Media: PASS
- Gate: PASS
- Preflight: PASS
- Verify: PASS
- Human fact check: PASS
- Human voice check: PASS
- Remaining warnings: none

If something was not actually run:

`Gate: NOT RUN — gate.py unavailable in current environment`

Never convert `NOT RUN` into `PASS`.

---

# 20. ERROR LEARNING LOOP

After any meaningful failure:

1. State what failed.
2. State why it failed.
3. Convert the failure into a reusable rule.
4. Apply that rule immediately.
5. Add it to the style-memory / operating canon when file access permits.

Do not merely apologize and continue unchanged.

---

# 21. CURRENT OWNER-SPECIFIC NEWS RULES

These remain mandatory:

- No bare weekday without a date.
- Keep event and date in the same clause when possible.
- Do not start `type=news` with `out today`.
- News title must contain artists + angle, not only a track title.
- Title and excerpt should not be mechanically identical.
- Album context must be explicit enough for a non-fan reader.
- Avoid label/PR voice in the lede and excerpt.
- Do not perform date arithmetic in the final paragraph.
- Keep producers out of a news lede unless requested or central.
- YouTube embed does not need a separate photo-style caption.
- Run a human-voice / anti-AI pass before publish.
- Merge weak tiny paragraphs into substantial blocks when appropriate.

---

# 22. MINIMUM LENGTH GUIDANCE

Use as house guidance, not as permission to pad:

- news: ~300+ words
- release: ~450+ words
- feature / longread: ~1200+ words, often substantially longer when justified

Never add filler just to reach a number.

---

# 23. FINAL PRINCIPLE

**Read first, edit second, read everything again last.** A locally correct fix inside a globally weak article is not a successful edit.

The model must prefer an explicit incomplete status over a false complete status.

Correct:
`Draft is editorially checked, but gate/preflight were not available here.`

Incorrect:
`Everything passed.`

when those checks were not actually executed.