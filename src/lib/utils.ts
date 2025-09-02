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
    // The dateString is assumed to be a PHT ISO string like "2024-07-03T10:00:00+08:00"
    // We need to parse the date parts according to PHT, not the server's local timezone or UTC.
    
    // A robust way to do this is to manipulate the string to create a UTC date
    // that has the same calendar date and time as the PHT date.
    // e.g., "2024-07-03T10:00:00+08:00" -> "2024-07-03T10:00:00Z"
    const phtDateAsUTCString = dateString.slice(0, 19) + 'Z';
    const date = new Date(phtDateAsUTCString);

    if (isNaN(date.getTime())) {
      // Fallback for invalid date string
      const nowPHT = getCurrentPHTISOString();
      const phtNowAsUTCString = nowPHT.slice(0, 19) + 'Z';
      const fallbackDate = new Date(phtNowAsUTCString);
      
      const year = fallbackDate.getUTCFullYear();
      const month = String(fallbackDate.getUTCMonth() + 1).padStart(2, '0');
      const day = String(fallbackDate.getUTCDate()).padStart(2, '0');
      const startOfYear = new Date(Date.UTC(year, 0, 1));
      const pastDaysOfYear = (fallbackDate.getTime() - startOfYear.getTime()) / 86400000;
      const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getUTCDay() + 1) / 7);

      return {
        daily: `/daily/${year}-${month}-${day}`,
        weekly: `/weekly/${year}-${String(weekNumber).padStart(2, '0')}`,
        monthly: `/monthly/${year}-${month}`,
        yearly: `/yearly/${year}`,
        overall: `/overall/all-time`,
      };
    }

    // Now all getUTC... methods will return values corresponding to the PHT calendar date
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    // Calculate week number based on this PHT-equivalent UTC date
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

  const sortedThresholds = [...thresholds].sort((a, b) => a.from - b.from);
  
  // Find the threshold that applies to the total amount
  const applicableThreshold = sortedThresholds.find(t => amount >= t.from && amount <= t.to);

  if (!applicableThreshold) {
    return 0; // Return 0 if no threshold matches
  }
  
  if (applicableThreshold.type === 'per_thousand_flat') {
      const thousands = Math.floor(amount / 1000);
      const remainder = amount % 1000;

      // Fee for the 'thousands' part
      const thousandsFee = thousands * applicableThreshold.fee;
      
      // Fee for the 'remainder' part
      let remainderFee = 0;
      if (remainder > 0) {
          // Find the 'fixed' fee for the remainder
          const remainderThreshold = sortedThresholds.find(t => remainder >= t.from && remainder <= t.to && t.type === 'fixed');
          if (remainderThreshold) {
              remainderFee = remainderThreshold.fee;
          }
      }
      
      return thousandsFee + remainderFee;
  }
  
  // Default is 'fixed' type
  return applicableThreshold.fee;
}
