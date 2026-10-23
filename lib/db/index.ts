import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Lazy initialization to ensure environment variables are loaded
let dbInstance: ReturnType<typeof drizzle> | null = null;

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!dbInstance) {
      // biome-ignore lint: Forbidden non-null assertion.
      // Close idle connections so the database compute can scale to zero
      const client = postgres(process.env.POSTGRES_URL!, {
        max: 5,
        idle_timeout: 20,
      });
      dbInstance = drizzle(client);
    }
    return (dbInstance as any)[prop];
  },
});
