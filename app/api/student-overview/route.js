import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  try {
    const { feedback } = await req.json();
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // Construct a focused prompt
    const prompt = `
      You are an expert foreign language tutor. Analyze this student's feedback across multiple assignments:
      ${JSON.stringify(feedback)}

      Based on this data, provide:
      1. Exactly 3 high-level strengths.
      2. Exactly 3 high-level areas for growth.

      Format the output as a JSON object strictly like this:
      {
        "strengths": ["string", "string", "string"],
        "weaknesses": ["string", "string", "string"]
      }
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    
    // Clean potential markdown formatting from the AI response
    const jsonString = text.replace(/```json|```/g, "").trim();
    const cleanData = JSON.parse(jsonString);

    return new Response(JSON.stringify(cleanData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI Skill Overview Error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate overview" }), { status: 500 });
  }
}