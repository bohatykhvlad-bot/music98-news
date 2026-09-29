"use strict";

(()=>{
  const DEFAULT_SELECTOR=[
    "[data-m98-press]",
    ".nav-btn",
    ".btn",
    ".cs-btn",
    ".hint-chip",
    ".action",
    ".radius-trigger",
    ".side-tab",
    ".tour-more",
    ".map-reset-btn"
  ].join(",");

  const STYLE=`
    [data-m98-press]{
      --m98-press-scale:.96;
      transform-origin:50% 50%;
      -webkit-tap-highlight-color:transparent;
    }
    [data-m98-press].m98-pressed:not([data-m98-press-mode="pill"]){
      scale:var(--m98-press-scale);
    }
    [data-m98-press-mode="pill"]{
      position:relative;
      isolation:isolate;
      background:transparent!important;
      border-color:transparent!important;
    }
    [data-m98-press-mode="pill"]::before{
      content:"";
      position:absolute;
      z-index:-1;
      inset:var(--m98-press-inset,0);
      border:1px solid var(--m98-press-border,currentColor);
      border-radius:inherit;
      background:var(--m98-press-bg,transparent);
      transform:scale(1);
      transform-origin:50% 50%;
      transition:
        transform .09s cubic-bezier(.34,1.2,.64,1),
        background .14s ease,
        border-color .14s ease,
        filter .14s ease;
      will-change:transform;
    }
    [data-m98-press-mode="pill"].m98-pressed::before{
      transform:scale(var(--m98-press-scale,.94));
    }
    [data-m98-press-mode="pill"] .m98-press-label{
      display:grid;
      place-items:center;
      width:100%;
      height:100%;
      font-size:var(--m98-press-font,inherit);
      line-height:1;
      transform:none!important;
      translate:none!important;
      transition:none!important;
      -webkit-font-smoothing:antialiased;
      text-rendering:geometricPrecision;
    }
    [data-m98-press-mode="pill"].m98-pressed .m98-press-label{
      font-size:var(--m98-press-font-pressed,var(--m98-press-font,inherit));
    }
    @media(prefers-reduced-motion:reduce){
      [data-m98-press],[data-m98-press]::before{transition:none!important}
    }
  `;

  function injectStyle(root){
    if(root.querySelector?.("style[data-m98-press-style]")) return;
    const doc=root.ownerDocument||document;
    const style=doc.createElement("style");
    style.dataset.m98PressStyle="";
    style.textContent=STYLE;
    if(root instanceof ShadowRoot) root.append(style);
    else (doc.head||doc.documentElement).appendChild(style);
  }

  function mark(root,selector){
    root.querySelectorAll?.(selector).forEach(el=>{
      if(!el.hasAttribute("data-m98-press")) el.setAttribute("data-m98-press","");
    });
  }

  function install(root=document,selector=DEFAULT_SELECTOR){
    if(!root || root.__m98PressInstalled) return;
    Object.defineProperty(root,"__m98PressInstalled",{value:true,configurable:true});
    injectStyle(root);
    mark(root,selector);

    const find=e=>{
      const el=e.target?.closest?.(selector);
      if(!el) return null;
      if(root instanceof ShadowRoot && el.getRootNode()!==root) return null;
      return el;
    };
    const release=el=>el?.classList.remove("m98-pressed");

    root.addEventListener("pointerdown",e=>{
      if(e.button!=null && e.button!==0) return;
      const el=find(e);
      if(!el || el.disabled || el.getAttribute("aria-disabled")==="true") return;
      el.classList.add("m98-pressed");
      const done=()=>{
        release(el);
        window.removeEventListener("pointerup",done,true);
        window.removeEventListener("pointercancel",done,true);
        window.removeEventListener("blur",done,true);
      };
      window.addEventListener("pointerup",done,true);
      window.addEventListener("pointercancel",done,true);
      window.addEventListener("blur",done,true);
    },true);

    root.addEventListener("pointerleave",e=>release(find(e)),true);
    root.addEventListener("keydown",e=>{
      if(e.key!=="Enter" && e.key!==" ") return;
      const el=find(e);
      if(el) el.classList.add("m98-pressed");
    },true);
    root.addEventListener("keyup",e=>{
      if(e.key!=="Enter" && e.key!==" ") return;
      release(find(e));
    },true);

    if("MutationObserver" in window){
      const mo=new MutationObserver(records=>{
        for(const rec of records){
          for(const node of rec.addedNodes){
            if(node?.nodeType!==1) continue;
            if(node.matches?.(selector) && !node.hasAttribute("data-m98-press")) node.setAttribute("data-m98-press","");
            mark(node,selector);
          }
        }
      });
      mo.observe(root,{childList:true,subtree:true});
    }
  }

  window.Music98Press={install};
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>install(document),{once:true});
  else install(document);
})();