import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazy initialization to ensure environment variables are loaded
let dbInstance: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!dbInstance) {
      // biome-ignore lint: Forbidden non-null assertion.
      const client = postgres(process.env.POSTGRES_URL!);
      dbInstance = drizzle(client);
    }
    return (dbInstance as any)[prop];
  },
});
