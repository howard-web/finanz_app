import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Nav, NavLinks } from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finanzen",
  description: "Persönliche Finanzen & Portfolio",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col md:flex-row">
        <aside className="border-b border-stone-200 bg-white md:sticky md:top-0 md:h-screen md:w-56 md:shrink-0 md:border-r md:border-b-0">
          <div className="px-5 py-4 text-lg font-semibold tracking-tight">💶 Finanzen</div>
          <Suspense fallback={<NavLinks pathname={null} />}>
            <Nav />
          </Suspense>
        </aside>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-8">{children}</main>
      </body>
    </html>
  );
}
