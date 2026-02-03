import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/* ------------------ HELPERS ------------------ */

/**
 * Robustly parses JSON output from the model, handling markdown blocks and truncated responses.
 */
function robustJsonParse(text: string): any {
  let clean = text.trim();

  // Remove markdown code blocks if present
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "");
  }

  // Basic brace/bracket balancing to fix potential truncation
  let braceCount = 0;
  let bracketCount = 0;
  for (let char of clean) {
    if (char === '{') braceCount++;
    else if (char === '}') braceCount--;
    else if (char === '[') bracketCount++;
    else if (char === ']') bracketCount--;
  }

  while (braceCount > 0) { clean += '}'; braceCount--; }
  while (bracketCount > 0) { clean += ']'; bracketCount--; }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("Failed to parse JSON from model output:", clean);
    throw new Error("The AI returned architectural data that could not be processed. Please try again.");
  }
}

/* ------------------ PROJECT SUMMARIES ------------------ */

export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  // Instantiate inside the function to ensure process.env.API_KEY is latest
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
You are an AI-powered Engineering Project Mentor.

Generate exactly 4 diverse engineering project ideas for:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Student Skill Level: ${prefs.skillLevel}

STRICT ACADEMIC MAPPING:
- ${prefs.skillLevel} Level → Map to appropriate difficulty.

Return ONLY a JSON array of 4 objects.
Descriptions must be under 15 words.
Suitability field must explain why it's a perfect fit for a ${prefs.semester} semester project.
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
            difficulty: { type: Type.STRING, description: 'Easy, Medium, or Hard' },
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
Act as a Senior Engineering Architect. 
Provide a comprehensive yet scannable blueprint for the project: "${summary.title}"

Project Context: ${summary.shortDescription}
Academic Context: Semester ${prefs.semester}, ${prefs.branch}
Target Difficulty: ${summary.difficulty}

Return a structured JSON object including:
- title: The project title.
- intro: A supportive 1-line intro to reduce student anxiety.
- fullDescription: A technical yet clear project objective (max 40 words).
- techStack: Array of objects {category: string, items: string[]} using student-friendly, documented tools.
- roadmap: 6-8 weeks of milestones. Each item has week, task, and an array of 3 details.
- resources: Array of objects {title: string, type: string, link: string}.
- vivaPrep: {questions: string[], concepts: string[], mistakes: string[], evaluatorExpectations: string[]}.
- presentationTips: 3 punchy, actionable tips.
- closing: A motivating sign-off.

STRICT JSON ONLY. No preamble.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", // Use Pro for complex reasoning and roadmap generation
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
