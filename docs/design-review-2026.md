# AI Insider — UI / Front-end Review & Inspiration Report

**Reviewed:** Home, Header, PromptForm, Paths list, Path/Roadmap, VideoPlayer, TopicWaypoint, Continue Watching, Pricing, Login, Mentors, Chat.
**Lens:** visual system, hierarchy, interaction states, accessibility, responsiveness, and conversion/retention.
**Date:** November 2026

---

## 1. Short verdict

The product has a genuinely good idea: **a learning path as a trail on a topographic map**. The ink/amber/sage palette, mono "legend labels", waypoint timeline, and copy ("YouTube has the course…") are distinctive and worth protecting.

The problem is not the concept. It is that the design system is **half-finished underneath the visuals**:

- A whole set of CSS variables used by real components are never defined.
- Two design systems are running side by side (the custom trail system and default shadcn light tokens), so some surfaces are dark and some are accidentally white.
- The stickiest, highest-value screen (the roadmap + player) has two layout bugs that visibly break it.
- The font the app loads is not the font the app renders.
- Returning users get the same first-time home page as anonymous visitors.

Fix the foundation first. Then add the retention layer (resume, next-up, completion, streaks).

---

## 2. What is already working (keep this)

1. **Distinct visual language.** Night-terrain ink, amber route, sage secondary. It does not look like generic AI-purple SaaS.
2. **The metaphor is carried through UI, not just copy.** Waypoint markers, trail line, legend labels, "Off the trail" rail.
3. **Strong hero copy.** "YouTube has the course. You just couldn't find the trail." is specific, memorable, and explains the product.
4. **Prompt-first home.** The primary action is obvious and above the fold.
5. **Vertical roadmap is the right pattern.** Numbered stops, collapsed thumbnails, expand-to-list is scannable.
6. **Some HIG details are already there.** Global `:focus-visible`, `prefers-reduced-motion` for smooth scroll, 44px targets in the continue bar.
7. **Good base contrast.** `--text` 15.5:1, `--text-dim` 7.0:1, `--route` 8.4:1 on `--ink`.

---

## 3. P0 — ship-blockers / visible breakage

### 3.1 Undefined CSS variables (real components render unstyled)

These are referenced in shipped components but do not exist in `app/globals.css`:

| Variable | Used in |
|---|---|
| `--surface-1` | `components/Header.tsx:150` (user dropdown background) |
| `--surface-subtle` | `components/PromptForm.tsx:151`, `app/mentors/page.tsx:63`, `components/Mentorship/MentorshipDashboard.tsx:71`, `components/Mentorship/MentorCard.tsx:146` |
| `--surface-elevated` | `components/PromptForm.tsx:97,109,128` |
| `--border-subtle` | `components/PromptForm.tsx:114,151` |

**Effect:** the account dropdown is transparent, the playlist input has no surface, borders are invisible.

**Fix:** add a real surface/border token ramp to `:root` and use it everywhere:

```css
:root {
  --surface-0: #10161A;
  --surface-1: #1B242A;
  --surface-2: #243038;
  --surface-3: #2E3C46;
  --border-subtle: rgba(255,255,255,.08);
  --border-strong: rgba(255,255,255,.18);
}
```

### 3.2 The light/dark split brain

- `body` is dark (`--ink`) via an **unlayered** rule (`globals.css:62`), while `@layer base body` sets shadcn's light `bg-background text-foreground` (`globals.css:348`).
- `.dark` is **never applied anywhere**, but the roadmap's continue bar uses `bg-white/85 dark:bg-black/85` (`PathRoadmap.tsx:248`). It renders **white on a dark app**.
- Toasts use `bg-popover text-popover-foreground` (`src/components/ui/toast.tsx:38`), which resolves to shadcn's **white** popover because `.dark` never activates.
- Mentorship forms (`MentorProfileForm`) use the default shadcn Input/Button/Form primitives, which are light-token components.

**Decision needed:** either commit to dark-only (recommended for the brand) and delete the light token set, or wire a real theme (`next-themes`, `.dark` on `<html>`). Doing neither is why the product feels "almost designed".

### 3.3 Sticky player is hidden behind the sticky header

`Header.tsx:65` is `sticky top-0 z-50`; `VideoPlayer.tsx:318` is `sticky top-0 z-30`. When the player sticks, the header overlaps its top 64px — the top of the video is clipped.

**Fix:** introduce `--header-h: 4rem`, then use `sticky top-[var(--header-h)]`. Or make the header non-sticky on `/path/*`.

### 3.4 Mobile horizontal overflow on the path page

`VideoPlayer.tsx:318` uses `-mx-16 px-16` (4rem), but the page container only has `px-5` (1.25rem) on mobile (`PathRoadmap.tsx:202`). The player extends ~44px past the viewport on each side → horizontal scroll and clipped content.

**Fix:** `-mx-5 px-5 sm:-mx-8 sm:px-8` or remove the negative margin entirely and let the player use the container.

### 3.5 "Continue watching" is broken three ways

`PathRoadmap.tsx:189-196, 247-282`

1. Link is `/paths/${path.id}` — that route **does not exist** (the route is `/path/[id]`). Users get a 404.
2. `?video=` is appended but **never read** by `PathRoadmap`, so even with the right URL it would not resume.
3. "Most recent" is computed by largest `lastPositionSec`, not by most recently watched time. A long video watched once can beat the actual last video.
4. It is a full-width white bar with light-mode grays and a blue button, using the remapped `bg-blue-600`, plus duplicate "Continue Watching" text.

**Fix:** persist `lastWatchedAt` (or use `updatedAt`), link to `/path/${id}?video=${youtubeVideoId}`, read the param on mount to set `activeVideo`, and rebuild the bar in the ink/amber system with a thumbnail and progress line.

### 3.6 The loaded font is not the rendered font

- `app/layout.tsx:12` loads Geist with `variable: "--font-sans"`.
- `app/globals.css:9` defines `--font-geist-sans: Inter, ...` and `body` uses **that** (`globals.css:65`).
- Inter is never loaded (the Google Fonts import is commented out at `globals.css:6`), so most machines fall back to system UI.
- `font-display` is literally the same family as body (`globals.css:98-100`), so there is no display hierarchy.

**Fix:** pick two roles and load them through `next/font` only — e.g. **Geist** for UI, **Instrument Sans / Satoshi** for display, **Geist Mono** for legend labels. Then map `--font-sans` and `--font-display` correctly.

### 3.7 Class names that do not exist

Used but not defined in CSS:

- `page-header`, `page-title`, `page-subtitle` — `app/paths/page.tsx:28,31,32`
- `btn--outline` — `app/mentors/page.tsx:54`
- `btn--sm` — `app/page.tsx:66`

They silently do nothing, which is why those screens look under-styled next to the home page. Either define them or replace with existing utilities.

---

## 4. P1 — high-impact UX / IA changes

### 4.1 Home: returning users need a "continue" state
Right now `/` is always the acquisition page. For anyone with routes, the highest-value pixel is "Continue where you left off", not another prompt.
Add, above the prompt (and below the hero on mobile):
- **Continue learning** card (last route + last video + progress + resume button)
- 2–3 recent routes as compact cards
- prompt demoted to secondary for signed-in users

This is the single biggest retention improvement available.

### 4.2 Home: show the artifact before asking for the goal
A first-time visitor cannot see what a "route" actually is. Add a **static roadmap preview** under the hero: 4–5 waypoint nodes, thumbnails, progress line, "12 videos · 6h 40m". It answers "what do I get?" without a signup or a generated path.

### 4.3 One progress metric, not three
- Path page: time watched / total duration (`PathRoadmap.tsx:175-185`)
- Paths list: watched videos / total videos (`PathHistoryListItem.tsx:61-63`)
- Topic: watched count / video count (`TopicWaypoint.tsx:26-27`)

Users see 62% on one screen and 4/12 on another for the same route. Standardize on **completion by video count** (easier to reason about) and show time as a secondary "estimated 2h 10m left". Label both.

### 4.4 Path page hierarchy
The current top row is `% complete · stops/videos · Delete Route` (`PathRoadmap.tsx:212-234`). Delete is a destructive action sitting in the primary header row, only guarded by `window.confirm` (`:137`).
- Move Delete into a `⋯` overflow menu with a real dialog.
- Add a back link / breadcrumb to `/paths`.
- Add one primary CTA: **Next up →** (first unwatched video), with the sticky player secondary until a video is chosen.
- Show route title, then one line of metadata (`6 stops · 14 videos · 3h 20m · 62%`).
- Put the current stop and the next stop in view; collapse the rest.

### 4.5 Generation is the product's "wow" moment and it is a text card
`PathRoadmap.tsx:287-296` shows a static "Finding the best videos…" card while polling. Replace with:
- staged progress (`Understanding your goal → Finding stops → Ranking videos → Assembling route`) driven by real or simulated stages,
- a skeleton roadmap that fills in as topics arrive,
- a "this usually takes ~20s" expectation,
- graceful failure + retry (currently just red text at `:298-302`).

### 4.6 Paths list needs retrieval tools
`app/paths/page.tsx` is a flat list. Once a user has 10+ routes it becomes unusable.
Add: search, filter tabs (`All / In progress / Completed`), sort (`Recent / Progress / Duration`), and a compact/comfortable toggle. Keep the current card design, just give it a toolbar.

### 4.7 Chat is visually a different product
`Chat/*` still uses `bg-gray-*`, `text-gray-*`, `bg-blue-600`, `from-purple-500 to-blue-500`, and a Discord-style layout. Everywhere else is trail-themed.

Also:
- Phone / video buttons (`ChatHeader.tsx:111-117`) and several menu items (`:129-142`) are **dead controls**. Remove them or implement them — dead buttons destroy trust.
- On mobile the sidebar is 42% (`globals.css:94-96`) leaving a cramped thread. Use a slide-in conversation drawer under `sm`.
- No message grouping, no day separators, no `role="log"` / `aria-live` for incoming messages, no typing announcement for screen readers.
- Empty state is one line of text; add 3 prompt starters / suggested groups (current AI-chat best practice).

### 4.8 Header
- No active state for the current section. Add `aria-current="page"` + an amber underline/pill.
- Mobile nav becomes a horizontally scrolling row of 4 links; "Pricing" can be hidden off-screen. Use a compact icon row or a sheet menu.
- User menu only closes on outside click (`Header.tsx:21-31`). Add `Escape`, arrow-key navigation, and `role="menu"`.
- Add a **skip to content** link.
- 32px avatar inside a larger button is fine, but the visible target is small; make the whole chip 44px tall on touch.

### 4.9 Pricing
- The Monthly / Annual toggle is decorative (`app/pricing/page.tsx:235-247`); Annual does nothing. Either implement it or render it as a static badge.
- If a Stripe price ID is missing, the CTA does nothing (`:307-316`). Show a disabled state + explanation.
- `/pricing` 404s when `NEXT_PUBLIC_FEATURE_PAYMENTS` is not `true` (`:163-165`), but the header always links to it. Gate the nav item with the same flag or show a "coming soon" page instead of a 404.
- `FeatureStatusBanner` uses raw blue/yellow (`components/ui/FeatureStatusBanner.tsx:12-16`). Re-theme it with `--surface-2`, `--warn`, `--route`.

### 4.10 Accessibility sweep (concrete)
- `legend-label` is 10px with 0.22em tracking (`globals.css:107-115`). Raise to 12px / 0.12em.
- Arrow-function controls in `VideoPlayer` have no `aria-label` (play, mute, fullscreen, seek, volume). Range inputs need labels + visible focus.
- `window.confirm` for delete → dialog component.
- Add `aria-live="polite"` for generation status and new messages.
- `hover:scale-105` on CTAs (`PromptForm.tsx:85`, `app/paths/page.tsx:36`, `PathHistoryListItem.tsx:68,107,116`) creates layout jitter and ignores `prefers-reduced-motion`. Replace with color/border elevation.
- Color is sometimes the only signal (green/amber/red status pills). Keep text, add icons.
- Provide a visible `focus-visible` style for the range inputs and dropdown items.

### 4.11 Media performance
- Raw `<img>` for thumbnails (`TopicWaypoint.tsx:74,129`, `RelatedRail.tsx:81`, `ConversationList.tsx:162,207`, `MessageBubble.tsx:44`) with no width/height → CLS. Use `next/image` (remote patterns already configured in `next.config.ts`) or fixed aspect boxes + `srcSet`.
- Collapsed and expanded topic render the same thumbnails twice; one image component with `sizes` fixes it.
- The hidden next-video iframe preload (`VideoPlayer.tsx:76-93`) loads a full YouTube embed on mobile for a video the user may never watch. Remove it; use `preconnect` to `https://www.youtube.com` / `https://i.ytimg.com` and rely on `cueVideoById` on hover/focus.
- Loading state is plain pulsing text (`PathRoadmap.tsx:165-171`) and "Loading…" in the header. Add skeletons for the path header, waypoints, and chat list.

---

## 5. Design-system recommendations

### 5.1 Token layer (do this before more screens)
Define and adopt:
- **Surfaces:** `--surface-0…3`, `--border-subtle/strong`
- **Text:** `--text-1` (primary), `--text-2` (dim), `--text-3` (muted/metadata)
- **Accent:** `--route` reserved for **progress + one primary CTA per screen**
- **Semantic:** `--success`, `--warn`, `--danger` (replace `#f87171`, `text-red-400`, `text-amber-500`)
- **Radius:** 6 / 10 / 14 / 20
- **Space:** 4-based scale, but standardize the section rhythm (currently mixes `mb-10`, `mt-14`, `mt-20`, `py-20`, `py-28`)
- **Motion:** `--motion-fast: 120ms`, `--motion-base: 200ms`, `--motion-slow: 320ms`, easing `cubic-bezier(.22,1,.36,1)`
- **Z-index:** `--z-header: 50`, `--z-player: 40` (below header), `--z-overlay: 60`, `--z-toast: 70`

### 5.2 One accent rule
Amber currently means: primary CTA, progress, hover link, "most popular", focus ring, selection, warning. That flattens hierarchy. Reserve amber for **progress + primary action**, use a cooler neutral or sage for links/secondary, and red only for destructive.

### 5.3 Typography
- Load exactly two families through `next/font`, no external `@import`.
- Display: a slightly more characterful sans (Instrument Sans, Satoshi, or keep Geist at 500/600 with tighter tracking).
- UI: Geist / system.
- Mono: Geist Mono only for labels and numbers.
- Set a real type scale: 12 / 14 / 16 / 20 / 24 / 32 / 48 / 64, with line-heights 1.5 body and 1.05–1.15 display.
- Ban `font-medium` as the only weight; define display vs body weight roles.

### 5.4 Component inventory to extract
`Button` (route / ink / ghost / danger), `Chip`, `Card`, `Input`, `Menu`, `Dialog`, `Skeleton`, `EmptyState`, `Progress`, `StatusBadge`, `SectionHeader`. Right now these exist as CSS classes plus inline styles, duplicated across `pricing`, `home`, `paths`, `mentors`, and the commented-out home pricing block. The duplication is already causing drift (home's hidden pricing block vs `pricing/page.tsx` are different implementations of the same tiers).

### 5.5 Iconography
Lucide is installed but the app still ships many hand-rolled SVGs (`VideoPlayer`, `TopicWaypoint`, `PromptForm`, `Chat`, `SignInButton`). Migrate to Lucide and freeze sizes: 16 (inline), 20 (controls), 24 (navigation). This is already in `TODO.md`; finish it.

### 5.6 Delete the dead branches
- `PathRoadmap.tsx:321-402` and `:404-481` are `{false && …}` design mocks.
- `app/page.tsx:105-244` is a large commented pricing section.
- `TopicWaypoint.tsx` `progressUpdateIntervalMs` prop is never used.
- `VideoPlayer` has an unreachable `if (!video)` placeholder because the parent only mounts it when `activeVideo` exists.
Dead code makes the design system look bigger and more inconsistent than it is.

---

## 6. Screen-by-screen recommendations

### Home (`/`)
1. Keep hero copy and prompt.
2. Add returning-user "Continue learning" + recent routes.
3. Add a visual route preview (static mock or animated waypoint line).
4. Simplify the meta row: usage belongs near the account chip or prompt, not above the H1.
5. Replace the 3-step strip with a more visual "how it works" (mini map, not three text columns).
6. Add a trust line ("Built on YouTube's catalog · your progress saved automatically").
7. Move the hidden pricing block into a real component or delete it.

### Paths (`/paths`)
1. Add search + filter tabs + sort.
2. Use one progress metric and one status vocabulary.
3. Show "last opened" time and "next video" on each card.
4. Delete → overflow menu + dialog.
5. Empty state is good; add a secondary "Browse an example route" link.

### Path (`/path/[id]`)
1. Fix sticky offset and mobile negative margin (P0).
2. Add breadcrumb + overflow menu.
3. "Next up" hero card with thumbnail, duration, resume progress.
4. Real generation progress + skeleton.
5. Make the player a proper mini-player when scrolled past: small floating card with title, progress, play/pause (the current full-width sticky video takes over the viewport).
6. Auto-scroll the player into view when a video is selected from deep in the list.
7. Completion state: celebration + "what to learn next" + share route.

### Chat (`/chat`)
1. Re-theme to ink/amber/sage; kill gray/blue/purple.
2. Remove dead call/video/menu items.
3. Mobile: drawer for conversations, full-width thread.
4. Add empty-state prompt starters, day separators, message grouping, `role="log"`, `aria-live`.
5. Add search in conversation history.
6. Add a "share route in chat" action — connect the two core surfaces.

### Pricing (`/pricing`)
1. Make the billing toggle functional or static.
2. One recommended tier is enough; the current "middle card raised" is good.
3. Add a comparison table for the "everything in…" rows instead of repeating.
4. Add FAQ schema / metadata for SEO if public.
5. Re-theme the status banner.

### Login (`/login`)
1. Fine structurally; use the display face for "AI Insider", add the logo mark, and make the Google button the only strong element.
2. Add a "continue without signing in" link — anonymous is a supported mode and should be explicit.

### Mentors (`/mentors`)
1. Locked state uses an undefined `btn--outline` and raw `amber-500`; re-theme.
2. The whole section is maintenance-gated; consider removing it from primary nav until it ships (progressive disclosure, not dead ends).
3. Mentor cards need real photos/initials system, availability, and pricing clarity.

---

## 7. Online inspiration report

Sources reviewed (Nov 2026):

1. **SaaSUI — "7 SaaS UI Design Trends in 2026"** — https://www.saasui.design/blog/7-saas-ui-design-trends-2026
   - *Calm design* (Linear): default views only show the current workflow; advanced actions behind progressive disclosure.
   - *AI as infrastructure, not a feature* (Notion/Intercom): no "AI badge" everywhere; AI appears at the point of need.
   - *Command palettes* (Linear/⌘K): expected once a product has more than a handful of features.
   - *Progressive disclosure*: sequence complexity after the user demonstrates need.
   - *Emotional design*: completion celebrations, human empty states, contextual loading copy.
   - *Strategic minimalism*: one clear CTA per screen; every element earns its place.
   - **Apply to AI Insider:** one primary action per screen; hide Delete/advanced tools; AI should feel built into the route, not sold as a badge; add a completion moment; consider ⌘K for "new route / go to path / search".

2. **Backpack Interactive — "7 Trends in EdTech Product Design for 2026"** — https://backpackinteractive.com/resources/articles/edtech-product-trends-2026
   - AI support at the point of need; personalized recommendations; actionable data dashboards; mobile-first for uneven device access; privacy/trust as a differentiator.
   - **Apply:** "next up" recommendation, a real progress dashboard, mobile-first path/player, visible privacy note near uploads and anonymous data.

3. **roadmap.sh** — https://roadmap.sh
   - The map is the product: large visual node graph, progress marking, per-topic AI tutor, shareable progress links.
   - **Apply:** make the roadmap the hero of the path page, add per-stop "ask about this" entry, and add a public/shareable progress view. This is also a growth loop.

4. **Duolingo product teardown** — https://assets.nextleap.app/submissions/DUOLINGOPRODUCTTEARDOWN-2c5d56db-ddf8-4568-847d-b8964721dccd.pdf
   - Bite-sized sessions, immediate achievement feedback, streaks, smart resume nudges, one clear next lesson.
   - **Apply:** session goal ("one stop a day"), completion animation, streak counter, "you're one video away" nudge. Keep it light — credibility matters more than confetti.

5. **AI chat UI best practices (2026)** — https://thefrontkit.com/blogs/ai-chat-ui-best-practices and https://www.saasui.design/ai-chat-interface-design
   - Empty state with prompt starters, streaming/progress states, stop/regenerate, citations, scannable history, mobile drawer, `aria-live`.
   - **Apply:** chat empty state with starters; generation status with stages; conversation drawer on mobile; accessible live regions.

6. **Figma — "Top Web Design Trends for 2026"** — https://www.figma.com/resource-library/web-design-trends
   - Dark mode, purposeful motion, gamified progress, bold typography, tactile surfaces.
   - **Apply:** commit to dark-only, use motion for state changes only, bold display type, tactile card edges (already started with `surface-card`).

7. **Merge — "7 best designed edtech platforms"** — https://merge.rocks/blog/7-best-designed-edtech-platforms-weve-seen-so-far
   - Cinematic content presentation + community plumbing; AI tutoring is now expected to be obvious and findable.
   - **Apply:** make video the visual centerpiece on the path page; make "ask a question about this stop" obvious.

### What not to copy
- Dribbble-only aesthetics (gradients, glass, 3D) without state design.
- Badge/streak inflation — it undermines a learning product's credibility if progress is fake.
- "Powered by AI" badges everywhere — 2026 products make AI invisible infrastructure.
- Maximalist dashboards — AI Insider's strength is a single clear path; protect that.

---

## 8. Suggested sequence

**Week 1 — foundation (P0)**
- Define surface/border/text tokens; delete or wire the light theme.
- Fix fonts and map `--font-sans` / `--font-display`.
- Fix sticky player offset + mobile negative margin.
- Rebuild the continue-watching bar (correct route, real resume, recency).
- Add missing `page-*`, `btn--outline`, `btn--sm` styles.

**Week 2 — core journey (P1)**
- Returning-user home (continue + recent).
- Path page IA: breadcrumb, overflow menu, "Next up", generation stages.
- Unify progress metric.
- Paths list search/filter/sort.
- Header active states, skip link, keyboard menu.
- Icon migration + `next/image` thumbnails.

**Week 3 — quality**
- Chat re-theme + mobile drawer + empty state + a11y.
- Skeleton/error/empty states for every async surface.
- Pricing toggle + feature-flag consistency.
- Metadata, icon, OG image, manifest.
- Motion tokens + reduced-motion audit.

**Week 4 — retention & differentiation**
- Completion celebration, streak, "next up" recommendation.
- Shareable route/progress page.
- ⌘K command palette.
- Instrument the funnel: `route_created → first_video_played → stop_completed → route_completed → upgrade_clicked`.

**Success metrics**
- Activation: first video played within 10 minutes of route creation.
- Return: % of users who resume a route within 7 days.
- Completion: routes with ≥1 completed stop.
- Paywall: upgrade clicks per limit hit.

---

## 9. Quick-win checklist (under a day each)

- [x] Define the 4 missing CSS variables.
- [x] Fix `sticky top-0` → header offset on the player.
- [x] Fix `-mx-16` on mobile.
- [x] Fix `/paths/${id}` → `/path/${id}` and read `?video=`.
- [x] Apply Geist (or chosen font) through one variable.
- [ ] Add `aria-label`s to video controls.
- [ ] Replace `window.confirm` with a dialog. *(List delete now at least confirms; path page still uses `window.confirm`.)*
- [ ] Add `aria-current` + active styles to header nav.
- [ ] Add loading/error/not-found route files.
- [ ] Add app icon + Open Graph image.
- [ ] Raise `legend-label` to 12px.
- [ ] Remove dead `{false && …}` blocks and commented pricing.
- [x] Returning-user home (resume billboard).
- [x] One canonical progress metric (`src/domain/progress.ts`).

---

## 10. Movie / streaming-site teardown (dulo.mov + peers)

**Inspected directly:** [dulo.mov](https://dulo.mov) — shipped SvelteKit HTML, compiled Tailwind CSS (`/_app/immutable/assets/0.C0DNrgyW.css`), and route chunks (`nodes/3` home, `nodes/5` calendar, `nodes/6` collection).
**Compared against patterns from:** Netflix, Apple TV, Disney+, MUBI, Letterboxd, Tubi. (Those sites are mostly client-rendered or bot-gated, so this is pattern-level comparison, not a CSS audit.)

### 10.1 What dulo actually ships (measured, not guessed)

| Token / element | Observed value | Why it works |
|---|---|---|
| Radius scale | `--r-control: 12px`, `--r-card: 20px`, `--r-panel: 28px` | One geometric family; panels read as "cinema glass", controls stay crisp. |
| Surfaces | `--s1: #ffffff0d`, `--s2: #ffffff14`, `--s3: #ffffff21`, `--ring: #ffffff17` | Translucent ramp on near-black, so cards layer without borders everywhere. |
| Motion | `--dur-fast: .16s`, `--dur: .26s`, `--dur-slow: .56s`, `--ease-fade: cubic-bezier(.4,0,.2,1)` | Short, quiet transitions; nothing bounces. |
| Buttons | 44px min height, pill radius, `active { scale: .97 }` | Touch-safe; press feedback without layout shift. |
| Chips | 44px on mobile, pill, `aria-selected` / `aria-current` = white fill + dark text | Doubles as filter tab and nav state; accessible by construction. |
| Hero | Full-bleed image, left-to-right black gradient (`from-black/90 via-black/55`), mask fade at 62%, logo/title, metadata row, 3-line overview, Play + secondary, 44px dot pagination | One decision above the fold; artwork sells the content. |
| Rows | Horizontal snap (`snap-start`), 20px cards, bottom gradient, title over art, hover play, 44px arrow buttons that fade in on hover/focus | Browse density without a grid wall. |
| Card hover | `shadow 0 16px 48px -12px` + `ring 1px white/8%`, poster scale/opacity | Elevation, not color, signals interactivity. |
| Ranking | Outlined `top-rank-number` numerals with gradient mask | Distinctive, but only meaningful for popularity lists. |
| Loading | `animate-pulse` + `dulo-shimmer`, staggered `fade-in` with `--i * 28ms` | Perceived speed; avoids a flash of layout. |

### 10.2 Elements worth taking — mapped to AI Insider

**Taken in this pass (implemented):**

1. **Resume billboard** (`components/ResumeTrailCard.tsx`) — dulo's hero recipe applied to the returning learner: next-lesson thumbnail as backdrop, ink gradient shade, title, "Up next · …", metadata chips (`% complete`, lessons left, minutes left), amber progress line, one primary **Resume lesson** + secondary **All routes**.
   - New `PathSummary` fields make it server-cheap: `resumeThumbnailUrl`, `resumeRemainingSec`, `totalDurationSec`, `topicCount`, `coverThumbnailUrl`.

2. **Thumbnail-first route cards** (`components/PathHistoryListItem.tsx`, `components/PathHistoryList.tsx`) — the `/paths` list is now a two-column library instead of text rows. 16:9 cover, bottom shade, status chip over the artwork, runtime badge, hover play affordance, and the **progress bar attached to the bottom edge of the image** (the Netflix/Disney+ convention). Meta row uses tabular numerals and `formatRuntime()`.

3. **One motion vocabulary** — reused `--ease-out` / `--motion-*` for card scale, hover, and progress transitions; all feedback is opacity/scale, no layout jitter.

4. **Chips as state, not decoration** — added `chip--danger` / `chip--success`; status chips sit on the artwork like dulo's rating badges, with text so color is never the only signal.

**Worth taking next (not yet implemented):**

5. **Rails with arrow controls** — apply to `RelatedRail` and a future "Recently watched" home row. Arrows: 44px circular, `bg-black/34` → white on hover, `ring-white/26`, hidden until hover/focus but always keyboard-reachable. Use `snap-x snap-mandatory` and `scrollbar-hide`.
6. **Chip filter toolbar on `/paths`** — `All / In progress / Completed`, sort by *Recent / Progress / Time*, using `aria-selected` and the 44px mobile chip height. This is the movie-site "browse bar" without the catalog sprawl.
7. **Staggered reveal + shimmer skeletons** — list cards fade in at 28ms intervals; replace the current generic pulse with a shimmer that matches cover aspect ratios. Keep total delay under ~250ms.
8. **Player chrome / breadcrumb** — dulo's watch page always shows back + title + quality. Our path page needs the same: `← All routes`, route title, stop counter, then the player. (Already on the Week 2 list.)
9. **"Recently watched" rail on home** — 3–5 compact route cards after the resume billboard, so the home page reads like a library, not a landing page.

**Deliberately not copying:**

- **Autoplay trailers on hover.** Expensive, inaccessible, and irrelevant when the content is a lesson the learner already chose.
- **Top-10 rank numerals / trending badges.** They imply social proof the product does not have yet; fake popularity erodes trust in a learning tool.
- **Hover-only information.** Every dulo-style card keeps title, duration, and status visible without hover.
- **Near-black + white-only palette.** AI Insider's amber trail is the differentiator; borrow structure and motion, not the skin.
- **20–28px radius everywhere.** 12–16px keeps the map/topographic language crisp; reserve larger radii for the billboard only.

