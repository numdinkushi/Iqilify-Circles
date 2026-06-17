import type { Metadata } from "next"

import { Geist, Geist_Mono, Inter } from "next/font/google"

import "./globals.css"
import { AppShell } from "@/components/layout/app-shell"
import { ConvexClientProvider } from "@/components/providers/convex-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { WalletProvider } from "@/components/wallet/wallet-provider"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const metadata: Metadata = {
  title: "IQlify · AI interview prep on Circles",
  description:
    "Master interviews with AI. Practice, get scored, unlock debriefs with CRC on Circles.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <ConvexClientProvider>
            <WalletProvider>
              <AppShell>{children}</AppShell>
              <Toaster richColors closeButton />
            </WalletProvider>
          </ConvexClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
