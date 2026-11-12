import { z } from 'zod'

/** `unknown` = the profile is missing a field a hard rule needs (docs/eligibility-engine.md). */
export const MATCH_STATES = ['eligible', 'almost', 'not', 'unknown'] as const
export const RULE_RESULTS = ['met', 'notMet', 'near', 'unknown'] as const

/** One rule, explained: what it asks for, how the student did, and a plain-language line. */
export const RuleReasonSchema = z.object({
  rule: z.string(),
  result: z.enum(RULE_RESULTS),
  text: z.string(),
})

/** What evaluate() returns for one student and one scheme. */
export const MatchResultSchema = z.object({
  state: z.enum(MATCH_STATES),
  score: z.number().int().min(0).max(100),
  reasons: z.array(RuleReasonSchema),
  /** The one line shown on cards. */
  reason: z.string(),
})

/** The short form sent with every scheme in the API. */
export const MatchSummarySchema = MatchResultSchema.pick({ state: true, score: true, reason: true })

export type MatchState = (typeof MATCH_STATES)[number]
export type RuleResult = (typeof RULE_RESULTS)[number]
export type RuleReason = z.infer<typeof RuleReasonSchema>
export type MatchResult = z.infer<typeof MatchResultSchema>
export type MatchSummary = z.infer<typeof MatchSummarySchema>
