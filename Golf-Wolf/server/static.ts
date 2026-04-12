import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // For the root route, inject a canonical URL tag if APP_URL is set
  app.get("/", (req, res) => {
    const appUrl = process.env.APP_URL ?? `${req.protocol}://${req.get("host")}`;
    let html = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");
    html = html.replace(
      "<!-- Primary SEO -->",
      `<link rel="canonical" href="${appUrl}" />\n    <!-- Primary SEO -->`
    );
    res.type("text/html").send(html);
  });

  // fall through to index.html if the file doesn't exist
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
