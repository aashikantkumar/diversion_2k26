// ============================================
// SHARED CONFIG — Used by ALL Members
// ============================================

require("dotenv").config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // AI Engine
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,

  // Cloudinary (Image Storage)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // ElevenLabs (Text-to-Speech)
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,

  // Data Layer
  DATABASE_URL: process.env.DATABASE_URL,

  // JWT Authentication (replaces Auth0)
  // Generate secrets: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES:  process.env.JWT_ACCESS_EXPIRES  || "15m",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "7d",

  // Frontend
  FRONTEND_URL: process.env.FRONTEND_URL,

  validate() {
    const required = ["DATABASE_URL", "JWT_SECRET", "JWT_REFRESH_SECRET"];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length) {
      throw new Error(
        `❌ Missing required env vars: ${missing.join(", ")}\n` +
        `   Copy .env.example to .env and fill in the values.`
      );
    }
    if (!process.env.GEMINI_API_KEY && !process.env.HUGGINGFACE_API_KEY) {
      console.warn("⚠️  Neither GEMINI_API_KEY nor HUGGINGFACE_API_KEY set — embeddings will fail");
    }
  },
};
