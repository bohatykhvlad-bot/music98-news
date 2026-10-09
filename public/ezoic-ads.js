/* News placements, paragraph ads and fixed desktop article rails.
   Add ?ad-preview=1 to inspect the chosen formats without requesting ads. */
(() => {
  "use strict";
  const legacy = document.getElementById("m98DisplayAd");
  if (!legacy) return;
  const preview = window.M98_AD_PREVIEW === true || new URLSearchParams(location.search).get("ad-preview") === "1";
  window.ezstandalone = window.ezstandalone || {};
  window.ezstandalone.cmd = window.ezstandalone.cmd || [];
  let frame = 0;
  let generation = 0;
  let displayedPage = "";
  let requested = new Set();
  let observer;
  let anchorDismissed = false;

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
    if (anchorDismissed || !matchMedia("(min-width:1100px)").matches) return [];
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
      const height = window.innerHeight - (parseFloat(getComputedStyle(document.body).getPropertyValue("--header-h")) || 55) - 52 - (anchorDismissed ? 0 : 111);
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
    observer?.disconnect();
    observer = undefined;
    requested = new Set();
    document.body.classList.remove("m98-anchor-visible");
    document.querySelectorAll(".m98-ad-placement, #m98DisplayAd").forEach(box => {
      box.hidden = true;
      box.classList.remove("is-filled", "is-preview");
      box.replaceChildren();
    });
  }

  function paintPreview(box, sizes) {
    const [width, height] = sizes.split(",")[0].split("x").map(Number);
    const visual = document.createElement("div");
    visual.className = "m98-ad-preview-box";
    visual.style.setProperty("--ad-width", width + "px");
    visual.style.setProperty("--ad-height", height + "px");
    const label = document.createElement("span");
    label.textContent = "Advertisement";
    const format = document.createElement("small");
    format.textContent = width + " × " + height;
    visual.append(label, format);
    box.append(visual);
    box.classList.add("is-preview");
  }

  function addAnchorClose(box) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "m98-ad-anchor-close";
    close.setAttribute("aria-label", "Close advertisement");
    close.textContent = "×";
    close.addEventListener("click", () => {
      anchorDismissed = true;
      box.hidden = true;
      document.body.classList.remove("m98-anchor-visible");
      observer?.unobserve(box);
    });
    box.append(close);
    document.body.classList.add("m98-anchor-visible");
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
      if (!preview && wasDisplayed) {
        window.ezstandalone.cmd.push(() => {
          if (currentGeneration === generation) window.ezstandalone.destroyAll();
        });
      }
      const boxes = placements();
      displayedPage = key;
      if (!preview && typeof IntersectionObserver !== "undefined") {
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
        if (preview) {
          paintPreview(box, sizes);
          if (box.classList.contains("m98-ad-anchor")) addAnchorClose(box);
          continue;
        }
        box.dataset.adPosition ||= "page-bottom";
        const slot = document.createElement("div");
        slot.className = "m98-ezoic-slot";
        slot.dataset.sizes = sizes;
        slot.dataset.fluid = "false";
        slot.dataset.required = "false";
        box.append(slot);
        if (box.classList.contains("m98-ad-anchor")) addAnchorClose(box);
        // Collapse after the network returns no fill; keep a measurable box
        // while waiting so below-the-fold units can be requested lazily.
        box.classList.add("is-filled");
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
      box.hidden = detail.filled !== true || (anchorDismissed && box.classList.contains("m98-ad-anchor"));
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
