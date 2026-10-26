# Music98 agent operating pointer

**Authority:** latest owner instruction → `editorial/CANON.md` → `site/_style-memory.md` only if that file exists → behavior the site already implements.

`editorial/CANON.md` is the owner's compact editorial canon and the top written authority in this repository. This file does not add rules and must not contradict the canon. Read `editorial/CANON.md` completely before editing, reviewing, or saving a post.

Human reading, endings, and the hard stop live in canon sections 3, 6, and 7. Do not restate them here.

## Missing `site/_style-memory.md`

The canon names `site/_style-memory.md` next. This repository has no `site/` directory (the public site is `public/`) and no style-memory file. `.gitignore` ignores `_style-memory.md` in any directory because private house-style notes stay out of the public tree. Do not invent that file. Until a real style memory is added, stop at `editorial/CANON.md`, then follow the site: release headlines render from `artist`, `title`, and `rtype`; song titles use straight ASCII double quotes; ticket buttons use Buy Tickets with Ticketmaster/Impact tracking.

## Checks and saves

Run `scripts/editorial_readthrough.py`, `scripts/gate.py`, and `scripts/preflight.py` through `scripts/post.py` (`create`, `set`, `replace-draft`, `publish`). A mechanical PASS does not certify prose, facts, photos, or a live page. Duties the scripts cannot perform are printed as `NOT RUN` and must never be reported as PASS.

`gate.py`'s `VERIFIED_DATES` dictionary is a historical notebook of past posts. Canon section 1 asks for a source-backed registry before writing. A year in that dictionary is not verification, and a year missing from it is not a mechanical failure. Fact checks stay `NOT RUN`.

Save and publish only through `scripts/post.py`. Never POST `/api/desk` directly. News and releases need 400+ prose words; longreads need 1,200+. Do not pad.

Do not change site UI or live articles while editing the canon or these checks.
