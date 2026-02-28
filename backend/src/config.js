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
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,

  // Member 3: Data Layer
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
};
