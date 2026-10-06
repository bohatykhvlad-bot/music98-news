# music98 — Mandatory AI Editorial Canon

Version: 2026-10-06  
This file is the single mandatory instruction for AI editorial work on music98.news.

## 1. Priority

1. Owner's latest instruction in the current conversation.
2. This canon.
3. Existing desk conventions.
4. General editorial judgment.

**Write for the reader, not for the checks.**  
Gate/preflight PASS never proves that prose is good.

If a post sounds like AI, PR copy, research notes, a ticket page, a tracklist, or a recap of itself, it is NOT READY.

## 2. Required workflow

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
