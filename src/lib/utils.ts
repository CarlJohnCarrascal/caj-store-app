import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { FeeThreshold } from './types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to format a Date object into 'YYYY-MM-DDTHH:mm:ss+08:00' for the current time
export function getCurrentPHTISOString(): string {
    const now = new Date();
    // Manually format to PHT without relying on server's timezone
    const phtOffset = 8 * 60; // PHT is UTC+8
    const localOffset = now.getTimezoneOffset(); // Server's offset from UTC in minutes
    const phtTime = new Date(now.getTime() + (phtOffset + localOffset) * 60 * 1000);
  
    const year = phtTime.getFullYear();
    const month = String(phtTime.getMonth() + 1).padStart(2, '0');
    const day = String(phtTime.getDate()).padStart(2, '0');
    const hours = String(phtTime.getHours()).padStart(2, '0');
    const minutes = String(phtTime.getMinutes()).padStart(2, '0');
    const seconds = String(phtTime.getSeconds()).padStart(2, '0');
  
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+08:00`;
}

// Function to get report paths for different periods based on a given date string (assumed to be in PHT)
export function getReportPaths(dateString: string) {
    // Create a Date object. The provided string is already in UTC or with offset, so this is safe.
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Handle invalid date string gracefully
      const now = new Date();
      return {
        daily: `/daily/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
        weekly: `/weekly/${now.getFullYear()}-01`,
        monthly: `/monthly/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
        yearly: `/yearly/${now.getFullYear()}`,
        overall: `/overall/all-time`,
      };
    }

    // To be independent of server timezone, perform all calculations in UTC.
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Calculate UTC week number
    const startOfYear = new Date(Date.UTC(year, 0, 1));
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getUTCDay() + 1) / 7);

    return {
      daily: `/daily/${year}-${month}-${day}`,
      weekly: `/weekly/${year}-${String(weekNumber).padStart(2, '0')}`,
      monthly: `/monthly/${year}-${month}`,
      yearly: `/yearly/${year}`,
      overall: `/overall/all-time`,
    };
}

export function calculateFee(amount: number, thresholds: FeeThreshold[]): number {
  if (amount <= 0 || !thresholds || thresholds.length === 0) {
    return 0;
  }

  // Sort by the 'from' value to ensure we check in the correct order
  const sortedThresholds = [...thresholds].sort((a, b) => a.from - b.from);
  
  const applicableThreshold = sortedThresholds.find(t => amount >= t.from && amount <= t.to);

  if (applicableThreshold) {
    if (applicableThreshold.type === 'per_thousand_flat') {
      // This calculates the fee proportionally based on the amount.
      // E.g., amount=2500, fee=20 per 1000 -> (2500 / 1000) * 20 = 50
      return (amount / 1000) * applicableThreshold.fee;
    }
    // Default is 'fixed'
    return applicableThreshold.fee;
  }
  
  return 0; // Return 0 if no threshold matches
}
