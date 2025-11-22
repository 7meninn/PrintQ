import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: "postgresql://postgres:1234@localhost:5432/print_system"
});

export const db = drizzle(pool);
