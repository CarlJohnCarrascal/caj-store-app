'use server';

/**
 * @fileOverview Extracts structured transaction details from a raw text message using AI.
 * - extractTransactionDetails - A function that parses a message to fill in transaction form fields.
 * - ExtractTransactionDetailsInput - The input type for the function.
 * - ExtractTransactionDetailsOutput - The return type for the function.
 */

import { z } from 'zod';

const ExtractTransactionDetailsInputSchema = z.object({
  message: z.string().describe('The raw text message containing transaction details.'),
});
export type ExtractTransactionDetailsInput = z.infer<typeof ExtractTransactionDetailsInputSchema>;

// The output schema should also allow for error fields for better client-side handling.
const ExtractTransactionDetailsOutputSchema = z.object({
  datetime: z.string().datetime({ message: "Invalid datetime string. Must be in ISO 8601 format." }).optional().describe("The date and time of the transaction, if available. Format as an ISO 8601 string (e.g., '2023-10-31T15:45:00.000Z')."),
  transactionType: z.enum(['sent', 'received']).optional().describe("The type of transaction from the message author's perspective. 'sent' if they sent money, 'received' if they received money."),
  amount: z.coerce.number().optional().describe("The numerical amount of the transaction."),
  accountName: z.string().optional().describe("The full name of the other party in the transaction."),
  accountNumber: z.string().optional().describe("The account number (like a phone number for e-wallets) of the other party."),
  balance: z.coerce.number().optional().describe("The remaining balance after the transaction, if mentioned."),
  reference: z.string().optional().describe("The reference number or tracking code for the transaction."),
  paymentMethod: z.enum(['Gcash', 'Maya', 'Other']).optional().describe("The payment platform used, like GCash or Maya."),
  error: z.string().optional(),
  raw: z.any().optional(),
});
export type ExtractTransactionDetailsOutput = z.infer<typeof ExtractTransactionDetailsOutputSchema>;


export async function extractTransactionDetails(
  input: ExtractTransactionDetailsInput
): Promise<ExtractTransactionDetailsOutput> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey === "your_google_api_key_here") {
        console.error("GOOGLE_API_KEY is not set in the environment variables.");
        return { error: "Server configuration error: Missing Google API Key." };
    }
    
    // Using gemini-1.5-flash as it's a valid and recommended model for this task.
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are an expert system that performs Named Entity Recognition (NER). Extract the following entities from this transaction message and return as a JSON object with ONLY these keys: datetime, transactionType, amount, accountName, accountNumber, balance, reference, paymentMethod.
- datetime: An ISO 8601 string.
- transactionType: Must be either "sent" or "received" from the message author's perspective.
- amount: Must be a number.
- paymentMethod: Must be 'Gcash', 'Maya', or 'Other'.
If a value is not present, omit the key from the JSON object.

Message: """${input.message}"""`

    const body = {
        contents: [ { parts: [ { text: prompt } ] } ],
        generationConfig: {
            response_mime_type: "application/json",
        }
    };

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error("Gemini API Error Response:", errorBody);
            throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!content) {
          console.error("No content returned from Gemini", data);
          return { error: "No content returned from AI.", raw: data };
        }
        
        const parsedContent = JSON.parse(content);
        
        const validation = ExtractTransactionDetailsOutputSchema.safeParse(parsedContent);
        if (validation.success) {
            return validation.data;
        } else {
            console.error("Zod validation error after Gemini parsing:", validation.error.flatten());
            return { error: "AI returned data in an unexpected format.", raw: parsedContent };
        }

    } catch (e: any) {
        console.error("Error calling or parsing Gemini response:", e);
        return { error: e.message || "An unknown error occurred during extraction." };
    }
}
