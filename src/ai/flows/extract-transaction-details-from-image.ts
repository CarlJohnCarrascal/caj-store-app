'use server';

/**
 * @fileOverview Extracts structured transaction details from an image using AI.
 * - extractTransactionDetailsFromImage - A function that parses an image to fill in transaction form fields.
 * - ExtractTransactionDetailsFromImageInput - The input type for the function.
 * - ExtractTransactionDetailsOutput - The return type for the function (shared with text extraction).
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { ExtractTransactionDetailsOutput } from './extract-transaction-details';

const ExtractTransactionDetailsFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "A photo of a transaction receipt or SMS, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTransactionDetailsFromImageInput = z.infer<typeof ExtractTransactionDetailsFromImageInputSchema>;


export async function extractTransactionDetailsFromImage(
  input: ExtractTransactionDetailsFromImageInput
): Promise<ExtractTransactionDetailsOutput> {
  try {
    const rawResult = await extractTransactionDetailsFromImageFlow(input);
    if (!rawResult) {
      return { error: "AI did not return a response.", raw: "" };
    }
    
    try {
      // The AI might still wrap the response in markdown, let's strip it.
      const cleanedResult = rawResult.replace(/^```json\n|```$/g, '').trim();
      const parsedData = JSON.parse(cleanedResult);
      return { data: parsedData, raw: cleanedResult };
    } catch (e) {
      return { error: "Failed to parse AI response as JSON.", raw: rawResult };
    }
  } catch (e: any) {
    console.error("Error running Genkit flow:", e);
    return { error: e.message || "An unknown error occurred during extraction.", raw: "" };
  }
}

const prompt = ai.definePrompt({
    name: 'extractTransactionDetailsFromImagePrompt',
    input: { schema: ExtractTransactionDetailsFromImageInputSchema },
    prompt: `You are an expert data extraction assistant. Your task is to accurately extract specific pieces of information from an image of an SMS notification about a financial transaction.

**Instructions:**
1.  Analyze the provided image carefully. It contains a financial transaction SMS.
2.  Extract the following fields: \`datetime\`, \`transactionType\`, \`reference\`, \`accountName\`, \`accountNumber\`, \`balance\`, \`amount\`.
3.  **Output the result as a JSON object ONLY. Do not include any other text or markdown formatting like \`\`\`json.**
4.  If a field is not found in the SMS, omit it from the JSON.
5.  Prioritize the earliest date/time mentioned for \`datetime\` and return it in ISO 8601 format.
6.  For \`amount\` and \`balance\`, extract the numeric value only.
7.  For \`accountName\`, identify the name of the sender/receiver of the transaction.
8.  For \`accountNumber\`, identify the phone number associated with the \`accountName\`. If the source is a company without an explicit phone number in the SMS, use "N/A".
9. For \`transactionType\`, determine if the message indicates that money was 'sent' or 'received'.

**Examples:**

**If the image shows this SMS:**
22 June 2025, 05:59 PM Express Send Notification You have received PHP 1000.00 of GCash from ME******E G. +639985868784 w/ MSG: . Your new balance is PHP 14992.63. Ref. No. 2029933342823.

**Your JSON Output should be:**
{
  "datetime": "2025-06-22T17:59:00.000Z",
  "transactionType": "received",
  "reference": "2029933342823",
  "accountName": "ME******E G.",
  "accountNumber": "+639985868784",
  "balance": 14992.63,
  "amount": 1000.00
}


Now, extract the entities from the following image.

Image: {{media url=imageDataUri}}`,
});

const extractTransactionDetailsFromImageFlow = ai.defineFlow(
  {
    name: 'extractTransactionDetailsFromImageFlow',
    inputSchema: ExtractTransactionDetailsFromImageInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const { text } = await prompt(input);
    return text;
  }
);
