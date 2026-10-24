import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

/**
 * Open the database and apply migrations/ while the dev server starts, before
 * the first request. Production does the same when src/lib/db.ts loads.
 */
function dbBootstrapPlugin(): Plugin {
  return {
    name: "idea-cartographer:db-bootstrap",
    apply: "serve",
    async configureServer(server) {
      const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
        ensureDbReady?: () => Promise<void>;
      };
      await mod.ensureDbReady?.();
    },
  };
}

// HOST / PORT pick where `npm run dev` listens (default localhost:3000).
// Set HOST=0.0.0.0 to reach it from your phone on the same network.
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

export default defineConfig(({ command, isPreview }) => ({
  server: { host, port },
  preview: { host, port },
  resolve: { tsconfigPaths: true },
  plugins: [
    dbBootstrapPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            // Plain Node server by default (`node .output/server/index.mjs`).
            // NITRO_PRESET=vercel (or another host's preset) to build for that host.
            preset: process.env.NITRO_PRESET ?? "node-server",
            // PGLite loads its WASM and data files from its own package folder
            // at runtime, so ship the whole package instead of bundling it.
            traceDeps: ["@electric-sql/pglite*"],
          }),
        ]
      : []),
    viteReact(),
  ],
}));
