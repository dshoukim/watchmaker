import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  console.log('[VITE SETUP] Starting Vite development server setup...');
  
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  console.log('[VITE SETUP] Creating Vite server with options:', serverOptions);

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        console.error('[VITE ERROR]', msg);
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  console.log('[VITE SETUP] Vite server created successfully');

  app.use(vite.middlewares);
  console.log('[VITE SETUP] Vite middleware added to Express');

  // Only serve HTML for requests that don't look like assets
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Let Vite handle asset requests (JS, CSS, images, etc.)
    if (url.includes('.') && !url.endsWith('.html')) {
      console.log('[VITE HANDLER] Skipping asset request:', url);
      return next();
    }
    
    // Also skip API requests
    if (url.startsWith('/api/')) {
      console.log('[VITE HANDLER] Skipping API request:', url);
      return next();
    }
    
    console.log('[VITE HANDLER] Handling HTML request for:', url);

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      console.log('[VITE HANDLER] Reading template from:', clientTemplate);

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      console.log('[VITE HANDLER] Original template (first 200 chars):', template.substring(0, 200));
      
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      
      console.log('[VITE HANDLER] Transforming HTML for URL:', url);
      const page = await vite.transformIndexHtml(url, template);
      console.log('[VITE HANDLER] Final HTML being sent (first 500 chars):', page.substring(0, 500));
      console.log('[VITE HANDLER] Sending transformed HTML response');
      
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      console.error('[VITE HANDLER] Error processing request:', e);
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
  
  console.log('[VITE SETUP] Vite setup completed successfully');
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
