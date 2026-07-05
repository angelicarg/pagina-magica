import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env"
  );
}

// Falls back to a placeholder so createClient doesn't throw at import time
// when .env isn't set up yet — calls will still fail, but with a clear
// network error instead of crashing the whole app on load.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder");
