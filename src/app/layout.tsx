import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Nav, NavLinks } from "@/components/Nav";
import { ThemeToggle, themeScript } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finanzen",
  description: "Persönliche Finanzen & Portfolio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: die Klasse "dark" setzt das Theme-Skript vor React
    <html lang="de" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans md:flex-row">
        <aside className="border-b border-line bg-surface/80 backdrop-blur md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
          <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-[1.9em] items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-600/25">
                <Wallet aria-hidden className="size-[1.1em]" strokeWidth={2.2} />
              </span>
              <span className="text-lg font-semibold tracking-tight">Finanzen</span>
            </div>
            <ThemeToggle className="md:hidden" />
          </div>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
          <div className="mt-auto hidden p-4 md:block">
            <ThemeToggle className="w-full justify-between" />
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-8">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
