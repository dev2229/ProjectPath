
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/**
 * Attempts to repair common JSON truncation issues from AI models.
 */
function robustJsonParse(text: string): any {
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\n?|\n?```$/g, "").trim();
  }

  // Handle unterminated strings at the very end
  if (clean.lastIndexOf('"') > clean.lastIndexOf(':') && !clean.endsWith('"') && !clean.endsWith('}') && !clean.endsWith(']')) {
    clean += '"';
  }

  // Balanced braces/brackets
  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    clean += '}';
    closeBraces++;
  }

  let openBrackets = (clean.match(/\[/g) || []).length;
  let closeBrackets = (clean.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) {
    clean += ']';
    closeBrackets++;
  }

  return JSON.parse(clean);
}

export async function generateProjectSummaries(prefs: UserPreferences): Promise<ProjectSummary[]> {
  // Use process.env.API_KEY directly as required. 
  // The global 'process' is defined in index.html for browser compatibility.
  const apiKey = (process as any)?.env?.API_KEY;
  
  if (!apiKey) {
    throw new Error("Engineering Intelligence Offline: API_KEY is missing from environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    You are an AI-powered Engineering Project Mentor.
    Generate exactly 4 diverse project ideas for:
    - Semester: ${prefs.semester}
    - Branch: ${prefs.branch}
    - Domain: ${prefs.domain}
    - User Skill Level: ${prefs.skillLevel}

    STRICT CONSTRAINTS ON DIFFICULTY:
    - If User Skill Level is "Beginner", the Difficulty for ALL 4 projects MUST be 'Easy'.
    - If User Skill Level is "Intermediate", the Difficulty for ALL 4 projects MUST be 'Medium'.
    - If User Skill Level is "Advanced", the Difficulty for ALL 4 projects MUST be 'Hard'.

    Return a JSON array of exactly 4 objects. Keep descriptions punchy and under 15 words.
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

  try {
    return robustJsonParse(response.text);
  } catch (e) {
    console.error("Summary Parsing Error:", e);
    throw new Error("Blueprint retrieval failed. System recalibrating. Please retry.");
  }
}

export async function generateProjectDeepDive(summary: ProjectSummary, prefs: UserPreferences): Promise<ProjectDeepDive> {
  const apiKey = (process as any)?.env?.API_KEY;
  
  if (!apiKey) {
    throw new Error("Engineering Intelligence Offline: API_KEY is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Act as a Senior Engineering Architect. 
    Provide a SUPER CONCISE deep dive for: "${summary.title}"
    Context: ${summary.shortDescription}
    Level: ${prefs.skillLevel} Student.

    RULES:
    - ABSOLUTELY NO FLUFF. Minimalist text only.
    - Each field must be brief.
    - Roadmap: Max 5 phases. 3 short sub-tasks each.
    - Viva: Exactly 4 questions and 4 concepts.
    - Total response must be under 500 words to ensure JSON integrity.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          intro: { type: Type.STRING, description: "One short sentence." },
          fullDescription: { type: Type.STRING, description: "Max 40 words." },
          techStack: {
            type: Type.ARRAY,
            maxItems: 4,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                items: { type: Type.ARRAY, maxItems: 3, items: { type: Type.STRING } }
              }
            }
          },
          roadmap: {
            type: Type.ARRAY,
            maxItems: 5,
            items: {
              type: Type.OBJECT,
              properties: {
                week: { type: Type.STRING },
                task: { type: Type.STRING },
                details: { type: Type.ARRAY, maxItems: 3, items: { type: Type.STRING } }
              }
            }
          },
          resources: {
            type: Type.ARRAY,
            maxItems: 3,
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
              questions: { type: Type.ARRAY, maxItems: 4, items: { type: Type.STRING } },
              concepts: { type: Type.ARRAY, maxItems: 4, items: { type: Type.STRING } },
              mistakes: { type: Type.ARRAY, maxItems: 3, items: { type: Type.STRING } },
              evaluatorExpectations: { type: Type.ARRAY, maxItems: 3, items: { type: Type.STRING } }
            }
          },
          presentationTips: { type: Type.ARRAY, maxItems: 3, items: { type: Type.STRING } },
          closing: { type: Type.STRING }
        },
        required: ["title", "intro", "fullDescription", "techStack", "roadmap", "vivaPrep", "closing"]
      }
    }
  });

  try {
    return robustJsonParse(response.text);
  } catch (e) {
    console.error("Deep Dive JSON Parsing Error:", e);
    throw new Error("Project architecture is too dense for this node. Please attempt a slightly different project scope.");
  }
}
