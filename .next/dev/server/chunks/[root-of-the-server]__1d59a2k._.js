module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/app/api/related/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$application$2f$getRelatedVideos$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/application/getRelatedVideos.ts [app-route] (ecmascript)");
;
;
async function GET(req) {
    const field = req.nextUrl.searchParams.get("field");
    if (!field) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            data: null,
            meta: {},
            error: {
                code: "INVALID_INPUT",
                message: "field query param is required"
            }
        }, {
            status: 400
        });
    }
    const videos = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$application$2f$getRelatedVideos$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getRelatedVideos"])(field);
    return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
        data: videos,
        meta: {},
        error: null
    });
}
}),
"[project]/src/application/getRelatedVideos.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getRelatedVideos",
    ()=>getRelatedVideos
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$youtube$2f$youtubeClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/youtube/youtubeClient.ts [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$youtube$2f$rankVideos$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/infrastructure/youtube/rankVideos.ts [app-route] (ecmascript)");
;
;
async function getRelatedVideos(field, count = 4) {
    const candidates = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$youtube$2f$youtubeClient$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["searchVideosForTopic"])(`${field} inspiring talk highlights`, 10);
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$infrastructure$2f$youtube$2f$rankVideos$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["rankVideos"])(candidates, count);
}
}),
"[project]/src/infrastructure/youtube/rankVideos.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "rankVideos",
    ()=>rankVideos,
    "scoreVideo",
    ()=>scoreVideo
]);
// Strategy pattern: this is the "good algorithm to suggest videos" piece.
// v1 uses cheap metadata-only heuristics (no transcript/LLM classification —
// that's deferred). Swappable later without touching callers.
const IDEAL_DURATION_SEC = 15 * 60; // ~15 min sweet spot for a single-topic tutorial
const MAX_AGE_DAYS = 365 * 3; // videos older than ~3 years score lower (may be outdated)
function normalize(value, max) {
    return Math.min(value / max, 1);
}
function scoreVideo(video) {
    // View count: log-scaled so a 10M-view video doesn't completely dominate
    // a 200K-view video that might actually be a better fit.
    const viewScore = normalize(Math.log10(video.viewCount + 1), 7); // log10(10M) ≈ 7
    // Duration fit: penalize videos far from the ideal length in either direction.
    const durationDelta = Math.abs(video.durationSec - IDEAL_DURATION_SEC);
    const durationScore = 1 - normalize(durationDelta, IDEAL_DURATION_SEC * 2);
    // Recency: newer content scores higher, floors out rather than going to zero.
    const ageDays = (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = 1 - normalize(ageDays, MAX_AGE_DAYS) * 0.7;
    // Weighted sum — views matter most (proxy for community-validated quality),
    // then duration fit, then recency.
    return viewScore * 0.5 + durationScore * 0.3 + recencyScore * 0.2;
}
function rankVideos(candidates, topN = 2) {
    return candidates.map((video)=>({
            ...video,
            score: scoreVideo(video)
        })).sort((a, b)=>b.score - a.score).slice(0, topN);
}
}),
"[project]/src/infrastructure/youtube/youtubeClient.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "searchVideosForTopic",
    ()=>searchVideosForTopic
]);
const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";
// Parses ISO 8601 durations like "PT14M32S" into seconds.
function parseIsoDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const [, h, m, s] = match;
    return (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);
}
// Mock results so the app is runnable/demoable without a YouTube API key.
// Replace by setting YOUTUBE_API_KEY in .env — real search takes over automatically.
function mockCandidates(topic) {
    return Array.from({
        length: 5
    }).map((_, i)=>({
            youtubeVideoId: `mock-${topic.replace(/\s+/g, "-")}-${i}`,
            title: `${topic} — Full Tutorial ${i + 1}`,
            channelTitle: `Sample Channel ${i + 1}`,
            thumbnailUrl: "https://placehold.co/320x180?text=" + encodeURIComponent(topic),
            durationSec: 600 + i * 300,
            viewCount: 500000 - i * 80000,
            publishedAt: new Date(Date.now() - i * 30 * 24 * 3600 * 1000).toISOString()
        }));
}
async function searchVideosForTopic(topic, maxResults = 8) {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
        return mockCandidates(topic);
    }
    const searchUrl = new URL(`${YOUTUBE_API_BASE}/search`);
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", `${topic} tutorial`);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(maxResults));
    searchUrl.searchParams.set("relevanceLanguage", "en");
    searchUrl.searchParams.set("key", apiKey);
    const searchRes = await fetch(searchUrl.toString());
    if (!searchRes.ok) {
        throw new Error(`YouTube search failed: ${searchRes.status}`);
    }
    const searchData = await searchRes.json();
    const videoIds = searchData.items.map((item)=>item.id.videoId).filter(Boolean);
    if (videoIds.length === 0) return [];
    // Second call needed: search.list doesn't return duration/viewCount, only
    // videos.list (statistics + contentDetails parts) does.
    const detailsUrl = new URL(`${YOUTUBE_API_BASE}/videos`);
    detailsUrl.searchParams.set("part", "snippet,statistics,contentDetails");
    detailsUrl.searchParams.set("id", videoIds.join(","));
    detailsUrl.searchParams.set("key", apiKey);
    const detailsRes = await fetch(detailsUrl.toString());
    if (!detailsRes.ok) {
        throw new Error(`YouTube video details failed: ${detailsRes.status}`);
    }
    const detailsData = await detailsRes.json();
    return detailsData.items.map((item)=>({
            youtubeVideoId: item.id,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default.url,
            durationSec: parseIsoDuration(item.contentDetails.duration),
            viewCount: Number(item.statistics.viewCount ?? 0),
            publishedAt: item.snippet.publishedAt
        }));
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__1d59a2k._.js.map