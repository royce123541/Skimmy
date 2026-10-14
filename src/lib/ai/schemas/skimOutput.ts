import { z } from 'zod'

const Refs = z
  .array(z.string())
  .describe('Refs such as "m12" of the messages that support this item')

/**
 * What the model must return (ADR 0003). Written for the strictest provider dialect:
 * every property required, "missing" expressed as null, no extra properties.
 */
export const SkimOutputSchema = z.strictObject({
  tldr: z.string().describe('At most two sentences on what matters most to You'),
  highlights: z.array(z.strictObject({ text: z.string(), refs: Refs })),
  actionItems: z.array(
    z.strictObject({
      task: z.string(),
      owner: z.string().nullable(),
      ownerIsMe: z.boolean(),
      due: z.string().nullable().describe('ISO 8601 date-time with offset, or null'),
      refs: Refs,
    }),
  ),
  questionsForMe: z.array(z.strictObject({ text: z.string(), refs: Refs })),
  decisions: z.array(z.strictObject({ text: z.string(), refs: Refs })),
  events: z.array(
    z.strictObject({
      title: z.string(),
      start: z
        .string()
        .describe('ISO 8601 date-time with offset, or a YYYY-MM-DD date when allDay is true'),
      end: z.string().nullable().describe('Same format as start, or null if not stated'),
      allDay: z.boolean(),
      location: z.string().nullable(),
      certainty: z
        .enum(['confirmed', 'proposed'])
        .describe('confirmed only when the group agreed on this date and time'),
      refs: Refs,
    }),
  ),
})

export type SkimOutput = z.infer<typeof SkimOutputSchema>

/**
 * The output schema as plain JSON Schema for provider structured-output modes.
 *
 * @returns JSON Schema without the `$schema` marker, which some providers reject.
 */
export function skimOutputJsonSchema(): Record<string, unknown> {
  const { $schema: _marker, ...schema } = z.toJSONSchema(SkimOutputSchema)
  return schema
}
