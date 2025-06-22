'use server';

/**
 * @fileOverview Generates a transaction message using AI.
 * - generateTransactionMessage - A function that generates a transaction message.
 * - GenerateTransactionMessageInput - The input type for the generateTransactionMessage function.
 * - GenerateTransactionMessageOutput - The return type for the generateTransactionMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateTransactionMessageInputSchema = z.object({
  transactionType: z.string().describe("The type of transaction (e.g., 'Cash In', 'Cash Out')."),
  customerName: z.string().describe('The name of the customer or counterparty.'),
  amount: z.coerce.number().describe('The amount of the transaction.'),
  paymentMethod: z.string().describe('The method of payment (e.g., Gcash, Maya).'),
  reference: z.string().describe('The reference number for the transaction.'),
});
export type GenerateTransactionMessageInput = z.infer<typeof GenerateTransactionMessageInputSchema>;

const GenerateTransactionMessageOutputSchema = z.object({
  message: z.string().describe('The generated transaction message or note.'),
});
export type GenerateTransactionMessageOutput = z.infer<typeof GenerateTransactionMessageOutputSchema>;

export async function generateTransactionMessage(
  input: GenerateTransactionMessageInput
): Promise<GenerateTransactionMessageOutput> {
  return generateTransactionMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateTransactionMessagePrompt',
  input: {schema: GenerateTransactionMessageInputSchema},
  output: {schema: GenerateTransactionMessageOutputSchema},
  prompt: `You are an assistant creating a brief, clear note for a financial transaction.
Based on the following details, generate a concise message for the transaction record.
The message should be suitable for a "message" or "note" field.

For example, "Payment from {{customerName}} for services rendered." or "Cash out for supplier payment to {{customerName}}."

Transaction Details:
- Type: {{transactionType}}
- Customer/Counterparty: {{customerName}}
- Amount: ₱{{amount}}
- Payment Method: {{paymentMethod}}
- Reference: {{reference}}

Generate a short message based on these details.`,
});

const generateTransactionMessageFlow = ai.defineFlow(
  {
    name: 'generateTransactionMessageFlow',
    inputSchema: GenerateTransactionMessageInputSchema,
    outputSchema: GenerateTransactionMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
