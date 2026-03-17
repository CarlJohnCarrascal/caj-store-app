'use server';

/**
 * @fileOverview Extracts structured transaction details from a PDF file using AI.
 * - extractCashioPdf - A function that parses a PDF to a list of transactions.
 * - ExtractCashioPdfInput - The input type for the function.
 * - ExtractCashioPdfOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { media, Part } from 'genkit/experimental/media';

const TransactionSchema = z.object({
  dateTime: z.string().describe("The full date and time of the transaction, e.g., '2025-11-01 12:20'"),
  description: z.string().describe('The transaction description.'),
  referenceNo: z.string().describe('The reference number.'),
  debit: z.number().optional().describe('The debit amount, if any.'),
  credit: z.number().optional().describe('The credit amount, if any.'),
  balance: z.number().describe('The balance after the transaction.'),
});

const ExtractCashioPdfOutputSchema = z.object({
    transactions: z.array(TransactionSchema),
});

export type PdfTransaction = z.infer<typeof TransactionSchema>;

export type ExtractCashioPdfInput = {
    pdfDataUri: string;
};

export type ExtractCashioPdfOutput = z.infer<typeof ExtractCashioPdfOutputSchema> & { usage?: any };


export async function extractCashioPdf(
  input: ExtractCashioPdfInput
): Promise<ExtractCashioPdfOutput> {
    return extractCashioPdfFlow(input);
}


const prompt = ai.definePrompt(
  {
    name: 'extractCashioPdfPrompt',
    input: { schema: z.object({ pdfDataUri: z.string() }) },
    output: { schema: ExtractCashioPdfOutputSchema },
    prompt: `You are an expert data extraction tool. Your task is to extract all transactions from the provided PDF document which is a GCash Transaction History.

    Analyze the document and extract every single transaction row into a structured JSON array.
    
    Each transaction object in the array should have the following fields:
    - dateTime: The full date and time of the transaction (e.g., '2025-11-01 12:20').
    - description: The full text from the 'Description' column.
    - referenceNo: The string from the 'Reference No.' column.
    - debit: The numeric value from the 'Debit' column. If empty, omit the field.
    - credit: The numeric value from the 'Credit' column. If empty, omit the field.
    - balance: The numeric value from the 'Balance' column.
    
    Do not include the "STARTING BALANCE" row. Only extract actual transaction rows.
    
    Return ONLY the JSON object containing the 'transactions' array. Do not include any other text, markdown formatting, or explanations.
    
    PDF Document:
    {{media url=pdfDataUri}}`,
  }
);


const extractCashioPdfFlow = ai.defineFlow(
    {
        name: 'extractCashioPdfFlow',
        inputSchema: z.object({ pdfDataUri: z.string() }),
        outputSchema: ExtractCashioPdfOutputSchema.extend({ usage: z.any() }),
    },
    async (input) => {
        const response = await prompt(input);
        return { ...response.output!, usage: response.usage };
    }
);
