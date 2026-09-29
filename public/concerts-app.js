"use strict";

const CONCERTS_CSS="\n:host{\n  --bg:#fff;--bg2:#f4f6f7;--card:#fff;--card2:#edf1f2;--line:#e2e8ea;--text:#15181a;--muted:#5c6a70;\n  --muted2:#8a969b;--accent:#00fdfb;--shadow:0 12px 34px rgba(15,45,55,.10);--r:16px;\n  --event-date-size:11.5px;--event-main-size:12.5px;--event-sub-size:11px;--event-art-size:42px;--event-date-col:54px;--event-gap:8px;--event-pad-y:9px;--event-pad-x:10px;--event-radius:14px;\n  --font:\"Pretendard\",Pretendard,-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;\n}\n*{box-sizing:border-box}\nhtml{overflow-x:clip}\nbody{margin:0;padding-top:70px;background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.45;-webkit-font-smoothing:antialiased}\nbutton,input,select{font:inherit}\na{color:inherit}\n.topbar{position:fixed;inset:0 0 auto;z-index:20;background:rgba(255,255,255,.82);border-bottom:1px solid rgba(226,232,234,.85);backdrop-filter:blur(14px) saturate(170%);-webkit-backdrop-filter:blur(14px) saturate(170%)}\n.topbar-in{max-width:1180px;margin:auto;height:68px;padding:0 20px;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}\n.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:20px;letter-spacing:-.015em}\n.brand img{width:40px;height:40px;border-radius:50%}\n.nav{justify-self:center;display:flex;align-items:center;justify-content:stretch;width:430px;max-width:100%;height:40px;gap:6px;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14);padding:4px;border-radius:999px}\n.nav-btn{flex:1 1 0;min-width:0;border:0;background:transparent;color:var(--muted);font-size:14px;font-weight:600;text-decoration:none;padding:0 10px;height:32px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1;text-box:trim-both cap alphabetic;border-radius:999px;cursor:pointer;transition:.18s;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;position:relative;top:.5px}\n.nav-btn:hover{color:var(--text)}\n.nav-btn.active{background:var(--accent);color:#03282b}\n.topfill{justify-self:end;color:var(--muted);font-size:13px}\n.wrap{max-width:1180px;margin:0 auto;padding:22px 20px 50px}\n.hero{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 0 16px}\n.hero h1{font-size:clamp(30px,4vw,44px);line-height:1.05;letter-spacing:-.04em;margin:0}\n.hero p{margin:0;color:var(--muted);font-size:15px}\n.controls{display:grid;grid-template-columns:minmax(260px,1fr) 160px 122px;gap:10px;margin:0 0 16px}\n.search-wrap{position:relative}\n.city-input{width:100%;height:43px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);padding:0 16px 0 41px;outline:none;color:var(--text);font-size:14px}\n.city-input:focus,.city-input:focus-visible{border-color:var(--accent);box-shadow:0 0 0 1.5px var(--accent);outline:none}\n.search-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted2);pointer-events:none}\n.suggestions{position:absolute;z-index:30;top:49px;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}\n.suggestion{width:100%;min-height:48px;border:0;background:#fff;text-align:left;padding:7px 12px;cursor:pointer;color:var(--text);display:flex;align-items:center;gap:10px}\n.suggestion:hover,.suggestion:focus{background:var(--bg2);outline:none}\n.suggestion-art{width:36px;height:36px;flex:0 0 36px;border:1px solid var(--line);border-radius:10px;object-fit:cover;background:var(--card2)}\n.suggestion-copy{min-width:0;display:flex;flex-direction:column}\n.suggestion-title{font-size:13.5px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.suggestion-kind{font-size:10.5px;color:var(--muted);margin-top:2px}\n.suggestion-location{padding-left:14px}\n.action,.radius-trigger{height:43px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);padding:0 18px;color:var(--text);font-size:14px;font-weight:600;white-space:nowrap;font-family:var(--font);outline:none;-webkit-tap-highlight-color:transparent}\n.action{width:160px;cursor:pointer}\n.action:hover,.radius-trigger:hover{border-color:var(--line)}\n.radius-menu{position:relative;width:122px;min-width:122px;max-width:122px}\n.radius-trigger{width:122px;min-width:122px;max-width:122px;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;outline:none;font-variant-numeric:tabular-nums}\n.radius-chevron{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}\n.radius-menu.open .radius-chevron{transform:rotate(180deg)}\n.radius-options{position:absolute;z-index:40;top:calc(100% + 7px);right:0;width:122px;min-width:122px;max-width:122px;padding:5px;background:#fff;border:1px solid var(--line);border-radius:18px;box-shadow:0 12px 30px rgba(15,45,55,.13);opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-5px);transform-origin:top right;transition:opacity .14s ease,transform .16s ease,visibility .16s}\n.radius-menu.open .radius-options{opacity:1;visibility:visible;pointer-events:auto;transform:translateY(0)}\n.radius-option{width:100%;height:34px;display:flex;align-items:center;justify-content:flex-start;border:0;border-radius:999px;background:transparent;padding:0 13px;color:var(--text);font:600 13.5px/1 var(--font);cursor:pointer;white-space:nowrap}\n.radius-option:hover{background:var(--bg2)}\n.radius-option.active{background:var(--accent);color:#03282b}\n.layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start}\n.map-shell{position:relative;height:420px;min-height:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fafbfb;box-shadow:var(--shadow)}\n@media(min-width:1100px){.map-shell{width:100%;height:420px}}\n#map{position:absolute;inset:0;width:100%;height:100%;overflow:hidden}\n#map .mapboxgl-map,#map .mapboxgl-canvas-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important}\n#map .mapboxgl-canvas{display:block;margin:0!important}\n.map-status{position:absolute;z-index:5;left:14px;top:14px;max-width:min(560px,calc(100% - 28px));padding:8px 12px;border:1px solid rgba(255,255,255,.92);background:#fff;border-radius:999px;box-shadow:0 4px 14px rgba(15,45,55,.08);font-size:12.5px;color:#425158}\n.map-status:empty{display:none}\n.map-shell.artist-context .map-status{top:62px}\n.map-mode-switch{position:absolute;z-index:8;left:14px;top:14px;max-width:calc(100% - 28px);height:40px;padding:4px;display:inline-flex;align-items:center;gap:4px;border:1px solid rgba(15,60,64,.14);border-radius:999px;background:#fff;box-shadow:0 4px 14px rgba(15,45,55,.08)}\n.map-mode-switch[hidden]{display:none!important}\n.map-mode-btn{height:32px;min-width:0;max-width:220px;padding:0 16px;border:0;border-radius:999px;background-color:transparent;color:var(--muted);font:600 14px/1 var(--font);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;transition:background-color .18s ease,color .18s ease}\n.map-mode-btn.active{background-color:var(--accent);color:#03282b}\n.map-mode-btn:hover{color:var(--text)}\n.map-mode-btn.active:hover{color:#03282b}\n.map-tool-stack{position:absolute;z-index:8;right:14px;top:14px;display:flex;gap:6px}\n.map-tool-btn,.search-area-btn{border:1px solid rgba(15,60,64,.14);background:#fff;color:var(--text);font:600 12.5px/1 var(--font);box-shadow:0 4px 14px rgba(15,45,55,.08);cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}\n.map-tool-btn{height:34px;padding:0 12px;border-radius:999px}\n.map-tool-btn:hover,.search-area-btn:hover{background:var(--accent);border-color:var(--accent);color:#03282b}\n.map-tool-btn[hidden],.search-area-btn[hidden]{display:none!important}\n.map-reset-btn{position:absolute;z-index:9;right:14px;top:14px;width:38px;height:38px;border:1px solid rgba(15,60,64,.14);border-radius:999px;background:#fff;color:var(--text);display:grid;place-items:center;padding:0;font:700 24px/1 var(--font);box-shadow:0 4px 14px rgba(15,45,55,.08);cursor:pointer;outline:none;--m98-press-scale:.92}\n.map-reset-btn:hover{background:var(--accent);border-color:var(--accent);color:#03282b}\n.search-area-btn{position:absolute;z-index:8;left:50%;bottom:16px;translate:-50% 0;height:36px;padding:0 16px;border-radius:999px;white-space:nowrap}\n.side{border:1px solid var(--line);border-radius:var(--r);background:#fff;padding:13px;height:420px;min-height:420px;display:flex;flex-direction:column;box-shadow:var(--shadow);overflow:hidden}\n.side-tabs{\n  width:auto;max-width:100%;display:inline-flex;align-items:center;align-self:center;gap:4px;\n  height:40px;padding:4px;background:rgba(255,255,255,.55);\n  border:1px solid rgba(15,60,64,.14);border-radius:999px;margin:0 0 10px;\n  position:relative;top:auto;z-index:5;flex:0 0 auto;pointer-events:none\n}\n.side-tab{\n  flex:0 0 auto;width:auto;min-width:0;max-width:190px;height:32px;padding:0 18px;border:0;border-radius:999px;\n  background:transparent;color:var(--muted);font-size:14px;font-weight:600;\n  line-height:1;text-box:trim-both cap alphabetic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;\n  transition:background .16s ease,color .16s ease;pointer-events:auto;outline:none;-webkit-tap-highlight-color:transparent\n}\n.side-tab:hover{color:var(--text)}\n.side-tab.active{background:var(--accent);color:#03282b}\n.side-sub{font-size:12.5px;color:var(--muted);margin:0 4px 10px;line-height:1.4;flex:0 0 auto}\n.tours{display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-gutter:stable;padding-right:3px;overscroll-behavior:contain}\n.tour-card{\n  flex:0 0 auto;min-height:62px;\n  border:1px solid transparent;border-radius:24px;overflow:hidden;background:transparent;\n  transition:background .2s ease,border-color .2s ease,box-shadow .2s ease\n}\n.tour-card.open{\n  background:var(--bg2);border-color:var(--line);box-shadow:0 6px 18px rgba(15,45,55,.06)\n}\n.tour-row{\n  width:100%;min-height:62px;display:grid;grid-template-columns:24px 48px minmax(0,1fr) 18px;gap:8px;align-items:center;\n  border:0;background:transparent;border-radius:999px;padding:7px 8px;text-align:left;cursor:pointer;color:var(--text);\n  transition:background .16s ease\n}\n.tour-row:hover{background:var(--bg2)}\n.tour-card.open .tour-row{background:#fff}\n.tour-rank{font-weight:800;font-size:11.5px;color:#879398;text-align:center;font-variant-numeric:tabular-nums}\n.tour-art{width:48px;height:48px;padding:2px;border-radius:12px;border:1px solid var(--line);background:#fff;overflow:hidden;transition:.16s}\n.tour-art img{width:100%;height:100%;display:block;object-fit:cover;border-radius:9px;background:var(--card2)}\n.tour-card.open .tour-art{background:var(--accent);border-color:var(--accent)}\n.tour-copy{min-width:0}\n.tour-name{display:block;font-size:15px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.015em;text-rendering:geometricPrecision}\n.tour-meta{display:block;font-size:12px;color:var(--muted);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.tour-chevron{width:18px;height:18px;display:grid;place-items:center;color:var(--muted);transition:transform .18s ease}\n.tour-chevron svg{width:14px;height:14px}\n.tour-card.open .tour-chevron{transform:rotate(90deg)}\n.tour-events{\n  max-height:0;opacity:0;overflow:hidden;pointer-events:none;\n  padding:0 9px;\n  transition:max-height .28s cubic-bezier(.3,.7,.4,1),opacity .18s ease,padding .28s cubic-bezier(.3,.7,.4,1)\n}\n.tour-card.open .tour-events{\n  max-height:4800px;opacity:1;pointer-events:auto;padding:2px 9px 10px\n}\n.tour-loading,.tour-none{font-size:11.5px;color:var(--muted);padding:7px 2px 9px}\n.event-link{\n  width:100%;display:grid;grid-template-columns:var(--event-date-col) var(--event-art-size) minmax(0,1fr);gap:var(--event-gap);border:0;\n  background:rgba(255,255,255,.72);color:inherit;text-align:left;cursor:pointer;text-decoration:none;\n  padding:var(--event-pad-y) var(--event-pad-x);border-radius:var(--event-radius);margin:4px 0;align-items:center;outline:none\n}\n.event-link:hover{background:#fff}\n.event-date{font-size:var(--event-date-size);font-weight:800;color:var(--text);text-transform:uppercase;line-height:1.25;text-rendering:geometricPrecision}\n.event-art{width:var(--event-art-size);height:var(--event-art-size);border-radius:10px;object-fit:cover;background:var(--card2);display:block}\n.event-place{min-width:0}\n.event-city{display:block;font-size:var(--event-main-size);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.event-venue{display:block;font-size:var(--event-sub-size);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;text-rendering:geometricPrecision}\n.side-empty{font-size:12.5px;color:var(--muted);padding:12px 5px}\n.disclosure{margin-top:8px;padding:10px 4px 2px;font-size:10.5px;color:#7a878c;line-height:1.4;flex:0 0 auto}\n.mapboxgl-popup{max-width:var(--pop-w,286px)!important}\n.mapboxgl-popup-content{width:var(--pop-w,286px);max-width:calc(100vw - 28px);padding:0;border-radius:var(--pop-radius,15px);overflow:hidden;box-shadow:0 14px 38px rgba(15,45,55,.2);font-family:var(--font)}\n.pop-img{display:block;width:100%;height:var(--pop-img-h,142px);object-fit:cover;background:#eef2f3}\n.pop-body{padding:var(--pop-pad,13px)}\n.pop-title{font-size:var(--pop-title-size,16px);font-weight:800;line-height:1.18;margin:0 26px var(--pop-title-gap,6px) 0}\n.pop-meta{font-size:var(--pop-meta-size,13px);color:#56656b;margin:var(--pop-meta-gap,3px) 0}\n.venue-list{max-height:var(--venue-list-h,190px);overflow:auto;padding:2px 0 0;scrollbar-width:thin}\n.buy{position:relative;isolation:isolate;width:112px;max-width:100%;height:36px;margin:10px auto 0;padding:0;border:0;border-radius:999px;background:transparent;color:var(--text);text-decoration:none;font-family:var(--font);font-weight:700;outline:none;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;transition:color .16s ease;--m98-press-inset:1px 2px;--m98-press-bg:#fff;--m98-press-border:var(--line);--m98-press-scale:.92;--m98-press-font:13px;--m98-press-font-pressed:12px}\n.buy-label{position:relative;width:100%;height:100%;white-space:nowrap}\n.mapboxgl-popup-close-button{font-size:20px;padding:5px 8px;color:#344}\n.mapboxgl-ctrl-group{border-radius:11px!important;overflow:hidden}\n.action,.radius-trigger,.side-tab,.tour-row,.event-link,.suggestion,.mapboxgl-ctrl button{\n  transform:none!important;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,color .16s ease;\n}\n.action:active,.radius-trigger:active,.side-tab:active,.tour-row:active,.event-link:active,.suggestion:active,.mapboxgl-ctrl button:active{transform:none!important}\n.buy:hover{--m98-press-bg:var(--accent);--m98-press-border:var(--accent);color:#03282b}\n@media(prefers-reduced-motion:reduce){\n  .action,.radius-trigger,.side-tab,.tour-row,.event-link,.buy,.suggestion,.mapboxgl-ctrl button{transition:none}\n}\n@media(max-width:900px){\n  .layout{grid-template-columns:1fr}\n  .map-shell{height:420px}\n  .side{height:auto;max-height:620px}\n  .topfill{display:none}\n}\n@media(max-width:700px){\n  body{padding-top:126px}\n  .topbar-in{height:auto;min-height:118px;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px}\n  .brand{font-size:17px}\n  .brand img{width:32px;height:32px}\n  .nav{order:3;width:100%;height:48px;gap:4px;padding:4px;justify-content:stretch;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14)}\n  .nav-btn{flex:1;height:40px;padding:0 8px;font-size:13px;justify-content:center}\n  .wrap{padding:18px 14px 36px}\n  .hero{align-items:flex-start;flex-direction:column}\n  .controls{grid-template-columns:minmax(0,1.35fr) minmax(96px,.65fr);gap:8px}\n  .search-wrap{grid-column:1/-1}\n  .city-input,.action,.radius-trigger{height:46px}\n  .action,.radius-menu,.radius-trigger{width:100%;min-width:0;max-width:none}.action,.radius-trigger{padding:0 12px}\n  .radius-options{width:100%;min-width:100%;max-width:none}\n  .radius-option{height:42px}\n  .suggestions{top:52px;max-height:min(55svh,360px);overflow-y:auto;overscroll-behavior:contain}\n  .map-shell{height:min(58svh,460px);min-height:350px;max-height:460px;border-radius:15px}\n  .map-mode-switch{left:10px;top:10px;max-width:calc(100% - 20px)}\n  .map-mode-btn{height:36px;padding:0 13px;font-size:13px}\n  .map-tool-stack{left:52px;right:52px;top:auto;bottom:10px;gap:5px;justify-content:center}\n  .map-tool-btn{height:40px;padding:0 12px;font-size:12px}\n  .map-reset-btn{right:10px;top:10px;width:40px;height:40px}\n  .search-area-btn{bottom:60px;height:40px}\n  .map-shell.artist-context .map-status{top:60px}\n  .mapboxgl-ctrl button{width:42px!important;height:42px!important}\n  .mapboxgl-popup-close-button{width:40px;height:40px;padding:0;display:grid;place-items:center;line-height:1}\n  .side{border-radius:15px;max-height:none}\n  .side-tabs{height:44px}\n  .side-tab{height:36px}\n  .tours{overflow:visible;padding-right:0;scrollbar-gutter:auto}\n  .tour-events{padding-left:9px}\n  .buy{min-height:38px}\n}\n@media(max-width:390px){\n  .controls{grid-template-columns:minmax(0,1fr) 104px}\n  .action,.radius-trigger{font-size:13px;padding:0 10px}\n  .map-shell{min-height:330px;height:54svh}\n}\n\n:host{display:block;width:100%;font-family:var(--font);color:var(--text);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\n.wrap{padding:0 0 18px;max-width:none}\n.hero{margin:0 0 16px;align-items:center}\n.hero h1{font-size:clamp(26px,4vw,38px);line-height:1.15;letter-spacing:-.03em;margin:0}\n.hero p{font-size:15px}\n\n.tour-more{width:fit-content;max-width:100%;height:32px;padding:0 16px;margin:5px auto 5px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:999px;background:var(--bg2);color:var(--text);font-size:12.5px;font-weight:600;line-height:1;text-box:trim-both cap alphabetic;cursor:pointer;outline:none;transform-origin:center;transition:transform .12s cubic-bezier(.34,1.2,.64,1),background .15s ease,border-color .15s ease,box-shadow .15s ease;-webkit-tap-highlight-color:transparent;will-change:transform}.tour-more:hover{background:#fff;border-color:#a9b6bb;box-shadow:0 1px 3px rgba(15,30,34,.07)}.tour-more:active{transform:scale(.96);background:#fff;border-color:#8a979c;box-shadow:inset 0 2px 4px rgba(15,30,34,.08)}\n\n.venue-event{width:100%;border:0;background:rgba(255,255,255,.72);border-radius:var(--event-radius);padding:var(--event-pad-y) var(--event-pad-x);display:grid;grid-template-columns:var(--event-date-col) var(--event-art-size) minmax(0,1fr);gap:var(--event-gap);align-items:center;text-align:left;color:var(--text);cursor:pointer;outline:none;margin:4px 0}\n.venue-event:hover{background:#fff}\n.venue-event-date{font-size:var(--event-date-size);font-weight:800;text-transform:uppercase;line-height:1.25}\n.venue-event-art{width:var(--event-art-size);height:var(--event-art-size);border-radius:10px;object-fit:cover;background:var(--card2);display:block}\n.venue-event-copy{min-width:0}\n.venue-event-name{display:block;font-size:var(--event-main-size);font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.venue-event-time{display:block;font-size:var(--event-sub-size);color:var(--muted);margin-top:2px}\n";
const CONCERTS_HTML="<main class=\"wrap\">\n  <section class=\"hero\">\n    <div>\n      <h1>Concerts Near You</h1>\n      \n    </div>\n  </section>\n\n  <div class=\"controls\">\n    <div class=\"search-wrap\">\n      <svg class=\"search-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>\n      <input class=\"city-input\" id=\"citySearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search city or artist...\" aria-label=\"Search city or artist\">\n      <div class=\"suggestions\" id=\"suggestions\" hidden></div>\n    </div>\n    <button class=\"action\" id=\"locateBtn\" type=\"button\">Use my location</button>\n    <div class=\"radius-menu\" id=\"radiusMenu\">\n      <input id=\"radius\" type=\"hidden\" value=\"100\">\n      <button class=\"radius-trigger\" id=\"radiusTrigger\" type=\"button\" aria-haspopup=\"listbox\" aria-expanded=\"false\">\n        <span id=\"radiusLabel\">100 km</span>\n        <svg class=\"radius-chevron\" viewBox=\"0 0 20 20\" aria-hidden=\"true\"><path d=\"m6 8 4 4 4-4\"/></svg>\n      </button>\n      <div class=\"radius-options\" id=\"radiusOptions\" role=\"listbox\" aria-label=\"Search radius\">\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"25\" aria-selected=\"false\">25 km</button>\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"50\" aria-selected=\"false\">50 km</button>\n        <button class=\"radius-option active\" type=\"button\" role=\"option\" data-value=\"100\" aria-selected=\"true\">100 km</button>\n        <button class=\"radius-option\" type=\"button\" role=\"option\" data-value=\"250\" aria-selected=\"false\">250 km</button>\n      </div>\n    </div>\n  </div>\n\n  <div class=\"layout\">\n    <section class=\"map-shell\" id=\"mapShell\" aria-label=\"Concert map\">\n      <div id=\"map\"></div>\n      <div class=\"map-mode-switch\" id=\"mapModeSwitch\" role=\"tablist\" aria-label=\"Map concert filter\" hidden>\n        <button class=\"map-mode-btn active\" id=\"mapArtistBtn\" type=\"button\" role=\"tab\" aria-selected=\"true\">Artist</button>\n        <button class=\"map-mode-btn\" id=\"mapAllBtn\" type=\"button\" role=\"tab\" aria-selected=\"false\">All concerts</button>\n      </div>\n      <div class=\"map-tool-stack\" hidden aria-hidden=\"true\">\n        <button class=\"map-tool-btn\" id=\"overviewBtn\" type=\"button\" tabindex=\"-1\">Overview</button>\n        <button class=\"map-tool-btn\" id=\"fitBtn\" type=\"button\" tabindex=\"-1\" hidden>Fit results</button>\n      </div>\n      <button class=\"map-reset-btn\" id=\"resetMapBtn\" type=\"button\" aria-label=\"Reset filters and zoom out\" title=\"Reset filters and zoom out\">−</button>\n      <button class=\"search-area-btn\" id=\"searchAreaBtn\" type=\"button\" hidden>Search this area</button>\n      <div class=\"map-status\" id=\"status\"></div>\n    </section>\n    <aside class=\"side\">\n      <div class=\"side-tabs\" role=\"tablist\" aria-label=\"Concert discovery\">\n        <button class=\"side-tab\" id=\"nearTab\" type=\"button\" role=\"tab\" aria-selected=\"false\">Near me</button>\n        <button class=\"side-tab active\" id=\"popularTab\" type=\"button\" role=\"tab\" aria-selected=\"true\">Popular</button>\n      </div>\n      <p class=\"side-sub\" id=\"sideSub\">Top 30 popular artists with upcoming Ticketmaster shows.</p>\n      <div class=\"tours\" id=\"tours\"></div>\n      <div class=\"side-empty\" id=\"sideEmpty\">Loading popular artists...</div>\n      <p class=\"disclosure\">Ticketing by Ticketmaster.</p>\n    </aside>\n  </div>\n</main>";

function ensureMapbox(){
  if(window.mapboxgl) return Promise.resolve(window.mapboxgl);
  if(window.__music98MapboxPromise) return window.__music98MapboxPromise;
  window.__music98MapboxPromise=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.js";
    s.onload=()=>resolve(window.mapboxgl);
    s.onerror=()=>reject(new Error("mapbox_load_failed"));
    document.head.appendChild(s);
  });
  return window.__music98MapboxPromise;
}

function initConcerts(root,host){

const MAPBOX_TOKEN = "pk.eyJ1IjoibXVzaWM5OCIsImEiOiJjbXVsaWM1M2kxbm4xMnpxeW83bWR5aHg5In0.8Y56YcxjJ3kpa5g51Yl3aw";
mapboxgl.accessToken = MAPBOX_TOKEN;

const STATIC_HUBS=[
  // Europe: permanent capital entry points.
  ["London","","GB",51.5074,-0.1278],["Dublin","","IE",53.3498,-6.2603],["Paris","","FR",48.8566,2.3522],
  ["Madrid","","ES",40.4168,-3.7038],["Lisbon","","PT",38.7223,-9.1393],["Berlin","","DE",52.5200,13.4050],
  ["Vienna","","AT",48.2082,16.3738],["Prague","","CZ",50.0755,14.4378],["Warsaw","","PL",52.2297,21.0122],
  ["Amsterdam","","NL",52.3676,4.9041],["Brussels","","BE",50.8503,4.3517],["Bern","","CH",46.9480,7.4474],
  ["Rome","","IT",41.9028,12.4964],["Copenhagen","","DK",55.6761,12.5683],["Oslo","","NO",59.9139,10.7522],
  ["Stockholm","","SE",59.3293,18.0686],["Helsinki","","FI",60.1699,24.9384],["Reykjavik","","IS",64.1466,-21.9426],
  ["Athens","","GR",37.9838,23.7275],["Budapest","","HU",47.4979,19.0402],["Bucharest","","RO",44.4268,26.1025],
  ["Sofia","","BG",42.6977,23.3219],["Zagreb","","HR",45.8150,15.9819],["Ljubljana","","SI",46.0569,14.5058],
  ["Bratislava","","SK",48.1486,17.1077],["Tallinn","","EE",59.4370,24.7536],["Riga","","LV",56.9496,24.1052],
  ["Vilnius","","LT",54.6872,25.2797],["Luxembourg","","LU",49.6116,6.1319],["Valletta","","MT",35.8989,14.5146],
  ["Nicosia","","CY",35.1856,33.3823],["Belgrade","","RS",44.7866,20.4489],["Podgorica","","ME",42.4304,19.2594],
  ["Sarajevo","","BA",43.8563,18.4131],["Skopje","","MK",41.9981,21.4254],["Tirana","","AL",41.3275,19.8187],
  ["Chisinau","","MD",47.0105,28.8638],["Kyiv","","UA",50.4501,30.5234],["Ankara","","TR",39.9334,32.8597],
  ["Tbilisi","","GE",41.7151,44.8271],["Baku","","AZ",40.4093,49.8671],["Yerevan","","AM",40.1792,44.4991],
  ["Andorra la Vella","","AD",42.5063,1.5218],["Monaco","","MC",43.7384,7.4246],

  // United States: every state capital + Washington, D.C.
  ["Montgomery","AL","US",32.3777,-86.3006],["Juneau","AK","US",58.3019,-134.4197],["Phoenix","AZ","US",33.4484,-112.0740],
  ["Little Rock","AR","US",34.7465,-92.2896],["Sacramento","CA","US",38.5816,-121.4944],["Denver","CO","US",39.7392,-104.9903],
  ["Hartford","CT","US",41.7658,-72.6734],["Dover","DE","US",39.1582,-75.5244],["Tallahassee","FL","US",30.4383,-84.2807],
  ["Atlanta","GA","US",33.7490,-84.3880],["Honolulu","HI","US",21.3070,-157.8584],["Boise","ID","US",43.6150,-116.2023],
  ["Springfield","IL","US",39.7989,-89.6440],["Indianapolis","IN","US",39.7684,-86.1581],["Des Moines","IA","US",41.5868,-93.6250],
  ["Topeka","KS","US",39.0473,-95.6752],["Frankfort","KY","US",38.2009,-84.8777],["Baton Rouge","LA","US",30.4515,-91.1871],
  ["Augusta","ME","US",44.3106,-69.7795],["Annapolis","MD","US",38.9784,-76.4922],["Boston","MA","US",42.3601,-71.0589],
  ["Lansing","MI","US",42.7325,-84.5555],["Saint Paul","MN","US",44.9537,-93.0900],["Jackson","MS","US",32.2988,-90.1848],
  ["Jefferson City","MO","US",38.5767,-92.1735],["Helena","MT","US",46.5891,-112.0391],["Lincoln","NE","US",40.8136,-96.7026],
  ["Carson City","NV","US",39.1638,-119.7674],["Concord","NH","US",43.2081,-71.5376],["Trenton","NJ","US",40.2171,-74.7429],
  ["Santa Fe","NM","US",35.6870,-105.9378],["Albany","NY","US",42.6526,-73.7562],["Raleigh","NC","US",35.7796,-78.6382],
  ["Bismarck","ND","US",46.8083,-100.7837],["Columbus","OH","US",39.9612,-82.9988],["Oklahoma City","OK","US",35.4676,-97.5164],
  ["Salem","OR","US",44.9429,-123.0351],["Harrisburg","PA","US",40.2732,-76.8867],["Providence","RI","US",41.8240,-71.4128],
  ["Columbia","SC","US",34.0007,-81.0348],["Pierre","SD","US",44.3683,-100.3510],["Nashville","TN","US",36.1627,-86.7816],
  ["Austin","TX","US",30.2672,-97.7431],["Salt Lake City","UT","US",40.7608,-111.8910],["Montpelier","VT","US",44.2601,-72.5754],
  ["Richmond","VA","US",37.5407,-77.4360],["Olympia","WA","US",47.0379,-122.9007],["Charleston","WV","US",38.3498,-81.6326],
  ["Madison","WI","US",43.0731,-89.4012],["Cheyenne","WY","US",41.1400,-104.8202],["Washington","DC","US",38.9072,-77.0369],

  // Other permanent Ticketmaster-oriented major markets/capitals worldwide.
  ["New York","NY","US",40.7128,-74.0060],["Los Angeles","CA","US",34.0522,-118.2437],["Chicago","IL","US",41.8781,-87.6298],
  ["Toronto","ON","CA",43.6532,-79.3832],["Ottawa","ON","CA",45.4215,-75.6972],["Vancouver","BC","CA",49.2827,-123.1207],
  ["Mexico City","","MX",19.4326,-99.1332],["Monterrey","","MX",25.6866,-100.3161],["São Paulo","","BR",-23.5505,-46.6333],
  ["Brasilia","","BR",-15.7939,-47.8828],["Buenos Aires","","AR",-34.6037,-58.3816],["Santiago","","CL",-33.4489,-70.6693],
  ["Bogota","","CO",4.7110,-74.0721],["Lima","","PE",-12.0464,-77.0428],["San Jose","","CR",9.9281,-84.0907],
  ["Panama City","","PA",8.9824,-79.5199],["San Juan","PR","US",18.4655,-66.1057],
  ["Dubai","","AE",25.2048,55.2708],["Abu Dhabi","","AE",24.4539,54.3773],["Doha","","QA",25.2854,51.5310],
  ["Riyadh","","SA",24.7136,46.6753],["Tokyo","","JP",35.6762,139.6503],["Seoul","","KR",37.5665,126.9780],
  ["Singapore","","SG",1.3521,103.8198],["Bangkok","","TH",13.7563,100.5018],["Manila","","PH",14.5995,120.9842],
  ["Kuala Lumpur","","MY",3.1390,101.6869],["Jakarta","","ID",-6.2088,106.8456],["Hong Kong","","HK",22.3193,114.1694],
  ["Taipei","","TW",25.0330,121.5654],["Mumbai","MH","IN",19.0760,72.8777],["New Delhi","DL","IN",28.6139,77.2090],
  ["Sydney","NSW","AU",-33.8688,151.2093],["Melbourne","VIC","AU",-37.8136,144.9631],["Brisbane","QLD","AU",-27.4698,153.0251],
  ["Perth","WA","AU",-31.9505,115.8605],["Auckland","","NZ",-36.8509,174.7645],["Johannesburg","","ZA",-26.2041,28.0473],
  ["Cape Town","","ZA",-33.9249,18.4241]
].map(([city,stateCode,countryCode,lat,lng])=>({city,stateCode,countryCode,lat,lng,count:0,static:1}));
let hotspots=mergeStaticHubSeed();
function mergeStaticHubSeed(){ return STATIC_HUBS.map(h=>({...h})); }

const map = new mapboxgl.Map({
  container:root.querySelector("#map"),
  style:"mapbox://styles/mapbox/light-v11",
  projection:"mercator",
  center:[12,49],
  zoom:2.45,
  renderWorldCopies:false,
  attributionControl:true
});
try{map.dragRotate.disable();}catch(e){}
try{map.touchZoomRotate.disableRotation();}catch(e){}
map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");

const $ = (s)=>root.querySelector(s);
const statusEl=$("#status"), toursEl=$("#tours"), sideEmpty=$("#sideEmpty");
const sideSub=$("#sideSub"), search=$("#citySearch"), suggestions=$("#suggestions"), radiusEl=$("#radius");
const radiusMenu=$("#radiusMenu"), radiusTrigger=$("#radiusTrigger"), radiusLabel=$("#radiusLabel"), radiusOptions=$("#radiusOptions");
const nearTab=$("#nearTab"), popularTab=$("#popularTab");
const mapShell=$("#mapShell"), mapModeSwitch=$("#mapModeSwitch"), mapArtistBtn=$("#mapArtistBtn"), mapAllBtn=$("#mapAllBtn");
const overviewBtn=$("#overviewBtn"), fitBtn=$("#fitBtn"), resetMapBtn=$("#resetMapBtn"), searchAreaBtn=$("#searchAreaBtn");

let currentEvents=[];
let artistMapEvents=[];
let nearbyEvents=[];
let nearbyTotal=0;
let currentTotal=0;
let popularEvents=[];
let popularArtists=[];
const ZERO_QUOTA_POPULAR_SUPPLEMENT=[
  // Current Ticketmaster public pages checked 2026-09-29. One real event is
  // embedded for each fallback so expanding these rows costs zero Worker/API quota.
  {name:"Teddy Swims",image:"",shows:73,eventConfirmed:true,webVerified:true,popularityRank:1001,
   events:[{id:"web-teddy-swims-20261002",artist:"Teddy Swims",name:"Teddy Swims: The UGLY Tour",date:"2026-10-02",time:"19:00:00",city:"Brooklyn",state:"NY",country:"United States",venue:"Barclays Center",url:"https://www.ticketmaster.com/teddy-swims-tickets/artist/2712573"}]},
  {name:"Chris Stapleton",image:"",shows:6,eventConfirmed:true,webVerified:true,popularityRank:1002,
   events:[{id:"web-chris-stapleton-20261002",artist:"Chris Stapleton",name:"Chris Stapleton's All-American Road Show",date:"2026-10-02",time:"19:30:00",city:"Bristow",state:"VA",country:"United States",venue:"Jiffy Lube Live",url:"https://www.ticketmaster.com/chris-stapleton-tickets/artist/1828177"}]},
  {name:"Twenty One Pilots",image:"",shows:10,eventConfirmed:true,webVerified:true,popularityRank:1003,
   events:[{id:"web-twenty-one-pilots-20261004",artist:"Twenty One Pilots",name:"Austin City Limits Music Festival - Weekend One",date:"2026-10-04",time:"12:00:00",city:"Austin",state:"TX",country:"United States",venue:"Zilker Park",url:"https://www.ticketmaster.com/twenty-one-pilots-tickets/artist/1495843"}]},
  {name:"Luke Combs",image:"",shows:12,eventConfirmed:true,webVerified:true,popularityRank:1004,
   events:[{id:"web-luke-combs-20270403",artist:"Luke Combs",name:"Luke Combs w/ Treaty Oak Revival",date:"2027-04-03",time:"17:20:00",city:"Arlington",state:"TX",country:"United States",venue:"AT&T Stadium",url:"https://www.ticketmaster.com/luke-combs-tickets/artist/2150342"}]},
  {name:"Benson Boone",image:"",shows:1,eventConfirmed:true,webVerified:true,popularityRank:1005,
   events:[{id:"web-benson-boone-20261102",artist:"Benson Boone",name:"Benson Boone – Live in Singapore",date:"2026-11-02",time:"20:00:00",city:"Singapore",state:"",country:"Singapore",venue:"The Star Theatre",url:"https://www.ticketmaster.com/benson-boone-tickets/artist/2892837"}]}
];

function withVerifiedPopularSupplement(rows){
  const out=[];
  const seenIds=new Set(),seenNames=new Set();
  const add=item=>{
    const id=String(item?.id||"").trim().toLowerCase();
    const name=String(item?.name||"").trim().toLowerCase();
    if(!id && !name) return;
    if((id && seenIds.has(id)) || (name && seenNames.has(name))) return;
    if(id) seenIds.add(id);
    if(name) seenNames.add(name);
    out.push({...item});
  };
  (rows||[]).forEach(add);
  if(out.length<30) ZERO_QUOTA_POPULAR_SUPPLEMENT.forEach(add);
  return out.slice(0,30).map((item,i)=>({...item,rank:i+1}));
}
let lastArea=null;
let activeMode="popular";
let suggestTimer=0;
let suggestSeq=0;
let areaRequestSeq=0;
let popularRequestSeq=0;
let popup=null;
let userMoving=false;
let pendingAreaSearch=null;
let expandedKey="";
let artistContext=null;
const artistEventCache=new Map();
const payloadCache=new Map();
const payloadInflight=new Map();
const PAYLOAD_CACHE_MS=3*60*1000;

function setStatus(s){
  const value=String(s||"");
  statusEl.textContent=/^loading concerts?(?: data)?/i.test(value) ? "" : value;
}
function hidePendingAreaSearch(){
  pendingAreaSearch=null;
  searchAreaBtn.hidden=true;
}
function syncFitButton(){
  const pool=activeMode==="artist" ? artistMapEvents : currentEvents;
  fitBtn.hidden=!(Array.isArray(pool) && pool.length);
}
function closePopup(){
  if(!popup) return;
  const own=popup;
  own.remove();
  if(popup===own) popup=null;
}
function fmtDate(e){
  if(!e.date) return "Date TBA";
  const d=new Date(e.date+"T12:00:00");
  return new Intl.DateTimeFormat(undefined,{month:"short",day:"numeric",year:"numeric"}).format(d);
}
function shortDate(e){
  if(!e.date) return "TBA";
  const d=new Date(e.date+"T12:00:00");
  return new Intl.DateTimeFormat("en",{month:"short",day:"numeric"}).format(d).toUpperCase();
}
function placeLine(e){ return [e.venue,e.city,e.state,e.country].filter(Boolean).join(" · "); }
function artistKey(a){ return String(a.id||a.attractionId||a.name||"").toLowerCase(); }

function setLayerVisible(id,visible){
  if(map.getLayer(id)) map.setLayoutProperty(id,"visibility",visible?"visible":"none");
}
function syncModeTabs(){
  const near=artistContext ? artistContext.sourceMode==="nearby" : activeMode==="nearby";
  nearTab.textContent="Near me";
  nearTab.title="";
  popularTab.textContent="Popular";
  popularTab.title="";
  nearTab.classList.toggle("active",near);
  popularTab.classList.toggle("active",!near);
  nearTab.setAttribute("aria-selected",near?"true":"false");
  popularTab.setAttribute("aria-selected",near?"false":"true");
}
function syncMapModeSwitch(){
  const visible=!!artistContext && (activeMode==="artist" || activeMode==="artist-area");
  mapModeSwitch.hidden=!visible;
  mapShell.classList.toggle("artist-context",visible);
  if(!visible) return;
  const artistActive=activeMode==="artist";
  mapArtistBtn.textContent=artistContext.item?.name||"Artist";
  mapArtistBtn.title=artistContext.item?.name||"Artist";
  mapArtistBtn.classList.toggle("active",artistActive);
  mapAllBtn.classList.toggle("active",!artistActive);
  mapArtistBtn.setAttribute("aria-selected",artistActive?"true":"false");
  mapAllBtn.setAttribute("aria-selected",artistActive?"false":"true");
}
function applyMapMode(){
  const artist=activeMode==="artist";
  const area=activeMode==="nearby" || activeMode==="artist-area";
  const popular=activeMode==="popular";
  const overview=map.getZoom()<4.7;
  const showHubs=popular || overview;
  const showArea=area && !overview;
  ["artist-points","artist-hit"].forEach(id=>setLayerVisible(id,artist));
  ["clusters","cluster-hit","event-points","event-hit","event-labels"].forEach(id=>setLayerVisible(id,showArea));
  [
    "capital-points","capital-labels","hub-hit-capital",
    "city-major-points","city-major-labels","hub-hit-major",
    "city-mid-points","city-mid-labels","hub-hit-mid",
    "city-all-points","city-all-labels","hub-hit-all"
  ].forEach(id=>setLayerVisible(id,showHubs));
  if(map.getLayer("cluster-count")) setLayerVisible("cluster-count",false);
}
function setMode(mode){
  activeMode=mode;
  if(mode!=="nearby" && mode!=="artist-area") hidePendingAreaSearch();
  syncModeTabs();
  syncMapModeSwitch();
  applyMapMode();
  syncFitButton();
}

function toGeoJSON(events){
  const valid=(events||[]).filter(e=>{
    const lat=Number(e?.lat),lng=Number(e?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&!(Math.abs(lat)<1e-7&&Math.abs(lng)<1e-7);
  });
  return {
    type:"FeatureCollection",
    features:valid.map(e=>({
      type:"Feature",
      geometry:{type:"Point",coordinates:[Number(e.lng),Number(e.lat)]},
      properties:{id:e.id,artist:e.artist,name:e.name,label:shortDate(e)+"\n"+e.artist}
    }))
  };
}

const EUROPE_CAPITALS={
  FR:["paris"],ES:["madrid"],DE:["berlin"],AT:["vienna","wien"],CZ:["prague","praha"],PL:["warsaw","warszawa"],
  GB:["london"],IE:["dublin"],ND:["belfast"],NL:["amsterdam"],BE:["brussels","bruxelles","brussel"],
  CH:["bern","berne"],IT:["rome","roma"],PT:["lisbon","lisboa"],SE:["stockholm"],NO:["oslo"],DK:["copenhagen","kobenhavn"],
  FI:["helsinki"],IS:["reykjavik"],GR:["athens","athina"],HU:["budapest"],RO:["bucharest","bucuresti"],
  BG:["sofia"],HR:["zagreb"],SI:["ljubljana"],SK:["bratislava"],EE:["tallinn"],LV:["riga"],LT:["vilnius"],
  LU:["luxembourg"],MT:["valletta"],CY:["nicosia","lefkosia"],RS:["belgrade","beograd"],ME:["podgorica"],
  AD:["andorra la vella"],MC:["monaco"],TR:["ankara"],UA:["kyiv","kiev"],GE:["tbilisi"],AZ:["baku"]
};
function normPlaceName(v){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}
function isEuropeanCapital(h){
  const names=EUROPE_CAPITALS[String(h?.countryCode||"").toUpperCase()];
  if(!names) return false;
  const n=normPlaceName(h?.city);
  return names.some(x=>normPlaceName(x)===n);
}
function hubsGeoJSON(){
  const capitals=hotspots.filter(isEuropeanCapital);
  const fallback=new Set(
    capitals.length ? [] : hotspots.slice().sort((a,b)=>Number(b.count||0)-Number(a.count||0)).slice(0,12)
  );
  return {
    type:"FeatureCollection",
    features:hotspots.map(h=>{
      const capital=isEuropeanCapital(h);\n      const permanent=Number(h?.static||0)===1;
      const cc=String(h.countryCode||"").toUpperCase();
      const europe=!!EUROPE_CAPITALS[cc];
      const count=Number(h.count||0);
      const outsideMajor=!europe && count>=40;
      return {
        type:"Feature",
        geometry:{type:"Point",coordinates:[h.lng,h.lat]},
        properties:{
          name:h.city,countryCode:cc,count,
          capital:capital?1:0,
          static:permanent?1:0,\n          overview:(permanent||capital||outsideMajor||fallback.has(h))?1:0
        }
      };
    })
  };
}

function setEventData(events,total=null){
  currentEvents=events||[];
  currentTotal=Number(total==null ? currentEvents.length : total) || 0;
  const src=map.getSource("events");
  if(src) src.setData(toGeoJSON(currentEvents));
  if(map.getLayer("cluster-count")) setLayerVisible("cluster-count",false);
  syncFitButton();
}

function setArtistMapData(events){
  artistMapEvents=events||[];
  const src=map.getSource("artist-events");
  if(src) src.setData(toGeoJSON(artistMapEvents));
  syncFitButton();
}


function addConcertTriangle(){
  if(map.hasImage("m98-triangle")) return;
  const canvas=document.createElement("canvas");
  canvas.width=40; canvas.height=40;
  const ctx=canvas.getContext("2d");
  ctx.clearRect(0,0,40,40);
  ctx.beginPath();
  ctx.moveTo(7,8);
  ctx.lineTo(33,8);
  ctx.lineTo(20,34);
  ctx.closePath();
  ctx.fillStyle="#00fdfb";
  ctx.fill();
  ctx.lineWidth=3;
  ctx.strokeStyle="rgba(255,255,255,.96)";
  ctx.lineJoin="round";
  ctx.stroke();
  map.addImage("m98-triangle",ctx.getImageData(0,0,40,40),{pixelRatio:2});
}

function addTopographicRelief(){
  try{
  const layers=map.getStyle()?.layers||[];
  for(const layer of layers){
    const id=String(layer.id||"");
    try{
      if(layer.type==="background"){
        map.setPaintProperty(id,"background-color","#fbfcfc");
      }
      if(layer.type==="fill" && /(^land$|land-|park|landcover|landuse|wood|grass|scrub|pitch|golf|cemetery)/i.test(id)){
        map.setPaintProperty(id,"fill-color","#f7f8f8");
        map.setPaintProperty(id,"fill-opacity",.88);
      }
      if(layer.type==="fill" && /building/i.test(id)){
        map.setPaintProperty(id,"fill-color","#f1f3f4");
        map.setPaintProperty(id,"fill-opacity",.82);
      }
      if(layer.type==="fill" && /water/i.test(id)){
        map.setPaintProperty(id,"fill-color","#e7f3f7");
      }
      if(layer.type==="line" && /waterway|river|canal|stream/i.test(id)){
        map.setPaintProperty(id,"line-color","#d5eaf0");
      }else if(layer.type==="line" && /(admin|boundary|country|state)/i.test(id)){
        map.setPaintProperty(id,"line-color","#cfd7da");
      }else if(layer.type==="line" && /(road|street|motorway|trunk|primary|secondary|tertiary)/i.test(id)){
        map.setPaintProperty(id,"line-color",/(motorway|trunk|primary)/i.test(id)?"#d5dadd":"#e3e7e9");
      }
      if(layer.type==="symbol" && /(poi|transit|airport|ferry)/i.test(id) && typeof map.setLayerZoomRange==="function"){
        map.setLayerZoomRange(id,8.5,24);
      }else if(layer.type==="symbol" && /(road.*label|road-label)/i.test(id) && typeof map.setLayerZoomRange==="function"){
        map.setLayerZoomRange(id,6.5,24);
      }
    }catch(e){}
  }
  if(map.getSource("m98-dem")) return;
  map.addSource("m98-dem",{type:"raster-dem",url:"mapbox://mapbox.mapbox-terrain-dem-v1",tileSize:512,maxzoom:14});
  const before=map.getStyle()?.layers?.find(x=>x.type==="symbol")?.id;
  map.addLayer({
    id:"m98-hillshade",
    type:"hillshade",
    source:"m98-dem",
    paint:{
      "hillshade-exaggeration":0.07,
      "hillshade-shadow-color":"#c7ced1",
      "hillshade-highlight-color":"#ffffff",
      "hillshade-accent-color":"#d9dfe1"
    }
  },before);
  }catch(err){
    console.warn("Optional map relief disabled",err);
  }
}

function addLayers(){
  if(map.getSource("events")) return;

  addTopographicRelief();
  try{ addConcertTriangle(); }catch(err){ console.error("Concert marker setup failed",err); }

  map.addSource("hubs",{type:"geojson",data:hubsGeoJSON()});

  // Wide view: only qualifying European capitals. Zoom in: all qualifying cities.
  map.addLayer({
    id:"capital-points",type:"symbol",source:"hubs",maxzoom:4.7,filter:["==",["get","overview"],1],
    layout:{
      "icon-image":"m98-triangle",
      "icon-size":["step",["get","count"],.68,20,.76,40,.84,80,.94,160,1.04,300,1.12],
      "icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true
    }
  });
  map.addLayer({
    id:"capital-labels",type:"symbol",source:"hubs",minzoom:2,maxzoom:4.7,filter:["==",["get","overview"],1],
    layout:{
      "text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
      "text-offset":[0,-1.25],"text-anchor":"bottom","text-allow-overlap":false
    },
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-capital",type:"circle",source:"hubs",maxzoom:4.7,filter:["==",["get","overview"],1],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  // Progressive reveal keeps the map readable: busiest cities first,
  // then medium hubs, then every verified 10+ city.
  const hubIconSize=["step",["get","count"],.72,20,.80,40,.90,80,1.00,160,1.10,300,1.18];
  map.addLayer({
    id:"city-major-points",type:"symbol",source:"hubs",minzoom:4.7,maxzoom:5.7,filter:[">=",["get","count"],40],
    layout:{"icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-major-labels",type:"symbol",source:"hubs",minzoom:4.9,maxzoom:5.7,filter:[">=",["get","count"],40],
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-major",type:"circle",source:"hubs",minzoom:4.7,maxzoom:5.7,filter:[">=",["get","count"],40],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  map.addLayer({
    id:"city-mid-points",type:"symbol",source:"hubs",minzoom:5.7,maxzoom:6.4,filter:[">=",["get","count"],20],
    layout:{"icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-mid-labels",type:"symbol",source:"hubs",minzoom:5.9,maxzoom:6.4,filter:[">=",["get","count"],20],
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-mid",type:"circle",source:"hubs",minzoom:5.7,maxzoom:6.4,filter:[">=",["get","count"],20],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  map.addLayer({
    id:"city-all-points",type:"symbol",source:"hubs",minzoom:6.4,maxzoom:12,
    layout:{"icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-all-labels",type:"symbol",source:"hubs",minzoom:6.6,maxzoom:12,
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-all",type:"circle",source:"hubs",minzoom:6.4,maxzoom:12,
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  map.addSource("events",{type:"geojson",data:toGeoJSON([]),cluster:true,clusterMaxZoom:5,clusterRadius:40});
  map.addLayer({
    id:"clusters",type:"symbol",source:"events",filter:["has","point_count"],
    layout:{
      "icon-image":"m98-triangle",
      "icon-size":["step",["get","point_count"],.68,2,.76,5,.84,10,.94,25,1.04,60,1.12],
      "icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true
    }
  });
  map.addLayer({
    id:"cluster-hit",type:"circle",source:"events",filter:["has","point_count"],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":24,"circle-opacity":.001,"circle-stroke-width":0}
  });
  map.addLayer({
    id:"event-points",type:"symbol",source:"events",minzoom:4.3,filter:["!",["has","point_count"]],
    layout:{
      "icon-image":"m98-triangle",
      "icon-size":["interpolate",["linear"],["zoom"],4.3,.72,7,.92,12,1.08],
      "icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true
    }
  });
  map.addLayer({id:"event-hit",type:"circle",source:"events",minzoom:3.2,filter:["!",["has","point_count"]],paint:{
    "circle-color":"rgba(0,0,0,0.001)","circle-radius":["interpolate",["linear"],["zoom"],3.2,25,5,24,8,22,12,22],
    "circle-opacity":0.001,"circle-stroke-width":0
  }});

  map.addSource("artist-events",{type:"geojson",data:toGeoJSON([]),cluster:false});
  map.addLayer({
    id:"artist-points",type:"symbol",source:"artist-events",minzoom:0,
    layout:{
      "icon-image":"m98-triangle",
      "icon-size":["interpolate",["linear"],["zoom"],0,.66,3,.76,6,.92,12,1.08],
      "icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true
    }
  });
  map.addLayer({id:"artist-hit",type:"circle",source:"artist-events",minzoom:0,paint:{
    "circle-color":"rgba(0,0,0,0.001)","circle-radius":["interpolate",["linear"],["zoom"],0,28,3,26,5,24,8,22,12,22],
    "circle-opacity":0.001,"circle-stroke-width":0
  }});

  map.addLayer({id:"event-labels",type:"symbol",source:"events",minzoom:6.2,filter:["!",["has","point_count"]],layout:{
    "text-field":["get","label"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
    "text-offset":[0,1.35],"text-anchor":"top","text-max-width":14,"text-allow-overlap":false
  },paint:{"text-color":"#15181a","text-halo-color":"#ffffff","text-halo-width":1.5}});

  ["hub-hit-capital","hub-hit-major","hub-hit-mid","hub-hit-all"].forEach(layer=>map.on("click",layer,handleHubClick));

  map.on("click","cluster-hit",async e=>{
    const f=map.queryRenderedFeatures(e.point,{layers:["cluster-hit"]})[0];
    if(!f||!map.getSource("events")) return;
    try{
      const z=await map.getSource("events").getClusterExpansionZoom(f.properties.cluster_id);
      userMoving=false;
      map.easeTo({center:f.geometry.coordinates,zoom:Math.min(Number(z)||map.getZoom()+2,14),duration:500});
    }catch(err){ console.error(err); }
  });

  map.on("click","event-hit",e=>{
    const id=String(e.features?.[0]?.properties?.id||"");
    const ev=currentEvents.find(x=>x.id===id);
    if(!ev) return;
    const group=eventsAtSameVenue(ev,currentEvents);
    group.length>1 ? showVenuePopup(group) : showPopup(ev);
  });
  map.on("click","artist-hit",e=>{
    const id=String(e.features?.[0]?.properties?.id||"");
    const ev=artistMapEvents.find(x=>x.id===id);
    if(!ev) return;
    const group=eventsAtSameVenue(ev,artistMapEvents);
    group.length>1 ? showVenuePopup(group) : showPopup(ev);
  });

  ["hub-hit-capital","hub-hit-major","hub-hit-mid","hub-hit-all","cluster-hit","event-hit","artist-hit"].forEach(layer=>{
    map.on("mouseenter",layer,()=>map.getCanvas().style.cursor="pointer");
    map.on("mouseleave",layer,()=>map.getCanvas().style.cursor="");
  });

  map.on("click",e=>{
    if(activeMode!=="artist" || !artistMapEvents.length) return;
    const direct=map.queryRenderedFeatures(e.point,{layers:["artist-hit"]});
    if(direct.length) return;
    const maxPx=map.getZoom()<5 ? 30 : 24;
    let best=null,bestD=maxPx;
    for(const ev of artistMapEvents){
      if(!Number.isFinite(Number(ev.lat))||!Number.isFinite(Number(ev.lng))) continue;
      const p=map.project([Number(ev.lng),Number(ev.lat)]);
      const d=Math.hypot(p.x-e.point.x,p.y-e.point.y);
      if(d<bestD){best=ev;bestD=d;}
    }
    if(best){
      const group=eventsAtSameVenue(best,artistMapEvents);
      group.length>1 ? showVenuePopup(group) : showPopup(best);
    }
  });
  applyMapMode();
}

function handleHubClick(e){
  const f=e.features?.[0];
  if(!f) return;
  const [lng,lat]=f.geometry.coordinates;
  const name=String(f.properties?.name||"Selected city");
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:8.5,duration:650});
  loadArea(lat,lng,name,{fit:false,radius:45,city:name,countryCode:String(f.properties?.countryCode||"")});
}

function popupContent(e){
  const root=document.createElement("div");
  if(e.image){
    const img=document.createElement("img");
    img.className="pop-img"; img.src=e.image; img.alt=""; img.loading="eager"; img.decoding="async"; img.width=286; img.height=142;
    root.appendChild(img);
  }
  const body=document.createElement("div"); body.className="pop-body";
  const title=document.createElement("div"); title.className="pop-title"; title.textContent=e.artist||e.name;
  body.appendChild(title);
  const date=document.createElement("div"); date.className="pop-meta"; date.textContent=fmtDate(e)+(e.time?" · "+e.time.slice(0,5):"");
  body.appendChild(date);
  const place=document.createElement("div"); place.className="pop-meta"; place.textContent=placeLine(e);
  body.appendChild(place);
  if(e.url){
    const a=document.createElement("a"); a.className="buy"; a.href=e.url; a.target="_blank"; a.rel="sponsored noopener"; a.dataset.m98Press=""; a.dataset.m98PressMode="pill";
    const label=document.createElement("span");
    label.className="buy-label m98-press-label";
    label.dataset.label="Buy Tickets";
    label.textContent="Buy Tickets";
    a.appendChild(label);
    body.appendChild(a);

  }
  root.appendChild(body);
  return root;
}

function eventsAtSameVenue(target,pool){
  const tlat=Number(target?.lat),tlng=Number(target?.lng);
  return (pool||[]).filter(e=>{
    const sameCoords=Math.abs(Number(e.lat)-tlat)<0.0008 && Math.abs(Number(e.lng)-tlng)<0.0008;
    const sameVenue=target.venue && e.venue===target.venue && e.city===target.city;
    return sameCoords || sameVenue;
  }).sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999"))||String(a.time||"").localeCompare(String(b.time||"")));
}

function venuePopupContent(events){
  const first=events[0];
  const root=document.createElement("div");
  const body=document.createElement("div"); body.className="pop-body";
  const title=document.createElement("div"); title.className="pop-title"; title.textContent=first.venue||first.city||"Concerts";
  body.appendChild(title);
  const place=document.createElement("div"); place.className="pop-meta"; place.textContent=[first.city,first.state,first.country].filter(Boolean).join(" · ");
  body.appendChild(place);
  const list=document.createElement("div"); list.className="venue-list";
  events.forEach(ev=>{
    const b=document.createElement("button"); b.type="button"; b.className="venue-event";
    const d=document.createElement("span"); d.className="venue-event-date"; d.textContent=shortDate(ev);
    const img=document.createElement("img"); img.className="venue-event-art"; img.src=ev.artistImage||ev.image||"/logo.png"; img.alt=""; img.loading="lazy";
    img.addEventListener("error",()=>{img.src="/logo.png";},{once:true});
    const cp=document.createElement("span"); cp.className="venue-event-copy";
    const n=document.createElement("span"); n.className="venue-event-name"; n.textContent=ev.artist||ev.name;
    const tm=document.createElement("span"); tm.className="venue-event-time"; tm.textContent=ev.time?ev.time.slice(0,5):"";
    cp.append(n,tm); b.append(d,img,cp);
    b.addEventListener("click",()=>showPopup(ev));
    list.appendChild(b);
  });
  body.appendChild(list); root.appendChild(body);
  return root;
}

function snapPopup(){
  if(!popup) return;
  const el=popup.getElement?.();
  if(!el) return;
  el.style.translate="";
  const rect=el.getBoundingClientRect();
  const dpr=Math.max(1,Number(window.devicePixelRatio)||1);
  const dx=Math.round(rect.left*dpr)/dpr-rect.left;
  const dy=Math.round(rect.top*dpr)/dpr-rect.top;
  if(Math.abs(dx)>.001 || Math.abs(dy)>.001) el.style.translate=dx.toFixed(3)+"px "+dy.toFixed(3)+"px";
}
const POPUP_CITY_MIN_ZOOM=6.2;
function syncPopupPresentation(){
  if(!popup) return;
  const el=popup.getElement?.();
  if(!el) return;

  // Popup geometry is intentionally fixed. Zooming the map must never shrink
  // the card, typography, artwork or inner spacing.
  [
    "--pop-w","--pop-img-h","--pop-pad","--pop-title-size",
    "--pop-meta-size","--pop-title-gap","--pop-meta-gap",
    "--pop-radius","--venue-list-h"
  ].forEach(name=>el.style.removeProperty(name));
  el.style.maxWidth="";
  if(typeof popup.setMaxWidth==="function") popup.setMaxWidth("286px");

  requestAnimationFrame(snapPopup);
}
function installPopup(next){
  if(popup) popup.remove();
  popup=next;
  const own=next;
  own.on("close",()=>{ if(popup===own) popup=null; });
  return own;
}
function showVenuePopup(events){
  if(!events?.length || map.getZoom()<POPUP_CITY_MIN_ZOOM) return;
  const first=events[0];
  installPopup(new mapboxgl.Popup({offset:16,closeButton:true,maxWidth:"286px",focusAfterOpen:false})
    .setLngLat([first.lng,first.lat]).setDOMContent(venuePopupContent(events))).addTo(map);
  syncPopupPresentation();
  requestAnimationFrame(()=>requestAnimationFrame(ensurePopupFullyVisible));
  setTimeout(ensurePopupFullyVisible,80);
}


function ensurePopupFullyVisible(){
  if(!popup) return;
  const el=popup.getElement ? popup.getElement() : map.getContainer().querySelector(".mapboxgl-popup");
  if(!el) return;

  const mapRect=map.getContainer().getBoundingClientRect();
  const popRect=el.getBoundingClientRect();
  const margin=16;

  let shiftX=0, shiftY=0;
  const leftLimit=mapRect.left+margin;
  const rightLimit=mapRect.right-margin;
  const topLimit=mapRect.top+margin;
  const bottomLimit=mapRect.bottom-margin;

  if(popRect.left<leftLimit) shiftX=leftLimit-popRect.left;
  else if(popRect.right>rightLimit) shiftX=-(popRect.right-rightLimit);

  if(popRect.top<topLimit) shiftY=topLimit-popRect.top;
  else if(popRect.bottom>bottomLimit) shiftY=-(popRect.bottom-bottomLimit);

  if(Math.abs(shiftX)<1 && Math.abs(shiftY)<1) return;

  const centerPoint=[mapRect.width/2-shiftX,mapRect.height/2-shiftY];
  const newCenter=map.unproject(centerPoint);
  userMoving=false;
  map.easeTo({center:newCenter,duration:280});
  setTimeout(snapPopup,300);
}

function showPopup(e){
  if(map.getZoom()<POPUP_CITY_MIN_ZOOM) return;
  installPopup(new mapboxgl.Popup({offset:16,closeButton:true,maxWidth:"286px",focusAfterOpen:false})
    .setLngLat([e.lng,e.lat]).setDOMContent(popupContent(e))).addTo(map);
  syncPopupPresentation();
  requestAnimationFrame(()=>requestAnimationFrame(ensurePopupFullyVisible));
  setTimeout(ensurePopupFullyVisible,80);
}

function focusEventOnMap(e){
  if(!e || !Number.isFinite(Number(e.lat)) || !Number.isFinite(Number(e.lng))) return;
  userMoving=false;
  const targetZoom=Math.min(Math.max(map.getZoom(),6.3),8.2);
  map.easeTo({center:[Number(e.lng),Number(e.lat)],zoom:targetZoom,duration:380});
  setTimeout(()=>showPopup(e),405);
}

function stabilizeArtistCoordinates(events){
  const out=(events||[]).map(e=>({...e}));
  const groups=new Map();
  for(const e of out){
    const city=String(e.city||"").trim().toLowerCase();
    const country=String(e.countryCode||e.country||"").trim().toLowerCase();
    if(!city||!country) continue;
    const key=city+"|"+country;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(e);
  }
  const median=a=>{
    const s=a.slice().sort((x,y)=>x-y);
    const m=Math.floor(s.length/2);
    return s.length%2?s[m]:(s[m-1]+s[m])/2;
  };
  for(const group of groups.values()){
    if(group.length<3) continue;
    const coords=group.filter(e=>Number.isFinite(Number(e.lat))&&Number.isFinite(Number(e.lng)));
    if(coords.length<3) continue;
    let ml=median(coords.map(e=>Number(e.lat)));
    let mg=median(coords.map(e=>Number(e.lng)));
    const core=coords.filter(e=>distanceKm(Number(e.lat),Number(e.lng),ml,mg)<=80);
    if(core.length<Math.ceil(coords.length*.6)) continue;
    ml=median(core.map(e=>Number(e.lat)));
    mg=median(core.map(e=>Number(e.lng)));
    for(const e of coords){
      if(distanceKm(Number(e.lat),Number(e.lng),ml,mg)>120){
        e.lat=ml;
        e.lng=mg;
        e.coordRepaired=true;
      }
    }
  }
  return out;
}

function validMapEvents(events){
  return (events||[]).filter(e=>{
    const lat=Number(e?.lat),lng=Number(e?.lng);
    return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-90&&lat<=90&&lng>=-180&&lng<=180&&!(Math.abs(lat)<1e-7&&Math.abs(lng)<1e-7);
  });
}
function fitEvents(events){
  const clean=validMapEvents(events);
  if(!clean.length) return;
  if(clean.length===1){ map.flyTo({center:[Number(clean[0].lng),Number(clean[0].lat)],zoom:7,duration:520}); return; }
  const b=new mapboxgl.LngLatBounds();
  clean.forEach(e=>b.extend([Number(e.lng),Number(e.lat)]));
  map.fitBounds(b,{padding:{top:50,bottom:50,left:50,right:50},maxZoom:7.2,duration:620});
}

function groupedNearby(events){
  const groups=new Map();
  for(const e of events){
    const key=(e.attractionId||e.artist).toLowerCase();
    if(!key) continue;
    const g=groups.get(key)||{
      id:e.attractionId||"",name:e.artist,image:e.artistImage||e.image||"",
      count:0,first:e.date||"9999-99-99",events:[]
    };
    g.count++;
    g.events.push(e);
    if((e.date||"9999-99-99")<g.first) g.first=e.date;
    if(!g.image) g.image=e.artistImage||e.image||"";
    groups.set(key,g);
  }
  return [...groups.values()]
    .sort((a,b)=>b.count-a.count||a.first.localeCompare(b.first)||a.name.localeCompare(b.name))
    .slice(0,10)
    .map((g,i)=>({...g,rank:i+1,shows:g.count}));
}

function setTourBoxHeight(box,open){
  if(!box) return;
  if(open){
    requestAnimationFrame(()=>{ box.style.maxHeight=box.scrollHeight+"px"; });
    return;
  }
  box.style.maxHeight=box.scrollHeight+"px";
  box.getBoundingClientRect();
  requestAnimationFrame(()=>{ box.style.maxHeight="0px"; });
}

function renderEventList(box,events){
  box.textContent="";
  const sorted=events.slice().sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999")));
  if(!sorted.length){
    const n=document.createElement("div"); n.className="tour-none"; n.textContent="No upcoming dates found.";
    box.appendChild(n); return;
  }

  let shown=0;
  let more=null;

  const draw=()=>{
    const next=Math.min(sorted.length,shown+10);
    for(let i=shown;i<next;i++){
      const e=sorted[i];
      const b=document.createElement("button"); b.type="button"; b.className="event-link";
      const d=document.createElement("span"); d.className="event-date"; d.textContent=shortDate(e);
      const img=document.createElement("img"); img.className="event-art"; img.src=e.artistImage||e.image||"/logo.png"; img.alt=""; img.loading="lazy";
      img.addEventListener("error",()=>{img.src="/logo.png";},{once:true});
      const p=document.createElement("span"); p.className="event-place";
      const city=document.createElement("span"); city.className="event-city"; city.textContent=[e.city,e.countryCode].filter(Boolean).join(", ")||"Venue TBA";
      const venue=document.createElement("span"); venue.className="event-venue"; venue.textContent=e.venue||e.name||"";
      p.append(city,venue); b.append(d,img,p);
      b.addEventListener("click",()=>focusEventOnMap(e));
      if(more) box.insertBefore(b,more); else box.appendChild(b);
    }
    shown=next;
    if(more && shown>=sorted.length){
      more.remove();
      more=null;
    }
    setTourBoxHeight(box,true);
  };

  if(sorted.length>10){
    more=document.createElement("button");
    more.type="button";
    more.className="tour-more";
    more.textContent="More";
    more.addEventListener("click",()=>{
      draw();
    });
    box.appendChild(more);
  }

  draw();
}

async function eventsForArtist(item,mode){
  if(Array.isArray(item.events) && item.events.length) return item.events;
  const key=item.id ? "id:"+item.id : "name:"+String(item.name||"").toLowerCase();
  if(artistEventCache.has(key)) return artistEventCache.get(key);
  const params=item.id ? {attractionId:item.id} : {artist:item.name};
  const events=await getEvents(params);
  artistEventCache.set(key,events);
  return events;
}

function clearArtistContext(){
  artistContext=null;
  setArtistMapData([]);
  syncModeTabs();
  syncMapModeSwitch();
}
function sourceItemsForArtist(item,mode){
  const key=artistKey(item);
  if(mode==="nearby") return groupedNearby(nearbyEvents);
  if(mode==="popular" && popularArtists.some(a=>artistKey(a)===key)) return popularArtists;
  return [item];
}
function restoreArtistSide(){
  if(!artistContext) return;
  const ctx=artistContext;
  const items=ctx.sourceItems?.length ? ctx.sourceItems : [ctx.item];
  renderArtists(items,ctx.sourceMode);
  const key=artistKey(ctx.item);
  const card=[...toursEl.querySelectorAll(".tour-card")].find(el=>el.dataset.artistKey===key);
  if(card){
    expandedKey=key;
    card.classList.add("open");
    renderEventList(card.querySelector(".tour-events"),ctx.events||[]);
  }
  sideSub.textContent="Upcoming concerts for "+(ctx.item?.name||"this artist")+".";
}
function showArtistContext(){
  if(!artistContext) return;
  hidePendingAreaSearch();
  areaRequestSeq++;
  popularRequestSeq++;
  setMode("artist");
  setEventData([],0);
  setArtistMapData(artistContext.events||[]);
  if(artistContext.events?.length) fitEvents(artistContext.events);
  setStatus((artistContext.events?.length||0)+" upcoming concerts · "+(artistContext.item?.name||"Artist"));
}
async function loadArtistArea(lat,lng,label,radius){
  if(!artistContext) return;
  hidePendingAreaSearch();
  const searchRadius=Math.max(5,Math.min(500,Number(radius)||100));
  const prev=artistContext.areaCenter;
  if(prev && Number(prev.radius)===searchRadius &&
     distanceKm(lat,lng,prev.lat,prev.lng)<Math.max(6,searchRadius*.22) &&
     Array.isArray(artistContext.areaEvents)){
    setMode("artist-area");
    setArtistMapData([]);
    setEventData(artistContext.areaEvents,artistContext.areaTotal||artistContext.areaEvents.length);
    return;
  }

  const requestId=++areaRequestSeq;
  const contextKey=artistKey(artistContext.item);
  setMode("artist-area");
  setArtistMapData([]);
  setStatus("Loading concerts...");
  try{
    const grid=searchGridCenter(lat,lng,searchRadius);
    const data=await getPayload({lat:grid.lat,lng:grid.lng,radius:searchRadius});
    if(requestId!==areaRequestSeq || !artistContext || artistKey(artistContext.item)!==contextKey || activeMode!=="artist-area") return;
    let events=stabilizeArtistCoordinates(data.events||[]);
    const maxDistance=searchRadius*1.35+18;
    events=events.filter(e=>distanceKm(lat,lng,Number(e.lat),Number(e.lng))<=maxDistance);
    const total=Number(data.page?.totalElements ?? events.length) || events.length;
    artistContext.areaEvents=events;
    artistContext.areaTotal=total;
    artistContext.areaCenter={lat,lng,radius:searchRadius};
    setEventData(events,total);
    setStatus("");
  }catch(err){
    if(requestId!==areaRequestSeq) return;
    console.error(err);
    setStatus(concertErrorMessage(err,"Could not load concerts in this area."));
  }
}
async function showAllConcertsInMapArea(){
  if(!artistContext) return;
  const c=map.getCenter();
  await loadArtistArea(c.lat,c.lng,"Map area",Number(radiusEl.value)||100);
}

async function toggleArtist(item,card,mode){
  const key=artistKey(item);
  const box=card.querySelector(".tour-events");
  const opening=expandedKey!==key;
  root.querySelectorAll(".tour-card.open").forEach(el=>{
    setTourBoxHeight(el.querySelector(".tour-events"),false);
    el.classList.remove("open");
  });

  if(!opening){
    const source=artistContext?.sourceMode||mode;
    expandedKey="";
    clearArtistContext();
    setMode(source==="nearby"?"nearby":"popular");
    sideSub.textContent=source==="nearby"
      ? "Artists with the most upcoming events in this area."
      : "Top 30 popular artists with upcoming Ticketmaster shows.";
    restoreModeMap();
    return;
  }

  areaRequestSeq++;
  popularRequestSeq++;
  artistContext={item:{...item},events:[],sourceMode:mode,sourceItems:sourceItemsForArtist(item,mode)};
  setMode("artist");
  setEventData([],0);
  expandedKey=key;
  card.classList.add("open");
  box.textContent="";
  const loading=document.createElement("div"); loading.className="tour-loading"; loading.textContent="Loading dates...";
  box.appendChild(loading);
  setTourBoxHeight(box,true);

  try{
    const rawEvents=await eventsForArtist(item,mode);
    if(expandedKey!==key) return;
    const events=stabilizeArtistCoordinates(rawEvents);
    renderEventList(box,events);
    setTourBoxHeight(box,true);
    if(artistContext && artistKey(artistContext.item)===key) artistContext.events=events;
    setMode("artist");
    setEventData([],0);
    setArtistMapData(events);
    sideSub.textContent="Upcoming concerts for "+item.name+".";
    if(events.length) fitEvents(events);
    setStatus(events.length ? events.length+" upcoming concerts · "+item.name : "No upcoming concerts · "+item.name);
  }catch(err){
    console.error(err);
    box.textContent="";
    const n=document.createElement("div"); n.className="tour-none"; n.textContent=concertErrorMessage(err,"Could not load tour dates.");
    box.appendChild(n);
  }
}

function renderArtists(items,mode){
  expandedKey="";
  toursEl.textContent="";
  sideEmpty.hidden=!!items.length;
  if(!items.length){
    sideEmpty.textContent=mode==="popular" ? "No popular artists are available right now." : "No artists found in this area.";
    return;
  }

  items.forEach((item,index)=>{
    const card=document.createElement("div"); card.className="tour-card"; card.dataset.artistKey=artistKey(item);
    const row=document.createElement("button"); row.type="button"; row.className="tour-row";

    const rank=document.createElement("span"); rank.className="tour-rank"; rank.textContent=String(item.rank||index+1);

    const art=document.createElement("span"); art.className="tour-art";
    const img=document.createElement("img"); img.src=item.image||"/logo.png"; img.alt=""; img.loading="lazy";
    img.addEventListener("error",()=>{ img.src="/logo.png"; },{once:true});
    art.appendChild(img);

    const copy=document.createElement("span"); copy.className="tour-copy";
    const name=document.createElement("span"); name.className="tour-name"; name.textContent=item.name||"Artist";
    const meta=document.createElement("span"); meta.className="tour-meta";
    const shows=Number(item.shows||item.count||0);
    meta.textContent=mode==="popular"
      ? "Upcoming shows"
      : (shows+" nearby "+(shows===1?"show":"shows"));
    copy.append(name,meta);

    const chev=document.createElement("span"); chev.className="tour-chevron";
    chev.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';

    row.append(rank,art,copy,chev);
    const box=document.createElement("div"); box.className="tour-events";
    row.addEventListener("click",()=>toggleArtist(item,card,mode));
    card.append(row,box); toursEl.appendChild(card);
  });
}

function restoreModeMap(){
  hidePendingAreaSearch();
  setArtistMapData([]);
  if(activeMode==="popular"){
    setEventData(popularEvents);
    setStatus("");
  }else{
    setEventData(nearbyEvents,nearbyTotal);
    const label=lastArea?.label||"Selected area";
    setStatus(nearbyTotal ? nearbyTotal+" concerts · "+label : "No Ticketmaster concerts found · "+label);
  }
}

async function getPayload(params){
  const u=new URL("/api/concerts",location.origin);
  Object.entries(params).forEach(([k,v])=>{ if(v!==""&&v!=null) u.searchParams.set(k,v); });
  const key=u.pathname+"?"+[...u.searchParams.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+"="+v).join("&");
  const cached=payloadCache.get(key);
  if(cached && Date.now()-cached.at<PAYLOAD_CACHE_MS) return cached.data;
  if(payloadInflight.has(key)) return payloadInflight.get(key);

  const work=(async()=>{
    const r=await fetch(u,{headers:{"Accept":"application/json"}});
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||"concerts_unavailable");
    payloadCache.set(key,{at:Date.now(),data:j});
    return j;
  })();
  payloadInflight.set(key,work);
  try{return await work;}finally{payloadInflight.delete(key);}
}
async function getEvents(params){ return (await getPayload(params)).events||[]; }
function concertErrorMessage(err,fallback){
  const code=String(err?.message||"");
  if(code==="ticketmaster_temporarily_limited") return "Ticketmaster is temporarily limiting requests. Please try again later.";
  if(code==="ticketmaster_key_missing") return "Concert search is being connected. Please try again shortly.";
  return fallback;
}

function mergeHotspots(rows){
  const byKey=new Map();
  for(const h of [...STATIC_HUBS,...(rows||[])]){
    const key=(String(h.city||"")+"|"+String(h.stateCode||"")+"|"+String(h.countryCode||"")).toLowerCase();
    const prev=byKey.get(key);
    if(!prev){
      byKey.set(key,{...h});
      continue;
    }
    const use=Number(h.count||0)>Number(prev.count||0) ? h : prev;
    byKey.set(key,{...prev,...use,static:Number(prev.static||h.static||0)?1:0});
  }
  return [...byKey.values()].sort((a,b)=>Number(b.static||0)-Number(a.static||0)||Number(b.count||0)-Number(a.count||0)||String(a.city||"").localeCompare(String(b.city||"")));
}

const POPULAR_CACHE_KEY="music98:concert-popular:v6";
function readPopularCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(POPULAR_CACHE_KEY)||"null");
    const age=Date.now()-(Date.parse(cached?.builtAt||0)||0);
    if(cached?.version==="popular-v4" &&
       cached?.eligibility==="ticketmaster_event_payload_gt_0" &&
       Array.isArray(cached.artists) &&
       cached.artists.length>=30 &&
       cached.artists.every(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0) &&
       age<26*60*60*1000) return cached;
  }catch(e){}
  return null;
}
function writePopularCache(data){
  if(data?.stale || data?.warming ||
     data?.version!=="popular-v4" ||
     data?.eligibility!=="ticketmaster_event_payload_gt_0" ||
     !Array.isArray(data.artists) ||
     data.artists.length<30 ||
     !data.artists.every(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0)) return;
  try{localStorage.setItem(POPULAR_CACHE_KEY,JSON.stringify(data));}catch(e){}
}

const HOTSPOT_CACHE_KEY="music98:concert-hotspots:v19";
function readHotspotCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(HOTSPOT_CACHE_KEY)||"null");
    const age=Date.now()-(Date.parse(cached?.builtAt||0)||0);
    if(cached?.version==="hotspots-v19" && Array.isArray(cached.hotspots) && age<24*60*60*1000) return cached;
  }catch(e){}
  return null;
}
function writeHotspotCache(data){
  if(data?.partial || data?.stale || data?.version!=="hotspots-v19" || !Array.isArray(data.hotspots)) return;
  try{ localStorage.setItem(HOTSPOT_CACHE_KEY,JSON.stringify(data)); }catch(e){}
}
async function loadHotspots(){
  const cached=readHotspotCache();
  hotspots=mergeHotspots(cached?.hotspots||[]);
  let src=map.getSource("hubs");
  if(src) src.setData(hubsGeoJSON());

  try{
    // This is a read-only Cloudflare snapshot. It never starts Ticketmaster
    // discovery from a visitor request; the cron Worker owns that job.
    const data=await getPayload({mode:"hotspots",v:"hotspots-v19"});
    const incoming=mergeHotspots(data.hotspots||[]);
    if(incoming.length || !hotspots.length) hotspots=incoming;
    src=map.getSource("hubs");
    if(src) src.setData(hubsGeoJSON());
    writeHotspotCache(data);
  }catch(err){
    console.error(err);
  }
}

async function loadPopular(force=false){
  hidePendingAreaSearch();
  areaRequestSeq++;
  const requestId=++popularRequestSeq;
  clearArtistContext();
  setMode("popular");
  sideSub.textContent="Top 30 popular artists with upcoming Ticketmaster shows.";

  const cached=!force ? readPopularCache() : null;
  if(!popularArtists.length && cached?.artists?.length){
    popularArtists=withVerifiedPopularSupplement(cached.artists);
    renderArtists(popularArtists,"popular");
    setEventData(popularEvents);
    setStatus("");
    sideEmpty.hidden=true;
  }else if(popularArtists.length && !force){
    renderArtists(popularArtists,"popular");
    setEventData(popularEvents);
    setStatus("");
    sideEmpty.hidden=true;
  }else{
    sideEmpty.hidden=false;
    sideEmpty.textContent="Loading popular artists...";
  }

  try{
    const data=await getPayload({mode:"popular",v:"popular-v6"});
    if(data.artists?.length && (!data.stale || !popularArtists.length || withVerifiedPopularSupplement(data.artists).length>=popularArtists.length)){
      popularArtists=withVerifiedPopularSupplement(data.artists);
    }
    popularEvents=[];
    writePopularCache(data);
    if(requestId!==popularRequestSeq || activeMode!=="popular" || artistContext) return;
    renderArtists(popularArtists,"popular");
    setEventData([]);
    setStatus("");
  }catch(err){
    if(requestId!==popularRequestSeq) return;
    console.error(err);
    // A transient Cloudflare/network failure must not erase a good local Top 30.
    if(popularArtists.length){
      renderArtists(popularArtists,"popular");
      setEventData([]);
      sideEmpty.hidden=true;
      setStatus("");
      return;
    }
    toursEl.textContent="";
    sideEmpty.hidden=false;
    sideEmpty.textContent="Could not load popular artists right now.";
    setStatus("Could not load popular concerts right now.");
  }
}

async function loadArea(lat,lng,label,opts={}){
  hidePendingAreaSearch();
  const searchRadius=Math.max(5,Math.min(500,Number(opts.radius ?? radiusEl.value)||100));
  const reuseDistance=Math.max(6,searchRadius*.22);
  if(!opts.force && !opts.city && !lastArea?.city && lastArea && Number(lastArea.radius)===searchRadius &&
      distanceKm(lat,lng,lastArea.lat,lastArea.lng)<reuseDistance &&
      nearbyEvents.length){
    clearArtistContext();
    setMode("nearby");
    sideSub.textContent="Artists with the most upcoming events in this area.";
    renderArtists(groupedNearby(nearbyEvents),"nearby");
    setEventData(nearbyEvents,nearbyTotal);
    return;
  }

  const requestId=++areaRequestSeq;
  clearArtistContext();
  setMode("nearby");
  sideSub.textContent="Artists with the most upcoming events in this area.";
  setStatus("Loading concerts...");
  try{
    const grid=searchGridCenter(lat,lng,searchRadius);
    const data=opts.city
      ? await getPayload({city:opts.city,countryCode:opts.countryCode||""})
      : await getPayload({lat:grid.lat,lng:grid.lng,radius:searchRadius});
    if(requestId!==areaRequestSeq) return;
    let events=stabilizeArtistCoordinates(data.events||[]);
    if(!opts.city){
      const maxDistance=searchRadius*1.35+18;
      events=events.filter(e=>distanceKm(lat,lng,Number(e.lat),Number(e.lng))<=maxDistance);
    }
    const total=Number(data.page?.totalElements ?? events.length) || events.length;

    nearbyEvents=events;
    nearbyTotal=total;
    lastArea={lat,lng,label,radius:searchRadius,city:opts.city||"",countryCode:opts.countryCode||""};

    renderArtists(groupedNearby(events),"nearby");
    setMode("nearby");
    setEventData(events,total);
    if(opts.fit) fitEvents(events);
    sideSub.textContent=opts.city
      ? "Artists with upcoming events in "+label+"."
      : "Artists with the most upcoming events in this area.";
    setStatus("");
  }catch(err){
    if(requestId!==areaRequestSeq) return;
    console.error(err);
    toursEl.textContent="";
    sideEmpty.hidden=false;
    sideEmpty.textContent="Could not load concerts in this area.";
    setStatus(err.message==="ticketmaster_key_missing" ? "Concert search is being connected. Please try again shortly." : "Could not load concerts right now.");
  }
}

function requestLocation(){
  areaRequestSeq++;
  popularRequestSeq++;
  clearArtistContext();
  setMode("nearby");
  if(!navigator.geolocation){
    setStatus("Location is not available in this browser.");
    return;
  }
  setStatus("Getting your location...");
  navigator.geolocation.getCurrentPosition(
    p=>{
      userMoving=false;
      map.flyTo({center:[p.coords.longitude,p.coords.latitude],zoom:9,duration:650});
      loadArea(p.coords.latitude,p.coords.longitude,"Near you",{fit:false});
    },
    ()=>setStatus("Location permission was not granted. Search for a city instead."),
    {enableHighAccuracy:false,timeout:12000,maximumAge:600000}
  );
}

function featureLabel(f){
  return f?.properties?.full_address || f?.properties?.name_preferred || f?.properties?.name || "";
}
async function geocode(q,autocomplete=true){
  const u=new URL("https://api.mapbox.com/search/geocode/v6/forward");
  u.searchParams.set("q",q); u.searchParams.set("access_token",MAPBOX_TOKEN);
  u.searchParams.set("types","place,locality,region,country"); u.searchParams.set("limit","5");
  u.searchParams.set("autocomplete",autocomplete?"true":"false");
  const r=await fetch(u); if(!r.ok) throw new Error("geocode_failed");
  return (await r.json()).features||[];
}
async function searchArtists(q){
  const data=await getPayload({mode:"artist-search",q,v:"artist-search-v1"});
  return data.artists||[];
}
async function selectFeature(f){
  areaRequestSeq++;
  popularRequestSeq++;
  clearArtistContext();
  const coords=f?.geometry?.coordinates;
  if(!coords||coords.length<2) return;
  const label=featureLabel(f)||search.value.trim()||"Selected area";
  search.value=label; suggestions.hidden=true;
  userMoving=false;
  setArtistMapData([]);
  map.flyTo({center:[coords[0],coords[1]],zoom:8,duration:600});
  await loadArea(coords[1],coords[0],label,{fit:false});
}
async function selectArtistSuggestion(item){
  search.value=item.name||""; suggestions.hidden=true;
  clearArtistContext();
  sideSub.textContent="Upcoming concerts for "+item.name+".";
  renderArtists([{...item,shows:0}], "popular");
  const card=toursEl.querySelector(".tour-card");
  if(card) await toggleArtist(item,card,"popular");
}
function localArtistMatches(q){
  const n=normPlaceName(q);
  if(!n) return [];
  return popularArtists
    .filter(a=>normPlaceName(a.name).includes(n))
    .sort((a,b)=>{
      const an=normPlaceName(a.name),bn=normPlaceName(b.name);
      const ae=an===n?0:an.startsWith(n)?1:2;
      const be=bn===n?0:bn.startsWith(n)?1:2;
      return ae-be||Number(a.rank||999)-Number(b.rank||999);
    })
    .slice(0,4);
}
function localHotspotMatches(q){
  const n=normPlaceName(q);
  if(!n) return [];
  return hotspots
    .filter(h=>normPlaceName(h.city).includes(n))
    .sort((a,b)=>{
      const an=normPlaceName(a.city),bn=normPlaceName(b.city);
      const ae=an===n?0:an.startsWith(n)?1:2;
      const be=bn===n?0:bn.startsWith(n)?1:2;
      return ae-be||Number(b.count||0)-Number(a.count||0);
    })
    .slice(0,4);
}
async function selectHotspotSuggestion(h){
  if(!h) return;
  const lat=Number(h.lat),lng=Number(h.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) return;
  const label=[h.city,h.countryCode].filter(Boolean).join(", ");
  search.value=label;
  suggestions.hidden=true;
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:8.5,duration:600});
  await loadArea(lat,lng,h.city||label,{fit:false,radius:45,city:h.city||"",countryCode:h.countryCode||""});
}
function addHotspotSuggestion(h){
  const b=document.createElement("button"); b.className="suggestion suggestion-location"; b.type="button";
  const cp=document.createElement("span"); cp.className="suggestion-copy";
  const title=document.createElement("span"); title.className="suggestion-title";
  title.textContent=[h.city,h.countryCode].filter(Boolean).join(", ");
  const kind=document.createElement("span"); kind.className="suggestion-kind";
  kind.textContent=Number(h.count||0)>0 ? Number(h.count||0)+" upcoming concerts" : "Major concert market";
  cp.append(title,kind); b.appendChild(cp);
  b.addEventListener("click",()=>selectHotspotSuggestion(h)); suggestions.appendChild(b);
}

function addArtistSuggestion(item){
  const b=document.createElement("button"); b.className="suggestion"; b.type="button";
  const img=document.createElement("img"); img.className="suggestion-art"; img.src=item.image||"/logo.png"; img.alt="";
  img.addEventListener("error",()=>{img.src="/logo.png";},{once:true});
  const cp=document.createElement("span"); cp.className="suggestion-copy";
  const title=document.createElement("span"); title.className="suggestion-title"; title.textContent=item.name||"Artist";
  const kind=document.createElement("span"); kind.className="suggestion-kind"; kind.textContent="Artist";
  cp.append(title,kind); b.append(img,cp);
  b.addEventListener("click",()=>selectArtistSuggestion(item)); suggestions.appendChild(b);
}
function addPlaceSuggestion(f){
  const b=document.createElement("button"); b.className="suggestion suggestion-location"; b.type="button";
  const cp=document.createElement("span"); cp.className="suggestion-copy";
  const title=document.createElement("span"); title.className="suggestion-title"; title.textContent=featureLabel(f);
  const kind=document.createElement("span"); kind.className="suggestion-kind"; kind.textContent="Location";
  cp.append(title,kind); b.appendChild(cp);
  b.addEventListener("click",()=>selectFeature(f)); suggestions.appendChild(b);
}
function renderSuggestions(places,artists,hubs=[]){
  suggestions.textContent="";
  const seenArtists=new Set();
  (artists||[]).forEach(a=>{
    const key=artistKey(a);
    if(!key||seenArtists.has(key)||seenArtists.size>=4) return;
    seenArtists.add(key); addArtistSuggestion(a);
  });
  (hubs||[]).slice(0,3).forEach(addHotspotSuggestion);
  (places||[]).slice(0,3).forEach(addPlaceSuggestion);
  suggestions.hidden=!suggestions.childElementCount;
}

nearTab.addEventListener("click",()=>{
  if(lastArea){
    clearArtistContext();
    setMode("nearby");
    sideSub.textContent="Artists with the most upcoming events in this area.";
    renderArtists(groupedNearby(nearbyEvents),"nearby");
    setEventData(nearbyEvents,nearbyTotal);
    restoreModeMap();
  }else{
    requestLocation();
  }
});
popularTab.addEventListener("click",()=>loadPopular());
resetMapBtn.addEventListener("click",()=>{
  hidePendingAreaSearch();
  closePopup();
  clearArtistContext();
  search.value="";
  suggestions.hidden=true;
  closeRadiusMenu();
  radiusEl.value="100";
  radiusLabel.textContent="100 km";
  radiusOptions.querySelectorAll(".radius-option").forEach(btn=>{
    const active=String(btn.dataset.value||"")==="100";
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-selected",active?"true":"false");
  });
  lastArea=null;
  nearbyEvents=[];
  nearbyTotal=0;
  userMoving=false;
  setMode("popular");
  renderArtists(popularArtists,"popular");
  setEventData([]);
  sideSub.textContent="Top 30 popular artists with upcoming Ticketmaster shows.";
  setStatus("");
  map.easeTo({center:[12,39],zoom:2.15,duration:520});
});
mapArtistBtn.addEventListener("click",showArtistContext);
mapAllBtn.addEventListener("click",showAllConcertsInMapArea);

overviewBtn.addEventListener("click",()=>{
  hidePendingAreaSearch();
  closePopup();
  search.value="";
  suggestions.hidden=true;
  closeRadiusMenu();
  userMoving=false;
  loadPopular();
  map.easeTo({center:[12,49],zoom:2.45,duration:520});
});

fitBtn.addEventListener("click",()=>{
  hidePendingAreaSearch();
  const pool=activeMode==="artist" ? artistMapEvents : currentEvents;
  if(pool?.length) fitEvents(pool);
});

searchAreaBtn.addEventListener("click",()=>{
  const pending=pendingAreaSearch;
  hidePendingAreaSearch();
  if(!pending) return;
  if(pending.mode==="artist-area" && artistContext){
    loadArtistArea(pending.lat,pending.lng,"Map area",pending.radius);
  }else{
    loadArea(pending.lat,pending.lng,"Map area",{fit:false,radius:pending.radius,force:true});
  }
});

search.addEventListener("input",()=>{
  clearTimeout(suggestTimer);
  const seq=++suggestSeq;
  const q=search.value.trim();
  if(q.length<2){ suggestions.hidden=true; return; }
  suggestTimer=setTimeout(async()=>{
    const localArtists=localArtistMatches(q);
    const localHubs=localHotspotMatches(q);
    const artistWork=q.length>=3 && localArtists.length<4 ? searchArtists(q) : Promise.resolve([]);
    const [placesResult,artistsResult]=await Promise.allSettled([geocode(q,true),artistWork]);
    if(seq!==suggestSeq || search.value.trim()!==q) return;
    const places=placesResult.status==="fulfilled"?placesResult.value:[];
    const remoteArtists=artistsResult.status==="fulfilled"?artistsResult.value:[];
    renderSuggestions(places,[...localArtists,...remoteArtists],localHubs);
  },340);
});
search.addEventListener("keydown",async e=>{
  if(e.key!=="Enter") return;
  e.preventDefault();
  ++suggestSeq;
  const q=search.value.trim(); if(!q) return;
  const localArtists=localArtistMatches(q);
  const exactLocalArtist=localArtists.find(a=>normPlaceName(a.name)===normPlaceName(q));
  if(exactLocalArtist){ await selectArtistSuggestion(exactLocalArtist); return; }
  const localHubs=localHotspotMatches(q);
  const exactHub=localHubs.find(h=>normPlaceName(h.city)===normPlaceName(q));
  if(exactHub){ await selectHotspotSuggestion(exactHub); return; }

  const [placesResult,artistsResult]=await Promise.allSettled([geocode(q,false),searchArtists(q)]);
  const places=placesResult.status==="fulfilled"?placesResult.value:[];
  const artists=artistsResult.status==="fulfilled"?artistsResult.value:[];
  const exact=artists.find(a=>normPlaceName(a.name)===normPlaceName(q));
  if(exact){ await selectArtistSuggestion(exact); return; }
  if(places[0]){ await selectFeature(places[0]); return; }
  if(artists[0]){ await selectArtistSuggestion(artists[0]); return; }
  setStatus("No matching city or artist found.");
});
root.addEventListener("click",e=>{ if(!e.target.closest(".search-wrap")) suggestions.hidden=true; });

$("#locateBtn").addEventListener("click",requestLocation);

function closeRadiusMenu(){
  radiusMenu.classList.remove("open");
  radiusTrigger.setAttribute("aria-expanded","false");
}
function openRadiusMenu(){
  radiusMenu.classList.add("open");
  radiusTrigger.setAttribute("aria-expanded","true");
}
radiusTrigger.addEventListener("click",e=>{
  e.stopPropagation();
  radiusMenu.classList.contains("open") ? closeRadiusMenu() : openRadiusMenu();
});
radiusOptions.querySelectorAll(".radius-option").forEach(option=>{
  option.addEventListener("click",()=>{
    const value=String(option.dataset.value||"100");
    radiusEl.value=value;
    radiusLabel.textContent=value+" km";
    radiusOptions.querySelectorAll(".radius-option").forEach(btn=>{
      const active=btn===option;
      btn.classList.toggle("active",active);
      btn.setAttribute("aria-selected",active?"true":"false");
    });
    closeRadiusMenu();
    radiusEl.dispatchEvent(new Event("change"));
  });
});
root.addEventListener("click",e=>{ if(!e.target.closest(".radius-menu")) closeRadiusMenu(); });
root.addEventListener("keydown",e=>{ if(e.key==="Escape") closeRadiusMenu(); });

radiusEl.addEventListener("change",()=>{
  hidePendingAreaSearch();
  if(activeMode==="artist") return;
  if(activeMode==="artist-area" && artistContext){
    const c=map.getCenter();
    if(artistContext) artistContext.areaCenter=null;
    loadArtistArea(c.lat,c.lng,"Map area",Number(radiusEl.value)||100);
    return;
  }
  if(lastArea) loadArea(lastArea.lat,lastArea.lng,lastArea.label,{fit:false,radius:Number(radiusEl.value),force:true});
  else if(map.getZoom()>=4){
    const c=map.getCenter(); loadArea(c.lat,c.lng,"Map area",{fit:false,radius:Number(radiusEl.value)});
  }
});

function searchGridStep(radius){
  const r=Number(radius)||100;
  if(r<=25) return .025;
  if(r<=75) return .05;
  if(r<=150) return .10;
  return .20;
}
function searchGridCenter(lat,lng,radius){
  const step=searchGridStep(radius);
  return {
    lat:Math.round(Number(lat)/step)*step,
    lng:Math.round(Number(lng)/step)*step
  };
}

function distanceKm(lat1,lng1,lat2,lng2){
  const r=6371,toRad=d=>d*Math.PI/180;
  const p1=toRad(lat1),p2=toRad(lat2),dp=toRad(lat2-lat1),dl=toRad(lng2-lng1);
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*r*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}

map.on("movestart",e=>{ if(e.originalEvent) userMoving=true; });
map.on("styleimagemissing",e=>{
  if(e?.id!=="m98-triangle") return;
  try{ addConcertTriangle(); }catch(err){ console.error("Could not restore concert marker",err); }
});
map.on("render",()=>{ if(popup) snapPopup(); });
map.on("zoom",()=>{
  applyMapMode();
  if(!popup) return;
  if(map.getZoom()<POPUP_CITY_MIN_ZOOM){ closePopup(); return; }
});
map.on("zoomend",()=>{
  if(!popup) return;
  if(map.getZoom()<POPUP_CITY_MIN_ZOOM){ closePopup(); return; }
  requestAnimationFrame(ensurePopupFullyVisible);
});
map.on("moveend",()=>{
  if(!userMoving) return;
  userMoving=false;
  if(map.getZoom()<4 || (activeMode!=="nearby" && activeMode!=="artist-area")){
    hidePendingAreaSearch();
    return;
  }
  const center=map.getCenter();
  pendingAreaSearch={
    lat:center.lat,
    lng:center.lng,
    radius:Number(radiusEl.value)||100,
    mode:activeMode
  };
  searchAreaBtn.hidden=false;
});

function resizeMapStable(){
  try{
    map.resize();
    if(popup) requestAnimationFrame(()=>{ syncPopupPresentation(); snapPopup(); });
  }catch(e){}
}

map.on("load",()=>{
  resizeMapStable();
  addLayers();
  loadPopular();
  requestAnimationFrame(resizeMapStable);
  setTimeout(resizeMapStable,90);
  setTimeout(resizeMapStable,320);
});

host._concertMap = map;
host.resizeConcertMap = ()=>{
  requestAnimationFrame(resizeMapStable);
  setTimeout(resizeMapStable,80);
};
if("ResizeObserver" in window){
  const ro=new ResizeObserver(()=>requestAnimationFrame(resizeMapStable));
  ro.observe(root.querySelector(".map-shell"));
  host._concertResizeObserver=ro;
}
const mobileViewportRefresh=()=>{
  clearTimeout(host._concertViewportTimer);
  host._concertViewportTimer=setTimeout(resizeMapStable,90);
};
window.addEventListener("orientationchange",mobileViewportRefresh,{passive:true});
if(window.visualViewport) window.visualViewport.addEventListener("resize",mobileViewportRefresh,{passive:true});
host._concertViewportCleanup=()=>{
  window.removeEventListener("orientationchange",mobileViewportRefresh);
  if(window.visualViewport) window.visualViewport.removeEventListener("resize",mobileViewportRefresh);
};

}

class Music98Concerts extends HTMLElement{
  constructor(){
    super();
    this._started=false;
    this.attachShadow({mode:"open"});
  }
  connectedCallback(){
    if(!this.shadowRoot.innerHTML){
      const mapCss=document.createElement("link");
      mapCss.rel="stylesheet";
      mapCss.href="https://api.mapbox.com/mapbox-gl-js/v3.15.0/mapbox-gl.css";
      const style=document.createElement("style");
      style.textContent=CONCERTS_CSS;
      const shell=document.createElement("div");
      shell.innerHTML=CONCERTS_HTML;
      this.shadowRoot.append(mapCss,style,...shell.childNodes);\n      window.Music98Press?.install(this.shadowRoot);
    }

    const start=()=>{
      if(this._started) {
        if(this.resizeConcertMap) requestAnimationFrame(()=>this.resizeConcertMap());
        return;
      }
      this._started=true;
      ensureMapbox().then(()=>initConcerts(this.shadowRoot,this)).catch(err=>{
        console.error(err);
        const st=this.shadowRoot.querySelector("#status");
        if(st) st.textContent="Could not load the concert map.";
      });
    };

    const visible=()=>{
      const r=this.getBoundingClientRect();
      return r.width>0 && r.height>0;
    };

    if(visible()) start();

    this._observer=new IntersectionObserver(entries=>{
      if(entries.some(e=>e.isIntersecting)){
        start();
        setTimeout(()=>{ if(this.resizeConcertMap) this.resizeConcertMap(); },60);
      }
    },{threshold:0.01});
    this._observer.observe(this);
  }
  disconnectedCallback(){
    if(this._observer) this._observer.disconnect();
    if(this._concertResizeObserver) this._concertResizeObserver.disconnect();
    try{ this._concertViewportCleanup?.(); }catch(e){}
    clearTimeout(this._concertViewportTimer);
  }
}
if(!customElements.get("music98-concerts")) customElements.define("music98-concerts",Music98Concerts);
