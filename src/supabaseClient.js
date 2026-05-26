import { createClient } from "@supabase/supabase-js";

// Estas dos variables se configuran en Vercel (y en un archivo .env para pruebas).
// NUNCA pongas aquí claves "secret"; la "anon key" es pública y está pensada para el navegador.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. " +
    "Configúralas en Vercel (Settings → Environment Variables) o en un archivo .env local."
  );
}

export const supabase = createClient(url, key);
