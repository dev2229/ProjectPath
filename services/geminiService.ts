import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, ProjectSummary, ProjectDeepDive } from "../types.ts";

/* ------------------ HELPERS ------------------ */

/**
 * Robustly parses JSON output from the model, handling markdown blocks and potential truncation.
 */
function robustJsonParse(text: string): any {
  let clean = text.trim();

  // Remove markdown code blocks if present
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "");
  }

  // Basic brace/bracket balancing to fix potential truncation from the model
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
    throw new Error("The architectural engine returned data that could not be parsed. Please try a different domain or skill level.");
  }
}

/* ------------------ PROJECT SUMMARIES ------------------ */

export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  // Use process.env.API_KEY directly as required
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
You are an AI-powered Engineering Project Mentor for university students.

Generate exactly 4 diverse engineering project ideas for:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Student Skill Level: ${prefs.skillLevel}

ACADEMIC REQUIREMENTS:
- Projects must be relevant to the ${prefs.semester} semester curriculum for ${prefs.branch}.
- They should be scoped for a group of 3-4 students.
- Avoid trivial "Hello World" style projects or massive "Startup" level projects.
- Map ${prefs.skillLevel} level to appropriate academic complexity.

Return ONLY a JSON array of 4 objects.
Descriptions must be under 15 words.
Suitability field should reassure the student why this fits their current academic stage.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", // Upgraded to Pro for better STEM/Engineering reasoning
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
            difficulty: { type: Type.STRING, description: 'Easy or Medium' },
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
Act as a Senior Engineering Architect and Project Mentor. 
Provide a detailed, practical blueprint for the engineering project: "${summary.title}"

CONTEXT:
- Description: ${summary.shortDescription}
- Academic Stage: Semester ${prefs.semester}, ${prefs.branch}
- Difficulty Level: ${summary.difficulty}
- Skill Level: ${prefs.skillLevel}

INSTRUCTIONS:
1. Recommend a practical, student-friendly tech stack.
2. Create a week-wise execution roadmap (6-8 weeks) covering Planning, Dev, Testing, and Documentation.
3. Provide viva/evaluation preparation details including common questions and concept anchors.
4. Use motivating, supportive language to reduce student anxiety.

Return a structured JSON object. No markdown preamble.
`;

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview", // Pro model is essential for complex technical roadmaps
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
