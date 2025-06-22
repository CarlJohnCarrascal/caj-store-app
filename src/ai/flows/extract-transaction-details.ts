'use server';

/**
 * @fileOverview Extracts structured transaction details from a raw text message using AI.
 * - extractTransactionDetails - A function that parses a message to fill in transaction form fields.
 * - ExtractTransactionDetailsInput - The input type for the function.
 * - ExtractTransactionDetailsOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractTransactionDetailsInputSchema = z.object({
  message: z.string().describe('The raw text message containing transaction details.'),
});
export type ExtractTransactionDetailsInput = z.infer<typeof ExtractTransactionDetailsInputSchema>;

const ExtractTransactionDetailsOutputSchema = z.object({
  datetime: z.string().datetime({ message: "Invalid datetime string. Must be in ISO 8601 format." }).optional().describe("The date and time of the transaction, if available. Format as an ISO 8601 string (e.g., '2023-10-31T15:45:00.000Z')."),
  transactionType: z.enum(['sent', 'received']).optional().describe("The type of transaction from the message author's perspective. 'sent' if they sent money, 'received' if they received money."),
  amount: z.coerce.number().optional().describe("The numerical amount of the transaction."),
  accountName: z.string().optional().describe("The full name of the other party in the transaction."),
  accountNumber: z.string().optional().describe("The account number (like a phone number for e-wallets) of the other party."),
  balance: z.coerce.number().optional().describe("The remaining balance after the transaction, if mentioned."),
  reference: z.string().optional().describe("The reference number or tracking code for the transaction."),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']).optional().describe("The payment platform used, like GCash or Maya."),
});
export type ExtractTransactionDetailsOutput = z.infer<typeof ExtractTransactionDetailsOutputSchema>;


export async function extractTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ExtractTransactionDetailsOutput> {
  return extractTransactionDetailsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractTransactionDetailsPrompt',
  input: {schema: ExtractTransactionDetailsInputSchema},
  output: {schema: ExtractTransactionDetailsOutputSchema},
  prompt: `You are an expert system that performs Named Entity Recognition (NER) to extract structured data from a raw transaction message. Your task is to analyze the message and extract the following entities into the specified JSON format.

- **transactionType**: Determine if money was 'sent' or 'received' from the perspective of the message author.
- **datetime**: Find the full date and time of the transaction. Convert it to a standard ISO 8601 format (e.g., '2023-10-31T15:45:00.000Z').
- **amount**: Identify and extract the monetary value.
- **accountName**: Identify the full name of the other person or business involved in the transaction.
- **accountNumber**: Extract the associated account number, often a phone number for e-wallets.
- **balance**: Extract the remaining account balance after the transaction, if mentioned.
- **reference**: Extract any transaction ID, reference number, or tracking code.
- **paymentMethod**: Identify the payment service used (e.g., GCash, Maya).

If a piece of information is not present in the message, omit its corresponding field from the output.

Message to analyze:
"{{message}}"`,
});

const extractTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFlow',
    inputSchema: ExtractTransactionDetailsInputSchema,
    outputSchema: ExtractTransactionDetailsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
