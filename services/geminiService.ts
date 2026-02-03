
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/* ------------------ Helpers ------------------ */

function robustJsonParse(text: string): any {
  let clean = text.trim();

  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\n?|\n?```$/g, "").trim();
  }

  let openBraces = (clean.match(/\{/g) || []).length;
  let closeBraces = (clean.match(/\}/g) || []).length;
  while (openBraces > closeBraces) clean += "}";

  let openBrackets = (clean.match(/\[/g) || []).length;
  let closeBrackets = (clean.match(/\]/g) || []).length;
  while (openBrackets > closeBrackets) clean += "]";

  return JSON.parse(clean);
}

/**
 * Validates API key presence and returns a GoogleGenAI instance.
 */
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("API CONFIG ERROR: No API key found in 'process.env.API_KEY'. Please ensure it is correctly set in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
}

/* ------------------ Functions ------------------ */

export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  const ai = getGenAIClient();

  const prompt = `
You are an AI-powered Engineering Project Mentor.

Generate exactly 4 diverse engineering project ideas for:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Student Skill Level: ${prefs.skillLevel}

Rules for Academic Appropriateness:
- Beginner Level → Easy projects (Foundational, clear scope)
- Intermediate Level → Medium projects (Integrated systems, moderate complexity)
- Advanced Level → Hard projects (Research-based, high technical depth)

Return ONLY a JSON array of 4 objects.
Descriptions must be under 15 words.
Each suitability field should explain why this is perfect for a ${prefs.semester} student.
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
  const ai = getGenAIClient();

  const prompt = `
Act as a Senior Engineering Architect and Project Mentor. 
Provide a comprehensive yet scannable blueprint for the project: "${summary.title}"

Context: ${summary.shortDescription}
Semester: ${prefs.semester} (${prefs.branch})
Level: ${prefs.skillLevel}

Return a structured JSON object including:
- title: The project title.
- intro: A supportive 1-line intro.
- fullDescription: A clear project objective (max 40 words).
- techStack: Array of objects {category: string, items: string[]} (Practical, student-friendly tech).
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
