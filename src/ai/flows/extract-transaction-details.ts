'use server';

/**
 * @fileOverview Extracts structured transaction details from a raw text message using AI.
 * - extractTransactionDetails - A function that parses a message to fill in transaction form fields.
 * - ExtractTransactionDetailsInput - The input type for the function.
 * - ExtractTransactionDetailsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const ExtractTransactionDetailsInputSchema = z.object({
  message: z.string().describe('The raw text message containing transaction details.'),
});
export type ExtractTransactionDetailsInput = z.infer<typeof ExtractTransactionDetailsInputSchema>;

const ExtractTransactionDetailsOutputSchema = z.object({
  datetime: z.string().datetime({ message: "Invalid datetime string. Must be in ISO 8601 format." }).optional().describe("The date and time of the transaction, if available. Format as an ISO 8601 string (e.g., '2023-10-31T15:45:00.000Z')."),
  transactionType: z.enum(['sent', 'received']).optional().describe("The type of transaction from the message author's perspective. 'sent' if they sent money, 'received' if they received money."),
  error: z.string().optional(),
});
export type ExtractTransactionDetailsOutput = z.infer<typeof ExtractTransactionDetailsOutputSchema>;


export async function extractTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ExtractTransactionDetailsOutput> {
  try {
    const result = await extractTransactionDetailsFlow(input);
    // Ensure that even if the flow returns nothing, we send a valid object.
    return result || { error: "AI did not return a valid output." };
  } catch (e: any) {
    console.error("Error running Genkit flow:", e);
    return { error: e.message || "An unknown error occurred during extraction." };
  }
}

const prompt = ai.definePrompt({
    name: 'extractTransactionDetailsPrompt',
    input: { schema: ExtractTransactionDetailsInputSchema },
    output: { schema: ExtractTransactionDetailsOutputSchema },
    prompt: `You are an expert system that performs Named Entity Recognition (NER). Extract the following entities from this transaction message and return as a JSON object with ONLY these keys: datetime, transactionType.
- datetime: An ISO 8601 string.
- transactionType: Must be either "sent" or "received" from the message author's perspective.

If a value is not present, omit the key from the JSON object.

Message: """{{message}}"""`
});

const extractTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFlow',
    inputSchema: ExtractTransactionDetailsInputSchema,
    outputSchema: ExtractTransactionDetailsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
