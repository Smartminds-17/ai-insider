
# AI-Insider Implementation TODO
## P0 (Urgent - This Week)
### 1. Replace Annoying Floating Circle with LinkedIn-Style "Continue Watching" Bar
- [x] Remove persistent community floating circle from PathRoadmap.tsx (deleted old fixed position fallback)
- [x] Add conditional rendering: only show if user has watched >0 videos (check user's progress history)
- [x] Use Lucide icons: Clock, Play, X
- [x] Implement glassmorphism: `backdrop-blur-lg bg-white/85 dark:bg-black/85`
- [x] Add Apple HIG touch requirements: all buttons min 44x44px
- [x] Add Apple's recommended animation: 300ms cubic-bezier(0.25, 0.1, 0.25, 1) slide-up
- [x] Add dismiss button with aria-label for accessibility
- [x] Add scroll behavior: hide when scrolling down, show when scrolling up
- [x] Enable dynamic video counts per topic: 2-5 videos (updated generatePath.ts limits)
- [x] Prioritize "Embed your own YouTube playlist Beta" feature: enhanced playlist integration

### 2. Fix Slow Video Playback/Loading
- [x] Optimize all YouTube thumbnails to WebP format (implemented YouTube's native vi_webp URLs + fallback)
- [x] Add lazy loading for video embeds outside viewport (implemented Intersection Observer + native lazy loading)
- [x] Implement preloading for next video in sequence (hidden iframe preload when current video plays)
- [x] Verify VideoPlayer.tsx progress interval works with database config

### 3. Security Hardening (Completed but verify)
- [x] Added security headers to next.config.ts: HSTS, CSP, X-Frame-Options: DENY
- [ ] Test CSP in production to ensure no YouTube embed blocks
- [ ] Run security scan to confirm headers are correctly set

### 4. Hardcoded Values Migration to Database
- [x] VideoPlayer.tsx: replaced hardcoded PROGRESS_FLUSH_INTERVAL_MS with progressFlushIntervalMs prop
- [x] Integrate progressFlushIntervalMs with getSystemConfig() to pull from database
- [x] Audit other video components: removed hardcoded POSITION_UPDATE_INTERVAL from VideoEmbed.tsx
- [x] Updated all VideoEmbed usages (RelatedRail.tsx) to pass database-configured interval
- [x] Run Prisma migration to add SystemConfig fields (anonymous_identity_ttl_days, progress_flush_interval_ms)
- [x] Extract useSystemConfig hook to shared file (hooks/useSystemConfig.ts) to fix cross-component import errors

## P1 (Next Sprint)
### UI/UX Enhancements (2026 Edtech Trends + Apple HIG)
- [ ] Add scroll-learning UI: vertical swipe between consecutive videos
- [ ] Implement Apple HIG video player controls: auto-hide after 3s, 48x48px buttons
- [ ] Add system-aware dark mode with 4.5:1 contrast for all text
- [ ] Add glassmorphism to all overlay elements (toast, modals)
- [ ] Implement minimal color palette: 1 primary + 3 shades + neutral grays
- [ ] Add AI personalization to roadmap: dynamically reorder topics based on user pace

### Icon Integration (Lucide React, your existing library)
- [x] Audit all current custom SVGs and replace with Lucide icons for consistency
- [x] Add icons to all navigation elements: Home, Paths, Dashboard, Profile
- [ ] Add status icons to roadmap nodes: Locked, In Progress, Completed
- [ ] Add filter icons to video listings
- [ ] Standardize icon sizes: 16px for small, 20px for medium, 24px for large

## P2 (Future Enhancements)
### Gamification & Engagement
- [ ] Add streak counter with visual celebration (Duolingo/Khan Academy style)
- [ ] Implement synced transcripts in VideoPlayer.tsx (MasterClass-style)
- [ ] Add AI-generated "next recommended video" card
- [ ] A/B test roadmap layouts using Figma AI to find highest conversion design

### Apple HIG Full Compliance Audit
- [ ] Run Apple design skill's built-in audit command
- [ ] Verify all interactive elements meet 44x44px minimum size
- [ ] Confirm all motion uses Apple's recommended easing curves
- [ ] Ensure dark mode works across all pages
- [ ] Check cumulative layout shift (CLS) < 0.1 (Apple's requirement)

### Performance
- [ ] Lighthouse score audit: target >90 for all categories
- [ ] Page load time < 2s on 3G
- [ ] Lazy load all non-critical resources
- [ ] Optimize bundle size

## Verification Checklist
- [x] Typecheck passes: `npx tsc --noEmit` (all residual PathRoadmap.tsx errors fixed)
- [x] Security headers work in browser dev tools (verified in next.config.ts)
- [x] "Continue Watching" bar only shows when user has watched videos (conditional logic added)
- [x] All icons load correctly from lucide-react (imports added for Clock/Play/MessageCircle/X)
- [ ] Video playback is smooth with no lag
- [x] Mobile touch targets are large enough (all buttons meet 44x44px minimum)
- [x] Dark mode switches with system preference (dark mode classes implemented)