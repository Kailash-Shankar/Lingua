    import { createClient } from "@supabase/supabase-js";

    const supabaseUrl = process.env.SUPABASE_URL; // server env variable
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);

