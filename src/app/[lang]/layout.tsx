import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Wallet } from "lucide-react";
import { Footer } from "@/components/Footer";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Nav, NavLinks } from "@/components/Nav";
import { ThemeToggle, themeScript } from "@/components/ThemeToggle";
import { I18nProvider } from "@/i18n/client";
import { LOCALES, hasLocale } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const t = dictionaries[hasLocale(lang) ? lang : "de"];
  return { title: t.meta.title, description: t.meta.description };
}

/** Platzhalter in Größe des Sprachumschalters, solange die URL-Parameter noch laden. */
function TogglePlaceholder() {
  return <div className="h-[1.9rem] w-[5.2rem] rounded-xl border border-line bg-surface-2" />;
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const t = dictionaries[lang];

  return (
    // suppressHydrationWarning: die Klasse "dark" setzt das Theme-Skript vor React
    <html lang={lang} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Setzt die Dark-Mode-Klasse vor dem ersten Rendern (kein Aufblitzen). */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-full flex-col font-sans md:flex-row">
        <I18nProvider lang={lang}>
          <aside className="border-b border-line bg-surface/80 backdrop-blur md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-b-0">
            <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-5">
              <div className="flex items-center gap-2.5">
                <span className="flex size-[1.9em] items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-600/25">
                  <Wallet aria-hidden className="size-[1.1em]" strokeWidth={2.2} />
                </span>
                <span className="text-lg font-semibold tracking-tight">{t.brand}</span>
              </div>
              <div className="flex items-center gap-2 md:hidden">
                <Suspense fallback={<TogglePlaceholder />}>
                  <LanguageToggle />
                </Suspense>
                <ThemeToggle />
              </div>
            </div>
            <Suspense fallback={<NavLinks pathname={null} />}>
              <Nav />
            </Suspense>
            <div className="mt-auto hidden gap-2 p-4 md:grid">
              <Suspense fallback={<TogglePlaceholder />}>
                <LanguageToggle className="w-full justify-center" />
              </Suspense>
              <ThemeToggle className="w-full justify-between" />
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 p-4 md:p-8">{children}</main>
            <Footer />
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
