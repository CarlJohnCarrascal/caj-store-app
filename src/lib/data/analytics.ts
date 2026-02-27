'use server';

import { BetaAnalyticsDataClient } from '@google-analytics/data';

// This will be initialized with credentials from the environment.
const analyticsDataClient = new BetaAnalyticsDataClient();
const propertyId = process.env.GA_PROPERTY_ID;

export async function getWebVisits() {
    if (!propertyId) {
        // Don't throw an error, just return an error state.
        // This is a more graceful failure for the UI.
        return {
            error: 'GA_PROPERTY_ID not set.',
        };
    }

    try {
        const [response] = await analyticsDataClient.runReport({
            property: `properties/${propertyId}`,
            dateRanges: [
                {
                    startDate: '7daysAgo',
                    endDate: 'today',
                },
            ],
            metrics: [
                {
                    name: 'activeUsers',
                },
            ],
        });

        const activeUsers = response.rows?.[0]?.metricValues?.[0]?.value || '0';
        return {
            activeUsers,
        };
    } catch (error: any) {
        console.error('Failed to fetch analytics data:', error.message);
        // Provide a more user-friendly error
        return {
            error: 'API request failed. Check credentials.',
        };
    }
}
