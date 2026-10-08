/* One in-content ad, recreated only when the reader changes pages. */
(() => {
  "use strict";
  const wrapper = document.getElementById("m98DisplayAd");
  if (!wrapper) return;

  let frame = 0;
  let generation = 0;
  let displayedPage = "";

  function pageKey() {
    const article = document.getElementById("articlePage");
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (article) {
      if (!article.hidden) return path + ":article";
      // Wait for the article's asynchronous content instead of requesting an
      // ad against the temporary News view on a direct article visit.
      if (!/^\/(?:news|releases|charts?|concerts)?$/.test(path)) return "";
    }
    return path;
  }

  function schedule() {
    const currentGeneration = ++generation;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const key = pageKey();
      if (!key || key === displayedPage) return;
      window.ezstandalone.cmd.push(() => {
        if (currentGeneration !== generation || key !== pageKey()) return;
        if (displayedPage) window.ezstandalone.destroyAll();
        wrapper.hidden = false;
        wrapper.classList.remove("is-filled");
        const slot = document.createElement("div");
        slot.className = "m98-ezoic-slot";
        const width = wrapper.clientWidth;
        slot.dataset.sizes = width >= 728 ? "728x90,468x60,300x250"
          : width >= 336 ? "336x280,320x100,320x50,300x250"
          : width >= 320 ? "320x100,320x50,300x250"
          : width >= 300 ? "300x250,250x250" : "250x250";
        slot.dataset.fluid = "false";
        slot.dataset.required = "false";
        wrapper.replaceChildren(slot);
        displayedPage = key;
        window.ezstandalone.showAds("#m98DisplayAd .m98-ezoic-slot");
      });
    });
  }

  document.addEventListener("ezSlotComplete", event => {
    const detail = event.detail || {};
    const slot = detail.slotId && document.getElementById(detail.slotId);
    if (slot && wrapper.contains(slot)) {
      wrapper.hidden = detail.filled !== true;
      wrapper.classList.toggle("is-filled", detail.filled === true);
    }
  });
  window.addEventListener("music98:pagechange", schedule);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  } else {
    schedule();
  }
})();
