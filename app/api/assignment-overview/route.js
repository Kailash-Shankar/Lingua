import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { feedback } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Analyze this feedback across all students for a foreign language learning assignment. 
      Identify 3 common strengths and 3 common weaknesses across all students.
      
      Data: ${JSON.stringify(feedback)}

      Return ONLY a plain JSON object. Do not include markdown formatting.
      Structure:
      {
        "strengths": ["string", "string", "string"],
        "weaknesses": ["string", "string", "string"]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    
    // Clean up any potential markdown formatting from Gemini
    const cleanedJson = text.replace(/```json|```/gi, "").trim();
    const data = JSON.parse(cleanedJson);

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}