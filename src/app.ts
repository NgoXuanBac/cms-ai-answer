import express from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

if (!process.env.API_KEY) {
  throw new Error("API_KEY is not defined");
}
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/api/v1/answer", async (req, res) => {
  const { question, prompt, answers, images } = req.body;
  if (!question || !prompt) {
    res.status(400).send("Question and prompt are required");
    return;
  }

  try {
    const result = await model.generateContent(prompt);
    const answer = result.response.text();
    res.status(200).json({ answer });
  } catch (error) {
    console.error("Error generating AI response:", error);
    res.status(500).send("Error processing request");
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

