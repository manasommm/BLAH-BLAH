'use server';
/**
 * @fileOverview An AI flow to suggest replies in a chat conversation.
 *
 * - suggestReplies - A function that suggests replies based on conversation history.
 * - SuggestRepliesInput - The input type for the suggestReplies function.
 * - SuggestRepliesOutput - The return type for the suggestReplies function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRepliesInputSchema = z.object({
  messages: z
    .array(z.string())
    .describe('An array of the last few chat message texts in the conversation.'),
});
export type SuggestRepliesInput = z.infer<typeof SuggestRepliesInputSchema>;

const SuggestRepliesOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .describe(
      'An array of up to 3 concise, relevant, and natural-sounding reply suggestions. Should be an empty array if no suggestions are appropriate.'
    ),
});
export type SuggestRepliesOutput = z.infer<typeof SuggestRepliesOutputSchema>;

export async function suggestReplies(
  input: SuggestRepliesInput
): Promise<SuggestRepliesOutput> {
  return suggestRepliesFlow(input);
}

const suggestionPrompt = ai.definePrompt({
  name: 'suggestRepliesPrompt',
  input: {schema: SuggestRepliesInputSchema},
  output: {schema: SuggestRepliesOutputSchema},
  prompt: `You are a helpful assistant that suggests replies in a chat conversation.
Based on the last few messages, provide up to 3 short, natural-sounding reply suggestions.
Keep the suggestions concise and relevant to the conversation.
If no reply seems appropriate or needed, return an empty array for the suggestions.

Conversation History:
{{#each messages}}
- {{{this}}}
{{/each}}
`,
});

const suggestRepliesFlow = ai.defineFlow(
  {
    name: 'suggestRepliesFlow',
    inputSchema: SuggestRepliesInputSchema,
    outputSchema: SuggestRepliesOutputSchema,
  },
  async (input: SuggestRepliesInput) => {
    if (input.messages.length === 0) {
      return {suggestions: []};
    }
    const {output} = await suggestionPrompt(input);
    return output!;
  }
);
