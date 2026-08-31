import type { Syllabus } from "@/domain/types";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Strategy pattern: this is the one place that knows how to turn a prompt
// into a syllabus. Swapping LLM providers later means changing this file only.

const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

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