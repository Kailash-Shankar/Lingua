import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    console.log("=== API Route Called ===");

    // Dynamic import to avoid build-time issues
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const body = await req.json();
    console.log("Received body:", JSON.stringify(body, null, 2));

    const { message, history = [] } = body;

    if (!message) {
      console.log("No message provided");
      return NextResponse.json({ reply: "No message provided" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: `You are Miguel, a teenager from Colombia with a strong understanding of Spanish language and culture.
Always respond in Spanish.
Be polite, friendly, and conversational.
Keep responses concise.
Always format responses using Markdown.
Do NOT mention being an AI or language model.`
    });

    const chatHistory = history.map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.text }]
    }));

    const chat = model.startChat({
      history: chatHistory,
      generationConfig: { temperature: 0.7 }
    });

    const MAX_RETRIES = 3;
    let attempt = 0;
    let result;
    let success = false;

    while (attempt < MAX_RETRIES && !success) {
      try {
        console.log(`Sending message to Gemini (attempt ${attempt + 1})...`);
        result = await chat.sendMessage(message);
        success = true;
      } catch (err) {
        console.error(`Attempt ${attempt + 1} failed:`, err.message);
        if (err.status === 503) {
          attempt++;
          await new Promise(r => setTimeout(r, 1000 * attempt)); // exponential backoff
        } else {
          throw err; // propagate other errors
        }
      }
    }

    if (!success) {
      return NextResponse.json(
        { reply: "Lo siento, el modelo está ocupado. Intenta de nuevo más tarde." },
        { status: 503 }
      );
    }

    const reply = result.response.text();

    const updatedHistory = [
      ...history,
      { role: "user", text: message },
      { role: "assistant", text: reply }
    ];

    return NextResponse.json({ reply, history: updatedHistory });

  } catch (err) {
    console.error("=== ERROR IN API ROUTE ===");
    console.error("Error type:", err.constructor.name);
    console.error("Error message:", err.message);
    console.error("Error status:", err.status);
    console.error("Full error:", err);
    console.error("========================");

    if (err.status === 429) {
      return NextResponse.json(
        { reply: "Lo siento, he alcanzado mi límite de mensajes. Intenta de nuevo en un momento." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { reply: `Error: ${err.message || "could not generate response"}` },
      { status: 500 }
    );
  }
}
