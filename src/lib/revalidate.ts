import { revalidatePath } from "next/cache";

/** Alle Seiten in allen Sprachen neu rendern (Wurzel-Layout liegt unter /[lang]). */
export function revalidateApp() {
  revalidatePath("/[lang]", "layout");
}
