
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/* ------------------ Helpers ------------------ */

function robustJsonParse(text: string): any {
  let clean = text.trim();

  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\n?|\n?```$/g, "").trim();
  }

  // Handle common JSON truncation issues
  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    clean += "}";
    closeBraces++;
  }

  let openBrackets = (clean.match(/\[/g) || []).length;
  let closeBrackets = (clean.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) {
    clean += "]";
    closeBrackets++;
  }

  return JSON.parse(clean);
}

/**
 * Robustly retrieves the API Key from the environment.
 * Checks process.env.API_KEY first (standard), then VITE_API_KEY (Vite default).
 */
function getApiKey(): string {
  // Try standard location first
  let key = process.env.API_KEY;
  
  // Try Vite-specific prefix if standard is empty
  if (!key || key === "") {
    key = (process.env as any).VITE_API_KEY;
  }

  if (!key || key === "") {
    throw new Error(
      "API CONFIGURATION ERROR: No API key detected. " +
      "Ensure either 'API_KEY' or 'VITE_API_KEY' is set in your environment variables."
    );
  }
  
  return key;
}

/* ------------------ Functions ------------------ */

export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an AI-powered Engineering Project Mentor.

Generate exactly 4 diverse engineering project ideas for:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Student Skill Level: ${prefs.skillLevel}

Rules:
- Beginner Level → Easy projects
- Intermediate Level → Medium projects
- Advanced Level → Hard projects

Return ONLY a JSON array of 4 objects.
Descriptions must be under 15 words.
Suitability should explain why it fits the ${prefs.semester} semester curriculum.
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
          required: [
            "id",
            "title",
            "shortDescription",
            "difficulty",
            "suitability"
          ]
        }
      }
    }
  });

  return robustJsonParse(response.text);
}

export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Act as a Senior Engineering Architect. Provide a scannable blueprint for: "${summary.title}"

Context: ${summary.shortDescription}
Semester: ${prefs.semester} (${prefs.branch})
Level: ${prefs.skillLevel}

Return a structured JSON object. Focus on practical tech and academic milestones.
STRICT JSON ONLY. No conversational filler.
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
        required: [
          "title",
          "intro",
          "fullDescription",
          "techStack",
          "roadmap",
          "vivaPrep",
          "closing"
        ]
      }
    }
  });

  return robustJsonParse(response.text);
}
