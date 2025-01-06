import express from "express";
import cors from "cors";
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
app.use(cors());
app.use(express.json());

app.post("/api/v1/answer", async (req, res) => {
  const { question, prompt, answers, images }: AnswerRequest = req.body;
  if (!question || !prompt) {
    res.status(400).send("Question and prompt are required");
    return;
  }
  const attachments = images.map(({ type, file }) => ({
    inlineData: {
      data: file,
      mimeType: `image/${type}`,
    },
  }));

  try {
    const result = await model.generateContent([
      ...attachments,
      `You will only answer multiple choice questions with single answers as they’re listed in the question. 
       You will answer them correctly. You will not use any fullstops or punctuation. 
       You will not explain your answers or write words before or after the answers. Only the answer itself will you respond with.
       ${question}\n` +
        `${prompt}\n` +
        answers.map((answer) => `${answer.num}. ${answer.content}`).join("\n"),
    ]);
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

interface AnswerRequest {
  question: string;
  prompt: string;
  answers: { num: string; content: string }[];
  images: { type: string; file: string }[];
}
