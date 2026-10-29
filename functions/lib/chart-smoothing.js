/* Position damping for the daily chart.
 *
 * The score of a song is rebuilt from scratch every day, so a song that
 * leaves one of the source charts overnight can lose most of its points and
 * fall twenty places in a single edition. The chart then reads as noise.
 *
 * The published position is therefore damped: a song that was at 10 and is
 * now computed at 40 is published at 25 - half of the way - and the rest of
 * the move happens on the following days, so the chart stays a daily chart
 * but stops jumping. New songs take their computed place at once; nothing
 * is held back.
 *
 * The function is shared by the publisher and by the verifier, so a published
 * edition can be recomputed from what the edition itself carries.
 */

export const DAMP_ALPHA = 0.5;

/* The damped order of `targetKeys` (the order the score produced).
 * `previousKeys` is the order of the previous published edition.
 * Returns the keys in their published order, or null when it cannot be
 * computed. */
export function dampOrder(targetKeys, previousKeys, alpha = DAMP_ALPHA, size = targetKeys && targetKeys.length) {
  if (!Array.isArray(targetKeys) || !targetKeys.length) return null;
  const n = Math.min(size || targetKeys.length, targetKeys.length);
  const a = Number(alpha);
  if (!(a > 0 && a <= 1)) return null;

  const previous = new Map();
  for (const key of previousKeys || []) {
    if (!previous.has(key)) previous.set(key, previous.size + 1);
  }

  const desired = targetKeys.map((key, i) => {
    const was = previous.get(key);
    if (was === undefined) return i + 1;          // a newcomer takes its place
    /* Half of the way, and half a place is not a place: the song keeps the
       place it has for one more day instead of moving a single step. */
    const raw = a * ((i + 1) - was);
    const step = raw >= 0 ? Math.floor(raw) : Math.ceil(raw);
    return Math.max(1, Math.min(n, was + step));
  });

  /* The songs are published in the order of the places they ask for. Nothing
     has to be pushed around to make room, so a song never jumps further than
     the distance it asked for. */
  return targetKeys
    .map((key, i) => ({ key, desired: desired[i], i }))
    .sort((a, b) => a.desired - b.desired || a.i - b.i)
    .map(x => x.key);
}
