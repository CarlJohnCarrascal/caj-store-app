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
  prompt: `You are an intelligent data entry assistant for a small business. Your task is to extract transaction details from a raw text message provided by a user. The user is likely pasting a message from their **customer's** transaction confirmation.

Your perspective should be that of the **business**. Analyze the following message and extract the relevant information into the specified JSON format.

- **transactionType**: Determine if this is a 'Cash In' (money received by the business) or 'Cash Out' (money sent by the business).
  - If the message says "You have sent" or "You paid", it means the **customer sent money to the business**. This is a **'Cash In'**.
  - If the message says "You have received", it means the **customer received money from the business**. This is a **'Cash Out'**.
- **customerName**: Identify the name of the customer or person involved. This is often the name associated with the account in the message.
- **amount**: Find the monetary value of the transaction.
- **paymentMethod**: If mentioned, identify the service used (e.g., GCash, Maya).
- **reference**: Look for any reference or transaction ID.
- **accountName**: The name associated with the e-wallet/bank account in the message.
- **accountNumber**: The number of the e-wallet/bank account (like a phone number for e-wallets) in the message.
- **datetime**: Extract the full date and time of the transaction. Convert it to a standard ISO 8601 format (e.g., '2023-10-31T15:45:00.000Z').

If a piece of information is not present, omit the field from the output.

Message:
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
