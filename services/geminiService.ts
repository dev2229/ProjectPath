import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive, SkillLevel } from "../types.ts";

/**
 * Robustly parses and repairs JSON from Gemini model output.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("The model returned an empty response.");
  
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
    throw new Error("Architectural data was received but malformed. Please try again.");
  }
}

/**
 * Maps SkillLevel to strict Difficulty labels for the prompt.
 */
const getTargetDifficulty = (level: SkillLevel): string => {
  switch (level) {
    case SkillLevel.BEGINNER: return "Easy";
    case SkillLevel.INTERMEDIATE: return "Medium";
    case SkillLevel.ADVANCED: return "Hard";
    default: return "Medium";
  }
};

/**
 * Generates tailored project ideas based on student preferences.
 */
export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const targetDifficulty = getTargetDifficulty(prefs.skillLevel);

  const prompt = `
You are a Senior Engineering Project Mentor. Generate 4 unique project ideas for an engineering student:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Skill Level: ${prefs.skillLevel}

CRITICAL: Since the user is "${prefs.skillLevel}", set "difficulty" of ALL 4 projects to strictly "${targetDifficulty}".

Return a JSON array of 4 objects. Each must have: id, title, shortDescription (max 12 words), difficulty (MUST be "${targetDifficulty}"), and suitability.
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
Act as a Senior Project Architect. Provide a full technical blueprint for: "${summary.title}".
Context: ${prefs.branch} Engineering, Semester ${prefs.semester}. Difficulty: ${summary.difficulty}.

Return a JSON object with: title, intro, fullDescription, techStack (category/items), roadmap (week/task/details), resources (title/type/link), vivaPrep (questions, concepts, mistakes, evaluatorExpectations), presentationTips, and closing.
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
              },
              required: ["category", "items"]
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
              },
              required: ["week", "task", "details"]
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
              },
              required: ["title", "type", "link"]
            }
          },
          vivaPrep: {
            type: Type.OBJECT,
            properties: {
              questions: { type: Type.ARRAY, items: { type: Type.STRING } },
              concepts: { type: Type.ARRAY, items: { type: Type.STRING } },
              mistakes: { type: Type.ARRAY, items: { type: Type.STRING } },
              evaluatorExpectations: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["questions", "concepts", "mistakes", "evaluatorExpectations"]
          },
          presentationTips: { type: Type.ARRAY, items: { type: Type.STRING } },
          closing: { type: Type.STRING }
        },
        required: ["title", "intro", "fullDescription", "techStack", "roadmap", "resources", "vivaPrep", "presentationTips", "closing"]
      }
    }
  });

  return robustJsonParse(response.text);
}