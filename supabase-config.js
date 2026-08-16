// ============================================================
// QUACK — Configuration Supabase
// ============================================================
// Où trouver tes clés :
// 1. https://supabase.com/dashboard → ton projet
// 2. Icône ⚙ "Project Settings" (en bas à gauche) → "API"
// 3. Copie "Project URL" → colle dans SUPABASE_URL
// 4. Copie la clé "anon public"   → colle dans SUPABASE_ANON_KEY
//    ⚠️ Ne colle JAMAIS la clé "service_role" ici : elle donne un
//    accès total à la base et ne doit jamais être exposée côté client.
// ============================================================

const SUPABASE_URL = "https://TON-PROJET.supabase.co";
const SUPABASE_ANON_KEY = "TA_CLE_ANON_PUBLIC";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
