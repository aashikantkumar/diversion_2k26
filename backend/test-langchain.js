const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
require("dotenv").config();

async function run() {
  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: "gemini-1.5-flash",
      apiKey: process.env.GEMINI_API_KEY,
    });
    const res = await model.invoke("say hi");
    console.log(res);
  } catch(e) { console.error(e.message); }
}
run();
