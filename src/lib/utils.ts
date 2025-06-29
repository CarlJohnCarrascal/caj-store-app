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
    // This function creates a Date object that correctly represents the PHT date,
    // regardless of the server's timezone.
    // Example: '2024-07-16T00:05:00+08:00' in PHT is July 16th.
    // In UTC, this is '2024-07-15T16:05:00Z'. new Date() would create a date for July 15th on a UTC server.
    // We need to parse it carefully to preserve the PHT date parts.
    
    // A robust way to get date parts in a specific timezone
    const formatter = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'Asia/Manila' });

    const date = new Date(dateString);
    const year = formatter({ year: 'numeric' }).format(date);
    const month = formatter({ month: '2-digit' }).format(date);
    const day = formatter({ day: '2-digit' }).format(date);
    
    // Get week number in PHT
    const phtDateForWeek = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    const startOfYear = new Date(phtDateForWeek.getFullYear(), 0, 1);
    const pastDaysOfYear = (phtDateForWeek.getTime() - startOfYear.getTime()) / 86400000;
    const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  
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
