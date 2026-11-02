import { cacheLife } from "next/cache";
import { getI18n } from "@/i18n/server";
import { version } from "../../package.json";

const AUTHOR = "Ralf Völker";

/** Jahreszahl gecacht, damit die Seite weiter vorgerendert werden kann (aktualisiert sich täglich). */
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return <>{new Date().getFullYear()}</>;
}

export async function Footer() {
  const { t } = await getI18n();
  return (
    <footer className="mx-auto w-full max-w-7xl border-t border-line px-4 py-4 text-xs text-ink-3 md:px-8">
      © <CurrentYear /> {AUTHOR} · {t.footer.version} {version}
    </footer>
  );
}
