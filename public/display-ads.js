/* PurpleAds responsive banners in News, articles and the desktop Bottom Leaderboard. */
(() => {
  "use strict";
  const legacy = document.getElementById("m98DisplayAd");
  if (!legacy) return;
  const TAG_SRC = "https://cdn.prplads.com/agent.js?publisherId=a8b5333aef37b2c617460b219f13cfd6:408ff97cad4bc4f8d82425ce9a7f27c99316eb91f427d7d872f4bc7fe74866af4e29bd0a80b151e45396498d349ea060d79ae087af39972417a5318d2578efb";
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
    if (active?.id === "tab-news" && !document.querySelector("#heroSlot .hero, #newsGrid .card") && document.getElementById("newsEmpty")?.hidden) return "";
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
      const canFitRails = matchMedia("(min-width:1180px) and (min-height:818px)").matches;
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

  function format(box) {
    if (box.classList.contains("m98-ad-anchor")) return [970, 90];
    if (box.classList.contains("m98-ad-side")) return [160, 600];
    const width = box.clientWidth;
    if (width >= 728) return [728, 90];
    if (width >= 468) return [468, 60];
    if (width >= 300) return [300, 250];
    if (width >= 250) return [250, 250];
    return [200, 200];
  }

  function collapse(box) {
    box.hidden = true;
    box.classList.remove("is-filled", "is-pending");
    if (box.classList.contains("m98-ad-anchor")) document.body.classList.remove("m98-anchor-visible");
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
    if (requested.has(box) || currentGeneration !== generation || key !== pageKey() || !box.isConnected) return;
    requested.add(box);
    const slot = box.querySelector(".m98-display-slot");
    const script = document.createElement("script");
    script.src = TAG_SRC;
    script.async = true;
    script.setAttribute("data-pa-tag", "");
    script.onerror = () => { if (currentGeneration === generation) collapse(box); };
    slot.append(script);
  }

  function schedule(force = false) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const key = pageKey();
      if (!key || (!force && key === displayedPage)) return;
      const currentGeneration = ++generation;
      reset();
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
        const [width, height] = format(box);
        box.dataset.adPosition ||= "page-bottom";
        const slot = document.createElement("div");
        slot.className = "m98-display-slot";
        slot.style.width = width + "px";
        slot.style.height = height + "px";
        box.append(slot);
        // Reveal fixed units when PurpleAds inserts its creative.
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

  window.purpleDisplay = window.purpleDisplay || {};
  const previousUnfilled = window.purpleDisplay.onUnfilled;
  window.purpleDisplay.onUnfilled = placement => {
    const box = placement.element?.closest(".m98-ad-placement, #m98DisplayAd");
    if (box) collapse(box);
    else if (typeof previousUnfilled === "function") previousUnfilled(placement);
  };
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
