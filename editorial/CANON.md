# MUSIC98 — COMPACT EDITORIAL CANON
**Updated:** 2026-10-29  
**Priority:** Owner's latest instruction → this canon → `site/_style-memory.md` → site conventions.  
**Core rule:** Write for readers, not checkers. A technically valid but artificial article is **NOT READY**.

## 1. Facts and angle
- **Verify before writing.** Keep a source-backed registry of all checkable facts: names/styling, dates, titles, quotes, roles, charts, collaborators and superlatives. Prefer primary sources; corroborate major claims. Never invent context or present rumors, teasers or plans as completed facts.
- **A quotation is the source's own words.** Anything the article puts in quotation marks has to appear in the registry's source quotes. A paraphrase inside quote marks is a fabricated quote.
- **A registry line the article never uses is a warning.** It usually means a line was carried over from another story, which is how facts get mixed between posts.
- Establish **one clear editorial angle**. No Billboard chart-news posts and no links to competing outlets in article copy. Keep only facts that advance the story, not research clutter.

## 2. Headline, lede, length
- **News:** headline names artist + actual news; first sentence = **ARTIST + ACTION + NEWS**. **Releases:** headline follows the site's album/release-title convention; lead with artist and release, not store/label details.
- Opening must answer the headline. The `excerpt` is a **verbatim, complete-sentence prefix** of paragraph one, never a newly written teaser.
- News/Releases: normally **400+ useful words**; longreads: **1,200+**, if the subject supports it. Never pad.

## 3. Voice and structure
- Original, fluent **American English** in a human music-journalism voice. No first person, PR copy, invented listening impressions, AI filler (`new chapter`, `moving forward`, `this highlights`), hollow metaphors or forced conclusions.
- **Every paragraph adds something.** Remove tautology, repeated names/surnames, duplicated facts, list-like credits/tracks/tour dates, generic bridges and formulaic sentence openings. Check repetition **across the whole article**, not just neighboring sentences.
- **One idea, one place.** A fact, a date or a quoted title stated in two paragraphs is a defect even when the wording differs. Restate nothing: the second mention has to carry the article forward.
- **Do not lean on one pronoun.** A body that names the artist once and then says "she" for the rest of the article reads as machine prose. Vary the subject: name, restructure, or bring in the people and the facts that carry the paragraph.
- Use official artist styling; full names on first mention, then natural pronouns/restructuring. Explain unfamiliar people's roles. Avoid text walls and repetitive tiny paragraphs. No unnecessary CD/vinyl, engineer, platform, venue or ticket-sale details.
- Use song titles in **quotation marks** and correct site typography; avoid colons and semicolons. End with a **specific earned fact or observation**, not a recap, slogan, bare date, number or purchase instructions.

## 4. Photo search — mandatory
- Search in this order: **official artist/label press kits → original photographer's portfolio/official account → verified organizer/event media → other authorized editorial sources**. Confirm the **right artist, shoot/campaign, event and period**; do not grab the first image or a thumbnail.
- **The frame must show the artist of this post.** A sharp, high-resolution picture of a different artist is a worse failure than a soft picture of the right one. Before a cover ships, state plainly who is in it and where that is confirmed from.
- Obtain the **highest-resolution original** (prefer **≥1920 px wide**, ideally 2500+). Inspect real sharpness, crop and compression, not merely dimensions or HTTP status. Reject low-res, watermarked, upscaled, text-overlaid or contextually unsuitable images.
- Check **editorial usage permission**: credit is not a license. Credit the **actual photographer** (or verifiable rights holder if unknown), linking to that person's portfolio/site/official Instagram — **never the article where the photo was found**. No invented credits or automatic `Courtesy`.
- **A distributor is not a photographer.** "Apple Music", "Spotify", "YouTube", a stock library or a wire service may not stand in the credit line. Name the person who took the picture.
- **One image may serve one post.** Never reuse a frame across two posts, and never carry a frame over from another artist's story.
- **Record every image in the fact registry.** The registry carries a `## Photos` section; one line per image: the path, the source it came from, the photographer, who is in the frame, and the verified credit link. The desk and the registry must agree on all of it.
- Preserve the **original file and owner-selected crop/position/zoom**. Compare desk-preview and live crops; inspect featured square and inline images **on desktop and mobile**. No unintended face/eye cutoffs or blur. Never change approved imagery when editing only text.

## 5. Media and links
- Select relevant supporting media (usually **1–2** per standard post; **2+** for longreads). Separate embeds/photos with real prose; never end a longread on a media block. Verify playback, cropping, proportions and credits on mobile and desktop.
- Use site-approved embeds/buttons. If ticket sales genuinely matter, use the existing **Buy Tickets** component and configured Ticketmaster/Impact affiliate tracking. Check the actual destination; no broken, duplicate or gratuitous CTAs.

## 6. Editorial read and tests
- **Existing copy:** read the **entire exact current article before editing**, even for a local fix. **New copy:** research → fact registry → draft → media. Work on **one post at a time**.
- After the **last edit**, read the **entire final body** again as a reader, then check facts/chronology, AI/PR tone, name and idea repetition, paragraph rhythm, transitions, lede/excerpt and ending. Scan paragraph openings and endings separately. **Any further edit restarts final reading and checks.**
- Run the real repository checks (`editorial_readthrough.py`, `gate.py`, `preflight.py`). An automated PASS does not certify prose quality. Never claim a script passed unless it actually ran.
- The whole-article rules (`editorial_lint.py`, `photo_lint.py`, `photo_manifest.py`) run inside the gate, so they apply to every write. A rule introduced today must not punish copy the owner already approved: that debt is recorded once in `editorial/known-debt.json` and reported as a warning, while anything beyond it still fails.

## 7. Draft, publish, verify
- **Save a draft first. Publish only with explicit owner authorization for the task.** Use the guarded `scripts/post.py` commands (`create`, `set`/`replace-draft`, `publish`). **Never bypass the gate with a direct `/api/desk` write.**
- Read back saved **title, excerpt, body, type, status, dates, cover, photographer/credit URL, embeds and CTA**; confirm other posts are unchanged. After live publication, **open the real public URL**, reread the entire rendered article, inspect desktop/mobile media and test links, embeds and ticket tracking. Any fix goes through the same checks.
- Report **actual draft/live state, real check results and unresolved issues**. Mark unavailable tests **`NOT RUN`**, never `PASS`. No verified publication, visual check or `READY` claim without evidence.

**HARD STOP:** Any unverified fact, unnatural copy, invalid image/credit, missing mandatory check or unverified saved/live state = **NOT READY**.

---

## Repository note

This note is not part of the owner's canon text. It records how this repository resolves a file the canon names.

`site/_style-memory.md` is the next source after this canon. It is not in the repository. There is no `site/` directory; the public site lives in `public/`. The gitignore pattern `_style-memory.md` ignores that filename in any directory, because private house-style notes were kept out of the public tree. Do not invent a style-memory file and do not treat the gap as permission to improvise house style.

Until a real style memory is added, stop the chain at this canon, then follow behavior the site already implements: release headlines are rendered from `artist`, `title`, and `rtype` as Artist - Release Name; song titles use straight ASCII double quotes; ticket buttons use the existing Buy Tickets component and configured Ticketmaster/Impact tracking.

`cover.cardSrc` is an optional square card image; when set, the card uses it instead of cropping the main cover.
