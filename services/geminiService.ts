import { UserPreferences, ProjectSummary, ProjectDeepDive, SkillLevel } from "../types.ts";

/**
 * Robustly parses and repairs JSON from a string, handling potential AI formatting noise.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("The engine returned an empty response.");
  
  let clean = text.trim();

  // Strip Markdown markers if the model ignored the JSON output instruction
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "");
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw content:", text);
    // Attempt basic brace/bracket repair for truncated streams
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
      throw new Error("The blueprint data was received but malformed. Please re-generate.");
    }
  }
}

/**
 * Communicates with the secure API folder endpoint.
 */
async function callGeminiApi(prompt: string, config: any = {}): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, config }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API Error: ${response.status}`);
  }

  const result = await response.json();
  return result.text;
}

const getTargetDifficulty = (level: SkillLevel): string => {
  switch (level) {
    case SkillLevel.BEGINNER: return "Easy";
    case SkillLevel.INTERMEDIATE: return "Medium";
    case SkillLevel.ADVANCED: return "Hard";
    default: return "Medium";
  }
};

export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
  const targetDifficulty = getTargetDifficulty(prefs.skillLevel);

  const prompt = `
Generate exactly 4 unique engineering project ideas for:
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Skill Level: ${prefs.skillLevel}
- Current Semester: ${prefs.semester}

Rules:
1. Difficulty MUST be strictly "${targetDifficulty}".
2. Suitability must explain why this fits a ${prefs.skillLevel} student.
`;

  const responseText = await callGeminiApi(prompt, {
    model: 'gemini-3-flash-preview',
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          title: { type: "STRING" },
          shortDescription: { type: "STRING" },
          difficulty: { type: "STRING", enum: ["Easy", "Medium", "Hard"] },
          suitability: { type: "STRING" }
        },
        required: ["id", "title", "shortDescription", "difficulty", "suitability"]
      }
    }
  });

  const parsed = robustJsonParse(responseText);
  return Array.isArray(parsed) ? parsed : [];
}

export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
  const prompt = `
Provide a comprehensive technical roadmap for the project: "${summary.title}".
Student Profile: ${prefs.branch}, Sem ${prefs.semester}, ${summary.difficulty} difficulty.

Deliver a detailed blueprint including tech stack, 8-week roadmap, viva questions, and presentation strategy.
`;

  const responseText = await callGeminiApi(prompt, {
    model: 'gemini-3-pro-preview',
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        intro: { type: "STRING" },
        fullDescription: { type: "STRING" },
        techStack: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              category: { type: "STRING" },
              items: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["category", "items"]
          }
        },
        roadmap: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              week: { type: "STRING" },
              task: { type: "STRING" },
              details: { type: "ARRAY", items: { type: "STRING" } }
            },
            required: ["week", "task", "details"]
          }
        },
        resources: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              type: { type: "STRING" },
              link: { type: "STRING" }
            },
            required: ["title", "type", "link"]
          }
        },
        vivaPrep: {
          type: "OBJECT",
          properties: {
            questions: { type: "ARRAY", items: { type: "STRING" } },
            concepts: { type: "ARRAY", items: { type: "STRING" } },
            mistakes: { type: "ARRAY", items: { type: "STRING" } },
            evaluatorExpectations: { type: "ARRAY", items: { type: "STRING" } }
          },
          required: ["questions", "concepts", "mistakes", "evaluatorExpectations"]
        },
        presentationTips: { type: "ARRAY", items: { type: "STRING" } },
        closing: { type: "STRING" }
      },
      required: ["title", "intro", "fullDescription", "techStack", "roadmap", "vivaPrep", "presentationTips", "closing"]
    }
  });

  return robustJsonParse(responseText);
}