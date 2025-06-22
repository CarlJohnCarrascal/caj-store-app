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
  amount: z.coerce.number().optional().describe('The transaction amount.'),
  accountName: z.string().optional().describe("The sender/receiver's account name."),
  accountNumber: z.string().optional().describe("The sender/receiver's account number."),
  balance: z.coerce.number().optional().describe("The new balance mentioned in the message."),
  reference: z.string().optional().describe('The transaction reference number.'),
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
    prompt: `You are an expert at extracting structured data from GCash transaction messages.
Analyze the user-provided SMS and extract the following entities: datetime, transactionType, amount, accountName, accountNumber, balance, and reference.
The transactionType should be 'sent' if the message indicates money was sent, and 'received' if money was received.
The datetime should be a valid ISO 8601 string.
The amount and balance should be numbers, without any currency symbols or commas.
If a field is not present in the message, omit it from the JSON output.

Here are some examples:

---
SMS: """16 June 2025, 06:06 PM Express Send Notification You have received PHP 200.00 of GCash from MA****N C. +639665377261 w/ MSG: . Your new balance is PHP 9466.67. Ref. No. 0029743073420."""
JSON:
{
  "datetime": "2025-06-16T18:06:00.000Z",
  "transactionType": "received",
  "amount": 200.00,
  "accountName": "MA****N C.",
  "accountNumber": "+639665377261",
  "balance": 9466.67,
  "reference": "0029743073420"
}
---
SMS: """19 June 2025, 09:20 AM Express Send Notification You have sent PHP 1000.00 to EM***N S. +639074053933 on 06-19-2025 09:20 AM with MSG: . Your new balance is PHP 3723.62. Ref. No. 8029822076869."""
JSON:
{
  "datetime": "2025-06-19T09:20:00.000Z",
  "transactionType": "sent",
  "amount": 1000.00,
  "accountName": "EM***N S.",
  "accountNumber": "+639074053933",
  "balance": 3723.62,
  "reference": "8029822076869"
}
---
SMS: """21 June 2025, 04:47 PM Over-the-Counter Cash In Limit Reminder You have reached your monthly limit for free over-the-counter cash ins.
Cashing in at over-the-counter outlets is free until you reach P8,000.00 each month. After reaching this limit, a service fee of 2% will be deducted each time you cash in. Please see the details of your transaction below:
You have received P2,474.01 of GCash from Philippine Seven Corporation with MSG - PSC Cashin. A 2% service fee amounting to P50.49 has been deducted from your wallet. Your new balance is P10,047.63 Sat Jun 21 16:47:48 GMT+08:00 2025. Ref no. 8029898986712."""
JSON:
{
  "datetime": "2025-06-21T16:47:48.000Z",
  "transactionType": "received",
  "amount": 2474.01,
  "accountName": "Philippine Seven Corporation",
  "balance": 10047.63,
  "reference": "8029898986712"
}
---

Now, extract the entities from the following message.

SMS: """{{message}}"""`
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
