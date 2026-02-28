// ============================================
// SHARED CONFIG — Used by ALL Members
// ============================================
// Owner: Shared (Member 2 sets GEMINI, Member 3 sets SUPABASE)

require("dotenv").config();

module.exports = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || "development",

  // Member 2: AI Engine
  GEMINI_API_KEY: process.env.GEMINI_API_KEY, // Kept for Vector Embeddings
  GROQ_API_KEY: process.env.GROQ_API_KEY,    // Used for LLM generation
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,

  // Cloudinary (Image Storage)
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Member 3: Data Layer
  DATABASE_URL: process.env.DATABASE_URL,

  // Auth0
  AUTH0_DOMAIN: process.env.AUTH0_DOMAIN,
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
  AUTH0_MGMT_CLIENT_ID: process.env.AUTH0_MGMT_CLIENT_ID,
  AUTH0_MGMT_CLIENT_SECRET: process.env.AUTH0_MGMT_CLIENT_SECRET,
};
