import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { message, history, context } = await req.json();

    console.log("📨 API received:", { 
      message, 
      historyLength: history?.length, 
      context 
    }); // Debug

    let chatHistory = (history || []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text || "" }],
    }));

   
    if (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.shift(); // Removes the first element
    }

    if (message === "GENERATE_FEEDBACK_SUMMARY") {
     const prompt = `
        You are an expert language tutor. In English, analyze this conversation history between a student and an AI:
        ${JSON.stringify(history)}

        Task: Provide 3 specific strengths and 3 specific areas for improvement for a ${context.level} student. Be specific and constructive.
        Also, provide 3 key characteristics/personality traits of the student based on the conversation. This will help tailor future conversations.

        Student Language Level: ${context.level}
        ${ context.difficulty === "Challenging" ? "Difficulty level: Challenging" : "" }
        Language: ${context.language}
        Topic: ${context.topic}

        Other than specific quotes from the conversation, all text in the JSON object should be in English.

        IMPORTANT: Return ONLY a JSON object with this structure:
        {
          "strengths": ["string", "string", "string"],
          "improvements": ["string", "string", "string"]
          "personality_traits": ["string", "string", "string"]
        }
      `;

       const feedbackModel = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // Use stable version
      systemInstruction: prompt, // Using the logic from your previous route code
    });

      const result = await feedbackModel.generateContent(prompt);
      const responseText = result.response.text();
      
      // Clean the string in case Gemini adds markdown code blocks (```json ... ```)
      const cleanedJson = responseText.replace(/```json|```/g, "").trim();
      
      return NextResponse.json(JSON.parse(cleanedJson));
    }
  
    const systemInstruction = `
        You are a foreign student tasked with having a conversation with an English student to improve their 
        oral communication and conversational skills in ${context.language}. 
        
        The student you are talking to has a ${context.language} profiency of ${context.level}. 
        ${context.difficulty == "Challenging" ? `This is a special 'challenge' conversation, so make it a little bit higher level than ${context.level}.` : ""}
        
        Your name is: ${context.character_id}
        ${context.character_description}
        The topic the discussion will be centered around is: ${context.topic}
        The specific scenario you will be playing out is: ${context.scenario}

        The conversation should be a total of ${context.exchanges} exchanges (back-and-forth messages) long. 

        ${context.vocabulary ? `PLEASE include the following vocabulary words in your discussion: ${context.vocabulary}` : ""}
        ${context.grammar ? `PLEASE include usage of the following grammar concepts in your discussion: ${context.grammar}` : ""}
        
        ${context.memory ? `As you have previously conversed with this student before, here is some information about the student's personality and interests so you can make your conversation more natural: ${context.memory}` : ""}

        INSTRUCTIONS:
        1. Stay in character at all times.
        2. Make sure you are conversing at a level a ${context.language} ${context.level} level can understand${context.difficulty == "Challenging" ? `, but since this is a 'challenge' conversation, feel free to go a little bit higher level.` : "."}
        3. Keep your response sizes natural, ${
          context.level == "Beginner (Year 1)" ? (
            "default 1 sentence but extend to max 2 sentences if it feels natural."
          ) : ( context.level == "Intermediate (Year 2)" ? (
            "default 1-2 sentences but extend to max 3 sentences if it feels natural."
            ) : (
              "default 2-3 sentences but extend to max 4-5 sentences if it feels natural."
            ))
        }
        4. Always be polite and encouraging. Refrain from inappropriate language.
        5. Strictly stick to the topic and scenario${context.vocabulary ? " and vocabulary" : ""}${context.grammar ? " and grammar" : ""} provided.
        DO NOT let the conversation deviate.
        6. Keep the conversation as natural as possible, e.g. don't tell the student about how you are going to talk about the given topic.
        7. Always respond ONLY in ${context.language}. Do not provide English translations unless the student specifically asks for help.
        8. Vary your conversation style. You don't always need to ask a question; you can also share an observation or react to what the student said.
        9. Make sure you wrap up the conversation on the last message before you reach the total of ${context.exchanges} exchanges.
      `;

          

   // 2. Initialize Model
    const model = genAI.getGenerativeModel({ 
      model: "gemini-3-flash-preview", // Use stable version
      systemInstruction: systemInstruction, // Using the logic from your previous route code
    });

    // 3. Start Chat with cleaned history
    const chat = model.startChat({
      history: chatHistory,
    });

    // 4. Send the new message
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ 
      reply: responseText 
    });

  } catch (error) {
    console.error("❌ Gemini API Error:", error);
    return NextResponse.json({ 
      error: "Failed to fetch AI response",
      details: error.message 
    }, { status: 500 });
  }
}