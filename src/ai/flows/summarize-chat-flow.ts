
'use server';
/**
 * @fileOverview An AI flow to summarize chat conversations.
 *
 * - summarizeChat - A function that handles the chat summarization.
 * - SummarizeChatInput - The input type for the summarizeChat function.
 * - SummarizeChatOutput - The return type for the summarizeChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeChatInputSchema = z.object({
  messages: z
    .array(z.string())
    .describe('An array of chat message texts to be summarized.'),
});
export type SummarizeChatInput = z.infer<typeof SummarizeChatInputSchema>;

const SummarizeChatOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat conversation.'),
});
export type SummarizeChatOutput = z.infer<typeof SummarizeChatOutputSchema>;

export async function summarizeChat(
  input: SummarizeChatInput
): Promise<SummarizeChatOutput> {
  return summarizeChatFlow(input);
}

const summaryPrompt = ai.definePrompt({
  name: 'summarizeChatPrompt',
  input: {schema: SummarizeChatInputSchema},
  output: {schema: SummarizeChatOutputSchema},
  prompt: `Please provide a concise summary of the following chat conversation.
Focus on the main topics and key takeaways.

Conversation:
{{#each messages}}
- {{{this}}}
{{/each}}
`,
});

const summarizeChatFlow = ai.defineFlow(
  {
    name: 'summarizeChatFlow',
    inputSchema: SummarizeChatInputSchema,
    outputSchema: SummarizeChatOutputSchema,
  },
  async (input: SummarizeChatInput) => {
    if (input.messages.length === 0) {
      return {summary: 'There are no messages to summarize.'};
    }
    const {output} = await summaryPrompt(input);
    return output!;
  }
);
