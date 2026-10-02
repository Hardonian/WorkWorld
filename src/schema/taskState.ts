import { z } from "zod";

export const CommandRecord = z.object({
  cmd: z.string(),
  exitCode: z.number().int(),
  observed: z.string().optional(),
});

export const Attempt = z.object({
  timestamp: z.string(),
  commands: z.array(CommandRecord),
  evidencePaths: z.array(z.string()),
  observation: z.string(),
});

export const Milestone = z.object({
  id: z.string().regex(/^M\d{1,2}$/),
  title: z.string().min(1),
  status: z.enum(["pending", "in_progress", "passed", "failed", "blocked_external"]),
  prerequisites: z.array(z.string()),
  attempts: z.array(Attempt),
  manualJudgment: z.string().nullable(),
  blockers: z.array(z.string()),
  nextAction: z.string(),
});

export const ExternalBlocker = z.object({
  id: z.string(),
  kind: z.enum(["hosted_config", "paid_provider", "human_governance", "other"]),
  summary: z.string(),
  openedAt: z.string(),
  status: z.enum(["open", "closed"]),
});

export const TaskState = z.object({
  schemaVersion: z.literal(1),
  project: z.string(),
  updatedAt: z.string(),
  codeRevision: z.object({
    branch: z.string(),
    commit: z.string().nullable(),
    note: z.string().optional(),
  }),
  milestones: z.array(Milestone).min(1),
  externalBlockers: z.array(ExternalBlocker),
  pendingUncommitted: z.array(z.string()),
});

export type TaskStateT = z.infer<typeof TaskState>;
