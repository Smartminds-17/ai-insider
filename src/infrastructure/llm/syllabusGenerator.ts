import type { Syllabus } from "@/domain/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Strategy pattern: this is the one place that knows how to turn a prompt
// into a syllabus. Swapping LLM providers later means changing this file only.

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

// ==========================================
// GEMINI API RATE LIMITER (for ALL concurrent users)
// Protects Gemini's free tier quota: 20 requests/day = ~0.83 requests/hour
// This queues requests to never exceed your free tier limit
// ==========================================
type QueuedRequest = {
  resolve: () => void;
  unitsNeeded: number;
};

class GeminiRateLimiter {
  private availableTokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefillTimestamp: number;
  private queue: QueuedRequest[] = [];
  private processing = false;

  constructor(maxTokens: number, refillRatePerDay: number) {
    this.maxTokens = maxTokens;
    this.availableTokens = maxTokens;
    this.refillRate = refillRatePerDay / (24 * 60 * 60); // convert to per second
    this.lastRefillTimestamp = Date.now();
    console.log(`Gemini rate limiter: ${maxTokens} max tokens, ${refillRatePerDay}/day refill`);
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTimestamp) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;
    this.availableTokens = Math.min(this.maxTokens, this.availableTokens + tokensToAdd);
    this.lastRefillTimestamp = now;
  }

  private processQueue() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    this.refill();

    while (this.queue.length > 0) {
      const next = this.queue[0];
      if (this.availableTokens >= next.unitsNeeded) {
        this.availableTokens -= next.unitsNeeded;
        this.queue.shift();
        next.resolve();
      } else {
        // Wait for tokens to refill before processing next
        const waitTime = Math.ceil((next.unitsNeeded - this.availableTokens) / this.refillRate * 1000);
        console.log(`Gemini rate limit: waiting ${Math.ceil(waitTime/1000/60)} minutes for next request`);
        setTimeout(() => {
          this.processing = false;
          this.processQueue();
        }, waitTime);
        return;
      }
    }
    this.processing = false;
  }

  // Wait until we have enough tokens to execute the API request
  async acquire(unitsNeeded: number): Promise<void> {
    return new Promise((resolve) => {
      this.queue.push({ resolve, unitsNeeded });
      this.processQueue();
    });
  }
}

// Singleton instance - ONE limiter for ALL users/requests in the entire app
// Gemini free tier: 20 generateContent requests/day for gemini-3.5-flash
// Config: 1 max token (only 1 request can run at a time), 19 requests/day refill
// This uses 1 token per path generation, keeping you safely under 20/day
const geminiRateLimiter = new GeminiRateLimiter(1, 19);

const SYSTEM_PROMPT = `You turn a learner's stated goal into a short, ordered
learning syllabus. Respond with ONLY valid JSON, no prose, no markdown fences,
in this exact shape:

{"title": "short path title", "topics": ["Topic 1", "Topic 2", ...]}

Rules:
- 5 to 9 topics, ordered from foundational to advanced.
- Each topic is a few words, specific enough to search YouTube for
  (e.g. "SQL joins" not just "Databases").
- Cover any field the user names — not just data/tech topics.
- Do not include a "practice" or "quiz" topic; topics are learning-content only.`;

export async function generateSyllabus(prompt: string): Promise<Syllabus> {
  if (!genAI) {
    return {
      title: `Learning path: ${prompt.slice(0, 60)}`,
      topics: [
        { title: "Fundamentals", order: 0 },
        { title: "Core concepts", order: 1 },
        { title: "Hands-on practice", order: 2 },
        { title: "Intermediate techniques", order: 3 },
        { title: "Real-world application", order: 4 },
      ],
    };
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
    },
    systemInstruction: SYSTEM_PROMPT,
  });

  // Acquire Gemini rate limit token BEFORE making API call
  // Uses 1 of your 20 free daily requests, queues if quota is exhausted
  await geminiRateLimiter.acquire(1);

  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();

  // Strip markdown fences if present
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
  }

  // Try to extract JSON object from text (handles extra prose)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    text = jsonMatch[0];
  }

  let parsed: { title?: string; topics?: string[]; sections?: { topics: { title: string }[] }[] };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Syllabus generation returned invalid JSON: ${text.slice(0, 200)}`);
  }

  // Extract topic titles from whatever format we got
  let topicTitles: string[];
  if (Array.isArray(parsed.topics)) {
    topicTitles = parsed.topics;
  } else if (Array.isArray(parsed.sections)) {
    topicTitles = parsed.sections.flatMap((s) => s.topics?.map((t) => t.title) ?? []);
  } else {
    throw new Error("Syllabus generation returned unexpected format");
  }

  return {
    title: parsed.title ?? `Learning path: ${prompt.slice(0, 60)}`,
    topics: topicTitles.map((title, order) => ({ title, order })),
  };
}