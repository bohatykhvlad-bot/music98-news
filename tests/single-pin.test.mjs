import test from "node:test";
import assert from "node:assert/strict";
import {enforceSinglePin} from "../functions/lib/store.js";

/* The home page renders one hero: the freshest post with pinned=true. Two
   pinned posts meant the desk held a state the site never showed, and every
   new pin needed a separate manual edit to release the old one. */

test("a new pin releases the other pinned post", () => {
  const posts = [
    {id: "old", pinned: true},
    {id: "new", pinned: false},
  ];
  const changed = enforceSinglePin(posts, "new");
  assert.equal(changed, true);
  assert.equal(posts.find(p => p.id === "old").pinned, false);
  assert.equal(posts.find(p => p.id === "new").pinned, false);
});

test("the named post keeps its own pin flag untouched", () => {
  const posts = [{id: "keep", pinned: true}];
  enforceSinglePin(posts, "keep");
  assert.equal(posts[0].pinned, true);
});

test("a writer that names no post changes nothing", () => {
  const posts = [
    {id: "a", pinned: true},
    {id: "b", pinned: true},
  ];
  const changed = enforceSinglePin(posts, "");
  assert.equal(changed, false);
  assert.equal(posts[0].pinned, true);
  assert.equal(posts[1].pinned, true);
});

test("releasing one pin leaves the others alone", () => {
  const posts = [
    {id: "a", pinned: true},
    {id: "b", pinned: false},
  ];
  const changed = enforceSinglePin(posts, "a");
  assert.equal(changed, false);
  assert.equal(posts[0].pinned, true);
  assert.equal(posts[1].pinned, false);
});

test("every other pinned post is released, not just the first", () => {
  const posts = [
    {id: "a", pinned: true},
    {id: "b", pinned: true},
    {id: "c", pinned: true},
    {id: "d", pinned: false},
  ];
  enforceSinglePin(posts, "d");
  assert.equal(posts.filter(p => p.pinned).length, 0);
});

test("a stale id releases nothing", () => {
  const posts = [
    {id: "a", pinned: true},
    {id: "b", pinned: true},
  ];
  const changed = enforceSinglePin(posts, "gone");
  assert.equal(changed, false);
  assert.equal(posts[0].pinned, true);
  assert.equal(posts[1].pinned, true);
});
