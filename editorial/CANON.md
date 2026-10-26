# MUSIC98 — COMPACT EDITORIAL CANON
**Updated:** 2026-10-14  
**Priority:** Owner's latest instruction → this canon → `site/_style-memory.md` → site conventions.  
**Core rule:** Write for readers, not checkers. A technically valid but artificial article is **NOT READY**.

## 1. Facts and angle
- **Verify before writing.** Keep a source-backed registry of all checkable facts: names/styling, dates, titles, quotes, roles, charts, collaborators and superlatives. Prefer primary sources; corroborate major claims. Never invent context or present rumors, teasers or plans as completed facts.
- Establish **one clear editorial angle**. No Billboard chart-news posts and no links to competing outlets in article copy. Keep only facts that advance the story, not research clutter.

## 2. Headline, lede, length
- **News:** headline names artist + actual news; first sentence = **ARTIST + ACTION + NEWS**. **Releases:** headline follows the site's album/release-title convention; lead with artist and release, not store/label details.
- Opening must answer the headline. The `excerpt` is a **verbatim, complete-sentence prefix** of paragraph one, never a newly written teaser.
- News/Releases: normally **400+ useful words**; longreads: **1,200+**, if the subject supports it. Never pad.

## 3. Voice and structure
- Original, fluent **American English** in a human music-journalism voice. No first person, PR copy, invented listening impressions, AI filler (`new chapter`, `moving forward`, `this highlights`), hollow metaphors or forced conclusions.
- **Every paragraph adds something.** Remove tautology, repeated names/surnames, duplicated facts, list-like credits/tracks/tour dates, generic bridges and formulaic sentence openings. Check repetition **across the whole article**, not just neighboring sentences.
- Use official artist styling; full names on first mention, then natural pronouns/restructuring. Explain unfamiliar people's roles. Avoid text walls and repetitive tiny paragraphs. No unnecessary CD/vinyl, engineer, platform, venue or ticket-sale details.
- Use song titles in **quotation marks** and correct site typography; avoid colons and semicolons. End with a **specific earned fact or observation**, not a recap, slogan, bare date, number or purchase instructions.

## 4. Photo search — mandatory
- Search in this order: **official artist/label press kits → original photographer's portfolio/official account → verified organizer/event media → other authorized editorial sources**. Confirm the **right artist, shoot/campaign, event and period**; do not grab the first image or a thumbnail.
- Obtain the **highest-resolution original** (prefer **≥1920 px wide**, ideally 2500+). Inspect real sharpness, crop and compression, not merely dimensions or HTTP status. Reject low-res, watermarked, upscaled, text-overlaid or contextually unsuitable images.
- Check **editorial usage permission**: credit is not a license. Credit the **actual photographer** (or verifiable rights holder if unknown), linking to that person's portfolio/site/official Instagram — **never the article where the photo was found**. No invented credits or automatic `Courtesy`.
- Preserve the **original file and owner-selected crop/position/zoom**. Compare desk-preview and live crops; inspect featured square and inline images **on desktop and mobile**. No unintended face/eye cutoffs or blur. Never change approved imagery when editing only text.

## 5. Media and links
- Select relevant supporting media (usually **1–2** per standard post; **2+** for longreads). Separate embeds/photos with real prose; never end a longread on a media block. Verify playback, cropping, proportions and credits on mobile and desktop.
- Use site-approved embeds/buttons. If ticket sales genuinely matter, use the existing **Buy Tickets** component and configured Ticketmaster/Impact affiliate tracking. Check the actual destination; no broken, duplicate or gratuitous CTAs.

## 6. Editorial read and tests
- **Existing copy:** read the **entire exact current article before editing**, even for a local fix. **New copy:** research → fact registry → draft → media. Work on **one post at a time**.
- After the **last edit**, read the **entire final body** again as a reader, then check facts/chronology, AI/PR tone, name and idea repetition, paragraph rhythm, transitions, lede/excerpt and ending. Scan paragraph openings and endings separately. **Any further edit restarts final reading and checks.**
- Run the real repository checks (`editorial_readthrough.py`, `gate.py`, `preflight.py`). An automated PASS does not certify prose quality. Never claim a script passed unless it actually ran.

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
