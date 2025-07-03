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
    // The dateString is assumed to be in a format like '2025-07-02T11:37:00+08:00'
    // This robustly extracts the date part without being affected by the server's timezone.
    const datePart = dateString.substring(0, 10); // "2025-07-02"
    const [year, month, day] = datePart.split('-');

    // For week number calculation, create a Date object representing noon on that day in PHT
    // to avoid midnight timezone-shifting issues.
    const phtDateForWeek = new Date(`${datePart}T12:00:00+08:00`);

    const startOfYear = new Date(phtDateForWeek.getFullYear(), 0, 1);
    const pastDaysOfYear = (phtDateForWeek.getTime() - startOfYear.getTime()) / 86400000;
    // JS getDay() is Sun-based (0=Sun, 6=Sat). Add 1 to align.
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
