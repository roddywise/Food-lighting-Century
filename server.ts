import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy for Text Generation
  app.get("/api/generate/text", async (req, res) => {
    const { prompts } = req.query;
    const key = process.env.GEN_TXT_KEY || "";
    
    if (!prompts) {
      return res.status(400).send("Missing prompts parameter");
    }

    try {
      const url = `https://api.eachother.work/generate/roddygentext?key=${key}&prompts=${encodeURIComponent(prompts as string)}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`External API failed with status ${response.status}`);
      const text = await response.text();
      res.send(text);
    } catch (error) {
      console.error("Proxy text generation error:", error);
      res.status(500).send("Failed to generate text");
    }
  });

  // API Proxy for Image Generation (Redirect)
  app.get("/api/generate/image", (req, res) => {
    const { prompts } = req.query;
    const key = process.env.GEN_IMG_KEY || "";
    
    if (!prompts) {
      return res.status(400).send("Missing prompts parameter");
    }

    const url = `https://api.eachother.work/generate/roddygenimg?key=${key}&prompts=${encodeURIComponent(prompts as string)}`;
    // We can just redirect the browser to the external API, but that might still hit CORS if the image is used in a canvas or something.
    // However, for <img> tags, a redirect is fine.
    res.redirect(url);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
