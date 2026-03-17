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

// This type is what the component will receive.
export type ExtractTransactionDetailsOutput = {
  data?: any; // The parsed JSON data
  error?: string;
  raw?: string; // The raw string from the AI
  usage?: any;
};

export async function extractTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ExtractTransactionDetailsOutput> {
  try {
    const result = await extractTransactionDetailsFlow(input);
    if (!result.text) {
      return { error: "AI did not return a response.", raw: "", usage: result.usage };
    }
    
    try {
      // The AI might still wrap the response in markdown, let's strip it.
      const cleanedResult = result.text.replace(/^```json\n|```$/g, '').trim();
      const parsedData = JSON.parse(cleanedResult);
      return { data: parsedData, raw: cleanedResult, usage: result.usage };
    } catch (e) {
      return { error: "Failed to parse AI response as JSON.", raw: result.text, usage: result.usage };
    }
  } catch (e: any) {
    console.error("Error running Genkit flow:", e);
    return { error: e.message || "An unknown error occurred during extraction.", raw: "" };
  }
}

const prompt = ai.definePrompt({
    name: 'extractTransactionDetailsPrompt',
    input: { schema: ExtractTransactionDetailsInputSchema },
    prompt: `You are an expert data extraction assistant. Your task is to accurately extract specific pieces of information from SMS notifications about financial transactions.

**Instructions:**
1.  Read the provided SMS carefully.
2.  Extract the following fields: \`datetime\`, \`transactionType\`, \`reference\`, \`accountName\`, \`accountNumber\`, \`balance\`, \`amount\`.
3.  **Output the result as a JSON object ONLY. Do not include any other text or markdown formatting like \`\`\`json.**
4.  If a field is not found in the SMS, omit it from the JSON.
5.  Prioritize the earliest date/time mentioned for \`datetime\` and return it in ISO 8601 format with PHT timezone (e.g., yyyy-mm-ddThh:mm:ss+08:00).
6.  For \`amount\` and \`balance\`, extract the numeric value only.
7.  For \`accountName\`, identify the name of the sender/receiver of the transaction.
8.  For \`accountNumber\`, identify the phone number associated with the \`accountName\`. If the source is a company without an explicit phone number in the SMS, use "N/A".
9. For \`transactionType\`, determine if the message indicates that money was 'sent' or 'received'.

**Examples:**

**SMS Input 1:**
22 June 2025, 05:59 PM Express Send Notification You have received PHP 1000.00 of GCash from ME******E G. +639985868784 w/ MSG: . Your new balance is PHP 14992.63. Ref. No. 2029933342823.

**JSON Output 1:**
{
  "datetime": "2025-06-22T17:59:00+08:00",
  "transactionType": "received",
  "reference": "2029933342823",
  "accountName": "ME******E G.",
  "accountNumber": "+639985868784",
  "balance": 14992.63,
  "amount": 1000.00
}

**SMS Input 2:**
21 June 2025, 04:47 PM Over-the-Counter Cash In Limit Reminder You have reached your monthly limit for free over-the-counter cash ins. Cashing in at over-the-counter outlets is free until you reach P8,000.00 each month. After reaching this limit, a service fee of 2% will be deducted each time you cash in. Please see the details of your transaction below: You have received P2,474.01 of GCash from Philippine Seven Corporation with MSG - PSC Cashin. A 2% service fee amounting to P50.49 has been deducted from your wallet. Your new balance is P10,047.63 Sat Jun 21 16:47:48 GMT+08:00 2025. Ref no. 8029898986712.

**JSON Output 2:**
{
  "datetime": "2025-06-21T16:47:48+08:00",
  "transactionType": "received",
  "reference": "8029898986712",
  "accountName": "Philippine Seven Corporation",
  "accountNumber": "N/A",
  "balance": 10047.63,
  "amount": 2474.01
}

**SMS Input 3:**
19 June 2025, 09:20 AM Express Send Notification You have sent PHP 1000.00 to EM***N S. +639074053933 on 06-19-2025 09:20 AM with MSG: . Your new balance is PHP 3723.62. Ref. No. 8029822076869.

**JSON Output 3:**
{
  "datetime": "2025-06-19T09:20:00+08:00",
  "transactionType": "sent",
  "reference": "8029822076869",
  "accountName": "EM***N S.",
  "accountNumber": "+639074053933",
  "balance": 3723.62,
  "amount": 1000.00
}

Now, extract the entities from the following message.

SMS: """{{message}}"""`,
});

const extractTransactionDetailsFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFlow',
    inputSchema: ExtractTransactionDetailsInputSchema,
    outputSchema: z.object({ text: z.string(), usage: z.any() }),
  },
  async (input) => {
    const response = await prompt(input);
    return { text: response.text, usage: response.usage };
  }
);
