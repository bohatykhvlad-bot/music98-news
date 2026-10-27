# Fact registry — <post-id>

One line per checkable claim. Format:

```
- <the claim as the article states it> | <source url> | <exact quote from the source>
```

Rules (canon section 1):

- The registry is written **before** the article text. A fact that is not in the
  registry here is a fact the article is not allowed to make.
- The third column is the source's own words, not a paraphrase. A quote that
  cannot be found in the source does not belong on this line.
- Two independent sources for anything load-bearing (a headline claim, a
  number, a name, a date, a chart position). Primary sources first.
- "Not found" is not "false". If a claim cannot be confirmed, it either does not
  go into the article, or it goes in with the uncertainty the source showed.
- `python scripts/post.py facts <post-id>` extracts every year, number,
  quantified noun, quoted title, multi-word proper name and date from the body
  and fails if any of them is missing from this file. Publishing is blocked
  until this file covers the body.

Example:

```
- Super Bowl LXI halftime show is on February 14, 2027 | https://www.nfl.com/news/jay-z-halftime-show-press-release | "JAŸ-Z will perform at the Apple Music Super Bowl LXI Halftime Show at SoFi Stadium in Los Angeles, Calif. on Sunday, February 14, 2027"
```
