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
  datetime: z.string().datetime({ message: "Invalid datetime string. Must be in ISO 8601 format." }).optional().describe("The date and time of the transaction in ISO 8601 format (e.g., '2023-10-31T15:45:00.000Z')."),
  transactionType: z.enum(['sent', 'received']).optional().describe("The type of transaction from the message author's perspective."),
  amount: z.number().optional().describe("The transaction amount."),
  accountName: z.string().optional().describe("The name of the other party in the transaction."),
  accountNumber: z.string().optional().describe("The account number or phone number of the other party."),
  balance: z.number().optional().describe("The new balance after the transaction."),
  reference: z.string().optional().describe("The transaction reference number."),
});


// This type is what the component will receive. It includes a possible error property.
export type ExtractTransactionDetailsOutput = z.infer<typeof ExtractTransactionDetailsOutputSchema> & {
  error?: string;
};

export async function extractTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ExtractTransactionDetailsOutput> {
  try {
    const result = await extractTransactionDetailsFlow(input);
    // Ensure that even if the flow returns nothing, we send a valid object.
    console.log("Extracted Details:", result);
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
    prompt: `You are an expert data extraction assistant. Your task is to accurately extract specific pieces of information from SMS notifications about financial transactions.

**Instructions:**
1.  Read the provided SMS carefully.
2.  Extract the following fields: \`datetime\`, \`transactionType\`, \`reference\`, \`accountName\`, \`accountNumber\`, \`balance\`, \`amount\`.
3.  **Output the result as a JSON object.**
4.  If a field is not found in the SMS, omit it from the JSON.
5.  Prioritize the earliest date/time mentioned for \`datetime\` and return it in ISO 8601 format.
6.  For \`amount\` and \`balance\`, extract the numeric value only.
7.  For \`accountName\`, identify the name of the sender/receiver of the transaction.
8.  For \`accountNumber\`, identify the phone number associated with the \`accountName\`. If the source is a company without an explicit phone number in the SMS, use "N/A".
9. For \`transactionType\`, determine if the message indicates that money was 'sent' or 'received'.

**Field Definitions & Extraction Hints:**
*   **datetime**: The full date and time of the SMS or transaction. (e.g., "22 June 2025, 05:59 PM"). Return in ISO 8601 format.
*   **transactionType**: The type of transaction, must be either "sent" or "received".
*   **reference**: The transaction reference number. (Look for "Ref. No." or "Ref no.")
*   **accountName**: The name of the party the transaction is with. (Look for "from X" or "to X")
*   **accountNumber**: The phone number of the \`accountName\`. (Look for "+63...")
*   **balance**: The new balance after the transaction. (Look for "Your new balance is PHP X"). Return a number.
*   **amount**: The specific amount of the transaction. (Look for "received PHP X" or "received P X"). Return a number.

**Examples:**

**SMS Input 1:**
22 June 2025, 05:59 PM Express Send Notification You have received PHP 1000.00 of GCash from ME******E G. +639985868784 w/ MSG: . Your new balance is PHP 14992.63. Ref. No. 2029933342823.

**JSON Output 1:**
\`\`\`json
{
  "datetime": "2025-06-22T17:59:00.000Z",
  "transactionType": "received",
  "reference": "2029933342823",
  "accountName": "ME******E G.",
  "accountNumber": "+639985868784",
  "balance": 14992.63,
  "amount": 1000.00
}
\`\`\`

Now, extract the entities from the following message.

SMS: """{{message}}"""`,
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
