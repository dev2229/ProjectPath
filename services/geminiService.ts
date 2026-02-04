import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/**
 * Robustly parses and repairs JSON from Gemini model output.
 */
function robustJsonParse(text: string): any {
  let clean = text.trim();

  // Strip Markdown markers if present
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "");
  }

  // Simple auto-balancing for truncated JSON responses
  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  while (openBraces > closeBraces) { clean += "}"; closeBraces++; }

  let openBrackets = (clean.match(/\[/g) || []).length;
  let closeBrackets = (clean.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) { clean += "]"; closeBrackets++; }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw content:", text);
    throw new Error("The AI response was malformed. Please refine your parameters and try again.");
  }
}

/**
 * Generates 4 tailored project ideas based on student preferences.
 */
export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
You are a Senior Engineering Project Mentor. Generate 4 unique project ideas for a student with these details:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Skill Level: ${prefs.skillLevel}

Criteria:
- Must be academically rigorous for a group of 3-4 students.
- Descriptions must be professional and under 15 words.
- Difficulty should be "Easy", "Medium", or "Hard".

Return exactly 4 ideas in a JSON array.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        minItems: 4,
        maxItems: 4,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            shortDescription: { type: Type.STRING },
            difficulty: { type: Type.STRING },
            suitability: { type: Type.STRING }
          },
          required: ["id", "title", "shortDescription", "difficulty", "suitability"]
        }
      }
    }
  });

  return robustJsonParse(response.text);
}

/**
 * Generates a deep-dive project roadmap and viva preparation guide.
 */
export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
Act as a Senior Project Architect. Provide a full technical blueprint for the project: "${summary.title}".

Academic Context: Semester ${prefs.semester}, ${prefs.branch}
Description: ${summary.shortDescription}

Return a JSON object containing technical roadmap, tech stack, and viva preparation.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          intro: { type: Type.STRING },
          fullDescription: { type: Type.STRING },
          techStack: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          roadmap: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                week: { type: Type.STRING },
                task: { type: Type.STRING },
                details: { type: Type.ARRAY, items: { type: Type.STRING } }
              }
            }
          },
          resources: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                type: { type: Type.STRING },
                link: { type: Type.STRING }
              }
            }
          },
          vivaPrep: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              evaluatorExpectations: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          presentationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          closing: { type: Type.STRING }
        },
        required: ["title", "intro", "fullDescription", "techStack", "roadmap", "vivaPrep", "closing"]
      }
    }
  });

  return robustJsonParse(response.text);
}