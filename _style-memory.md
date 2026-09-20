# Редакционные правила music98 (стиль постов)

Запомнено сессией 19.09.2026 — применять ко ВСЕМ будущим текстам постов без напоминаний.

## Фото и визуал (ресёрч 20.09.2026, приоритет при поиске картинок)

Откуда брать — по убыванию приоритета:
1. **Официальные пресс-релизы лейблов и PR-агентств** (первоисточник, hi-res, кредит уже в тексте релиза):
   - Лейбл-ньюсрумы: warnermusic.* (страновые домены дублируют Atlantic/WMG пресс-релизы с фото), universalmusic.com, sonymusic.com; лейбл-пулы типа press.atlanticrecords.com (полноразмерные кадры).
   - PR-агентства с публичными страничками релизов: shorefire.com/releases, pitchperfectpr.com, bighassle.com — у релиза обычно ссылка «click to download high-res photo» + имя фотографа.
   - Агрегаторы пресс-релизов: twntythree.com, chuffmedia.com (страницы по артистам).
   - Инди-лейблы с открытыми пресс-комнатами: subpop.com, beggars.com (4AD/XL/Matador/Rough Trade/Young), secretlygroup.com (Jagjaguwar/Secretly Canadian/Dead Oceans), matadorrecords.com, jagjaguwar.com, 4ad.com, xlrecordings.com.
   - Пример по этой схеме: MILEY-пост — фото Mert Alas из пресс-кампании Atlantic, кредит «Mert Alas» + ссылка на Instagram фотографа.
2. **Официальные промо-кадры в статьях авторитетных изданий** (кредит фотографа в подписи обязателен): people.com, deadline.com (галереи кампаний), variety.com, billboard.com. Осторожно: их CDN жмёт до max_bytes(150000) — качать подписанный URL как есть и проверять фактический размер файла.
   ⚠️ ПРАВИЛО КРЕДИТА: ссылка в кредит-поле — ТОЛЬКО на первоисточник фото (пресс-релиз лейбла, сайт фотографа/агентства, страница агентства). Другие СМИ — НЕ первоисточник, их нельзя ставить ссылкой; статья издания — лишь место, где кадр найден. Приоритет: сайт фотографа или агентства → если у фотографа нет сайта (проверить ресёрчем, как с Mert Alas 19.09.2026) → Instagram фотографа как компромисс (принято владельцем).
3. **Обложки альбомов/синглов** — artwork из iTunes Lookup API (mzstatic, 1200×1200, заменой `100x100bb` на `1200x1200bb`); подходит для обложки релиз-поста.
4. **Wikimedia Commons / Flickr** (кастом-фото, всегда с лицензией CC и автором):
   - Свежесть строго: 2020 и старее = ПЛОХОЕ фото, неактуально, не брать; цель — текущий год. Поиск через commons API (`list=search`, `srnamespace=6`) по «Artist YYYY», категория «Artist in YYYY».
   - По событию: фестиваль → фото с фестиваля, премия → с ковровой дорожки премии.
   - Проверять через `prop=imageinfo&iiprop=url|size|extmetadata`: дата съёмки, автор, лицензия (CC BY / CC BY-SA / CC0 — ок).

Качество (мерить, не гадать):
- Размер: минимум 1200px по большей стороне, лучше 1800+. Помнить, что обложка 16:9 — из вертикального фото при кропе должна остаться ≥1200px ширины.
- Резкость: дисперсия Лапласиана по серому каналу. <100 мыло (отбраковка), >500 хорошо, >1000 отлично (замер на ~1000px стороне).
- Лицо в кадре: детектор YuNet, модель в `~/.music98-tools/face_detection_yunet_2023mar.onnx`, скрипт `site/scripts/face_crop.py` — отдаёт готовые pos/zoom/cardY/cardZoom для кропа админки (лицо ≥2% площади кадра, воздух сверху).
- Финальную кроп-проверку делать скриншотом превью (глаза не резать).
- НИКОГДА не брать: Getty/папарацци/фанские скрины без лицензии; арт из статей-сканов.

Кредит: «Имя фотографа / Источник (лицензия если есть)» + прямая ссылка на страницу, где фото найдено. Если у картинки нет фотографа (кей-арт игры, арт-обложка от арт-команды) — кредитует создатель (например «Rockstar Games»), а не партнёры проекта (лейбл-партнёр типа Atlantic в авторы не ставится).

Прочие инструментарий: `site/scripts/publish-sept20.py` — образец публикации через API (GET живого desk → добавить посты → POST всего массива; автопроверки стиля в `check()`).

⚠️ КОДИРОВКА (инцидент 20.09.2026, ROSÉ → «ROSГ‰»): пайплайн публикации на Windows ОБЯЗАН читать ответ API как байты и декодировать UTF-8 явно (subprocess без text=True, `.decode("utf-8")`), а payload писать с `ensure_ascii=True` — тогда не-ASCII уходит в \uXXXX и кодировка его не тронет. Перед каждым POST прогонять diff «что изменилось» (только добавленные посты). После любой записи — контрольный GET с посимвольным сканом (кириллица U+0400..04FF, U+2030, U+FFFD = артефакты). Скрипт восстановления: `site/scripts/repair-desk-encoding.py` (round-trip cp1251→utf-8 + верификация).

## Фильтр выбора тем (калибровка владельца 20.09)
- Размер темы меряем аудиторией артиста, а не фактом хедлайна у Billboard/NME. НЕ хвататься за новость только потому, что её 10 минут назад написал крупный сайт.
- Ориентир — Spotify monthly listeners (kworb.net/spotify/listeners.html или профиль артиста): приоритет — верхний эшелон (топ-150, десятки миллионов слушателей), Pop / K-Pop / Country / Hip-Hop, аудитория США. Событие должно либо НЕСТИ ИЗВЕСТНОЕ ИМЯ (Taylor Swift), либо ИНТЕРЕСНУЮ ИСТОРИЮ саму по себе (кроссовер миров в GTA VI: The Album).
- Нишевый порог: < ~15 млн monthly listeners и без мейнстрим-узнаваемости = НЕ публикуем ради свежести. Отклонены на калибровке 20.09: Beck (~7.4M) — «нишево», Gnarls Barkley (~11M, ~1147-е место kworb) — тоже. Легаси-статус сам по себе не пропускает: их пишут СМИ «для количества» или по пейроллу.
- ЖЁСТКИЙ АЛГОРИТМ ОТБОРА (указание владельца 20.09, откалибровано его цифрами): проверка слушателей идёт ПЕРВОЙ, до ресёрча деталей. Источник правды: kworb.net/spotify/listeners.html (monthly listeners, живые цифры) или карточка open.spotify.com. Три тира:
  • ТИР A — приоритет: топ-150 kworb по monthly listeners (сейчас ≈ 36M+) ЛИБО мейнстрим-суперстар с узнаваемостью вне стриминга (пример: Cardi B, 32.2M / #191 — проходит как суперстар Hip-Hop, ядро аудитории USA).
  • ТИР B — вторичный приоритет: ~20–35M listeners (якорь владельца: Tove Lo 28,072,601). Допустимо, но только на КРУПНОЕ событие (большой альбом, тур по аренам, премия) — не писать ради свежей мелочи.
  • ТИР C — откидывать: <15M. Якоря владельца: Beck ~7.4M («нишево»), Gnarls Barkley ~11M (#1147 на kworb). Легаси-статус и хедлайн у крупных СМИ сам по себе НЕ пропускают. Единственное исключение — событие первой величины, о котором узнает вся аудитория вне стриминга (смерть суперзвезды, исторический рекорд, скандал/суд первой величины).
  Порядок: (1) кандидат из ленты СМИ → (2) listeners артиста по kworb → мимо порога = стоп, не тратить время на ресёрч → (3) прошёл = обычный Pass 0 фактчек по первоисточникам.
- QUALITY > QUANTITY: цель — задержать читателя одним сильным постом, а не наполнить ленту. Один GTA-пост стоит трёх нишевых перепечаток.
- Исключения из порога слушателей (пишем и без топ-тира): смерть суперзвезды, скандал/суд первой величины, историческое рекордное событие в чартах/наградах — то, о чём узнает вся аудитория вне стриминга.
- Порог проверять ДО ресерча деталей: сначала смотреть listeners, потом тратить время на фактчек.

## Писатель
- Пишу ОТ СЕБЯ: читаю 3–5 крупных изданий + интервью, делаю выжимку фактов, сводю и переосмысляю. Рерайт своими словами, НИКОГДА не копирую формулировки источников.
- Критическое мышление: сверять факты между источниками, выкидывать хайповые клише изданий.

## Стиль
- MILEY капсом — официальное написание артиста (проверять у каждого артиста, как он себя пишет сейчас).
- Ноль двоеточий и точек с запятой. Короткие ясные предложения.
- Финал поста — спокойные фактические предложения (как у Pylon: «The arenas can wait until October...»), БЕЗ афоризмов и «фирменных» панчей — стиль сайта ещё формируется.
- Минимум отсылок. Если отсылка — то на сверхузнаваемое (The Beatles, Taylor Swift, Netflix), а не на нишевые имена (Burt Bacharach). Штампы критики вида «X-shaped», «Y-tinged» не использовать.
- Финальный текст вычитывать «свежим глазом» перед выдачей.

## Формат
- Тизер: ~100–160 символов, без имени артиста в тексте (оно уже на карточке), с точкой в конце.
- Тело релиза: ~500–620 слов, фокус на САМ релиз (треки, факты, люди в титрах), концерты — одним абзацем в конце.
- НЕ писать today/just/«вышел сегодня» — посты часто запоздалые, формулировки обобщённые.
- Клипы: развёрнутый абзац на каждый + метка [YouTube — название] отдельной строкой, куда юзер вставит ролик.
- Apple-эмбед вставляет юзер сам (слот оставлять).

## Фото
- Только официальные пресс-материалы (обложка альбома с Apple/Mzstatic — ок). НЕ брать фото из статей People/Getty/статьи-сканов — у них лицензия, у нас нет. Кредит из.wikimedia — по правилам сайта.

## Процесс
- Перед пушем ВСЕГДА проверять на живых данных/живом эмбеде (не симуляцией). Пример: пин плеера чинился вслепую 3 раза, пока не замерили живой DOM.
- Админка: удаление поста только через подтверждающую модалку (уже сделано).
- В превью-окне локальная версия может отставать от прода — реальный сайт music98.news, деплой автоматом из GitHub при пуше.
- Сборники и саундтреки без одного исполнителя не получают подставного артиста (никаких "Various Artists" в поле artist). Поле artist оставляем пустым - рендер сам убирает префикс, в заголовке остаётся только название.

## Разделение работы в общем чекауте (site/) — КОД-АГЕНТ vs WRITER-АГЕНТ
- Writer правит КОНТЕНТ: посты через API (desk.json на проде), скрипты `scripts/publish-*.py`, `proofread-*.py`, `_style-memory.md`. Он НЕ меняет вёрстку `public/index.html` и `public/admin-desk.html`, кроме точечного фикса рендера (как YouTube-параметры).
- Код-агент правит ВЁРСТКУ и JS сайта. Он НЕ трогает `public/data/desk.json` записями постов (только синк-снапшот для превью), скрипты публикации и `_style-memory.md`.
- Коммитить ТОЛЬКО свои файлы явным `git add <файлы>` — никогда `git add -A`/`commit -am`: в общем чекауте `-am` захватывает чужие незакоммиченные правки (инцидент 20.09: код-агент swept YouTube-фикс writer'а своим коммитом).
- Перед коммитом: `git status -s` + `git diff --stat` — если в стейдже файлы не твои, отступить и распушить только своё.
- Если правишь файл, который может быть у другого агента незаконченным — сначала `git diff` этого файла, чтобы не стереть чужую работу своей версией.
- Рамка честности релиза-анонса: если альбом не вышел, а вышли только синглы, заголовок/тизер/лид не читаются как вышедший релиз. Формула: альбом анонсирован с датой, сегодня вышли N треков (revealed / first wave / first six tracks). В лиде одна фраза прямо фиксирует, что сама запись ещё не вышла.
- Приоритет ссылки в кредите промо-фото (когда личного сайта фотографа нет): 1) сайт/портфолио фотографа, 2) страница фотографа у представляющего агентства (официальное портфолио автора), 3) Instagram фотографа, 4) и только в крайнем случае страница пресс-релиза лейбла/PR-агентства, где фото опубликовано. PR-агентство (twntythree и т.п.) - канал дистрибуции, а не ресурс автора, ссылкой на него кредитуемся в последнюю очередь.
- Ревизия кредитов 20.09.2026: все 10 постов приведены к иерархии ссылок. Заменены PR-ссылки на личные ресурсы авторов - beabadoobee/Pylon: Erika Kamano -> портфолио New School Represents; Olivia Rodrigo/n1: Olivia Parker -> instagram.com/ioliviaparker; CRJ/Day and Night: Vince Aung -> vinceaung.com;Drake/n4: Sarah Delangel -> 
её личный сайт-портфолио sarahdelangel6343.myportfolio.com (Adobe Portfolio - её 
собственный сайт; инста sarah_delangel оставлена как запасной вариант). Wikimedia-кредиты 
не трогать - там ссылка на страницу файла с лицензией и автором уже является 
первоисточником. Урок: Adobe Portfolio / Squarespace / Wix под именем автора - это 
ЛИЧНЫЙ сайт фотографа, не PR-ресурс, проверять имя автора на странице перед заменой.
- Контекст должен быть самодостаточным: любые отсылки (муж/жена/команда/шоу) раскрывать при первом упоминании именем и ролью, даже если факт кажется общеизвестным. Аудитория без фанового контекста должна понимать абзац. (Правка 20.09 - в VMA-посте добавлено 'Her husband, Chiefs tight end Travis Kelce').
- Вставка эмбеда в середину поста: маркер [apple:song:COLLECTION:TRACK] обязан стоять ОТДЕЛЬНОЙ строкой (парсер сайта берёт маркер только как целую строку). Перед эмбедом нужна текстовая подводка в предыдущем абзаце ('Hear the record's centerpiece below.'), эмбед не роняют в пост без слова. Урок 20.09: маркер, приклеенный к следующему абзацу, не рендерится плеером.
- Лимит payload записи desk: полный POST падает молча (пустой ответ) примерно от 5 МБ. Обложку держать не больше 2200px по длинной стороне, JPEG q80 (примерно 500-700 KB в base64). Проверка после каждой записи обязательна - свежий GET и сравнение значений полей.

### Proofread protocol (20.09, after two failed expansions)
- No one-sentence paragraphs under ~25 words; if a paragraph is a stub, merge it into the neighbor it belongs to.
- Every embed follows the paragraph about THAT embed's subject; lead-in names the track ("Hear it below." only right after the subject sentence).
- Two passes mandatory after ANY expansion: (1) editor pass — merges, tautologies, orphan sentences; (2) reader pass — echo scan (repeated names/phrases, esp. song and album titles that were just pasted in), back-references that force scrolling up.
- Expansion by pasting = highest tautology risk: recheck every repeated title/noun in the touched paragraphs specifically.

- Anchor nouns are not fat: words like "record", "album", "release" after "the first / the last" disambiguate the referent (track? album? era?). Before cutting such a word, ask what the phrase points at; if the answer needs the noun, keep it. (Came from cutting "first record released without a Cyrus" to "first without a Cyrus" - ambiguous.)

- Kicker variety is mandatory. There is no house kicker yet; every closing paragraph must earn its own shape. Retired as a template: "The shows will pass / the record stays". A post may keep a short punchy kicker ONLY if the construction differs from the previous posts in the feed. Check the last 2-3 published posts before writing a close.
- Do not describe own devices as "signature/house style" - the style is being written now, and naming a habit a brand is how habits calcify.

- Tour routing: never more than 2-3 city names in one sentence. Keep the anchors (opener, marquee room, closer, hometown), compress the middle into route shape ("three arcs: East Coast, a West Coast week, a Vegas close"). Album-recording cities and other context cities are exempt when they carry meaning. Owner's brief rule "don't lean on dates and cities" applies to tour paragraphs especially.

### Third-pass reader audit (20.09, fresh-eyes rules)
- Voice crutches are the real ctrl-c/ctrl-v: watch recurring constructions, not words. Retired/rationed after audit: "That is a ... , not a ..." (negation-pair), "map" as metaphor for any plan/list, "argument" as record metaphor, "the part that stays" closers. Before publishing, scan own last 3 posts for these.
- Every promise a sentence makes must be paid: "the song that explains the title" requires the explanation to actually be there; if it is interpretation, soften the claim ("carries the title's mood").
- Date style: full month names everywhere (September 17, not Sept. 17).
- Register check: avoid corporate nouns in emotional contexts ("part of the product" -> "part of the deal").
- Verified color only: a juicy quote/fact goes in only after finding the primary source (Drake's "Nobody is coming to save you" - Complex, from his premiere note). No reason speculated for the FOMO takedown - no official statement exists.

### CANONICAL: Five-pass proofing pipeline (20.09, owner-approved) — run on EVERY post before publish

Pass 0 — at research time (before writing): every fact carries a source in notes; two-source rule for track/album titles; quotes verbatim from primary sources only.

Pass 1 — EDITOR / STRUCTURE. Paragraph integrity (no one-sentence stubs under ~25 words); embed placement (media breaks a text wall at its most meaningful joint, never decorates the end; lead-in names the embed's subject); frame honesty (announced vs released — a not-yet-out record must not read as out); teaser/headline/lead division of labor (teaser never duplicates the headline, it sells a different angle); kicker placement and variety (check last 2-3 posts' closers first); time/subject logic inside paragraphs (one subject per sentence, no invented travel math).

Pass 2 — JOURNALIST-PEDANT (before flavor passes: a found fact error rewrites paragraphs). Re-verify every number, date, age, chart position, name against sources; attribution on every quote; no speculation stated as fact (if no official reason exists, the reason stays absent); risky turns softened; every sentence-promise paid ("the song that explains the title" must actually explain it, otherwise soften the claim); interpretation labeled as interpretation.

Pass 3 — VOICE / ECHO (scanner + human). Run the 4-gram echo scanner; title/name echoes inside one paragraph; cross-post crutch check against the last 2-3 posts (retired list: "That is a X, not a Y" rationing, "map" as universal metaphor, "argument" as record metaphor, "the part that stays" closers); corporate register out of emotional contexts ("part of the product"); date style: full month names everywhere.

Pass 4 — MUSIC FOLLOWER (the target reader). Interest test: is the best verified fact buried mid-paragraph? would a fan ask "but what about X?" and the post ignores it? Add verified color from primary sources only (Drake's "Nobody is coming to save you" - Complex quote). Cut PR-brochure sentences that a follower already knows.

Pass 5 — ZERO-CONTEXT LAY READER (FINAL gate, closes the pipeline). Read the RENDERED page, not the data; read aloud once (catches broken grammar like the two-"since" slip). Every first mention = name + role (husband, Chiefs tight end Travis Kelce). Niche references either explained in-line in one clause or cut. A person who does not follow music must finish the post without a single google. Any fix made here re-runs the Pass 3 scanner on touched paragraphs.

Loop rule: every later-pass edit triggers a mini re-run of mechanical checks on the touched paragraph — fixes have introduced defects twice (duplicated trailer marker, glued embed marker).

Surface rule: never proof only in the editor/data view; at least one pass on the rendered page (embeds visible, teaser separate, photo crop, length feel).

Freshness rule: never run two passes back-to-back from memory; fresh GET between passes, and a time gap (even 10 minutes) before Pass 4/5 when possible.

Saturation note: five passes is the ceiling by design. Each pass class catches a distinct defect class (structure -> claims -> voice -> interest -> accessibility) and the classes converge after five; a sixth pass over-polishes and flattens the living voice the site is built on.

### CANONICAL ADDITION: Visual & Media track (owner-approved, 20.09) — runs in parallel with the text passes

Two tracks per post:
- TEXT = sequential cutting table: Pass 1 -> 2 -> 3 -> 4 -> 5, each persona cuts after the previous one, final owner-style re-read + review of every edit made -> publish.
- VISUAL & MEDIA (cover photo, in-body photos, embeds) = the same personas inspect each pass, each gives their OWN verdict, and the operator synthesizes the optimal choice from all for/against — WITHOUT breaking the standing rules already recorded (official promo first / photographer or owner credit hierarchy / freshness floor (2020 = stale) / event-matched sources / no text-on-crop / face centered + air above head / embeds on their own lines / album vs song embed correctness).

What each persona watches on the visual track:
- Pass 1 editor: photo belongs to THIS post's subject and era; crop works structurally (stage 16:9 + square card), no title text cut on either surface.
- Pass 2 pedant: credit correct (photographer vs art owner vs label partner); source link = first source per hierarchy; date/freshness claim honest; embed IDs correct (song vs album, official channel for videos).
- Pass 3 voice: visual consistency with the feed (era, color mood) — no stylistic off-note between neighboring posts.
- Pass 4 fan: is this THE photo for this news? (right album era, right event for festival/award news, not a stale promo of a previous cycle); would the fan say "wrong pic, that's from another era"?
- Pass 5 lay reader: instantly legible — face visible and centered, quality high on both surfaces, nothing confusing at first glance (no mystery text, no half-cropped figure).

Synthesis rule: collect verdicts, weigh for/against, pick optimal — but standing rules are hard constraints, personas cannot vote them away (e.g. a fan preferring a nicer but pre-2020 photo loses to the freshness rule). If verdicts tie between two compliant options, prefer the one better for Pass 5 (legibility) — the lay reader is the final gate.

Conflict precedent (recorded): pass 4 fan wants era-accurate fresh photo, pass 1 editor notes crop removes title text, pass 5 wants max legibility -> the vinyl-portrait case was resolved by denser crop at zoom that drops the title out of frame (compliant on all three).
