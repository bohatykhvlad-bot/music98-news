"use strict";

const CONCERTS_CSS="\n:host{\n  --bg:#fff;--bg2:#f4f6f7;--card:#fff;--card2:#edf1f2;--line:#e2e8ea;--text:#15181a;--muted:#5c6a70;\n  --muted2:#8a969b;--accent:#00fdfb;--shadow:0 12px 34px rgba(15,45,55,.10);--r:16px;\n  --event-date-size:11.5px;--event-main-size:12.5px;--event-sub-size:11px;--event-art-size:42px;--event-date-col:54px;--event-gap:8px;--event-pad-y:9px;--event-pad-x:10px;--event-radius:14px;\n  --font:\"Pretendard\",Pretendard,-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;\n}\n*{box-sizing:border-box}\nhtml{overflow-x:clip}\nbody{margin:0;padding-top:70px;background:var(--bg);color:var(--text);font-family:var(--font);line-height:1.45;-webkit-font-smoothing:antialiased}\nbutton,input,select{font:inherit}\na{color:inherit}\n.topbar{position:fixed;inset:0 0 auto;z-index:20;background:rgba(255,255,255,.82);border-bottom:1px solid rgba(226,232,234,.85);backdrop-filter:blur(14px) saturate(170%);-webkit-backdrop-filter:blur(14px) saturate(170%)}\n.topbar-in{max-width:1180px;margin:auto;height:68px;padding:0 20px;display:grid;grid-template-columns:1fr auto 1fr;gap:16px;align-items:center}\n.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:20px;letter-spacing:-.015em}\n.brand img{width:40px;height:40px;border-radius:50%}\n.nav{justify-self:center;width:410px;max-width:100%;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;height:40px;gap:4px;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14);padding:4px;border-radius:999px}\n.nav-btn{width:100%;border:0;background:transparent;color:var(--muted);font-size:14px;font-weight:600;text-decoration:none;padding:0 8px;height:32px;display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;line-height:1;text-box:trim-both cap alphabetic;border-radius:999px;cursor:pointer;transition:.18s;-webkit-tap-highlight-color:transparent;-webkit-touch-callout:none;position:relative;top:.5px}\n.nav-btn:hover{color:var(--text)}\n.nav-btn.active{background:var(--accent);color:#03282b}\n@media(hover:hover) and (pointer:fine){.nav-btn:hover:not(.active){background:var(--bg2);color:var(--text)}}\n.topfill{justify-self:end;color:var(--muted);font-size:13px}\n.wrap{max-width:1180px;margin:0 auto;padding:22px 20px 50px}\n.hero{display:flex;align-items:center;justify-content:space-between;gap:24px;margin:0 0 16px}\n.hero h1{font-size:clamp(30px,4vw,44px);line-height:1.05;letter-spacing:-.04em;margin:0}\n.hero p{margin:0;color:var(--muted);font-size:15px}\n.controls{display:block;margin:0 0 16px}\n.search-wrap{position:relative}\n.city-input{width:100%;height:43px;border:1px solid var(--line);border-radius:999px;background:var(--bg2);padding:0 16px 0 41px;outline:none;color:var(--text);font-size:14px}\n.city-input:focus,.city-input:focus-visible{border-color:var(--accent);box-shadow:0 0 0 1.5px var(--accent);outline:none}\n.search-icon{position:absolute;left:15px;top:50%;transform:translateY(-50%);width:16px;height:16px;color:var(--muted2);pointer-events:none}\n.suggestions{position:absolute;z-index:30;top:49px;left:0;right:0;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden}\n.suggestion{width:100%;min-height:48px;border:0;background:#fff;text-align:left;padding:7px 12px;cursor:pointer;color:var(--text);display:flex;align-items:center;gap:10px}\n.suggestion:hover,.suggestion:focus{background:var(--bg2);outline:none}\n.suggestion-art{width:36px;height:36px;flex:0 0 36px;border:1px solid var(--line);border-radius:10px;object-fit:cover;background:var(--card2)}\n.suggestion-copy{min-width:0;display:flex;flex-direction:column}\n.suggestion-title{font-size:13.5px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.suggestion-kind{font-size:10.5px;color:var(--muted);margin-top:2px}\n.suggestion-location{padding-left:14px}\n.layout{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:16px;align-items:start}\n.map-shell{position:relative;height:420px;min-height:0;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;background:#fff;box-shadow:none}\n.map-fallback{position:absolute;z-index:7;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px;text-align:center;background:#fff;color:var(--muted);font-size:13px;line-height:1.45}.map-fallback[hidden]{display:none!important}.map-retry{height:36px;padding:0 16px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--text);font:600 13px/1 var(--font);cursor:pointer}.map-retry:hover{background:var(--bg2)}.map-retry:focus-visible{outline:2px solid #007f82;outline-offset:2px}\n@media(min-width:1100px){.map-shell{width:100%;height:420px}}\n#map{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:#fff}\n#map .mapboxgl-map,#map .mapboxgl-canvas-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;margin:0!important;background:#fff!important}\n#map .mapboxgl-canvas{position:absolute!important;inset:0!important;display:block;width:100%!important;height:100%!important;margin:0!important}\n.map-mode-switch{position:absolute;z-index:8;left:14px;top:14px;width:min(300px,calc(100% - 28px));max-width:calc(100% - 28px);height:40px;padding:4px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;gap:4px;border:0;border-radius:999px;background:transparent;box-shadow:none}\n.map-mode-switch[hidden]{display:none!important}\n.map-mode-btn{width:100%;height:32px;min-width:0;max-width:none;padding:0 12px;border:1px solid var(--line);border-radius:999px;background-color:#fff;color:var(--muted);font:600 14px/1 var(--font);display:grid;place-items:center;text-align:center;text-indent:var(--ink-x,0px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent;transition:background .18s ease,border-color .18s ease,color .18s ease}\n.map-mode-btn.active{background-color:var(--accent);border-color:var(--accent);color:#03282b}\n.map-mode-btn:hover:not(.active){background-color:var(--bg2);color:var(--text)}\n.map-mode-btn.active:hover{color:#03282b}\n.map-tool-stack{position:absolute;z-index:8;right:14px;top:14px;display:flex;gap:6px}\n.map-tool-btn,.search-area-btn{border:1px solid rgba(15,60,64,.14);background:#fff;color:var(--text);font:600 12.5px/1 var(--font);box-shadow:0 4px 14px rgba(15,45,55,.08);cursor:pointer;outline:none;-webkit-tap-highlight-color:transparent}\n.map-tool-btn{width:38px;height:38px;padding:0;border-radius:999px;display:grid;place-items:center;font-size:23px;font-weight:500;line-height:1;transform-origin:50% 50%}\n.map-tool-btn:hover{background:#fff;border-color:rgba(15,60,64,.14);color:var(--text)}\n.search-area-btn:hover{background:var(--accent);border-color:var(--accent);color:#03282b}\n.map-tool-btn:active{transform:none!important}\n.map-tool-btn[hidden],.search-area-btn[hidden]{display:none!important}\n.search-area-btn{position:absolute;z-index:8;left:0;right:0;bottom:16px;width:max-content;margin-inline:auto;height:36px;padding:0 16px;border-radius:999px;white-space:nowrap;text-indent:var(--ink-x,0px);transform:none;transition:background .18s ease,border-color .18s ease,color .18s ease}\n.side{border:1px solid var(--line);border-radius:var(--r);background:#fff;padding:13px;height:420px;min-height:420px;display:flex;flex-direction:column;box-shadow:var(--shadow);overflow:hidden}\n.side-tabs{\n  width:244px;max-width:100%;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:center;align-self:center;gap:4px;\n  height:40px;padding:3px;background:rgba(255,255,255,.55);\n  border:1px solid rgba(15,60,64,.14);border-radius:999px;margin:0 0 10px;\n  position:relative;top:auto;z-index:5;flex:0 0 auto;pointer-events:auto\n}\n.side-tab{\n  width:100%;min-width:0;max-width:none;height:32px;padding:0 12px;border:0;border-radius:999px;\n  background:transparent;color:var(--muted);font-size:14px;font-weight:600;\n  display:inline-flex;align-items:center;justify-content:center;text-align:center;text-indent:var(--ink-x,0px);line-height:1;text-box:trim-both cap alphabetic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer;\n  transition:.18s;pointer-events:auto;outline:none;-webkit-tap-highlight-color:transparent;position:relative;top:0\n}\n.side-tab:hover:not(.active){background:var(--bg2);color:var(--text)}\n.side-tab.active{background:var(--accent);color:#03282b}\n/* Align status, artist ranks and Ticketmaster disclosure. */\n.side-sub{font-size:12.5px;color:var(--muted);margin:0 4px 10px 17px;line-height:1.4;flex:0 0 auto}.side-sub:empty{display:none}\n.side-status{font-size:13.5px;color:var(--muted);margin:0 4px 8px 17px;line-height:1.4;flex:0 0 auto}.side-status:empty{display:none}\n.tours{display:flex;flex-direction:column;gap:6px;flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin;scrollbar-gutter:stable;padding-right:3px;overscroll-behavior:contain}\n.tour-card{\n  flex:0 0 auto;min-height:62px;\n  border:1px solid transparent;border-radius:var(--event-radius);overflow:hidden;background:transparent;\n  transition:border-color .2s ease,box-shadow .2s ease\n}\n.tour-card.open{\n  background:#fff;border-color:var(--line);box-shadow:var(--shadow)\n}\n.tour-row{\n  width:100%;min-height:62px;display:grid;grid-template-columns:24px 56px minmax(0,1fr) 18px;gap:8px;align-items:center;\n  border:0;background:transparent;border-radius:13px;padding:7px 8px;text-align:left;cursor:pointer;color:var(--text);\n  transition:background .16s ease\n}\n.tour-card:hover:not(.open) .tour-row{background:var(--bg2)}\n.tour-card.open .tour-row{background:var(--bg2);border-radius:13px 13px 0 0}\n.tour-rank{font-weight:800;font-size:11.5px;color:#879398;text-align:center;font-variant-numeric:tabular-nums}\n.tour-art{width:56px;height:56px;padding:2px;border-radius:12px;border:0;background:transparent;overflow:visible;flex:none;box-shadow:none;transition:background .16s ease}\n.tour-art img{width:100%;height:100%;display:block;object-fit:cover;border-radius:10px;background:var(--card2)}\n.tour-art .concert-art-canvas{width:100%;height:100%;display:block;border-radius:10px}\n.tour-card.open .tour-art{background:var(--accent)}\n.tour-copy{min-width:0;width:100%;padding:0;margin:0;display:grid;grid-template-columns:minmax(0,1fr);justify-items:start}\n.tour-name{display:block;width:100%;margin:0;padding:0;text-indent:0;text-align:left;font-size:15px;font-weight:800;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.015em;text-rendering:geometricPrecision}\n.tour-meta{display:block;width:100%;margin:3px 0 0;padding:0;text-indent:0;text-align:left;font-size:12px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.tour-chevron{width:18px;height:18px;display:grid;place-items:center;color:var(--muted);transition:transform .18s ease}\n.tour-chevron svg{width:14px;height:14px}\n.tour-card.open .tour-chevron{transform:rotate(90deg)}\n.tour-events{\n  max-height:0;opacity:0;overflow:hidden;pointer-events:none;\n  padding:0 9px;background:#fff;\n  transition:max-height .28s cubic-bezier(.3,.7,.4,1),opacity .18s ease\n}\n.tour-card.open .tour-events{\n  max-height:4800px;opacity:1;pointer-events:auto;padding:2px 9px 10px\n}\n.tour-loading,.tour-none{font-size:11.5px;color:var(--muted);padding:7px 2px 9px}\n.event-link{\n  width:100%;display:grid;grid-template-columns:var(--event-date-col) var(--event-art-size) minmax(0,1fr);gap:var(--event-gap);border:1px solid var(--line);\n  background:#fff;color:inherit;text-align:left;cursor:pointer;text-decoration:none;\n  padding:var(--event-pad-y) var(--event-pad-x);border-radius:var(--event-radius);margin:4px 0;align-items:center;outline:none\n}\n.event-link:hover{background:var(--bg2)}\n.event-date{font-size:var(--event-date-size);font-weight:800;color:var(--text);text-transform:uppercase;line-height:1.25;text-rendering:geometricPrecision}\n.event-art{width:var(--event-art-size);height:var(--event-art-size);border-radius:10px;object-fit:cover;background:var(--card2);display:block}\n.event-place{min-width:0}\n.event-city{display:block;font-size:var(--event-main-size);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-rendering:geometricPrecision}\n.event-venue{display:block;font-size:var(--event-sub-size);color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;text-rendering:geometricPrecision}\n.side-empty{font-size:12.5px;color:var(--muted);padding:12px 5px 12px 17px}\n.disclosure{margin-top:8px;padding:10px 4px 2px 17px;font-size:10.5px;color:#7a878c;line-height:1.4;flex:0 0 auto}\n.mapboxgl-popup{max-width:min(var(--pop-w,286px),calc(100vw - 44px))!important}\n.mapboxgl-popup-content{width:var(--pop-w,286px);max-width:calc(100vw - 44px);padding:0;border-radius:var(--pop-radius,15px);overflow:hidden;box-shadow:0 14px 38px rgba(15,45,55,.2);font-family:var(--font)}\n.pop-img{display:block;width:100%;height:var(--pop-img-h,142px);object-fit:cover;background:#eef2f3}\n.pop-body{padding:var(--pop-pad,13px)}\n.pop-title{font-size:var(--pop-title-size,16px);font-weight:800;line-height:1.18;margin:0 26px var(--pop-title-gap,6px) 0}\n.pop-meta{font-size:var(--pop-meta-size,13px);color:#56656b;margin:var(--pop-meta-gap,3px) 0}\n/* Single-event popups use a square portrait to avoid banner crops.\n   Venue-group popups keep their original, narrower layout. */\n.pop-card{width:100%;height:auto;background:#fff}\n.pop-card .pop-body{padding:14px 14px 16px}\n.pop-card .pop-grid{display:grid;grid-template-columns:138px minmax(0,1fr);gap:12px;align-items:start}\n.pop-card .pop-thumb{display:block;width:138px;height:138px;aspect-ratio:1;object-fit:cover;object-position:50% 18%;border-radius:12px;background:var(--card2)}\n.pop-card .pop-main{min-width:0;overflow-wrap:anywhere}\n.pop-card .pop-title{margin:0 28px 8px 0;line-height:1.2}\n.pop-card .pop-meta{font-size:13px;line-height:1.4;margin:0 0 6px;overflow-wrap:break-word}\n.pop-card .pop-meta + .pop-meta{margin-bottom:0}\n.pop-card .pop-meta.pop-venue{margin:0 0 2px}\n.pop-card .pop-actions{width:100%;display:flex;align-items:center;justify-content:center;margin-top:12px;padding:0}\n.pop-card .pop-actions .buy{width:min(150px,100%);margin:0}\n.venue-list{max-height:var(--venue-list-h,190px);overflow:auto;padding:2px 0 0;scrollbar-width:thin}\n.buy{position:relative;isolation:isolate;width:112px;max-width:100%;height:36px;margin:10px auto 0;padding:0;border:0;border-radius:999px;background:transparent;color:var(--text);text-decoration:none;font-family:var(--font);font-weight:700;outline:none;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;transform:none;-webkit-font-smoothing:antialiased;transition:color .16s ease}\n.buy::before{content:\"\";position:absolute;z-index:-1;inset:1px 2px;border:1px solid var(--line);border-radius:999px;background:#fff;transition:background .14s ease,border-color .14s ease}\n.buy-label{position:relative;width:100%;text-indent:var(--ink-x,0px);height:100%;display:grid;place-items:center;font-size:13px;line-height:1;white-space:nowrap;text-rendering:geometricPrecision;transform:none;translate:none;transition:none;-webkit-font-smoothing:antialiased}\n.mapboxgl-popup-close-button{font-size:20px;padding:5px 8px;color:#344}\n.mapboxgl-ctrl-group{border-radius:11px!important;overflow:hidden}\n.tour-row,.event-link,.suggestion,.mapboxgl-ctrl button{\n  transform:none!important;transition:background .16s ease,border-color .16s ease,box-shadow .16s ease,color .16s ease;\n}\n.tour-row:active,.event-link:active,.suggestion:active,.mapboxgl-ctrl button:active{transform:none!important}\n.buy:hover{color:#03282b}\n.buy:hover::before{background:var(--accent);border-color:var(--accent)}\n.buy:active,.buy.press{transform:none}\n@media(prefers-reduced-motion:reduce){\n  .side-tab,.tour-row,.event-link,.buy,.suggestion,.mapboxgl-ctrl button{transition:none}\n}\n@media(max-width:900px){\n  .layout{grid-template-columns:1fr}\n  .map-shell{height:420px}\n  .side{height:auto;max-height:620px}\n  .topfill{display:none}\n}\n@media(max-width:700px){\n  body{padding-top:126px}\n  .topbar-in{height:auto;min-height:118px;padding:8px 14px;display:flex;flex-wrap:wrap;gap:8px}\n  .brand{font-size:17px}\n  .brand img{width:32px;height:32px}\n  .nav{order:3;width:100%;height:48px;gap:4px;padding:4px;justify-content:stretch;background:rgba(255,255,255,.55);border:1px solid rgba(15,60,64,.14)}\n  .nav-btn{flex:1;height:38px;padding:0 8px;font-size:13px;justify-content:center;top:0}\n  .wrap{padding:18px 14px 36px}\n  .hero{align-items:flex-start;flex-direction:column}\n  .city-input{height:46px}\n  .suggestions{top:52px;max-height:min(55svh,360px);overflow-y:auto;overscroll-behavior:contain}\n  .map-shell{height:min(58svh,460px);min-height:350px;max-height:460px;border-radius:15px}\n  .map-mode-switch{left:10px;top:10px;max-width:calc(100% - 20px)}\n  .map-mode-btn{height:36px;padding:0 13px;font-size:13px}\n  .map-tool-stack{left:auto;right:10px;top:10px;bottom:auto;gap:5px;justify-content:flex-end}\n  .map-tool-btn{width:40px;height:40px;padding:0;font-size:23px}\n  .search-area-btn{left:auto;right:10px;top:10px;bottom:auto;margin-inline:0;height:40px}\n  .map-shell.artist-context .search-area-btn{top:60px}\n  .mapboxgl-ctrl button{width:42px!important;height:42px!important}\n  .mapboxgl-popup-close-button{width:40px;height:40px;padding:0;display:grid;place-items:center;line-height:1}\n  .side{border-radius:15px;max-height:none}\n  .side-tabs{height:44px}\n  .side-tab{height:36px}\n  .tours{overflow:visible;padding-right:0;scrollbar-gutter:auto}\n  .tour-events{padding-left:9px}\n  .buy{min-height:38px}\n}\n@media(max-width:640px){\n  .tour-row{grid-template-columns:24px 44px minmax(0,1fr) 18px}\n  .tour-art{width:44px;height:44px;border-radius:10px}\n  .tour-art img{border-radius:8px}\n  .tour-art .concert-art-canvas{border-radius:8px}\n}\n@media(max-width:640px){\n  .pop-card .pop-body{padding:12px 12px 14px}\n  .pop-card .pop-grid{grid-template-columns:100px minmax(0,1fr);gap:10px}\n  .pop-card .pop-thumb{width:100px;height:100px;border-radius:10px}\n  .pop-card .pop-title{margin-right:28px}\n  .pop-card .pop-actions{margin-top:10px}\n}\n@media(max-width:390px){\n  .map-shell{min-height:330px;height:54svh}\n}\n\n:host{display:block;width:100%;font-family:var(--font);color:var(--text);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}\n.wrap{padding:0 0 18px;max-width:none}\n.hero{margin:0 0 16px;align-items:center}\n.hero h1{font-size:clamp(26px,4vw,38px);line-height:1.15;letter-spacing:-.03em;margin:0}\n.hero p{font-size:15px}\n\n.tour-more{width:fit-content;max-width:100%;height:32px;padding:0 16px;margin:12px auto 2px;display:grid;place-items:center;text-align:center;text-indent:var(--ink-x,0px);border:1px solid var(--line);border-radius:999px;background:var(--bg2);color:var(--text);font-size:12.5px;font-weight:600;line-height:1;cursor:pointer;outline:none;transform:none;transition:background .15s ease,border-color .15s ease,color .15s ease;-webkit-tap-highlight-color:transparent}.tour-more:hover{background:var(--accent);border-color:var(--accent);color:#03282b}.tour-more:active{transform:none}\n\n.search-area-btn:active,.side-tab:active,.map-mode-btn:active{transform:none}\n.side-tab:focus-visible,.map-mode-btn:focus-visible,.tour-row:focus-visible,.event-link:focus-visible,.tour-more:focus-visible,.venue-event:focus-visible,.search-area-btn:focus-visible,.suggestion:focus-visible,.buy:focus-visible{outline:2px solid #007f82;outline-offset:2px}\n\n.venue-event{width:100%;border:1px solid var(--line);background:#fff;border-radius:var(--event-radius);padding:var(--event-pad-y) var(--event-pad-x);display:grid;grid-template-columns:var(--event-date-col) var(--event-art-size) minmax(0,1fr);gap:var(--event-gap);align-items:center;text-align:left;color:var(--text);cursor:pointer;outline:none;margin:4px 0}\n.venue-event:hover{background:var(--bg2)}\n.venue-event-date{font-size:var(--event-date-size);font-weight:800;text-transform:uppercase;line-height:1.25}\n.venue-event-art{width:var(--event-art-size);height:var(--event-art-size);border-radius:10px;object-fit:cover;background:var(--card2);display:block}\n.venue-event-copy{min-width:0}\n.venue-event-name{display:block;font-size:var(--event-main-size);font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n.venue-event-time{display:block;font-size:var(--event-sub-size);color:var(--muted);margin-top:2px}\n";
const CONCERTS_HTML="<main class=\"wrap\">\n  <section class=\"hero\">\n    <div>\n      <h1>Concerts Near You</h1>\n      \n    </div>\n  </section>\n\n  <div class=\"controls\">\n    <div class=\"search-wrap\">\n      <svg class=\"search-icon\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.1\" stroke-linecap=\"round\"><circle cx=\"11\" cy=\"11\" r=\"7\"/><path d=\"m20 20-3.5-3.5\"/></svg>\n      <input class=\"city-input\" id=\"citySearch\" type=\"search\" autocomplete=\"off\" placeholder=\"Search city or artist...\" aria-label=\"Search city or artist\">\n      <div class=\"suggestions\" id=\"suggestions\" hidden></div>\n    </div>\n  </div>\n\n  <div class=\"layout\">\n    <section class=\"map-shell\" id=\"mapShell\" aria-label=\"Concert map\">\n      <div id=\"map\"></div>\n      <div class=\"map-fallback\" id=\"mapFallback\" role=\"status\" hidden><span id=\"mapFallbackText\"></span><button class=\"map-retry\" id=\"mapRetry\" type=\"button\">Retry map</button></div>\n      <div class=\"map-mode-switch\" id=\"mapModeSwitch\" role=\"tablist\" aria-label=\"Map concert filter\" hidden>\n        <button class=\"map-mode-btn active\" id=\"mapArtistBtn\" type=\"button\" role=\"tab\" aria-selected=\"true\">Artist</button>\n        <button class=\"map-mode-btn\" id=\"mapAllBtn\" type=\"button\" role=\"tab\" aria-selected=\"false\">All concerts</button>\n      </div>\n      <button class=\"search-area-btn\" id=\"searchAreaBtn\" type=\"button\" hidden>Search this area</button>\n    </section>\n    <aside class=\"side\">\n      <div class=\"side-tabs\" role=\"tablist\" aria-label=\"Concert discovery\">\n        <button class=\"side-tab active\" id=\"popularTab\" type=\"button\" role=\"tab\" aria-selected=\"true\">Popular</button>\n        <button class=\"side-tab\" id=\"nearTab\" type=\"button\" role=\"tab\" aria-selected=\"false\">Near me</button>\n      </div>\n      <p class=\"side-sub\" id=\"sideSub\"></p>\n      <p class=\"side-status\" id=\"sideStatus\" role=\"status\" aria-live=\"polite\"></p>\n      <div class=\"tours\" id=\"tours\"></div>\n      <div class=\"side-empty\" id=\"sideEmpty\">Loading popular artists...</div>\n      <p class=\"disclosure\">Ticketing by Ticketmaster.</p>\n    </aside>\n  </div>\n</main>";

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

let hotspots=[];

const compactWorldView=window.matchMedia("(max-width:700px)").matches;
function createMapFallback(container){
  const sources=new Map();
  const noop=()=>{};
  const fallback={
    __fallback:true,
    dragRotate:{disable:noop},
    touchZoomRotate:{disableRotation:noop},
    addControl:noop,resize:noop,flyTo:noop,easeTo:noop,fitBounds:noop,
    addLayer:noop,setLayoutProperty:noop,setPaintProperty:noop,setLayerZoomRange:noop,
    addImage:noop,hasImage:()=>false,getLayer:()=>null,getStyle:()=>({layers:[]}),
    getZoom:()=>0,getCenter:()=>({lat:0,lng:0}),
    project:()=>({x:0,y:0}),unproject:()=>({lat:0,lng:0}),
    queryRenderedFeatures:()=>[],
    getCanvas:()=>({style:{}}),
    getContainer:()=>container,
    addSource:(id)=>{
      if(!sources.has(id)) sources.set(id,{setData:noop,getClusterExpansionZoom:async()=>0});
    },
    getSource:id=>sources.get(id)||null,
    on:(event,layerOrHandler,maybeHandler)=>{
      const handler=typeof layerOrHandler==="function" ? layerOrHandler : maybeHandler;
      if(event==="load" && typeof handler==="function") queueMicrotask(handler);
      return fallback;
    }
  };
  return fallback;
}
let map;
let mapInitError=null;
try{
  map=new mapboxgl.Map({
    container:root.querySelector("#map"),
    style:"mapbox://styles/mapbox/light-v11",
    projection:"mercator",
    center:compactWorldView ? [5,18] : [8,27],
    zoom:compactWorldView ? 0 : 1.55,
    renderWorldCopies:false,
    attributionControl:true
  });
  try{map.dragRotate.disable();}catch(e){}
  try{map.touchZoomRotate.disableRotation();}catch(e){}
  map.addControl(new mapboxgl.NavigationControl({showCompass:false}),"bottom-right");
}catch(err){
  mapInitError=err;
  console.error("Concert map unavailable",err);
  map=createMapFallback(root.querySelector("#map"));
}

const $ = (s)=>root.querySelector(s);
const toursEl=$("#tours"), sideEmpty=$("#sideEmpty");
const sideSub=$("#sideSub"), sideStatus=$("#sideStatus"), search=$("#citySearch"), suggestions=$("#suggestions");
const nearTab=$("#nearTab"), popularTab=$("#popularTab");
const mapShell=$("#mapShell"), mapFallback=$("#mapFallback"), mapFallbackText=$("#mapFallbackText"), mapModeSwitch=$("#mapModeSwitch"), mapArtistBtn=$("#mapArtistBtn"), mapAllBtn=$("#mapAllBtn");
const searchAreaBtn=$("#searchAreaBtn");

let currentEvents=[];
let artistMapEvents=[];
let nearbyEvents=[];
let nearbyTotal=0;
let currentTotal=0;
let popularEvents=[];
let popularArtists=[];
let lastArea=null;
let activeMode="popular";
let suggestTimer=0;
let suggestSeq=0;
let suggestGeocodeAbort=null;
let areaRequestSeq=0;
let popularRequestSeq=0;
let popularWarmTimer=0;
let popup=null;
let userMoving=false;
let pendingAreaSearch=null;
let expandedKey="";
let artistContext=null;
const artistEventCache=new Map();
const ARTIST_EVENT_CACHE_MS=5*60*1000;
const payloadCache=new Map();
const payloadInflight=new Map();
const PAYLOAD_CACHE_MS=3*60*1000;
const DEFAULT_RADIUS_KM=100;

/* Optical centering by rendered ink, not by the text advance box. CSS centers
   the advance box; fonts can leave unequal side-bearings that make labels look
   1-2 px right/left. Measure the actual painted alpha pixels with the active
   font, but keep the correction on whole CSS pixels so text never starts a
   press transform from a half-pixel offset. */
const pillInkCanvas=document.createElement("canvas");
function pillInkShift(el){
  if(!el) return 0;
  const text=String(el.textContent||"").trim();
  if(!text) return 0;
  const cs=getComputedStyle(el);
  const scale=3, pad=18;
  let ctx=pillInkCanvas.getContext("2d",{willReadFrequently:true});
  const font=[cs.fontStyle,cs.fontVariant,cs.fontWeight,cs.fontSize,cs.fontFamily].filter(Boolean).join(" ");
  ctx.font=font;
  if("letterSpacing" in ctx) ctx.letterSpacing=cs.letterSpacing;
  const advance=Math.max(1,ctx.measureText(text).width);
  const fontPx=Math.max(10,parseFloat(cs.fontSize)||14);
  pillInkCanvas.width=Math.ceil((advance+pad*2)*scale);
  pillInkCanvas.height=Math.ceil((fontPx*3+pad*2)*scale);
  ctx=pillInkCanvas.getContext("2d",{willReadFrequently:true});
  ctx.scale(scale,scale);
  ctx.font=font;
  if("letterSpacing" in ctx) ctx.letterSpacing=cs.letterSpacing;
  ctx.textBaseline="alphabetic";
  ctx.fillStyle="#000";
  const x0=pad, baseline=pad+fontPx*1.8;
  ctx.fillText(text,x0,baseline);
  const data=ctx.getImageData(0,0,pillInkCanvas.width,pillInkCanvas.height).data;
  let minX=pillInkCanvas.width,maxX=-1;
  for(let p=3;p<data.length;p+=4){
    if(data[p]<24) continue;
    const x=((p-3)/4)%pillInkCanvas.width;
    if(x<minX) minX=x;
    if(x>maxX) maxX=x;
  }
  if(maxX<minX) return 0;
  const inkCenter=((minX+maxX+1)/2)/scale-x0;
  const raw=advance/2-inkCenter;
  return Math.max(-2,Math.min(2,Math.round(raw)));
}
function centerPillInk(el){
  if(!el) return;
  el.style.setProperty("--ink-x",pillInkShift(el)+"px");
}
function centerAllPillInk(){
  root.querySelectorAll(".side-tab,.map-mode-btn,.search-area-btn,.tour-more,.buy-label").forEach(centerPillInk);
}
let pillInkFrame=0;
function queuePillInkCenter(){
  cancelAnimationFrame(pillInkFrame);
  pillInkFrame=requestAnimationFrame(centerAllPillInk);
}


function setStatus(message){ sideStatus.textContent=String(message||"").trim(); if(sideStatus.textContent) sideSub.textContent=""; }
function hidePendingAreaSearch(){
  pendingAreaSearch=null;
  searchAreaBtn.hidden=true;
}
function syncFitButton(){}
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
function locationLine(e){
  const seen=new Set();
  const country=String(e.country||"").trim();
  const displayCountry=String(e.countryCode||"").toUpperCase()==="US" ||
    /^(?:united states(?: of america)?|u\.?s\.?a\.?)$/i.test(country)
      ? "USA" : country;
  return [e.city,e.state,displayCountry]
    .map(value=>String(value||"").trim().replace(/\s+/g," "))
    .filter(value=>{
      if(!value) return false;
      const key=value.toLocaleLowerCase("en");
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    }).join(", ");
}
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
  queuePillInkCenter();
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
  queuePillInkCenter();
}
function applyMapMode(){
  const artist=activeMode==="artist";
  const area=activeMode==="nearby" || activeMode==="artist-area";
  const overviewZoom=map.getZoom()<4.7;
  const showArea=area && !overviewZoom;
  const showHubs=activeMode==="popular" || (area && overviewZoom);

  // Artist mode stays exclusive at every zoom. In an area/city mode, zooming
  // back out crosses into the global overview automatically: local event pins
  // disappear and the verified world-market layer returns.
  ["artist-points","artist-hit"].forEach(id=>setLayerVisible(id,artist));
  ["clusters","cluster-hit","event-points","event-hit","event-labels"].forEach(id=>setLayerVisible(id,showArea));

  [
    "capital-points","capital-labels","state-capital-labels","hub-hit-capital",
    "city-major-labels","hub-hit-major",
    "city-mid-labels","hub-hit-mid",
    "city-all-labels","hub-hit-all"
  ].forEach(id=>setLayerVisible(id,showHubs));

  // Legacy progressive point layers are permanently disabled; the stable
  // capital-points layer now carries every verified market at every zoom.
  ["city-major-points","city-mid-points","city-all-points"].forEach(id=>setLayerVisible(id,false));
  if(map.getLayer("cluster-count")) setLayerVisible("cluster-count",false);
}
function setMode(mode){
  if(activeMode!==mode) closePopup();
  activeMode=mode;
  if(mode!=="popular") clearPopularWarmRetry();
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
  GB:["london"],IE:["dublin"],NL:["amsterdam"],BE:["brussels","bruxelles","brussel"],
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
      const capital=isEuropeanCapital(h);
      const cc=String(h.countryCode||"").toUpperCase();
      const europe=!!EUROPE_CAPITALS[cc];
      const count=Number(h.count||0);
      const outsideMajor=!europe && count>=40;
      return {
        type:"Feature",
        geometry:{type:"Point",coordinates:[h.lng,h.lat]},
        properties:{
          name:h.city,countryCode:cc,stateCode:String(h.stateCode||""),radiusKm:Number(h.radiusKm||0),count,
          capital:capital?1:0,pinned:h.pinned?1:0,tier:Number(h.tier||0),
          overview:(h.verified||h.pinned||capital||outsideMajor||fallback.has(h))?1:0
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
  // Bright flat cartography only. Do not add DEM/hillshade: the owner prefers
  // the cleaner high-key map and it also avoids gray relief bands.
  try{
    const layers=map.getStyle()?.layers||[];
    for(const layer of layers){
      const id=String(layer.id||"");
      try{
        if(layer.type==="background"){
          map.setPaintProperty(id,"background-color","#ffffff");
        }
        if(layer.type==="fill" && /(^land$|land-|park|landcover|landuse|wood|grass|scrub|pitch|golf|cemetery)/i.test(id)){
          map.setPaintProperty(id,"fill-color","#fbfcfc");
          map.setPaintProperty(id,"fill-opacity",.92);
        }
        if(layer.type==="fill" && /building/i.test(id)){
          map.setPaintProperty(id,"fill-color","#f6f8f8");
          map.setPaintProperty(id,"fill-opacity",.78);
        }
        if(layer.type==="fill" && /water/i.test(id)){
          map.setPaintProperty(id,"fill-color","#dff4fa");
        }
        if(layer.type==="line" && /waterway|river|canal|stream/i.test(id)){
          map.setPaintProperty(id,"line-color","#cfeaf2");
        }else if(layer.type==="line" && /(admin|boundary|country|state)/i.test(id)){
          map.setPaintProperty(id,"line-color","#d8e0e2");
        }else if(layer.type==="line" && /(road|street|motorway|trunk|primary|secondary|tertiary)/i.test(id)){
          map.setPaintProperty(id,"line-color",/(motorway|trunk|primary)/i.test(id)?"#dde3e5":"#edf0f1");
        }
        if(layer.type==="symbol" && /(poi|transit|airport|ferry)/i.test(id) && typeof map.setLayerZoomRange==="function"){
          map.setLayerZoomRange(id,8.5,24);
        }else if(layer.type==="symbol" && /(road.*label|road-label)/i.test(id) && typeof map.setLayerZoomRange==="function"){
          map.setLayerZoomRange(id,6.5,24);
        }
      }catch(e){}
    }
  }catch(err){
    console.warn("Optional map palette adjustment disabled",err);
  }
}

function addLayers(){
  if(map.getSource("events")) return;

  // Keep the bright flat Mapbox palette; no DEM hillshade/gray relief.
  try{ addConcertTriangle(); }catch(err){ console.error("Concert marker setup failed",err); }

  map.addSource("hubs",{type:"geojson",data:hubsGeoJSON()});
  requestAnimationFrame(()=>{ const src=map.getSource("hubs"); if(src) src.setData(hubsGeoJSON()); });

  // One stable marker layer for every verified Ticketmaster market at every zoom.
  // Labels can still reveal progressively, but the marker itself must never
  // disappear just because the camera crosses a zoom threshold.
  map.addLayer({
    id:"capital-points",type:"symbol",source:"hubs",minzoom:0,maxzoom:18,
    layout:{
      "icon-image":"m98-triangle",
      "icon-size":["interpolate",["linear"],["zoom"],0,.58,3,.68,5,.82,7,.94,12,1.08],
      "icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true
    }
  });
  map.addLayer({
    id:"capital-labels",type:"symbol",source:"hubs",minzoom:2.75,maxzoom:4.7,filter:["all",["==",["get","overview"],1],["!=",["get","tier"],2]],
    layout:{
      "text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],
      "text-offset":[0,-1.25],"text-anchor":"bottom","text-allow-overlap":false
    },
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"state-capital-labels",type:"symbol",source:"hubs",minzoom:4.0,maxzoom:4.7,filter:["==",["get","tier"],2],
    layout:{
      "text-field":["concat",["get","name"]," · ",["get","stateCode"]],"text-size":10.5,
      "text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.2],"text-anchor":"bottom",
      "text-allow-overlap":false
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
    id:"city-major-points",type:"symbol",source:"hubs",minzoom:4.7,maxzoom:5.7,filter:["any",[">=",["get","count"],40],["==",["get","pinned"],1]],
    layout:{"visibility":"none","icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-major-labels",type:"symbol",source:"hubs",minzoom:4.9,maxzoom:5.7,filter:["any",[">=",["get","count"],40],["==",["get","pinned"],1]],
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-major",type:"circle",source:"hubs",minzoom:4.7,maxzoom:5.7,filter:["any",[">=",["get","count"],40],["==",["get","pinned"],1]],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  map.addLayer({
    id:"city-mid-points",type:"symbol",source:"hubs",minzoom:5.7,maxzoom:6.4,filter:["any",[">=",["get","count"],20],["==",["get","pinned"],1]],
    layout:{"visibility":"none","icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-mid-labels",type:"symbol",source:"hubs",minzoom:5.9,maxzoom:6.4,filter:["any",[">=",["get","count"],20],["==",["get","pinned"],1]],
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-mid",type:"circle",source:"hubs",minzoom:5.7,maxzoom:6.4,filter:["any",[">=",["get","count"],20],["==",["get","pinned"],1]],
    paint:{"circle-color":"rgba(0,0,0,.001)","circle-radius":22,"circle-opacity":.001,"circle-stroke-width":0}
  });

  map.addLayer({
    id:"city-all-points",type:"symbol",source:"hubs",minzoom:6.4,maxzoom:18,
    layout:{"visibility":"none","icon-image":"m98-triangle","icon-size":hubIconSize,"icon-anchor":"bottom","icon-allow-overlap":true,"icon-ignore-placement":true}
  });
  map.addLayer({
    id:"city-all-labels",type:"symbol",source:"hubs",minzoom:6.6,maxzoom:12,
    layout:{"text-field":["get","name"],"text-size":11,"text-font":["Open Sans Semibold","Arial Unicode MS Bold"],"text-offset":[0,-1.3],"text-anchor":"bottom","text-allow-overlap":false},
    paint:{"text-color":"#20272a","text-halo-color":"rgba(255,255,255,.96)","text-halo-width":1.5}
  });
  map.addLayer({
    id:"hub-hit-all",type:"circle",source:"hubs",minzoom:6.4,maxzoom:18,
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
    focusEventGroupOnMap(group);
  });
  map.on("click","artist-hit",e=>{
    const id=String(e.features?.[0]?.properties?.id||"");
    const ev=artistMapEvents.find(x=>x.id===id);
    if(!ev) return;
    const group=eventsAtSameVenue(ev,artistMapEvents);
    focusEventGroupOnMap(group);
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
      focusEventGroupOnMap(group);
    }
  });
  applyMapMode();
}

function handleHubClick(e){
  const f=e.features?.[0];
  if(!f) return;
  const [lng,lat]=f.geometry.coordinates;
  const name=String(f.properties?.name||"Selected city");
  const radius=Math.max(5,Number(f.properties?.radiusKm)||(Number(f.properties?.tier)===2?45:60));
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:8.5,duration:650});
  loadArea(lat,lng,name,{
    fit:false,radius,
    city:name,
    countryCode:String(f.properties?.countryCode||""),
    stateCode:String(f.properties?.stateCode||"")
  });
}

// Optimize only the ORIGINAL selected Ticketmaster photo through this site's
// Cloudflare image cache. No alternate Ticketmaster thumbnail is substituted,
// and no extra Ticketmaster API calls or image-handling Worker routes are used.
// Only transform the exact original Ticketmaster image. One stable URL for
// each preset keeps the free-plan unique-transformation count predictable.
// The CSS controls the displayed square/portrait: never change the artist,
// source image or crop merely to get a different-sized Ticketmaster image.
// Browser-only original-photo rendering. There are no CDN transformations,
// no probe requests, and no alternate artist image selection.
function browserResampleConcertArt(img,preset){
  const render=(attempt=0)=>{
    if(!img.isConnected){
      if(attempt<8) requestAnimationFrame(()=>render(attempt+1));
      return;
    }
    if(!img.naturalWidth || !img.naturalHeight) return;
    const bounds=img.getBoundingClientRect();
    const dpr=Math.max(1,Math.min(3,Number(window.devicePixelRatio)||1));
    const display=Math.max(1,Math.round(Math.max(bounds.width,bounds.height)*dpr));
    if(bounds.width<1 || bounds.height<1) return;
    try{
      const crop=Math.min(img.naturalWidth,img.naturalHeight);
      const sx=(img.naturalWidth-crop)/2;
      // Match the existing top-biased single-event popup composition.
      const sy=(img.naturalHeight-crop)*(img.classList.contains("pop-thumb")?0.18:0.5);
      const square=Math.max(display,Math.min(crop,display*2));
      const pre=document.createElement("canvas"); pre.width=square; pre.height=square;
      const prectx=pre.getContext("2d",{alpha:false});
      if(!prectx) return;
      prectx.imageSmoothingEnabled=true;
      prectx.imageSmoothingQuality="high";
      prectx.drawImage(img,sx,sy,crop,crop,0,0,square,square);
      const visible=document.createElement("canvas");
      visible.width=display; visible.height=display;
      visible.className=(img.className||"")+" concert-art-canvas";
      visible.setAttribute("aria-hidden","true");
      visible.draggable=false;
      const ctx=visible.getContext("2d",{alpha:false});
      if(!ctx) return;
      ctx.imageSmoothingEnabled=true;
      ctx.imageSmoothingQuality="high";
      ctx.drawImage(pre,0,0,square,square,0,0,display,display);
      img.replaceWith(visible);
    }catch(_){
      // Preserve the loaded original if a browser refuses canvas drawing.
    }
  };
  if(preset==="icon" && typeof window.requestIdleCallback==="function"){
    window.requestIdleCallback(()=>render(),{timeout:450});
  }else{
    requestAnimationFrame(()=>render());
  }
}
function applyConcertArt(img,original,preset){
  const originalSrc=String(original||"/logo.png");
  img.draggable=false;
  img.onload=()=>{
    img.onload=null;
    if(originalSrc!=="/logo.png") browserResampleConcertArt(img,preset);
  };
  img.onerror=()=>{
    img.onload=null;
    img.onerror=null;
    if(originalSrc!=="/logo.png") img.src="/logo.png";
  };
  img.src=originalSrc;
}

function popupContent(e){
  const root=document.createElement("div"); root.className="pop-card";
  const body=document.createElement("div"); body.className="pop-body";
  const grid=document.createElement("div"); grid.className="pop-grid";

  const img=document.createElement("img");
  img.className="pop-thumb";
  img.alt="";
  img.loading="eager";
  img.decoding="async";
  img.width=138; img.height=138;
  const originalArt=e.image||e.artistImage||"/logo.png";
  applyConcertArt(img,originalArt,"event");

  const main=document.createElement("div"); main.className="pop-main";
  const title=document.createElement("div"); title.className="pop-title"; title.textContent=e.artist||e.name||"Artist";
  const date=document.createElement("div"); date.className="pop-meta"; date.textContent=fmtDate(e)+(e.time?" · "+e.time.slice(0,5):"");
  main.append(title,date);
  // Keep the venue distinct from the comma-separated city, state and country.
  const venueName=String(e.venue||"").trim();
  if(venueName){
    const venue=document.createElement("div"); venue.className="pop-meta pop-venue"; venue.textContent=venueName;
    main.appendChild(venue);
  }
  const address=locationLine(e);
  if(address){
    const location=document.createElement("div"); location.className="pop-meta pop-location"; location.textContent=address;
    main.appendChild(location);
  }
  // Presentation-only photo: no link, hover zoom or native dragging.
  grid.append(img,main);
  body.appendChild(grid);

  if(e.url){
    const actions=document.createElement("div"); actions.className="pop-actions";
    const a=document.createElement("a"); a.className="buy"; a.href=e.url; a.target="_blank"; a.rel="sponsored noopener";
    const label=document.createElement("span");
    label.className="buy-label";
    label.dataset.label="Buy Tickets";
    label.textContent="Buy Tickets";
    a.appendChild(label);
    if(typeof window.music98PillPress==="function") window.music98PillPress(a);
    actions.appendChild(a);
    body.appendChild(actions);
    queuePillInkCenter();
  }
  root.appendChild(body);
  return root;
}

function eventsAtSameVenue(target,pool){
  const tid=String(target?.venueId||"").trim();
  const norm=v=>String(v||"").trim().toLowerCase();
  return (pool||[]).filter(e=>{
    const eid=String(e?.venueId||"").trim();
    if(tid && eid) return eid===tid;
    return !!target?.venue &&
      norm(e?.venue)===norm(target.venue) &&
      norm(e?.city)===norm(target.city) &&
      norm(e?.state)===norm(target.state) &&
      norm(e?.countryCode||e?.country)===norm(target.countryCode||target.country);
  }).sort((a,b)=>String(a.date||"9999").localeCompare(String(b.date||"9999"))||String(a.time||"").localeCompare(String(b.time||"")));
}

function venuePopupContent(events){
  const first=events[0];
  const root=document.createElement("div");
  const body=document.createElement("div"); body.className="pop-body";
  const title=document.createElement("div"); title.className="pop-title"; title.textContent=first.venue||first.city||"Concerts";
  body.appendChild(title);
  const place=document.createElement("div"); place.className="pop-meta"; place.textContent=locationLine(first);
  body.appendChild(place);
  const list=document.createElement("div"); list.className="venue-list";
  events.forEach(ev=>{
    const b=document.createElement("button"); b.type="button"; b.className="venue-event";
    const d=document.createElement("span"); d.className="venue-event-date"; d.textContent=shortDate(ev);
    const img=document.createElement("img"); img.className="venue-event-art"; img.alt=""; img.loading="lazy";
    applyConcertArt(img,ev.artistImage||ev.image||"/logo.png","icon");
    const cp=document.createElement("span"); cp.className="venue-event-copy";
    const n=document.createElement("span"); n.className="venue-event-name"; n.textContent=ev.artist||ev.name;
    const tm=document.createElement("span"); tm.className="venue-event-time"; tm.textContent=ev.time?ev.time.slice(0,5):"";
    cp.append(n,tm); b.append(d,img,cp);
    b.addEventListener("click",()=>focusEventOnMap(ev));
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
  const singleEvent=!!el.querySelector(".pop-card");
  const width=singleEvent?(window.matchMedia("(max-width:700px)").matches?"300px":"340px"):"286px";
  el.style.setProperty("--pop-w",width);
  if(typeof popup.setMaxWidth==="function") popup.setMaxWidth(width);

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


// Keep a map-attached popup clear of Search this area without changing zoom.
// The pill is at the bottom on desktop and at the top right on phones.
function popupPanShift(mapRect,popRect,pillRect){
  const margin=16, gap=14;
  const leftLimit=mapRect.left+margin;
  const rightLimit=mapRect.right-margin;
  let topLimit=mapRect.top+margin;
  let bottomLimit=mapRect.bottom-margin;
  const pillAtBottom=!!pillRect && pillRect.top>mapRect.top+mapRect.height/2;
  if(pillAtBottom){
    bottomLimit=Math.min(bottomLimit,pillRect.top-gap);
  }else if(pillRect){
    const overlapsHorizontally=popRect.left<pillRect.right+gap && popRect.right>pillRect.left-gap;
    if(overlapsHorizontally && popRect.height<=bottomLimit-pillRect.bottom-gap){
      topLimit=Math.max(topLimit,pillRect.bottom+gap);
    }
  }
  let shiftX=popRect.left<leftLimit ? leftLimit-popRect.left :
    popRect.right>rightLimit ? rightLimit-popRect.right : 0;
  let shiftY=0;
  if(pillAtBottom && popRect.bottom>bottomLimit){
    // The lower pill takes priority over ordinary map-edge positioning.
    shiftY=bottomLimit-popRect.bottom;
    // Align nearly centered cards with the pill without sweeping across the map.
    const pillCenter=(pillRect.left+pillRect.right)/2;
    const popupCenter=(popRect.left+popRect.right)/2;
    const centerOffset=pillCenter-popupCenter;
    if(Math.abs(centerOffset)<=64){
      shiftX=Math.max(leftLimit-popRect.left,Math.min(rightLimit-popRect.right,centerOffset));
    }
  }else if(popRect.top<topLimit){
    shiftY=topLimit-popRect.top;
  }else if(popRect.bottom>bottomLimit){
    shiftY=bottomLimit-popRect.bottom;
  }
  return {shiftX,shiftY};
}
function ensurePopupFullyVisible(){
  if(!popup) return;
  const el=popup.getElement ? popup.getElement() : map.getContainer().querySelector(".mapboxgl-popup");
  if(!el) return;
  const mapRect=map.getContainer().getBoundingClientRect();
  const popRect=el.getBoundingClientRect();
  const pillRect=searchAreaBtn && !searchAreaBtn.hidden && searchAreaBtn.getClientRects?.().length
    ? searchAreaBtn.getBoundingClientRect() : null;
  const {shiftX,shiftY}=popupPanShift(mapRect,popRect,pillRect);
  if(Math.abs(shiftX)<1 && Math.abs(shiftY)<1) return;
  const centerPoint=[mapRect.width/2-shiftX,mapRect.height/2-shiftY];
  const newCenter=map.unproject(centerPoint);
  userMoving=false;
  map.easeTo({center:newCenter,duration:280}); // Pan only: keep the user's current zoom.
  setTimeout(snapPopup,300);
}

function showPopup(e){
  if(map.getZoom()<POPUP_CITY_MIN_ZOOM) return;
  const popupMaxWidth=window.matchMedia("(max-width:700px)").matches?"300px":"340px";
  installPopup(new mapboxgl.Popup({offset:16,closeButton:true,maxWidth:popupMaxWidth,focusAfterOpen:false})
    .setLngLat([e.lng,e.lat]).setDOMContent(popupContent(e))).addTo(map);
  syncPopupPresentation();
  requestAnimationFrame(()=>requestAnimationFrame(ensurePopupFullyVisible));
  setTimeout(ensurePopupFullyVisible,80);
}

function focusEventGroupOnMap(events){
  const group=Array.isArray(events)?events.filter(Boolean):[];
  const first=group[0];
  if(!first || !Number.isFinite(Number(first.lat)) || !Number.isFinite(Number(first.lng))) return;
  const modeAtClick=activeMode;
  const contextAtClick=areaRequestSeq;
  const present=()=>{
    if(activeMode!==modeAtClick || areaRequestSeq!==contextAtClick) return;
    group.length>1 ? showVenuePopup(group) : showPopup(first);
  };
  // Clicking an already visible concert must not zoom out or recenter the map.
  if(map.getZoom()>=POPUP_CITY_MIN_ZOOM){ present(); return; }
  // Only zoom IN when a date was picked while the map was at world/city scale.
  userMoving=false;
  map.easeTo({center:[Number(first.lng),Number(first.lat)],zoom:POPUP_CITY_MIN_ZOOM+.1,duration:380});
  setTimeout(present,405);
}
function focusEventOnMap(e){ focusEventGroupOnMap([e]); }

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

const artistLocationCache=new Map();
function eventLocationKey(e){
  const city=normPlaceName(e?.city);
  const state=normPlaceName(e?.state);
  const country=String(e?.countryCode||e?.country||"").trim().toUpperCase();
  return [city,state,country].join("|");
}
function hotspotPointForEvent(e){
  const city=normPlaceName(e?.city);
  if(!city) return null;
  const cc=String(e?.countryCode||"").trim().toUpperCase();
  const state=String(e?.state||"").trim().toUpperCase();
  const exact=(hotspots||[]).find(h=>{
    if(normPlaceName(h?.city)!==city) return false;
    const hcc=String(h?.countryCode||"").trim().toUpperCase();
    if(cc && hcc && cc!==hcc) return false;
    const hs=String(h?.stateCode||"").trim().toUpperCase();
    return !state || !hs || state===hs;
  });
  if(!exact) return null;
  const lat=Number(exact.lat),lng=Number(exact.lng);
  return validMapEvents([{lat,lng}]).length ? {lat,lng,source:"market"} : null;
}
async function hydrateArtistMapCoordinates(events){
  const out=(events||[]).map(e=>({...e}));
  const groups=new Map();
  for(const e of out){
    if(validMapEvents([e]).length) continue;
    const key=eventLocationKey(e);
    if(!key || key.startsWith("||")) continue;
    if(!groups.has(key)) groups.set(key,[]);
    groups.get(key).push(e);
  }
  await Promise.all([...groups.entries()].map(async([key,group])=>{
    const sample=group[0];
    let point=hotspotPointForEvent(sample) || artistLocationCache.get(key) || null;
    if(!point){
      const query=[sample.city,sample.state,sample.country||sample.countryCode].filter(Boolean).join(", ");
      if(query){
        try{
          const features=await geocode(query,false);
          const coords=features?.[0]?.geometry?.coordinates;
          const lng=Number(coords?.[0]),lat=Number(coords?.[1]);
          if(validMapEvents([{lat,lng}]).length){
            point={lat,lng,source:"mapbox-city"};
            artistLocationCache.set(key,point);
          }
        }catch(err){
          console.warn("Could not resolve artist map location",query,err);
        }
      }
    }
    if(!point) return;
    for(const e of group){
      e.lat=point.lat;
      e.lng=point.lng;
      e.coordApproximate=true;
      e.coordSource=point.source;
    }
  }));
  return out;
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
    .slice(0,30)
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
      const img=document.createElement("img"); img.className="event-art"; img.alt=""; img.loading="lazy";
      applyConcertArt(img,e.artistImage||e.image||"/logo.png","icon");
        const p=document.createElement("span"); p.className="event-place";
      const city=document.createElement("span"); city.className="event-city"; city.textContent=[e.city,e.countryCode].filter(Boolean).join(", ")||"Venue TBA";
      const venue=document.createElement("span"); venue.className="event-venue"; venue.textContent=e.venue||e.name||"";
      p.append(city,venue); b.append(d,img,p);
      b.addEventListener("click",()=>{
        if(validMapEvents([e]).length){
          focusEventOnMap(e);
        }else{
          setStatus("Map location is unavailable for this venue.");
        }
      });
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
    queuePillInkCenter();
    more.addEventListener("click",()=>{
      draw();
    });
    box.appendChild(more);
  }

  draw();
}

async function eventsForArtist(item,mode){
  if(mode==="nearby" && Array.isArray(item.events)){
    return {events:item.events,total:item.events.length,partial:false};
  }
  const key=item.id ? "id:"+item.id : "name:"+String(item.name||"").toLowerCase();
  const cached=artistEventCache.get(key);
  if(cached && Date.now()-cached.at<ARTIST_EVENT_CACHE_MS) return cached.data;
  const params=item.id ? {attractionId:item.id} : {artist:item.name};
  const payload=await getPayload(params);
  const data={
    events:Array.isArray(payload?.events)?payload.events:[],
    total:Number(payload?.page?.totalElements ?? payload?.events?.length ?? 0)||0,
    partial:!!payload?.partial
  };
  artistEventCache.set(key,{at:Date.now(),data});
  return data;
}

function clearArtistContext(){
  closePopup();
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
  sideSub.textContent="";
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
    events=events.filter(e=>{
      const elat=Number(e?.lat),elng=Number(e?.lng);
      const mappable=Number.isFinite(elat)&&Number.isFinite(elng)&&
        elat>=-90&&elat<=90&&elng>=-180&&elng<=180&&
        !(Math.abs(elat)<1e-7&&Math.abs(elng)<1e-7);
      return !mappable || distanceKm(lat,lng,elat,elng)<=maxDistance;
    });
    const total=Number(data.page?.totalElements ?? events.length) || events.length;
    artistContext.areaEvents=events;
    artistContext.areaTotal=total;
    artistContext.areaCenter={lat,lng,radius:searchRadius};
    setEventData(events,total);
    setStatus(data.partial && total>events.length
      ? "Showing the soonest upcoming concerts in this area."
      : "");
  }catch(err){
    if(requestId!==areaRequestSeq) return;
    console.error(err);
    setStatus(concertErrorMessage(err,"Could not load concerts in this area."));
  }
}
async function showAllConcertsInMapArea(){
  if(!artistContext) return;
  const c=map.getCenter();
  await loadArtistArea(c.lat,c.lng,"Map area",DEFAULT_RADIUS_KM);
}

async function toggleArtist(item,card,mode){
  const key=artistKey(item);
  const box=card.querySelector(".tour-events");
  const opening=expandedKey!==key;
  root.querySelectorAll(".tour-card.open").forEach(el=>{
    setTourBoxHeight(el.querySelector(".tour-events"),false);
    el.classList.remove("open");
    el.querySelector(".tour-row")?.setAttribute("aria-expanded","false");
  });

  if(!opening){
    const source=artistContext?.sourceMode||mode;
    expandedKey="";
    clearArtistContext();
    setMode(source==="nearby"?"nearby":"popular");
    sideSub.textContent="";
    restoreModeMap();
    return;
  }

  const requestId=++areaRequestSeq;
  popularRequestSeq++;
  artistContext={item:{...item},events:[],sourceMode:mode,sourceItems:sourceItemsForArtist(item,mode)};
  setMode("artist");
  sideSub.textContent="";
  setEventData([],0);
  expandedKey=key;
  closePopup();
  card.classList.add("open");
  card.querySelector(".tour-row")?.setAttribute("aria-expanded","true");
  box.textContent="";
  const loading=document.createElement("div"); loading.className="tour-loading"; loading.textContent="Loading dates...";
  box.appendChild(loading);
  setTourBoxHeight(box,true);

  try{
    const result=await eventsForArtist(item,mode);
    if(requestId!==areaRequestSeq || expandedKey!==key || activeMode!=="artist" || !artistContext || artistKey(artistContext.item)!==key) return;
    let events=stabilizeArtistCoordinates(result.events);
    events=await hydrateArtistMapCoordinates(events);
    if(requestId!==areaRequestSeq || expandedKey!==key || activeMode!=="artist" || !artistContext || artistKey(artistContext.item)!==key) return;
    renderEventList(box,events);
    setTourBoxHeight(box,true);
    if(artistContext && artistKey(artistContext.item)===key) artistContext.events=events;
    setMode("artist");
    setEventData([],0);
    setArtistMapData(events);
    sideSub.textContent="";
    if(events.length) fitEvents(events);
    setStatus(result.partial && result.total>events.length
      ? "Showing "+events.length+" loaded dates of "+result.total+" Ticketmaster results · "+item.name
      : (events.length ? events.length+" upcoming concerts · "+item.name : "No upcoming concerts · "+item.name));
  }catch(err){
    if(requestId!==areaRequestSeq || expandedKey!==key) return;
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
    sideEmpty.textContent=mode==="popular" ? "No popular artists are available right now." : "No upcoming concerts in this area.";
    return;
  }

  items.forEach((item,index)=>{
    const card=document.createElement("div"); card.className="tour-card"; card.dataset.artistKey=artistKey(item);
    const row=document.createElement("button"); row.type="button"; row.className="tour-row"; row.setAttribute("aria-expanded","false");

    const rank=document.createElement("span"); rank.className="tour-rank"; rank.textContent=String(item.rank||index+1);

    const art=document.createElement("span"); art.className="tour-art";
    const img=document.createElement("img"); img.alt=""; img.loading="lazy";
    applyConcertArt(img,item.image||"/logo.png","icon");
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
    setStatus(nearbyEvents.length ? "Ranked by number of upcoming concerts" : "");
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
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),15000);
    let r;
    try{
      r=await fetch(u,{cache:"no-store",headers:{"Accept":"application/json","Cache-Control":"no-cache"},signal:controller.signal});
    }finally{
      clearTimeout(timer);
    }
    const j=await r.json().catch(()=>({}));
    if(!r.ok) throw new Error(j.error||"concerts_unavailable");
    payloadCache.set(key,{at:Date.now(),data:j});
    return j;
  })();
  payloadInflight.set(key,work);
  try{return await work;}finally{payloadInflight.delete(key);}
}

function concertErrorMessage(err,fallback){
  const code=String(err?.message||"");
  if(code==="ticketmaster_temporarily_limited" || code==="ticketmaster_budget_guard") return "Ticketmaster is temporarily limiting requests. Please try again later.";
  if(code==="ticketmaster_key_missing") return "Concert search is being connected. Please try again shortly.";
  return fallback;
}

function mergeHotspots(rows){
  const byKey=new Map();
  for(const h of rows||[]){
    if(Number(h?.count||0)<=0) continue;
    const key=(String(h.city||"")+"|"+String(h.stateCode||"")+"|"+String(h.countryCode||"")).toLowerCase();
    const prev=byKey.get(key);
    if(!prev || Number(h.count||0)>Number(prev.count||0)) byKey.set(key,{...h,verified:true,pinned:1});
  }
  return [...byKey.values()].sort((a,b)=>Number(b.count||0)-Number(a.count||0)||String(a.city||"").localeCompare(String(b.city||"")));
}

const POPULAR_ALGORITHM="rank-ordered-event-query-v2";
const POPULAR_CACHE_KEY="music98:concert-popular:v11";
function readPopularCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(POPULAR_CACHE_KEY)||"null");
    const age=Date.now()-(Date.parse(cached?.builtAt||0)||0);
    if(cached?.version==="popular-v4" &&
       cached?.algorithm===POPULAR_ALGORITHM &&
       cached?.source==="spotify_monthly_listeners" &&
       cached?.eligibility==="ticketmaster_event_payload_gt_0" &&
       Array.isArray(cached.artists) &&
       cached.artists.length>=30 &&
       cached.artists.every(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0) &&
       age<26*60*60*1000) return cached;
  }catch(e){}
  return null;
}
function writePopularCache(data){
  if(data?.stale ||
     data?.version!=="popular-v4" ||
     data?.algorithm!==POPULAR_ALGORITHM ||
     data?.source!=="spotify_monthly_listeners" ||
     data?.eligibility!=="ticketmaster_event_payload_gt_0" ||
     !Array.isArray(data.artists) ||
     data.artists.length<30 ||
     !data.artists.every(a=>a?.eventConfirmed===true && Number(a?.shows||0)>0)) return;
  try{localStorage.setItem(POPULAR_CACHE_KEY,JSON.stringify(data));}catch(e){}
}

const MARKET_CACHE_KEY="music98:concert-markets:v7";
function readMarketCache(){
  try{
    const cached=JSON.parse(localStorage.getItem(MARKET_CACHE_KEY)||"null");
    const age=Date.now()-(Date.parse(cached?.builtAt||0)||0);
    if(cached?.version==="concert-markets-v4" && Array.isArray(cached.markets) && cached.markets.length && age<30*60*60*1000) return cached;
  }catch(e){}
  return null;
}
function writeMarketCache(data){
  if(data?.version!=="concert-markets-v4" || !Array.isArray(data.markets) || !data.markets.length) return;
  try{localStorage.setItem(MARKET_CACHE_KEY,JSON.stringify(data));}catch(e){}
}
async function loadMarkets(){
  const cached=readMarketCache();
  if(cached?.markets?.length){
    hotspots=mergeHotspots(cached.markets);
    const src=map.getSource("hubs");
    if(src) src.setData(hubsGeoJSON());
  }
  try{
    const data=await getPayload({mode:"markets",v:"concert-markets-v7"});
    if(data?.markets?.length){
      hotspots=data.complete===false
        ? mergeHotspots([...(hotspots||[]),...data.markets])
        : mergeHotspots(data.markets);
      const src=map.getSource("hubs");
      if(src) src.setData(hubsGeoJSON());
      if(data.complete!==false) writeMarketCache(data);
    }
  }catch(err){
    console.error(err);
  }
}

function clearPopularWarmRetry(){
  if(popularWarmTimer){ clearTimeout(popularWarmTimer); popularWarmTimer=0; }
}
function schedulePopularWarmRetry(){
  clearPopularWarmRetry();
  popularWarmTimer=setTimeout(()=>{
    popularWarmTimer=0;
    if(activeMode==="popular" && !artistContext) loadPopular(true);
  },30000);
}

async function loadPopular(force=false){
  clearPopularWarmRetry();
  hidePendingAreaSearch();
  areaRequestSeq++;
  const requestId=++popularRequestSeq;
  clearArtistContext();
  setMode("popular");
  sideSub.textContent="";
  setStatus("");

  const cached=!force ? readPopularCache() : null;
  if(!popularArtists.length && cached?.artists?.length){
    popularArtists=cached.artists;
    renderArtists(popularArtists,"popular");
    setEventData(popularEvents);
    setStatus("");
    sideEmpty.hidden=true;
  }else if(popularArtists.length>=30 && !force){
    renderArtists(popularArtists,"popular");
    setEventData(popularEvents);
    setStatus("");
    sideEmpty.hidden=true;
  }else{
    sideEmpty.hidden=false;
    sideEmpty.textContent="Loading popular artists...";
  }

  try{
    const data=await getPayload({mode:"popular",v:"popular-v11"});
    if(data?.algorithm===POPULAR_ALGORITHM && data?.source==="spotify_monthly_listeners" && Array.isArray(data.artists) && data.artists.length>=30){
      popularArtists=data.artists.slice(0,30);
    }
    popularEvents=[];
    writePopularCache(data);
    if(requestId!==popularRequestSeq || activeMode!=="popular" || artistContext) return;
    if(popularArtists.length>=30){
      clearPopularWarmRetry();
      renderArtists(popularArtists.slice(0,30),"popular");
      sideEmpty.hidden=true;
    }else{
      popularArtists=[];
      toursEl.textContent="";
      sideEmpty.hidden=false;
      sideEmpty.textContent=data?.warming ? "Updating popular artists..." : "No popular artists are available right now.";
      if(data?.warming) schedulePopularWarmRetry();
    }
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
    sideEmpty.hidden=true;
    setStatus("Could not load popular concerts right now.");
    schedulePopularWarmRetry();
  }
}

async function loadArea(lat,lng,label,opts={}){
  hidePendingAreaSearch();
  const searchRadius=Math.max(5,Math.min(500,Number(opts.radius ?? DEFAULT_RADIUS_KM)||DEFAULT_RADIUS_KM));
  const reuseDistance=Math.max(6,searchRadius*.22);
  if(!opts.force && !opts.city && !lastArea?.city && lastArea && Number(lastArea.radius)===searchRadius &&
      distanceKm(lat,lng,lastArea.lat,lastArea.lng)<reuseDistance &&
      nearbyEvents.length){
    clearArtistContext();
    setMode("nearby");
    sideSub.textContent="";
    renderArtists(groupedNearby(nearbyEvents),"nearby");
    setEventData(nearbyEvents,nearbyTotal);
    setStatus("Ranked by number of upcoming concerts");
    return;
  }

  const requestId=++areaRequestSeq;
  clearArtistContext();
  sideSub.textContent="";
  sideEmpty.hidden=true;
  setStatus("Loading concerts...");
  try{
    const grid=searchGridCenter(lat,lng,searchRadius);
    const data=await getPayload({lat:grid.lat,lng:grid.lng,radius:searchRadius});
    if(requestId!==areaRequestSeq) return;
    let events=stabilizeArtistCoordinates(data.events||[]);
    const maxDistance=searchRadius*1.35+18;
    events=events.filter(e=>distanceKm(lat,lng,Number(e.lat),Number(e.lng))<=maxDistance);
    const total=Number(data.page?.totalElements ?? events.length) || events.length;

    nearbyEvents=events;
    nearbyTotal=total;
    lastArea={lat,lng,label,radius:searchRadius,city:opts.city||"",countryCode:opts.countryCode||"",stateCode:opts.stateCode||""};

    renderArtists(groupedNearby(events),"nearby");
    setMode("nearby");
    setEventData(events,total);
    if(opts.fit) fitEvents(events);
    sideSub.textContent="";
    setStatus(events.length ? "Ranked by number of upcoming concerts" : "");
  }catch(err){
    if(requestId!==areaRequestSeq) return;
    console.error(err);
    nearbyEvents=[];
    nearbyTotal=0;
    toursEl.textContent="";
    sideEmpty.hidden=true;
    setEventData([],0);
    setStatus(err.message==="ticketmaster_key_missing" ? "Concert search is being connected. Please try again shortly." : "Could not load concerts right now.");
  }
}

function geoPositionOnce(options){
  return new Promise((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(resolve,reject,options);
  });
}
function geoPositionWatch(options,waitMs=18000){
  return new Promise((resolve,reject)=>{
    let settled=false,watchId=-1;
    const finish=(fn,value)=>{
      if(settled) return;
      settled=true;
      clearTimeout(timer);
      if(watchId>=0) navigator.geolocation.clearWatch(watchId);
      fn(value);
    };
    const timer=setTimeout(()=>finish(reject,{code:3,message:"Location request timed out."}),waitMs);
    watchId=navigator.geolocation.watchPosition(
      p=>finish(resolve,p),
      err=>{ if(err?.code===1) finish(reject,err); },
      options
    );
  });
}
function locationErrorText(err){
  if(err?.code===1) return "Location access was denied. Enable Location for music98.news in your browser settings, then tap Near me again.";
  if(err?.code===2) return "Your device could not determine its location. Turn on Location Services/Wi-Fi and tap Near me again.";
  if(err?.code===3) return "Location request timed out. Tap Near me to try again.";
  return "Could not get your location. Check Location Services and try again.";
}
async function requestLocation(){
  const geoRequestId=++areaRequestSeq;
  popularRequestSeq++;
  clearArtistContext();
  hidePendingAreaSearch();
  setMode("nearby");

  nearbyEvents=[];
  nearbyTotal=0;
  lastArea=null;
  toursEl.textContent="";
  sideEmpty.hidden=false;
  sideEmpty.textContent="Getting your location...";
  setEventData([],0);
  setStatus("");

  if(!window.isSecureContext){
    sideSub.textContent="Location requires a secure HTTPS connection.";
    sideEmpty.hidden=true;
    return;
  }
  if(!navigator.geolocation){
    sideSub.textContent="Location is not available in this browser. Search for a city instead.";
    sideEmpty.hidden=true;
    return;
  }

  sideSub.textContent="";
  let position=null,lastError=null;
  const attempts=[
    {enableHighAccuracy:false,timeout:12000,maximumAge:120000},
    {enableHighAccuracy:true,timeout:18000,maximumAge:0}
  ];
  for(const options of attempts){
    try{
      position=await geoPositionOnce(options);
      break;
    }catch(err){
      lastError=err;
      if(err?.code===1) break;
    }
  }
  if(!position && lastError?.code!==1){
    try{
      position=await geoPositionWatch({enableHighAccuracy:false,timeout:10000,maximumAge:300000},18000);
    }catch(err){ lastError=err; }
  }

  if(geoRequestId!==areaRequestSeq || activeMode!=="nearby") return;
  if(!position){
    sideSub.textContent=locationErrorText(lastError);
    sideEmpty.hidden=true;
    setEventData([],0);
    return;
  }

  const lat=Number(position.coords?.latitude),lng=Number(position.coords?.longitude);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)){
    sideSub.textContent="Your browser returned an invalid location. Tap Near me to try again.";
    sideEmpty.hidden=true;
    setEventData([],0);
    return;
  }

  sideSub.textContent="";
  sideEmpty.hidden=true; // loadArea supplies the single loading message.
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:9,duration:650});
  await loadArea(lat,lng,"Near you",{fit:false,force:true,radius:DEFAULT_RADIUS_KM});
}

function featureLabel(f){
  return f?.properties?.full_address || f?.properties?.name_preferred || f?.properties?.name || "";
}
async function geocode(q,autocomplete=true,externalSignal=null){
  const u=new URL("https://api.mapbox.com/search/geocode/v6/forward");
  u.searchParams.set("q",q); u.searchParams.set("access_token",MAPBOX_TOKEN);
  u.searchParams.set("types","place,locality,region,country"); u.searchParams.set("limit","5");
  u.searchParams.set("autocomplete",autocomplete?"true":"false");
  const controller=new AbortController();
  const abort=()=>controller.abort();
  if(externalSignal){
    if(externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort",abort,{once:true});
  }
  const timer=setTimeout(()=>controller.abort(),8000);
  let r;
  try{ r=await fetch(u,{signal:controller.signal}); }
  finally{
    clearTimeout(timer);
    externalSignal?.removeEventListener?.("abort",abort);
  }
  if(!r.ok) throw new Error("geocode_failed");
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
  sideSub.textContent="";
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
  const label=[h.city,h.stateCode,h.countryCode].filter(Boolean).join(", ");
  search.value=label;
  suggestions.hidden=true;
  userMoving=false;
  map.flyTo({center:[lng,lat],zoom:8.5,duration:600});
  await loadArea(lat,lng,h.city||label,{
    fit:false,
    radius:Math.max(5,Number(h.radiusKm)||(Number(h.tier)===2?45:60)),
    city:h.city||"",
    countryCode:h.countryCode||"",
    stateCode:h.stateCode||""
  });
}
function addHotspotSuggestion(h){
  const b=document.createElement("button"); b.className="suggestion suggestion-location"; b.type="button";
  const cp=document.createElement("span"); cp.className="suggestion-copy";
  const title=document.createElement("span"); title.className="suggestion-title";
  title.textContent=[h.city,h.stateCode,h.countryCode].filter(Boolean).join(", ");
  const kind=document.createElement("span"); kind.className="suggestion-kind";
  kind.textContent=Number(h.count||0)+" upcoming concerts";
  cp.append(title,kind); b.appendChild(cp);
  b.addEventListener("click",()=>selectHotspotSuggestion(h)); suggestions.appendChild(b);
}

function addArtistSuggestion(item){
  const b=document.createElement("button"); b.className="suggestion"; b.type="button";
  const img=document.createElement("img"); img.className="suggestion-art"; img.alt="";
  applyConcertArt(img,item.image||"/logo.png","icon");
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

nearTab.addEventListener("click",requestLocation);
popularTab.addEventListener("click",()=>loadPopular());
mapArtistBtn.addEventListener("click",showArtistContext);
mapAllBtn.addEventListener("click",showAllConcertsInMapArea);

function resetMapFilters(){
  areaRequestSeq++;
  popularRequestSeq++;
  hidePendingAreaSearch();
  closePopup();
  clearArtistContext();
  search.value="";
  suggestions.hidden=true;
  userMoving=false;
  lastArea=null;
  nearbyEvents=[];
  nearbyTotal=0;
  currentEvents=[];
  currentTotal=0;
  artistMapEvents=[];
  setMode("popular");
  sideSub.textContent="";
  if(popularArtists.length){
    renderArtists(popularArtists,"popular");
    sideEmpty.hidden=true;
  }
  setEventData([]);
  setStatus("");
}
function bindNativeZoomOutReset(){
  const btn=map.getContainer()?.querySelector?.(".mapboxgl-ctrl-zoom-out");
  if(!btn || btn.dataset.music98ResetBound==="1") return;
  btn.dataset.music98ResetBound="1";
  btn.addEventListener("click",resetMapFilters);
}

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
  suggestGeocodeAbort?.abort();
  suggestGeocodeAbort=null;
  const seq=++suggestSeq;
  const q=search.value.trim();
  if(q.length<2){ suggestions.hidden=true; return; }
  suggestTimer=setTimeout(async()=>{
    const localArtists=localArtistMatches(q);
    const localHubs=localHotspotMatches(q);
    if(localArtists.length || localHubs.length) renderSuggestions([],localArtists,localHubs);
    const geocodeAbort=new AbortController();
    suggestGeocodeAbort=geocodeAbort;
    const artistWork=q.length>=3 && localArtists.length<4 ? searchArtists(q) : Promise.resolve([]);
    const [placesResult,artistsResult]=await Promise.allSettled([geocode(q,true,geocodeAbort.signal),artistWork]);
    if(suggestGeocodeAbort===geocodeAbort) suggestGeocodeAbort=null;
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
    radius:DEFAULT_RADIUS_KM,
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

let concertDataBooted=false;
function bootConcertData(){
  if(concertDataBooted) return;
  concertDataBooted=true;
  loadMarkets();
  loadPopular();
}
map.on("load",()=>{
  if(!map.__fallback) mapFallback.hidden=true;
  resizeMapStable();
  addTopographicRelief();
  addLayers();
  const hubs=map.getSource("hubs");
  if(hubs) hubs.setData(hubsGeoJSON());
  applyMapMode();
  bindNativeZoomOutReset();
  bootConcertData();
  queuePillInkCenter();
  if(document.fonts?.ready) document.fonts.ready.then(queuePillInkCenter).catch(()=>{});
  requestAnimationFrame(resizeMapStable);
  setTimeout(resizeMapStable,90);
  setTimeout(resizeMapStable,320);
});
bootConcertData();
if(mapInitError){
  mapFallback.hidden=false;
  mapFallbackText.textContent="The map is unavailable in this browser, but search and concert lists still work.";
}else{
  setTimeout(()=>{
    const ready=typeof map.loaded==="function" ? map.loaded() : false;
    if(!ready){
      mapFallback.hidden=false;
      mapFallbackText.textContent="The map is taking longer to load. Search and concert lists are still available.";
    }
  },8000);
}

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
      this.shadowRoot.append(mapCss,style,...shell.childNodes);
      this.shadowRoot.querySelector("#mapRetry")?.addEventListener("click",()=>location.reload());
    }

    const start=()=>{
      if(this._started) {
        if(this.resizeConcertMap) requestAnimationFrame(()=>this.resizeConcertMap());
        return;
      }
      this._started=true;
      ensureMapbox().then(()=>initConcerts(this.shadowRoot,this)).catch(err=>{
        console.error(err);
        const mapFallback=this.shadowRoot.querySelector("#mapFallback");
        const mapFallbackText=this.shadowRoot.querySelector("#mapFallbackText");
        const sideEmpty=this.shadowRoot.querySelector("#sideEmpty");
        if(mapFallback){
          mapFallback.hidden=false;
          if(mapFallbackText) mapFallbackText.textContent="Could not load the map library.";
        }
        if(sideEmpty){
          sideEmpty.hidden=false;
          sideEmpty.textContent="Concert tools could not start because the map library failed to load.";
        }
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
