import { UserPreferences, ProjectSummary, ProjectDeepDive, SkillLevel } from "../types.ts";

/**
 * Robustly parses and repairs JSON from the proxy response.
 */
function robustJsonParse(text: string): any {
  if (!text) throw new Error("The engine returned an empty response.");
  
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
 * Unified fetcher for the server-side Gemini proxy.
 */
async function callGeminiProxy(prompt: string, task: string): Promise<string> {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt, task }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Proxy request failed with status ${response.status}`);
  }

  const result = await response.json();
  // Expecting { text: "..." } from the server proxy
  return result.text || "";
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
 * Generates tailored project ideas based on student preferences via backend proxy.
 */
export async function generateProjectSummaries(
  prefs: UserPreferences
): Promise<ProjectSummary[]> {
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
- id: string
- title: string
- shortDescription: string (max 12 words)
- difficulty: string (must be "${targetDifficulty}")
- suitability: string
`;

  const responseText = await callGeminiProxy(prompt, "generate_summaries");
  const parsed = robustJsonParse(responseText);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Generates a deep-dive project roadmap and viva preparation guide via backend proxy.
 */
export async function generateProjectDeepDive(
  summary: ProjectSummary,
  prefs: UserPreferences
): Promise<ProjectDeepDive> {
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

  const responseText = await callGeminiProxy(prompt, "generate_deep_dive");
  return robustJsonParse(responseText);
}