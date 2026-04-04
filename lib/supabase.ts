import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

let _client: SupabaseClient<Database> | null = null;

function getClient(): SupabaseClient<Database> {
  if (!_client) {
    _client = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_: SupabaseClient<Database>, prop: string | symbol) {
    return Reflect.get(getClient(), prop);
  },
});
