"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// For next-themes v0.4+ the standard cast usually relies on ComponentProps
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
