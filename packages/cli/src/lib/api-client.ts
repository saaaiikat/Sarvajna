import { hc } from 'hono/client';
import type { AppType } from "@sarvajna/server";

export const client = hc<AppType>(process.env.API_URL ?? "http://localhost:3000");
