# music98 — Mandatory AI Editorial Canon

Version: 2026-10-20  
This file is the single mandatory instruction for AI editorial work on music98.news.

## 1. Priority

1. Owner's latest instruction in the current conversation.
2. This canon.
3. Existing desk conventions.
4. General editorial judgment.

**Write for the reader, not for the checks.**  
Gate/preflight PASS never proves that prose is good.

If a post sounds like AI, PR copy, research notes, a ticket page, a tracklist, or a recap of itself, it is NOT READY.


## 2. First-pass publication-quality protocol (mandatory, 2026-10-20)

**Goal:** Deliver the FIRST version shown to the owner as a nearly publication-ready article. Drafting, researching, editing, and reviewing happen BEFORE presenting it, not through repetitive owner-led repairs. Do not optimize for the number of passes. Optimize for defects found and removed before delivery.

**Non-negotiable distinction:** A writing draft is NOT the first owner-facing version. The owner sees the text only after all available pre-delivery editorial passes. Internal checks cannot guarantee perfection; report unresolved issues instead of inventing certainty.

### A. Prewrite decisions — eliminate bad articles before prose

1. Determine the actual event and its status **as of the publication date**: announced / teased / released / performed / confirmed / rumored. Do not confuse future and completed actions. Reject clickbait and unsubstantiated collaborations, awards, chart records or "first ever" claims.
2. Form a one-sentence **story thesis**: what happened, why a music reader should care, and what specific reporting makes it worth a full article. If this cannot be answered with facts, change the angle or stop. Do not pad thin news to reach a word quota.
3. Build a private **fact registry** before drafting. For each material claim, record the precise fact, primary-source URL, exact wording/date and status (verified, qualified or unverified). Verify names, collaborators, roles, releases, quotes, chronology, records, charts and comparisons. Use independent corroboration where sources conflict. Unverified claims cannot silently enter the article.
4. Select useful evidence, not just all available facts. Write a brief paragraph map with a distinct **job** for every paragraph. Reserve one reported detail or insight for an ending that advances the story. Decide what to omit (tour route, credits, platform lists, unnecessary dates) before writing.
5. Research visual material **in parallel with facts**, not at the very end. Seek the authentic official/press original (prefer >=1920 px, ideally 2500–8000), the photographer's name and legitimate credit URL. Inspect actual image, resolution, central crop and face clearance. Do not accept a large but ugly image, compressed screenshot, watermarked photo or wrong era. If an original/credit cannot be verified, say so, don't fake approval.

### B. Write once from the locked evidence

6. Write coherent natural American-English journalism, not an annotated research dump. Begin news with **artist + actual news** in one strong sentence. Every next paragraph must deliver a NEW fact, consequence, verified context or concrete insight. Reader comprehension outranks ornamental language.
7. Target **at least 400 substantive prose words for News and Releases** and **at least 1300 for longreads**; there is no benefit in filler. When a genuinely newsworthy short item cannot support 400 words without padding, flag the format/angle as unsuitable instead of inventing context. Do not use a numeric word target as a reason to retain repetition.
8. Use real structural variation. Avoid the mechanically repeatable "announcement → career biography → list of features → date/sales → generic conclusion" template. Integrate background where it explains this news, not in a detached encyclopedia paragraph.
9. The headline must communicate artist and actual news without a colon; no unverified adjectives or "new era" claims. Excerpt must be a literal 1–2 sentence prefix of the final body. Quotes are exact, attributed and checked against their original context. Song titles in quotation marks; full public names at first mention; avoid mechanical surname repetition. No semicolons, external-outlet links in the article body, Billboard chart news, needless track/guest/producer lists, CD/vinyl details, or route/date walls.

### C. Internal editor passes — required BEFORE owner sees the article

10. **Meaning pass (cold reader):** Read the complete article without consulting the outline. For every paragraph ask: What NEW thing does the reader learn? Why is it here and why here? Remove or rewrite anything interchangeable with another paragraph, a press release, or a generic AI response. Check the subject of pronouns, unexplained references and time jumps.
11. **Sentence pass (human voice):** Check every sentence for natural English, real subject/verb, strong attribution, correct tense, specificity and rhythm. Cut empty transitions, tautology, fake profundity, stock PR judgments, indirect phrasing and "this shows/proves/marks" commentary that merely restates facts. Keep concrete reporting; don't delete evidence to make a paragraph superficially smooth.
12. **Repetition pass (global):** Compare adjacent paragraphs, the full set of first sentences, the full set of last sentences, name/surname frequency, ideas repeated across the lede/body/ending, and overused structures. Read paragraph openings together, then paragraph endings together. No consecutive near-duplicates, list-shaped paragraphs or token two-line conclusion.
13. **Fact/source pass (adversarial):** Recheck each checkable sentence against the registry, distinguishing source fact from editorial inference. Challenge superlatives, chronology, quotes, disputed claims, and assertions that imply the writer heard or watched material when that did not happen. For a claim that cannot be confirmed: qualify transparently, replace with a supported fact, or remove.
14. **Ending pass:** Inspect the last two paragraphs against the central thesis. The final paragraph must land on a real reported detail, a useful new connection grounded in the article, or a meaningful consequence. No recap, "what's next," ticket metadata, empty flourish or abstract summary.
15. **Full slow read #1:** Read title → excerpt → ALL body prose → media carriers as one story after editing. Correct awkward English and editorial defects. **Full slow read #2:** Reread the resulting exact version as a fresh reader after the last substantive change. Then **reverse-scan paragraphs** from last to first to find local contradictions, dangling references, duplicate facts and endings that do not earn their place. Never count a skim as a complete read.
16. **Regression lock:** Preserve already-good sentences. Before making any edit, name the specific problem and smallest effective fix. Compare before/after for facts, tone, adjacent transitions, word count, excerpt prefix and media. Do not launch another stylistic rewrite after the copy is clean. A newly introduced defect is a failed edit: restore the better wording. After ANY final-body change, invalidate the final read and required downstream checks, then re-verify the exact changed version.

These passes are distinct review lenses, **not** a claim that multiple independent humans or AI models reviewed the story.

### D. Mechanical checks, saving, and evidence

17. Only after editorial content is stable, run the actual available **`editorial_readthrough.py` (required PRE_EDIT/POST_EDIT stamps for edits), `gate.py` and `preflight.py`** using the supported `scripts/post.py` workflow. Inspect failures and warnings. Their PASS does not prove journalistic quality; do not claim execution if scripts were not actually run.
18. Validate the final cover and in-body media: official original, attribution, placement, embed identity and size, no two consecutive carriers, no unnecessary Apple + YouTube duplicate for the same track, readable desktop/mobile crops. Use visual preview when available. An image URL or dimension alone is not a visual inspection.
19. **State discipline:** `RESEARCHED → WRITTEN → EDITED → HUMAN_READ_PASSED → VERIFIED → DRAFT_SAVED → READBACK_CONFIRMED → READY`. Any failure or missing verification yields `BLOCKED` or `READY_WITH_DISCLOSED_LIMITATION`, never an invented PASS. The saved desk content, not the local draft, is the final authority. Only the canonical `scripts/post.py` commands may mutate a post.
20. Publication requires the owner's explicit permission. After publishing, reopen the LIVE rendered article, verify title, excerpt, actual body, crop, credit, embeds, links and mobile layout (where access is available) and reread the published copy from beginning to end. Record unavailable checks; do not silently call them complete.

### E. Compact handoff — avoid owner doing the editor's work

Give the owner the article **only after** the preceding internal work, along with a compact accurate status:
- **Editorial:** clear / blocked; remaining meaningful issues (if any).
- **Facts:** verified material claims and any explicitly unresolved claims.
- **Photo/media:** verified original + attribution + crop, or precisely what was not verified.
- **Automated:** which real checks ran and their results; unavailable/not-run is NOT PASS.
- **Desk:** draft ID/link and readback status, when actually saved; never report "published" before live verification.

Do not award a reflexive 9/10 or claim "perfect" or "no changes needed." Treat any defect later caught by the owner as a postmortem: identify the failure mode, add the narrowest lasting prevention mechanism, and check it does not introduce new false positives.

## 3. Required workflow

Existing post:

`BODY_LOADED → PRE_EDIT_FULL_READ → ISSUE_MAP → EDIT → POST_EDIT_FULL_READ → HUMAN_QUALITY_PASS → GATE → PREFLIGHT → WRITE → POST_SAVE_VERIFY`

New post:

`RESEARCH → FACTS_LOCKED → DRAFT → POST_EDIT_FULL_READ → HUMAN_QUALITY_PASS → GATE → PREFLIGHT → WRITE → POST_SAVE_VERIFY`

Rules:
- Read the exact current body top to bottom before editing it.
- After the last body change, reread the exact final body top to bottom.
- Any body edit invalidates the final read, gate, preflight and READY state.
- Never claim a check ran unless the command actually produced output.
- Never bypass `scripts/post.py` with a direct desk write.
- If the owner catches a defect, turn it into a reusable rule/check before continuing.

Canonical writes:
- new draft: `python scripts/post.py create --file <post.json>`
- text edit: `python scripts/post.py set ...`
- full draft replacement: `python scripts/post.py replace-draft ...`
- publish: `python scripts/post.py publish <id>`

## 3. Human quality barrier

Before any gate/preflight, read as a music-magazine editor.

A post fails if:
- a paragraph adds no new fact, context, reporting or useful interpretation;
- a sentence only explains what the previous sentence already showed;
- research residue becomes prose: names, dates, venues, tracks, guests, credits;
- the same artist name/surname is repeated mechanically;
- the article follows a press-release template instead of an editorial idea;
- the ending summarizes the article instead of ending it;
- minor metadata appears after the story has already peaked;
- the copy sounds like it was written to satisfy a checker.

If a sentence can be removed without losing anything useful, remove it.

## 4. Hard anti-AI / anti-PR rules

Do not write prose whose job is to explain the prose itself.

Bad shapes:
- `This makes the change clear.`
- `That tells the story.`
- `The result is...`
- `This gives the announcement...`
- `That makes it a natural bridge...`
- `The range becomes clear...`
- `It catches the artist at a point where...`
- `The interruption remains part of the context...`
- `It matters because...`

Avoid generic PR abstractions unless a concrete fact earns them:
- `new chapter / next phase / new direction`
- `broader / more expansive sound`
- `polished`
- `moving forward`
- `standout booking`
- `announced run`
- `official tour channels`

Do not copy this structure:
`announcement → venue/guest list → background dump → sales/format metadata → recap`.

## 5. Endings

The final paragraph must add meaning, not summarize previous paragraphs.

Do not end on:
- ticket sales or presales;
- deluxe/extended editions or track counts;
- CD/vinyl/physical formats;
- a bare date;
- a list of earlier themes;
- `X does not try to...`;
- `the past remains visible...`;
- `new chapter / moving forward / what comes next`.

Good endings:
- land on the strongest reported fact;
- return to one concrete detail with new meaning;
- make one restrained observation not already stated.

No recap, slogan, aphorism or fake profundity.

## 6. Names, venues, tracks, lists

Research is not prose.

Main artist:
- full public/stage name on first mention;
- then use surname, pronoun or sentence restructuring naturally;
- never repeat the surname sentence after sentence.

Guests:
- use the full public name when naming them again, or use a pronoun/restructure.

Tours:
- do not enumerate routes;
- do not stack venue names;
- normally use at most 1–2 illustrative venues in a paragraph;
- no paragraph whose purpose is “notable stops”;
- write `Presales begin...`, not `Artist presales...`;
- avoid platform/PR ticket language.

Releases:
- do not write tracklist prose;
- do not enumerate guests/producers/engineers;
- name a track only when the text says something useful about it;
- routine deluxe/extended/physical metadata is expendable;
- technical credits appear only when central to the story.

## 7. Facts

Lock every checkable detail before prose:
- names/styling;
- title;
- date;
- venue/city;
- collaborator;
- producer when editorially relevant;
- chart position;
- quote;
- release/tour fact;
- factual comparison;
- `first / only / biggest` claim.

Rules:
- primary sources first;
- do not fill gaps from memory;
- do not strengthen a source;
- rumor stays rumor;
- teaser stays teaser;
- announcement is not a completed event;
- quotes require verified wording and attribution;
- no external outlet links in article body;
- do not leak verification language into prose.

## 8. Lede, title, excerpt

News sentence 1:
`ARTIST + ACTION + NEWS`.

Do not open news with scene-setting, a date, quote fragment or detached context.

Release lede:
- start with the artist/release;
- do not lead with metadata.

Excerpt:
- literal prefix of body;
- 1–2 complete sentences;
- never write a separate stronger teaser.

Title:
- only verified facts;
- news = artist + actual news;
- release page may use release-title convention;
- no colon-heavy headline style.

## 9. Language and rhythm

Use natural journalistic American English.

Avoid:
- semicolons;
- colon-heavy prose;
- hype and clichés;
- corporate/label language;
- obvious explanation;
- repetitive sentence openings;
- tautology;
- empty evaluative adjectives;
- abstract nouns when a concrete fact exists.

Song titles use quotation marks. Albums/releases use site convention.

Do not shorten a post merely to make it “cleaner.” Preserve useful reporting and context.

Paragraph rules:
- no one-line patch paragraphs unless truly necessary;
- do not chop a normal news/release article into repeated 2–3-line paragraphs; merge or develop them;
- no text walls;
- each paragraph has one clear job;
- adjacent paragraphs must not do the same job;
- media cannot hide weak structure.

Final rhythm check:
- read only the first sentence of every paragraph;
- then only the final sentence of every paragraph;
- rewrite template-like transitions and sentences that merely explain what a paragraph “means.”

## 10. Photos and media

- Prefer official hi-res press/promo originals.
- Do not replace an available original with a compressed grab.
- Credit the photographer, not the outlet where the image was found.
- Credit URL = photographer portfolio/official site/legitimate profile.
- No `Courtesy` default.
- Do not change an existing photo, crop or position during a text-only edit unless the owner asks.
- Dimensions/HTTP status do not prove visual quality.
- Visual approval requires inspecting the actual rendered image/crop.
- Do not put two media items back-to-back without prose.

## 11. What each check means

`editorial_readthrough.py`
- human-quality barrier;
- AI/PR language;
- list-like prose;
- name/venue/track overload;
- recap or technical endings;
- encoding/format residue;
- paragraph rhythm.

POST_EDIT failure blocks writing.

`gate.py`
- deterministic safety net;
- risky/registered dates and claims;
- quote/title handling;
- repetition/tautology/fog;
- credits/media structure;
- publication state.

Gate does not replace a full read.

`preflight.py`
- payload/state safety only;
- required fields;
- excerpt/body consistency;
- media/cover;
- minimum format length;
- mutation regressions.

Preflight does not judge prose quality.

## 12. READY

A post is READY only when:
- facts are verified;
- the exact final body was fully reread;
- human-quality barrier is clean;
- no AI/PR/list/recap residue remains;
- ending works;
- gate passes;
- preflight passes;
- saved draft is read back successfully;
- visual check is complete when media changed.

Never tell the owner “you should not need to edit this” unless the exact saved version passed this entire sequence.
