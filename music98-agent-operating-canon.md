# music98 — Agent Operating Canon

Version: 2026-10-06  
This is the mandatory working instruction for any AI editing music98.news.

## 0. READ THIS BEFORE TOUCHING A POST

Priority:
1. Owner's latest instruction in the current conversation.
2. This canon.
3. `site/_style-memory.md` for image/media presentation.
4. Existing desk conventions.
5. General editorial judgment.

A script PASS is never proof that an article is good. **Write for the reader first. Checks are a safety net, not a target.**

If a draft sounds like AI, a press release, research notes, a ticket listing, a tracklist, or a recap of itself, it is NOT READY even when every automated check passes.

---

## 1. REQUIRED PIPELINE

### Existing post
`BODY_LOADED → PRE_EDIT_FULL_READ → ISSUE_MAP → EDIT → POST_EDIT_FULL_READ → HUMAN_QUALITY_PASS → GATE → PREFLIGHT → WRITE → POST_SAVE_VERIFY`

### New post
`RESEARCH → FACTS_LOCKED → DRAFT → POST_EDIT_FULL_READ → HUMAN_QUALITY_PASS → GATE → PREFLIGHT → WRITE → POST_SAVE_VERIFY`

Hard rules:
- Read the exact current body from top to bottom before editing an existing post.
- After the final body change, read the entire final body again from top to bottom.
- Any body change invalidates the final read, gate, preflight and ready state.
- Never claim a check was run unless the real command produced output.
- Never bypass `scripts/post.py` with a direct desk POST.
- If a required check fails, fix the text. Do not write around the check.
- If the owner catches a defect, convert it into a reusable rule/check before continuing.

Canonical writes:
- new draft: `python scripts/post.py create --file <post.json>`
- existing text edit: `python scripts/post.py set ...`
- full draft replacement: `python scripts/post.py replace-draft ...`
- publish: `python scripts/post.py publish <id>`

---

## 2. HUMAN QUALITY BARRIER — MOST IMPORTANT

Before gate/preflight, read the article as a magazine editor and ask:

1. Does every paragraph add NEW information, reporting, context or interpretation?
2. Can any sentence be removed without losing anything? If yes, remove it.
3. Is any paragraph merely explaining what the previous paragraph already showed? Remove/rewrite it.
4. Does the article sound like a press release, ticket page, research memo or AI summary? Rewrite it.
5. Does the ending actually end the story, or merely repeat the lede/body? If it repeats, rewrite it.
6. Are names, venues, tracks, dates or credits being listed because research found them, rather than because the reader needs them? Cut them.
7. Is the main artist's name/surname repeated mechanically? Rewrite for natural rhythm.
8. Are abstract phrases doing work that a concrete fact could do better? Replace them.
9. Does the final paragraph introduce a minor technical detail (deluxe/extended edition, track count, ticket sale, physical format) after the story has already peaked? Move it or delete it.
10. Would a competent music editor publish this exact wording without apologizing for "AI tone"? If not, it is not ready.

### Hard anti-AI / anti-PR rules

Do NOT write sentences whose main purpose is to explain the prose itself.

Bad patterns:
- `This makes the change clear.`
- `That already tells the story.`
- `This gives the announcement a connection...`
- `The result is...`
- `This does not need to be spelled out...`
- `That makes it a natural bridge...`
- `The range becomes clear...`
- `The interruption remains part of the context...`
- `It catches the artist at a point where...`

Avoid generic PR abstractions unless a concrete fact immediately earns them:
- `new chapter`
- `broader / more expansive sound`
- `polished`
- `moving forward`
- `next phase`
- `new direction`
- `standout booking`
- `announced run`
- `official tour channels`

Do not copy the press-release structure:
`announcement → venue/guest list → background dump → sales metadata → summary recap`.

Rebuild the story around the strongest editorial idea instead.

---

## 3. ENDINGS

The ending must add a final piece of meaning, not summarize the article.

Forbidden ending behavior:
- repeating the lede in different words;
- collecting earlier themes into one "AI summary";
- ending on ticket sales, presales, track counts, deluxe/extended editions, CD/vinyl, release formats, or a bare date unless that detail IS the story;
- `X does not try to...` followed by a recap of the album;
- `the past remains visible...`, `a new chapter...`, `moving forward...` as a generic closer;
- restating `tour + bigger rooms + new music + return` after those points were already made.

A good ending should either:
- land on the strongest reported fact,
- return to one concrete image/detail with new meaning,
- or make one restrained observation that has not already been stated.

No slogan, aphorism, recap or fake profundity.

---

## 4. LISTS, NAMES, VENUES, TRACKS

Research is not prose.

### Tours
- Do not enumerate routes.
- Do not stack venue names.
- Normally use at most 1–2 illustrative venues in a paragraph and only if they prove something important.
- Never write a paragraph whose function is "here are the notable stops."
- Ticketing terminology belongs only when readers actually need it.
- Prefer `Presales begin...` over platform language such as `Artist presales...`.
- Do not write `official tour channels`, `announced run`, or equivalent PR filler.

### Releases
- Do not turn an article into a tracklist.
- Do not run through guests/producers/engineers.
- Name a track only when the article says something useful about that track.
- Routine deluxe/extended/physical-edition metadata is expendable.
- Producer/engineer credits belong only when central to the story.

### Names
- First mention: full public/stage name.
- Main artist: after first mention, use surname/pronoun/restructure naturally.
- Never repeat the surname sentence after sentence just to avoid pronouns.
- Guest artists keep their full public name when named again unless a pronoun/restructure is clearer.
- Avoid paragraphs opening repeatedly with the artist name/surname.

---

## 5. FACTS AND SOURCES

Before prose, lock every checkable detail in a fact registry:
- name/styling,
- title,
- date,
- venue/city,
- collaborator,
- producer when editorially relevant,
- chart position,
- quote,
- release/tour fact,
- factual comparison,
- "first/only/biggest" claim.

Rules:
- Primary sources first for announcements, dates, tracklists, credits and quotes.
- Do not fill gaps from memory.
- Do not strengthen a source.
- Rumor stays rumor. Teaser stays teaser. Announcement is not a completed event.
- Quotes require verified wording and attribution.
- No external outlet links in article body.
- Do not leak verification language into prose (`Apple lists...`, `the release material says...`) unless the source itself is the story.

---

## 6. LEDE, TITLE, EXCERPT

### News lede
Sentence 1 = `ARTIST + ACTION + NEWS`.

Do not open with scene-setting, a date, quote fragment or detached context.

### Release lede
Start with the artist/release itself. Do not lead with metadata.

### Excerpt
- Literal prefix of the body.
- Prefer 1–2 complete sentences.
- Do not write a separate stronger teaser.

### Title
- News title: artist + actual news.
- Release page may use the release title according to site convention.
- No unverified claim in a title.

---

## 7. LANGUAGE

Use natural journalistic American English.

Avoid:
- semicolons;
- colon-heavy prose;
- hype;
- clichés;
- corporate/label language;
- "reader guidance" that explains obvious implications;
- repetitive sentence openings;
- tautology;
- empty evaluative adjectives;
- abstract nouns where a concrete fact is available.

Song titles use quotation marks. Albums/releases use the site's established formatting.

Do not shorten a post merely to make it "cleaner." Preserve useful reporting and context.

---

## 8. PARAGRAPHS AND RHYTHM

- No one-line patch paragraphs unless genuinely necessary.
- No text walls.
- Paragraphs should have a clear job.
- Adjacent paragraphs must not do the same job.
- Merge or cut paragraphs that merely restate a prior point.
- Media must not be used to hide weak structure.

Before final approval, read only the first sentence of every paragraph in order. If they sound like a sequence of template transitions, rewrite.

Then read only the final sentence of every paragraph. If they repeatedly explain what the paragraph "means," rewrite.

---

## 9. MEDIA / PHOTOS

For detailed visual rules use `site/_style-memory.md`.

Non-negotiable:
- Prefer official hi-res press/promo originals.
- Do not substitute compressed grabs when an original exists.
- Credit the photographer, not the outlet where the image was found.
- Credit URL = photographer portfolio/official site/legitimate profile.
- No `Courtesy` default.
- Do not change an existing photo/crop/position during a text-only edit unless the owner explicitly asks.
- Never call an image visually approved from dimensions/HTTP status alone.
- Visual approval requires inspecting the actual rendered image/crop.

---

## 10. RESPONSIBILITY OF THE THREE CHECKS

### `editorial_readthrough.py`
Human-quality barrier:
- AI/PR language,
- obvious explanation,
- list-like prose,
- name/venue/track overload,
- recap endings,
- weak/technical endings,
- paragraph rhythm.

A POST_EDIT failure blocks writing.

### `gate.py`
Mechanical/editorial safety:
- registered dates and claims,
- quote/title handling,
- factual-risk language,
- repetition/tautology,
- credits,
- structure/media rules,
- state checks.

Do not use gate as a writing target.

### `preflight.py`
Payload/state safety:
- required fields,
- excerpt/body consistency,
- media presence/order,
- cover presence,
- status,
- mutation regressions.

Preflight does not judge whether prose is good.

---

## 11. FINAL APPROVAL

A post is READY only when ALL are true:
- facts verified;
- exact final body fully reread;
- no human-quality finding;
- no press-release/AI residue;
- ending is not a recap;
- names/tracks/venues are not list-like;
- gate passed;
- preflight passed;
- saved draft read back successfully;
- visual check completed when media changed.

If any statement above is uncertain, the post is NOT READY.

**Never tell the owner "you should not need to edit this" unless the exact saved version has passed this entire sequence.**
