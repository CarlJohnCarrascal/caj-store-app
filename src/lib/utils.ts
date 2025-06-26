import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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
