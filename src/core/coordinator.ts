import { validateAgentId, validateModelId, validateSkillId, validateVariantId } from "./config.ts";
import { recommendSkill, type SkillCandidate } from "./skill-catalog.ts";
import type { CoordinatorConfig, InterviewCheckpoint, InterviewTranscript, InterviewTurn } from "./types.ts";
export type { InterviewCheckpoint, InterviewTranscript, InterviewTurn } from "./types.ts";

export type InterviewMode = "create" | "modify";

export interface CoordinatorPrompt {
  system: string;
  message: string;
  coordinator: CoordinatorConfig;
  signal: AbortSignal;
  onProgress?: (text: string) => void;
}

export interface CoordinatorSession {
  prompt(input: CoordinatorPrompt): Promise<string>;
}

export type InstalledSkillInput = string | SkillCandidate;

const INTERVIEW_SYSTEM_PROMPT = "Return one strict JSON object with exactly these fields: question, quickReplies, and checkpoint. Ask one question per turn. quickReplies must contain 2 to 4 short strings. checkpoint contains only safe draft fields id, description, operations, model, effort, skills, pendingSkills, and recommendation. Do not include permissions, systemPrompt, Markdown, or commentary.";

export function buildInterviewPrompt(input: {
  transcript: InterviewTranscript;
  checkpoint: InterviewCheckpoint;
  installedSkills: readonly InstalledSkillInput[];
  mode?: InterviewMode;
}): Pick<CoordinatorPrompt, "system" | "message"> {
  return {
    system: INTERVIEW_SYSTEM_PROMPT,
    message: [
      `Mode: ${input.mode ?? "create"}`,
      `Installed skills: ${JSON.stringify(input.installedSkills)}`,
      `Transcript: ${JSON.stringify(input.transcript)}`,
      `Checkpoint: ${JSON.stringify(input.checkpoint)}`,
    ].join("\n"),
  };
}

function interviewCandidate(response: string): unknown {
  const normalizedResponse = response.trim();
  const fenced = normalizedResponse.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  const firstBrace = normalizedResponse.indexOf("{");
  const lastBrace = normalizedResponse.lastIndexOf("}");
  return JSON.parse(fenced ?? (firstBrace >= 0 && lastBrace > firstBrace ? normalizedResponse.slice(firstBrace, lastBrace + 1) : normalizedResponse));
}

function parseInterviewCheckpoint(value: unknown): InterviewCheckpoint {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Interview turn checkpoint must be an object.");
  const raw = value as Record<string, unknown>;
  const allowed = new Set(["draft", "pendingSkills", "recommendation"]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error("Interview turn checkpoint contains unsafe fields.");
  if (!raw.draft || typeof raw.draft !== "object" || Array.isArray(raw.draft)) throw new Error("Interview turn checkpoint requires a safe draft.");
  const draft = raw.draft as Record<string, unknown>;
  const required = ["id", "description", "operations", "model", "effort", "skills"] as const;
  const textKeys = ["id", "description", "operations", "model", "effort"] as const;
  if (Object.keys(draft).some((key) => !required.includes(key as (typeof required)[number])) || textKeys.some((key) => typeof draft[key] !== "string")) throw new Error("Interview turn checkpoint has an invalid safe draft.");
  const pendingSkills = raw.pendingSkills;
  if (!Array.isArray(pendingSkills) || !pendingSkills.every((skill) => skill && typeof skill === "object" && typeof (skill as Record<string, unknown>).id === "string" && typeof (skill as Record<string, unknown>).rationale === "string")) throw new Error("Interview turn checkpoint has invalid pending skills.");
  const recommendation = raw.recommendation;
  if (recommendation !== undefined && (!recommendation || typeof recommendation !== "object" || typeof (recommendation as Record<string, unknown>).model !== "string" || typeof (recommendation as Record<string, unknown>).effort !== "string" || typeof (recommendation as Record<string, unknown>).rationale !== "string")) throw new Error("Interview turn checkpoint has an invalid model recommendation.");
  const skills = draft.skills;
  if (!Array.isArray(skills) || !skills.every((skill) => typeof skill === "string")) throw new Error("Interview turn checkpoint has invalid skills.");
  return {
    draft: {
      id: validateAgentId(draft.id as string),
      description: (draft.description as string).trim(),
      operations: (draft.operations as string).trim(),
      model: validateModelId(draft.model as string),
      effort: validateVariantId(draft.effort as string),
      skills: [...new Set(skills.map((skill) => validateSkillId(skill.trim())))],
    },
    pendingSkills: (pendingSkills as Array<{ id: string; rationale: string }>).map((skill) => ({ id: validateSkillId(skill.id.trim()), rationale: skill.rationale.trim() })),
    ...(recommendation === undefined ? {} : { recommendation: { model: validateModelId((recommendation as Record<string, unknown>).model as string), effort: validateVariantId((recommendation as Record<string, unknown>).effort as string), rationale: ((recommendation as Record<string, unknown>).rationale as string).trim() } }),
  };
}

function installedSkillCandidates(installedSkills: readonly InstalledSkillInput[]): SkillCandidate[] {
  return installedSkills.map((skill) => typeof skill === "string"
    ? { id: skill, name: skill, description: "", source: "installed" as const }
    : skill).filter((skill) => skill.source === "installed");
}

/** Keep only installed skill IDs in the draft; every other candidate remains pending in memory. */
export function normalizeInterviewCheckpoint(checkpoint: InterviewCheckpoint, installedSkills: readonly InstalledSkillInput[] = [], pendingFromCoordinator: readonly { id: string; rationale: string }[] = []): InterviewCheckpoint {
  const installed = installedSkillCandidates(installedSkills);
  const draftSkills: string[] = [];
  const pendingSkills: Array<{ id: string; rationale: string }> = [];
  const seenDraft = new Set<string>();
  const seenPending = new Set<string>();
  const addPending = (id: string, rationale: string) => {
    if (seenDraft.has(id) || seenPending.has(id)) return;
    seenPending.add(id);
    pendingSkills.push({ id, rationale: rationale.trim() || `Skill “${id}” remains pending until after approval.` });
  };
  const addRequestedSkill = (requested: string, rationale?: string) => {
    const recommendation = recommendSkill(requested, installed, []);
    if ("candidate" in recommendation && recommendation.candidate.source === "installed") {
      const id = recommendation.candidate.id;
      if (!seenDraft.has(id)) {
        seenDraft.add(id);
        draftSkills.push(id);
      }
      return;
    }
    const id = validateSkillId(requested.trim());
    addPending(id, rationale ?? recommendation.rationale);
  };
  for (const skill of checkpoint.draft.skills) addRequestedSkill(skill);
  for (const skill of checkpoint.pendingSkills) addRequestedSkill(skill.id, skill.rationale);
  for (const skill of pendingFromCoordinator) addRequestedSkill(skill.id, skill.rationale);

  return {
    draft: { ...checkpoint.draft, skills: draftSkills },
    pendingSkills,
    ...(checkpoint.recommendation === undefined ? {} : { recommendation: { ...checkpoint.recommendation } }),
  };
}

export function parseInterviewTurn(response: string, fallbackCheckpoint: InterviewCheckpoint, options: { fallback?: boolean } = {}): InterviewTurn {
  try {
    const raw = interviewCandidate(response);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Interview turn must be an object.");
    const payload = raw as Record<string, unknown>;
    const allowed = new Set(["question", "quickReplies", "checkpoint"]);
    if (Object.keys(payload).some((key) => !allowed.has(key)) || typeof payload.question !== "string" || !payload.question.trim() || !Array.isArray(payload.quickReplies) || payload.quickReplies.length < 2 || payload.quickReplies.length > 4 || !payload.quickReplies.every((reply) => typeof reply === "string" && reply.trim())) throw new Error("Interview turn must use the strict one-question shape.");
    return { question: payload.question.trim(), quickReplies: payload.quickReplies.map((reply) => (reply as string).trim()), checkpoint: parseInterviewCheckpoint(payload.checkpoint) };
  } catch (error) {
    if (options.fallback) return { question: "We kept your last checkpoint. Please retry this turn.", quickReplies: ["Retry", "Continue later"], checkpoint: fallbackCheckpoint };
    throw new Error(`Coordinator interview turn is invalid: ${error instanceof Error ? error.message : "strict JSON required"}`);
  }
}

export async function runInterviewTurn(input: {
  session: CoordinatorSession;
  coordinator: CoordinatorConfig;
  transcript: InterviewTranscript;
  checkpoint: InterviewCheckpoint;
  installedSkills: readonly InstalledSkillInput[];
  signal: AbortSignal;
  mode?: InterviewMode;
  onProgress?: (text: string) => void;
}): Promise<InterviewTurn> {
  if (input.signal.aborted) throw new Error("Coordinator interview was cancelled.");
  const prompt = buildInterviewPrompt(input);
  const response = await new Promise<string>((resolve, reject) => {
    const cancel = () => reject(new Error("Coordinator interview was cancelled."));
    input.signal.addEventListener("abort", cancel, { once: true });
    void input.session.prompt({ ...prompt, coordinator: input.coordinator, signal: input.signal, onProgress: input.onProgress })
      .then(resolve, reject)
      .finally(() => input.signal.removeEventListener("abort", cancel));
  });
  if (input.signal.aborted) throw new Error("Coordinator interview was cancelled.");
  const turn = parseInterviewTurn(response, input.checkpoint, { fallback: true });
  return { ...turn, checkpoint: normalizeInterviewCheckpoint(turn.checkpoint, input.installedSkills) };
}
