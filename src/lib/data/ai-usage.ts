import { db } from '../firebase';
import { ref, runTransaction } from 'firebase/database';
import { getCurrentPHTISOString } from '../utils';
import { logActivity } from './activity';

// Example pricing model. In a real app, this would be more sophisticated.
const GEMINI_FLASH_INPUT_COST_PER_1K_TOKENS = 0.0001;
const GEMINI_FLASH_OUTPUT_COST_PER_1K_TOKENS = 0.0002;
const IMAGEN_COST_PER_IMAGE = 0.01; // Example

interface AIUsageInput {
    userId: string;
    userName: string;
    flowName: string;
    usage: {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
    };
    imageCount?: number;
}

export async function logAIUsage({ userId, userName, flowName, usage, imageCount = 0 }: AIUsageInput): Promise<void> {
    if (!userId) return;

    const inputTokens = usage.inputTokens || usage.totalTokens || 0;
    const outputTokens = usage.outputTokens || 0;

    const tokenCost = (inputTokens / 1000 * GEMINI_FLASH_INPUT_COST_PER_1K_TOKENS) + 
                       (outputTokens / 1000 * GEMINI_FLASH_OUTPUT_COST_PER_1K_TOKENS);
    
    const imageCost = imageCount * IMAGEN_COST_PER_IMAGE;

    const totalCost = tokenCost + imageCost;
    const totalTokens = inputTokens + outputTokens;

    if (totalTokens === 0 && imageCount === 0) return; // Don't log empty usage

    const userRef = ref(db, `users/${userId}`);

    await runTransaction(userRef, (currentUser: any) => {
        if (currentUser) {
            if (!currentUser.aiUsage) {
                currentUser.aiUsage = { totalTokens: 0, totalCost: 0, monthlyTokens: 0, monthlyCost: 0, lastReset: '1970-01-01T00:00:00Z' };
            }

            // Check if it's a new month to reset monthly stats
            const now = new Date();
            const lastReset = new Date(currentUser.aiUsage.lastReset || '1970-01-01T00:00:00Z');
            if (now.getUTCMonth() !== lastReset.getUTCMonth() || now.getUTCFullYear() !== lastReset.getUTCFullYear()) {
                currentUser.aiUsage.monthlyTokens = 0;
                currentUser.aiUsage.monthlyCost = 0;
                currentUser.aiUsage.lastReset = getCurrentPHTISOString();
            }

            currentUser.aiUsage.totalTokens = (currentUser.aiUsage.totalTokens || 0) + totalTokens;
            currentUser.aiUsage.totalCost = (currentUser.aiUsage.totalCost || 0) + totalCost;
            currentUser.aiUsage.monthlyTokens = (currentUser.aiUsage.monthlyTokens || 0) + totalTokens;
            currentUser.aiUsage.monthlyCost = (currentUser.aiUsage.monthlyCost || 0) + totalCost;
        }
        return currentUser;
    });

    logActivity({
        type: 'AI',
        action: 'Used',
        details: `Used '${flowName}'. Tokens: ${totalTokens}. Cost: ~$${totalCost.toFixed(6)}`,
        targetId: flowName,
        userId,
        userName,
    });
}
