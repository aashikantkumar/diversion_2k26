require("dotenv").config();

async function run() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.models) {
        console.log("Available models:");
        data.models.forEach(m => console.log(m.name, m.supportedGenerationMethods));
    } else {
        console.error("Error:", data);
    }
}
run();
