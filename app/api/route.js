import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function cleanAIResponse(text) {
  if (!text) return "";
  return text
    .replace(/<\/?[^>]+(>|$)/g, "") 
    .replace(/\n{3,}/g, "\n\n")     
    .trim();
}

async function callGeminiWithFallback(config, isFeedback = false) {
  const modelsToTry = [
    { name: "gemini-2.5-flash", label: "PRIMARY" },
    { name: "gemini-2.5-flash-lite", label: "FALLBACK" }
  ];

  for (const modelInfo of modelsToTry) {
    const modelObj = genAI.getGenerativeModel({ 
      model: modelInfo.name,
      systemInstruction: isFeedback ? undefined : config.systemInstruction 
    });

    for (let i = 0; i < 5; i++) {
      try {
        console.log(`Attempt ${i + 1} using ${modelInfo.label} (${modelInfo.name})...`);
        
        const responseText = await Promise.race([
          (async () => {
            if (isFeedback) {
              const result = await modelObj.generateContent(config.message);
              return result.response.text();
            } else {
              const chat = modelObj.startChat({ history: config.history });
              const result = await chat.sendMessage(config.message);
              return result.response.text();
            }
          })(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("TIMEOUT")), 5000)
          )
        ]);

        return cleanAIResponse(responseText);

      } catch (error) {
        const isTimeout = error.message === "TIMEOUT";
        const isOverloaded = error.status === 503 || error.message?.toLowerCase().includes("overloaded") || error.status === 429;
        
        if ((isOverloaded || isTimeout) && i < 4) {
          const waitTime = isTimeout ? 500 : 1000 * (i + 1);
          console.warn(`⚠️ ${modelInfo.name} ${isTimeout ? 'timed out' : 'overloaded'}. Retrying...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        break; 
      }
    }
  }
  throw new Error("All models and retries exhausted.");
}

export async function POST(req) {
  try {
    const { message, history, context } = await req.json();

    let chatHistory = (history || []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text || "" }],
    }));

    if (chatHistory.length > 0 && chatHistory[0].role === "model") chatHistory.shift();

    // --- YOUR ORIGINAL FEEDBACK PROMPT ---
    if (message === "GENERATE_FEEDBACK_SUMMARY") {
      const feedbackPrompt = `
        You are an expert language tutor. In English, analyze this conversation history between a student and an AI:
        ${JSON.stringify(history)}

        Task: Provide 3 specific strengths and 3 specific areas for improvement for a ${context.level} student. Be specific, concise and constructive. Be informal but focused in your tone.
        Also, provide 3 key SPECIFIC personal details about the student and their life based on the conversation, NOT RELATED TO THE SPECIFIC TOPIC/THEME ITSELF. If the student did not provide any personal details, resort to personality traits/behavior. This will help tailor future conversations about other topics. Each one can be up to a sentence long. Refer to student in third person.
        Do NOT include slashes or markdown formatting in your response.

        Student Language Level: ${context.level}
        ${ context.difficulty === "Challenging" ? "Difficulty level: Challenging" : "" }
        Language: ${context.language}
        Topic: ${context.topic}
        ${context.grammar ? `Grammar needed to have been used: ${context.grammar}` : ""}
        ${context.vocabulary ? `Vocabulary needed to have been used: ${context.vocabulary}` : ""}

        Other than specific quotes from the conversation, all text in the JSON object should be in English.

        IMPORTANT: Return ONLY a JSON object with this structure:
        {
          "strengths": ["string", "string", "string"],
          "improvements": ["string", "string", "string"],
          "personality_traits": ["string", "string", "string"]
        }
      `;

      const responseText = await callGeminiWithFallback({ message: feedbackPrompt }, true);
      const cleanedJson = responseText.replace(/```json|```/g, "").trim();
      return NextResponse.json(JSON.parse(cleanedJson));
    }

    // --- YOUR ORIGINAL CHAT PROMPT ---
    const isLastMessage = context.current_exchange_count === context.exchanges - 1; 

    const systemInstruction = `
        You are ${context.character_id} (a speaker of ${context.language}). You are currently in a conversation with ${context.student_name || "a student"}, with the goal of improving their ${context.language} speaking skills.
        
        STUDENT PROFILE:
        ${context.student_name ? `- Name: ${context.student_name}` : ""}
        - Proficiency: ${context.level}
        ${context.difficulty === "Challenging" ? "- Current Mode: Challenge Mode (Speak slightly above their level)" : "Do NOT use vocabulary or grammar above the student's level."}}
        ${context.memory ? `- Personality from past conversations: ${context.memory}` : ""}

        YOUR CHARACTER & SETTING:
        - Character: ${context.character_id} (${context.character_description})
        - TOPIC (Stay on this): ${context.topic}
        - SCENARIO (STRICTLY discuss this only): ${context.scenario}

        CONVERSATION CONSTRAINTS:
        - Length: Exactly ${context.exchanges} exchanges.
        ${context.vocabulary ? `- You MUST include this vocabulary: ${context.vocabulary} (don't bold/italicize these words)` : ""}
        ${context.grammar ? `- You MUST use these grammar(s): ${context.grammar} (don't bold/italicize these words)` : ""}

        STRICT RULES:
        * INTERNALIZE THE CHARACTER: You are NOT an AI tutor. You are ${context.character_id} in the scenario.
        * LANGUAGE: Speak ONLY in ${context.language}. No English.
        
        * RESPONSE LENGTH: ${
          context.level.includes("Beginner") 
            ? "1-2 sentences max." 
            : context.level.includes("Intermediate") 
            ? "2-3 sentences max." 
            : "3-5 sentences max."
        }
        * DRIVE THE CONVERSATION: Make sure the conversation always stays on the given topic and scenario. DO NOT discuss anything else!
        * NO DRIFTING: If the student tries to change the topic or gives a short answer, pull them back into the ${context.topic} scenario immediately.
        * NO REPEATING GREETINGS: Do not say "Hola" or "Nice to meet you" again if the conversation has already started.
        ${isLastMessage 
    ? "THE CONVERSATION IS OVER. Wrap up and say goodbye. Do NOT ask a follow-up question." 
    : ""}
`.trim();

    const finalReply = await callGeminiWithFallback({
      systemInstruction,
      history: chatHistory,
      message: message
    }, false);

    return NextResponse.json({ reply: finalReply });

  } catch (error) {
    console.error("❌ Final API Error:", error);
    return NextResponse.json({ error: "Service unavailable", details: error.message }, { status: 500 });
  }
}