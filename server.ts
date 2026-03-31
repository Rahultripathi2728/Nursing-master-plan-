import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import puppeteer from "puppeteer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Route for PDF Generation
  app.post("/api/generate-pdf", async (req, res) => {
    console.log("--- PDF Generation Start ---");
    const { html } = req.body;

    if (!html) {
      console.error("Error: HTML content is missing");
      return res.status(400).json({ error: "HTML content is required" });
    }

    console.log("HTML Size:", (html.length / 1024).toFixed(2), "KB");

    let browser;
    try {
      console.log("Launching browser...");
      browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process", // Often helps in restricted environments
          "--disable-gpu"
        ],
      });
      
      console.log("Browser launched. Creating page...");
      const page = await browser.newPage();
      
      // Set a reasonable timeout for the whole operation
      page.setDefaultNavigationTimeout(60000);
      page.setDefaultTimeout(60000);

      console.log("Setting page content...");
      // Using networkidle2 is often more reliable than networkidle0
      await page.setContent(html, { waitUntil: "networkidle2" });
      console.log("Content set. Generating PDF...");
      
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: "5mm",
          right: "5mm",
          bottom: "5mm",
          left: "5mm",
        },
      });

      console.log("PDF generated. Size:", (pdfBuffer.length / 1024).toFixed(2), "KB");
      console.log("--- PDF Generation Success ---");

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=master-plan.pdf");
      res.send(pdfBuffer);
    } catch (error: any) {
      console.error("--- PDF Generation Failure ---");
      console.error("Error Details:", error);
      res.status(500).json({ 
        error: "Failed to generate PDF", 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    } finally {
      if (browser) {
        await browser.close();
        console.log("Browser closed.");
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
