
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/* ------------------ HELPERS ------------------ */

function robustJsonParse(text: string): any {
  let clean = text.trim();

  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\n?|\n?```$/g, "").trim();
  }

  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  while (openBraces > closeBraces) {
    clean += "}";
    openBraces--; // actually it should be openBraces > closeBraces, while loop needs count
  }

  // More standard brace counting for robustness
  let count = 0;
  for (let char of clean) {
    if (char === '{') count++;
    if (char === '}') count--;
  }
  while (count > 0) { clean += '}'; count--; }

  let bCount = 0;
  for (let char of clean) {
    if (char === '[') bCount++;
    if (char === ']') bCount--;
  }
  while (bCount > 0) { clean += ']'; bCount--; }

  return JSON.parse(clean);
}

/**
 * Robustly retrieves the API Key from the environment.
 * Checks process.env.API_KEY first, then VITE_API_KEY.
 */
function getApiKey(): string {
  const key = process.env.API_KEY || (process.env as any).VITE_API_KEY;

  if (!key) {
    console.warn("ProjectPath: API_KEY not found in process.env. System may fail.");
  }
  return key || "";
}

/* ------------------ PROJECT SUMMARIES ------------------ */

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

STRICT RULES:
- Beginner → Easy (Foundational scope)
- Intermediate → Medium (Integrated systems)
- Advanced → Hard (High research depth)

Return ONLY a JSON array of 4 objects.
Descriptions must be under 15 words.
Suitability field must explain why it's perfect for a semester ${prefs.semester} student.
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

/* ------------------ PROJECT DEEP DIVE ------------------ */

export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
  const apiKey = getApiKey();
  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
Act as a Senior Engineering Architect. 
Provide a comprehensive yet scannable blueprint for the project: "${summary.title}"

Context: ${summary.shortDescription}
Semester: ${prefs.semester}
Level: ${prefs.skillLevel}

Return a structured JSON object including:
- title: The project title.
- intro: A supportive 1-line intro.
- fullDescription: A clear project objective (max 40 words).
- techStack: Array of objects {category: string, items: string[]}
- roadmap: 6-8 weeks of milestones.
- resources: Helpful learning assets.
- vivaPrep: Common questions, concepts, and typical mistakes.
- presentationTips: 3 punchy tips.
- closing: A motivating sign-off.

STRICT JSON ONLY. No preamble.
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
