import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive, SkillLevel } from "../types.ts";

/**
 * Robustly parses and repairs JSON from Gemini model output.
 * Handles markdown code blocks and ensures the output is valid.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("The model returned an empty response.");
  
  let clean = text.trim();

  // Strip Markdown markers if present
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "");
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw content:", text);
    // Simple repair for truncated JSON
    let repair = clean;
    const openBraces = (repair.match(/\{/g) || []).length;
    const closeBraces = (repair.match(/\}/g) || []).length;
    for (let i = 0; i < openBraces - closeBraces; i++) repair += "}";
    
    const openBrackets = (repair.match(/\[/g) || []).length;
    const closeBrackets = (repair.match(/\]/g) || []).length;
    for (let i = 0; i < openBrackets - closeBrackets; i++) repair += "]";
    
    try {
      return JSON.parse(repair);
    } catch (e2) {
      throw new Error("Architectural data was received but malformed. Please try again.");
    }
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
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });
  const targetDifficulty = getTargetDifficulty(prefs.skillLevel);

  const prompt = `
You are a Senior Engineering Project Mentor. 
Generate exactly 4 unique project ideas for an engineering student with the following profile:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Skill Level: ${prefs.skillLevel}

CRITICAL REQUIREMENT:
Since the user is at the "${prefs.skillLevel}" skill level, you MUST set the "difficulty" of ALL projects to strictly "${targetDifficulty}".

Output ONLY a JSON array of 4 objects. Each object must contain:
- id: string (unique identifier)
- title: string
- shortDescription: string (max 12 words)
- difficulty: string (must be "${targetDifficulty}")
- suitability: string (why it fits this student)
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

  const parsed = robustJsonParse(response.text);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Generates a deep-dive project roadmap and viva preparation guide.
 */
export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Act as a Senior Project Architect. Provide a full technical blueprint for the project: "${summary.title}".
Context: ${prefs.branch} Engineering, Semester ${prefs.semester}. Difficulty Level: ${summary.difficulty}.

Return a JSON object with:
- title: string
- intro: string
- fullDescription: string
- techStack: array of { category: string, items: string[] }
- roadmap: array of { week: string, task: string, details: string[] }
- resources: array of { title: string, type: string, link: string }
- vivaPrep: object { questions: string[], concepts: string[], mistakes: string[], evaluatorExpectations: string[] }
- presentationTips: string[]
- closing: string
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