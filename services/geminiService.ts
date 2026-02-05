import { UserPreferences, ProjectSummary, ProjectDeepDive, SkillLevel } from "../types.ts";

/**
 * Robustly parses and repairs JSON from a string.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("The engine returned an empty response.");
  
  let clean = text.trim();

  if (clean.startsWith("```")) {
    clean = clean.replace(/^```json\s*|\s*```$/g, "").replace(/^```\s*|\s*```$/g, "");
  }

  try {
    return JSON.parse(clean);
  } catch (e) {
    console.error("JSON Parse Error. Raw content:", text);
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
 * Generic caller for the server-side API.
 */
async function callGemini(prompt: string, config: any = {}): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, config }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to communicate with the architectural engine.");
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
You are a Senior Engineering Project Mentor. 
Generate exactly 4 unique project ideas for an engineering student:
- Semester: ${prefs.semester}
- Branch: ${prefs.branch}
- Domain: ${prefs.domain}
- Skill Level: ${prefs.skillLevel}

CRITICAL: Set the "difficulty" of ALL projects to strictly "${targetDifficulty}".

Output ONLY a JSON array of 4 objects with: id, title, shortDescription (max 12 words), difficulty (must be "${targetDifficulty}"), and suitability.
`;

  const responseText = await callGemini(prompt, {
    responseMimeType: "application/json",
    responseSchema: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          title: { type: "STRING" },
          shortDescription: { type: "STRING" },
          difficulty: { type: "STRING" },
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
Act as a Senior Project Architect. Provide a full technical blueprint for: "${summary.title}".
Context: ${prefs.branch} Engineering, Semester ${prefs.semester}. Difficulty: ${summary.difficulty}.

Return a JSON object with: title, intro, fullDescription, techStack (category/items), roadmap (week/task/details), resources (title/type/link), vivaPrep (questions, concepts, mistakes, evaluatorExpectations), presentationTips, and closing.
`;

  const responseText = await callGemini(prompt, {
    model: 'gemini-3-pro-preview', // Use pro for deep dives
    responseMimeType: "application/json"
  });

  return robustJsonParse(responseText);
}