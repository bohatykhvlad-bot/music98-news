/* Ezoic ads for News: inline placements, fixed side rails and desktop Bottom Leaderboard. */
(() => {
  "use strict";
  const legacy = document.getElementById("m98DisplayAd");
  if (!legacy) return;
  window.ezstandalone = window.ezstandalone || {};
  window.ezstandalone.cmd = window.ezstandalone.cmd || [];
  let frame = 0;
  let generation = 0;
  let displayedPage = "";
  let requested = new Set();
  let observer;
  const fillObservers = [];

  function pageKey() {
    const article = document.getElementById("articlePage");
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (article && !article.hidden) return path + location.hash + ":article";
    if (article && !/^\/(?:news|releases|charts?|concerts)?$/.test(path)) return "";
    const active = document.querySelector(".tab.active");
    const layout = active?.id === "tab-news" ? (document.querySelector("#heroSlot .hero") ? ":hero" : ":cards") : "";
    return path + ":" + (active ? active.id : "page") + layout;
  }

  function makePlacement(position, classes) {
    const box = document.createElement("aside");
    box.className = "m98-ad-placement " + classes;
    box.dataset.adPosition = position;
    box.setAttribute("aria-label", "Advertisement");
    box.hidden = true;
    return box;
  }

  function anchorPlacement() {
    if (!matchMedia("(min-width:1100px)").matches) return [];
    let anchor = document.querySelector(".m98-ad-anchor");
    if (!anchor) {
      anchor = makePlacement("news-anchor", "m98-ad-anchor");
      document.body.append(anchor);
    }
    return [anchor];
  }

  function placements() {
    const article = document.getElementById("articlePage");
    if (article && !article.hidden && article.dataset.postType === "news") {
      const text = article.querySelector(".atext");
      if (text && !text.querySelector(".m98-ad-inline")) {
        const paragraphs = [...text.children].filter(el => el.tagName === "P" && !el.classList.contains("pcred"));
        paragraphs.forEach((p, i) => {
          if ((i + 1) % 2 === 0) p.after(makePlacement("article-paragraph-" + (i + 1), "m98-ad-inline"));
        });
      }
      const canFitRails = matchMedia("(min-width:1180px) and (min-height:500px)").matches;
      for (const side of ["left", "right"]) {
        if (!article.querySelector(".m98-ad-side-" + side)) article.append(makePlacement("article-" + side, "m98-ad-side m98-ad-side-" + side));
      }
      return [...article.querySelectorAll(".m98-ad-placement")].filter(el => !el.classList.contains("m98-ad-side") || canFitRails).concat(anchorPlacement());
    }
    const news = document.getElementById("tab-news");
    if ((!article || article.hidden) && news && news.classList.contains("active")) {
      if (document.body.classList.contains("searching")) return [];
      return [...news.querySelectorAll(".m98-ad-placement")].filter(el => el.dataset.adPosition !== "news-between" || document.querySelector("#heroSlot .hero")).concat(anchorPlacement());
    }
    return [legacy];
  }

  function formats(box) {
    if (box.classList.contains("m98-ad-anchor")) {
      const width = box.clientWidth - 24;
      return width >= 970 ? "970x90,728x90" : "728x90,468x60";
    }
    if (box.classList.contains("m98-ad-side")) {
      const height = window.innerHeight - (parseFloat(getComputedStyle(document.body).getPropertyValue("--header-h")) || 55) - 52 - 111;
      return height >= 600 ? "160x600,120x600" : "160x300,120x240";
    }
    const width = box.clientWidth;
    if (width >= 728) return "728x90,468x60";
    if (width >= 468) return "468x60,300x250";
    if (width >= 336) return "300x250,336x280,320x100";
    if (width >= 320) return "300x250,320x100,320x50";
    return width >= 300 ? "300x250,250x250" : "250x250";
  }

  function reset() {
    fillObservers.splice(0).forEach(observer => observer.disconnect());
    observer?.disconnect();
    observer = undefined;
    requested = new Set();
    document.body.classList.remove("m98-anchor-visible");
    document.querySelectorAll(".m98-ad-placement, #m98DisplayAd").forEach(box => {
      box.hidden = true;
      box.classList.remove("is-filled", "is-pending");
      box.replaceChildren();
    });
  }

  function requestAd(box, key, currentGeneration) {
    if (requested.has(box)) return;
    requested.add(box);
    window.ezstandalone.cmd.push(() => {
      if (currentGeneration !== generation || key !== pageKey() || !box.isConnected) return;
      window.ezstandalone.showAds("[data-ad-position='" + box.dataset.adPosition + "'] .m98-ezoic-slot");
    });
  }

  function schedule(force = false) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const key = pageKey();
      if (!key || (!force && key === displayedPage)) return;
      const currentGeneration = ++generation;
      const wasDisplayed = !!displayedPage;
      reset();
      if (wasDisplayed) {
        window.ezstandalone.cmd.push(() => {
          if (currentGeneration === generation) window.ezstandalone.destroyAll();
        });
      }
      const boxes = placements();
      displayedPage = key;
      if (typeof IntersectionObserver !== "undefined") {
        observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) {
            observer.unobserve(entry.target);
            requestAd(entry.target, key, currentGeneration);
          }
        }, { rootMargin: "300px 0px" });
      }
      for (const box of boxes) {
        box.hidden = false;
        const sizes = formats(box);
        box.dataset.adPosition ||= "page-bottom";
        const slot = document.createElement("div");
        slot.className = "m98-ezoic-slot";
        slot.dataset.sizes = sizes;
        slot.dataset.fluid = "false";
        slot.dataset.required = "false";
        box.append(slot);
        // Show a fixed unit only after Ezoic inserts its actual creative.
        const fillObserver = new MutationObserver(() => {
          if (currentGeneration !== generation || !box.isConnected) return;
          const creative = slot.querySelector("iframe");
          if (!creative || !(creative.width || creative.clientWidth)) return;
          box.hidden = false;
          box.classList.remove("is-pending");
          box.classList.add("is-filled");
          if (box.classList.contains("m98-ad-anchor")) document.body.classList.add("m98-anchor-visible");
        });
        fillObserver.observe(slot, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "width", "height", "style"] });
        fillObservers.push(fillObserver);
        // Collapse after the network returns no fill; keep a measurable box
        // while waiting so below-the-fold units can be requested lazily.
        box.classList.add("is-pending");
        if (observer) observer.observe(box);
        else requestAd(box, key, currentGeneration);
      }
    });
  }

  document.addEventListener("ezSlotComplete", event => {
    const detail = event.detail || {};
    const slot = detail.slotId && document.getElementById(detail.slotId);
    const box = slot?.closest(".m98-ad-placement, #m98DisplayAd");
    if (box) {
      box.hidden = detail.filled !== true;
      box.classList.remove("is-pending");
      if (box.classList.contains("m98-ad-anchor")) document.body.classList.toggle("m98-anchor-visible", !box.hidden);
      box.classList.toggle("is-filled", detail.filled === true);
    }
  });
  window.addEventListener("music98:pagechange", () => schedule());
  let resize;
  window.addEventListener("resize", () => {
    clearTimeout(resize);
    resize = setTimeout(() => schedule(true), 250);
  });
  document.getElementById("search")?.addEventListener("input", () => schedule(true));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => schedule(), { once: true });
  else schedule();
})();
