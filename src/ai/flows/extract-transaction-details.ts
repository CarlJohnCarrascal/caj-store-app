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
  transactionType: z.enum(['Cash In', 'Cash Out']).optional().describe("The type of transaction. 'Cash In' for receiving money, 'Cash Out' for sending money."),
  customerName: z.string().optional().describe("The name of the customer or person involved in the transaction."),
  amount: z.coerce.number().optional().describe("The numerical amount of the transaction."),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']).optional().describe("The payment platform used, like GCash or Maya."),
  reference: z.string().optional().describe("The reference number or tracking code for the transaction."),
  accountName: z.string().optional().describe("The account name of the sender or receiver."),
  accountNumber: z.string().optional().describe("The account number (like a phone number for e-wallets) of the sender or receiver."),
  datetime: z.string().datetime({ message: "Invalid datetime string. Must be in ISO 8601 format." }).optional().describe("The date and time of the transaction, if available. Format as an ISO 8601 string (e.g., '2023-10-31T15:45:00.000Z')."),
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
  prompt: `You are an expert system that performs Named Entity Recognition (NER) to extract structured data from raw text. Your task is to analyze a transaction message and extract the following entities into the specified JSON format. The message is from the perspective of the **business's customer**.

- **transactionType**: Analyze the message to determine if it is a 'Cash In' (money received by the business) or 'Cash Out' (money sent by the business).
  - If the message says "You have sent", "You paid", or implies the customer sent money, this is a **'Cash In'** for the business.
  - If the message says "You have received", or implies the customer received money, this is a **'Cash Out'** for the business.

- **Named Entities to Extract**:
  - **customerName / accountName**: Identify the person's name or business name involved in the transaction. Use this for both \`customerName\` and \`accountName\`.
  - **amount**: Identify and extract the monetary value.
  - **paymentMethod**: Identify the payment service used (e.g., GCash, Maya).
  - **reference**: Extract any transaction ID, reference number, or tracking code.
  - **accountNumber**: Extract the associated account number, often a phone number for e-wallets.
  - **datetime**: Find the full date and time of the transaction. Convert it to a standard ISO 8601 format (e.g., '2023-10-31T15:45:00.000Z').

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
