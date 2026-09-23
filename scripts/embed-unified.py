#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""embed-unified.py - one paste field for any social link, plus Instagram cards.

Owner, 24.09: "добавь иконку и вставку тогда и инстаграма и тиктока сверху" and "нельзя ли
сделать унифицированную просто ссылку вставил с любой соц сети и она будет?".

So the desk gets:
  * three icons in the toolbar - YouTube, TikTok, Instagram - that all open ONE dialog;
  * one field: the card is chosen from the link itself, not from the button, which is what
    "вставил с любой соц сети и она будет" means. Apple Music keeps its own dialogs, because
    that flow injects the affiliate token (owner: "НЕТ ЭПЛ НАДО ОСТАВИТЬ ОНО ЖЕ ТАМ ТОКЕН
    АФИЛЕЙТ ПОДСТАВЛЯЕТ") and must not be re-routed;
  * Instagram card [ig:<kind>:<code>[:account]] - the card itself names the author, so the
    account field only adds our own credit line under the card.

Run:  python scripts/embed-unified.py [--apply]
"""
import io
import sys

PATH = "public/admin-desk.html"
APPLY = "--apply" in sys.argv

OLD_TOOLBAR = """        <button class="ico wide" type="button" id="btnYoutube" title="YouTube">YouTube</button>
        <button class="ico wide" type="button" id="btnTiktok" title="TikTok — оригинал съёмки события">TikTok</button>"""

NEW_TOOLBAR = """        <button class="ico" type="button" id="btnYoutube" title="YouTube — или вставьте любую ссылку"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4L15.8 12z"/></svg></button>
        <button class="ico" type="button" id="btnTiktok" title="TikTok — оригинал съёмки события, или вставьте любую ссылку"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M19.7 7.4a5.7 5.7 0 0 1-3.5-1.2 5.7 5.7 0 0 1-2-3.2h-3.4v13.4a2.9 2.9 0 1 1-2-2.7v-3.5a6.3 6.3 0 1 0 5.4 6.2V9.8a9 9 0 0 0 5.5 1.9V8.3c-.4 0-.7-.4-.7-.9z"/></svg></button>
        <button class="ico" type="button" id="btnInstagram" title="Instagram — публикация автора, или вставьте любую ссылку"><svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true"><path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2zm0 1.8A4 4 0 0 0 3.8 7.8v8.4a4 4 0 0 0 4 4h8.4a4 4 0 0 0 4-4V7.8a4 4 0 0 0-4-4H7.8zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 1.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4zM17.6 5.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"/></svg></button>"""

OLD_MODALS = """<div class="modal hide" id="ytModal">
  <div class="card">
    <h2>YouTube</h2>
    <p class="muted">Paste a youtube.com or youtu.be link.</p>
    <label for="ytUrl">Link</label>
    <input id="ytUrl" placeholder="https://www.youtube.com/watch?v=…">
    <div id="ytPrev"></div>
    <div class="actions">
      <button class="btn primary" type="button" id="ytGo">Insert</button>
      <button class="btn ghost" type="button" id="ytCancel">Cancel</button>
    </div>
  </div>
</div>
<div class="modal hide" id="ttModal">
  <div class="card">
    <h2>TikTok</h2>
    <p class="muted">Paste a tiktok.com link like <b>/@account/video/7688…</b> — a full link, not the short vm.tiktok.com one. This card is for footage filmed at the event itself; a broadcaster's report is not inserted.</p>
    <label for="ttUrl">Link</label>
    <input id="ttUrl" placeholder="https://www.tiktok.com/@account/video/…">
    <label for="ttAcc">Account shown in the credit</label>
    <input id="ttAcc" placeholder="account">
    <div id="ttPrev"></div>
    <div class="actions">
      <button class="btn primary" type="button" id="ttGo">Insert</button>
      <button class="btn ghost" type="button" id="ttCancel">Cancel</button>
    </div>
  </div>
</div>"""

NEW_MODAL = """<div class="modal hide" id="emModal">
  <div class="card">
    <h2>Embed a link</h2>
    <p class="muted">One field for any link: YouTube, TikTok or Instagram — the card is chosen from the link, so it does not matter which icon you clicked. Put the clip filmed at the event itself, not a broadcaster's report. Apple Music keeps its own dialogs, because that flow carries the affiliate token.</p>
    <label for="emUrl">Link</label>
    <input id="emUrl" placeholder="https://www.youtube.com/watch?v=… / tiktok.com/@account/video/… / instagram.com/reel/…">
    <label for="emAcc" id="emAccLabel" class="hide">Account shown in the credit</label>
    <input id="emAcc" class="hide" placeholder="account">
    <p class="muted hide" id="emHint"></p>
    <div id="emPrev"></div>
    <div class="actions">
      <button class="btn primary" type="button" id="emGo">Insert</button>
      <button class="btn ghost" type="button" id="emCancel">Cancel</button>
    </div>
  </div>
</div>"""

OLD_CSS = """.composer .yembed.tk{max-width:340px}
.composer .yembed.tk .ytbox{aspect-ratio:9/16}"""

NEW_CSS = """.composer .yembed.tk{max-width:340px}
.composer .yembed.tk .ytbox{aspect-ratio:auto;height:0;padding-bottom:calc(160% + 150px)}
.composer .yembed.ig{max-width:340px}
.composer .yembed.ig .ytbox{aspect-ratio:auto;height:0;padding-bottom:calc(122% + 210px)}"""

NEW_JS = r"""/* ОДНО ПОЛЕ ДЛЯ ЛЮБОЙ ССЫЛКИ (владелец, 24.09): иконки YouTube, TikTok и Instagram открывают
   один и тот же диалог, а карточка выбирается по самой ссылке - «вставил с любой соц сети и
   она будет». Apple Music сюда намеренно не входит: у него свой диалог и свой партнёрский
   токен (владелец: «эпл надо оставить, оно же там токен аффилейт подставляет»). */
function parseInstagram(raw){
  const s = String(raw||"").trim();
  if(/^[A-Za-z0-9_-]{5,20}$/.test(s)) return {kind:"p", code:s, handle:""};
  let u;
  try{ u = new URL(s); }catch(e){ return null; }
  const host = (u.hostname||"").replace(/^www\./,"").toLowerCase();
  if(host !== "instagram.com" && host !== "m.instagram.com") return null;
  const m = u.pathname.match(/^\/(p|reel|reels|tv)\/([A-Za-z0-9_-]{5,20})/);
  if(!m) return null;
  return {kind: m[1]==="reels" ? "reel" : m[1], code:m[2], handle:""};
}
function instagramSrc(kind, code){
  const k = (kind==="reel" || kind==="tv") ? kind : "p";
  return "https://www.instagram.com/"+k+"/"+code+"/embed/";
}
function instagramBlock(kind, code, handle){
  const h = String(handle||"").replace(/^@/,"").trim();
  const token = [kind, code].concat(h ? [h] : []).join(":");
  const cred = h ? `<p class="tkcred">${kind==="p" ? "Post" : "Video"}: <a href="https://www.instagram.com/${esc(kind)}/${esc(code)}/" target="_blank" rel="noopener noreferrer">@${esc(h)}</a> via Instagram</p>` : "";
  return `<figure class="blk yembed ig" contenteditable="false" data-instagram="${esc(token)}">${blkChrome()}<div class="ytbox"><iframe src="${esc(instagramSrc(kind, code))}" title="Instagram" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="eager"></iframe></div>${cred}</figure>`;
}
function detectEmbed(raw){
  const yt = parseYouTube(raw); if(yt) return Object.assign({kind:"youtube"}, yt);
  const tt = parseTikTok(raw); if(tt) return Object.assign({kind:"tiktok"}, tt);
  const ig = parseInstagram(raw); if(ig) return Object.assign({kind:"instagram"}, ig);
  return null;
}
function closeEmbed(keepCaret){
  $("#emModal").classList.add("hide");
  $("#emPrev").innerHTML = "";
  $("#emHint").textContent = "";
  $("#emHint").classList.add("hide");
  if(!keepCaret) thawCaret();
}
function openEmbed(){
  closeApple(true);
  freezeCaret();
  $("#emUrl").value = "";
  $("#emAcc").value = "";
  $("#emPrev").innerHTML = "";
  $("#emHint").textContent = "";
  $("#emHint").classList.add("hide");
  $("#emAcc").classList.add("hide");
  $("#emAccLabel").classList.add("hide");
  $("#emModal").classList.remove("hide");
  $("#emUrl").focus();
}
function embedBox(kind, src){
  const pad = kind==="tiktok" ? "calc(160% + 150px)" : "calc(122% + 210px)";
  return `<div class="yembed ${kind==="tiktok" ? "tk" : "ig"}" style="margin-top:10px"><div class="ytbox" style="position:relative;aspect-ratio:auto;height:0;padding-bottom:${pad};border-radius:10px;overflow:hidden;background:#000"><iframe src="${esc(src)}" title="${kind==="tiktok" ? "TikTok" : "Instagram"}" allow="encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe></div></div>`;
}
function previewEmbed(){
  const got = detectEmbed($("#emUrl").value);
  $("#emPrev").innerHTML = "";
  $("#emHint").classList.add("hide");
  if(!got) return null;
  if(got.short){
    $("#emHint").textContent = "Short vm.tiktok.com links do not open a video id. Open the link, copy the full address and paste it here.";
    $("#emHint").classList.remove("hide");
    return null;
  }
  if(got.kind === "youtube"){
    $("#emAcc").classList.add("hide");
    $("#emAccLabel").classList.add("hide");
    $("#emPrev").innerHTML = `<div class="ytbox" style="position:relative;aspect-ratio:16/9;border-radius:10px;overflow:hidden;background:#000;margin-top:10px"><iframe src="${esc(youtubeSrc(got.id, got.start))}" title="YouTube" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`;
    return got;
  }
  $("#emAcc").classList.remove("hide");
  $("#emAccLabel").classList.remove("hide");
  if(got.kind === "tiktok"){
    $("#emAccLabel").textContent = "Account shown in the credit";
    if(got.handle && !$("#emAcc").value.trim()) $("#emAcc").value = got.handle;
    $("#emPrev").innerHTML = embedBox("tiktok", tiktokSrc(got.id));
    return got;
  }
  $("#emAccLabel").textContent = "Account for our credit line (the card itself already names the author)";
  $("#emPrev").innerHTML = embedBox("instagram", instagramSrc(got.kind, got.code));
  return got;
}
$("#btnYoutube").onclick = openEmbed;
$("#btnTiktok").onclick = openEmbed;
$("#btnInstagram").onclick = openEmbed;
$("#emCancel").onclick = closeEmbed;
$("#emModal").addEventListener("click", e=>{ if(e.target === $("#emModal")) closeEmbed(); });
$("#emUrl").addEventListener("change", previewEmbed);
$("#emUrl").addEventListener("paste", ()=> setTimeout(previewEmbed, 50));
$("#emGo").onclick = ()=>{
  const got = detectEmbed($("#emUrl").value);
  if(!got){ toast("Paste a YouTube, TikTok or Instagram link"); return; }
  if(got.short){ toast("Short link — open it and copy the full address"); return; }
  const acc = $("#emAcc").value.trim().replace(/^@/,"");
  if(got.kind === "youtube") insertHTML(youtubeBlock(got.id, got.start));
  else if(got.kind === "tiktok") insertHTML(tiktokBlock(got.id, acc || got.handle || ""));
  else insertHTML(instagramBlock(got.kind, got.code, acc));
  closeEmbed();
};
"""

EDITS = [
    ("toolbar", OLD_TOOLBAR, NEW_TOOLBAR),
    ("modals", OLD_MODALS, NEW_MODAL),
    ("composer css", OLD_CSS, NEW_CSS),
    ("caret freeze list",
     'btn.id==="btnPhoto" || btn.id==="btnSong" || btn.id==="btnAlbum" || btn.id==="btnYoutube" || btn.id==="btnTiktok"',
     'btn.id==="btnPhoto" || btn.id==="btnSong" || btn.id==="btnAlbum" || btn.id==="btnYoutube" || btn.id==="btnTiktok" || btn.id==="btnInstagram"'),
    ("apple dialog closes the embed dialog",
     "function openApple(kind){\n  closeYoutube(true);",
     "function openApple(kind){\n  closeEmbed(true);"),
    ("escape closes it too",
     'if(e.key === "Escape"){ closeApple(); closeYoutube(); closeTiktok(); return; }',
     'if(e.key === "Escape"){ closeApple(); closeEmbed(); return; }'),
    ("brand home hides it",
     '  const apple = $("#appleModal");\n  const yt = $("#ytModal");\n  const tt = $("#ttModal");\n  if(apple) apple.classList.add("hide");\n  if(yt) yt.classList.add("hide");\n  if(tt) tt.classList.add("hide");',
     '  const apple = $("#appleModal");\n  const em = $("#emModal");\n  if(apple) apple.classList.add("hide");\n  if(em) em.classList.add("hide");'),
    ("save marker",
     '      if(node.dataset.tiktok) parts.push("[tiktok:"+node.dataset.tiktok+"]");',
     '      if(node.dataset.tiktok) parts.push("[tiktok:"+node.dataset.tiktok+"]");\n      if(node.dataset.instagram) parts.push("[ig:"+node.dataset.instagram+"]");'),
    ("load marker",
     '    const tt = t.match(/^\\[tiktok:(\\d{6,25})(?::@?([A-Za-z0-9._]{2,32}))?\\]$/i);\n    if(tt) return tiktokBlock(tt[1], tt[2]||"");',
     '    const tt = t.match(/^\\[tiktok:(\\d{6,25})(?::@?([A-Za-z0-9._]{2,32}))?\\]$/i);\n    if(tt) return tiktokBlock(tt[1], tt[2]||"");\n    const ig = t.match(/^\\[ig:(p|reel|tv):([A-Za-z0-9_-]{5,20})(?::@?([A-Za-z0-9._]{2,32}))?\\]$/i);\n    if(ig) return instagramBlock(ig[1].toLowerCase(), ig[2], ig[3]||"");'),
]


def main():
    src = io.open(PATH, encoding="utf-8").read()
    out = src
    for name, old, new in EDITS:
        if old not in out:
            print("MISS  ", name)
            continue
        out = out.replace(old, new, 1)
        print("ok    ", name)

    s = out.index("function closeYoutube(keepCaret){")
    e = out.index('document.addEventListener("keydown", e=>{', s)
    out = out[:s] + NEW_JS + out[e:]
    print("ok     embed dialog functions replaced (%d chars -> %d)" % (e - s, len(NEW_JS)))

    left = [k for k in ("ytModal", "ttModal", "ytUrl", "ttUrl", "ytPrev", "ttPrev",
                        "ttAcc", "ytGo", "ttGo", "closeYoutube", "closeTiktok",
                        "previewYoutube", "previewTiktok")
            if k in out]
    for k in ("btnInstagram", "emModal", "parseInstagram", "instagramBlock", "detectEmbed"):
        print("added :", k, out.count(k), "x")
    print("stale references left:", left or "none")
    print("lines:", len(out.splitlines()))
    if not APPLY:
        print("dry run - nothing written")
        return 0
    io.open(PATH, "w", encoding="utf-8", newline="\n").write(out)
    print("written:", PATH)
    return 0


if __name__ == "__main__":
    sys.exit(main())
