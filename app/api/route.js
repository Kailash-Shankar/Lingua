import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper function for handling retries on 503 errors
async function callGeminiWithRetry(fn, maxRetries = 7) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isOverloaded = error.status === 503 || error.message?.includes("503") || error.message?.includes("overloaded");
      if (isOverloaded && i < maxRetries - 1) {
        console.warn(`⚠️ Gemini overloaded. Retrying in ${1000 * (i + 1)}ms...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        continue;
      }
      throw error;
    }
  }
}

export async function POST(req) {
  try {
    const { message, history, context } = await req.json();

    console.log("📨 API received:", { 
      message, 
      historyLength: history?.length, 
      context 
    });

    let chatHistory = (history || []).map((m) => ({
      role: m.role === "user" ? "user" : "model",
      parts: [{ text: m.text || "" }],
    }));

    if (chatHistory.length > 0 && chatHistory[0].role === "model") {
      chatHistory.shift();
    }

    if (message === "GENERATE_FEEDBACK_SUMMARY") {
      const prompt = `
        You are an expert language tutor. In English, analyze this conversation history between a student and an AI:
        ${JSON.stringify(history)}

        Task: Provide 3 specific strengths and 3 specific areas for improvement for a ${context.level} student. Be specific, concise and constructive. Be informal but focused in your tone.
        Also, provide 3 key SPECIFIC characteristics/personality traits of the student based on the conversation, NOT RELATED TO THE SPECIFIC TOPIC/THEME ITSELF. This will help tailor future conversations about other topics. Each one can be up to a sentence long. Refer to student in third person.
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

      const feedbackModel = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        systemInstruction: prompt,
      });

      const result = await callGeminiWithRetry(() => feedbackModel.generateContent(prompt));
      const responseText = result.response.text();
      const cleanedJson = responseText.replace(/```json|```/g, "").trim();
      
      return NextResponse.json(JSON.parse(cleanedJson));
    }

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
        ${context.vocabulary ? `- You MUST include this vocabulary: ${context.vocabulary} (don't bold these words)` : ""}
        ${context.grammar ? `- You MUST use these grammar(s): ${context.grammar} (don't bold these words)` : ""}

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
`
      .trim();


    // Old system prompt
    // const systemInstruction = `
    //     You are a foreign student tasked with having a conversation with an English student to improve their 
    //     oral communication skills in ${context.language}. 
        
    //     STUDENT PROFILE:
    //     ${context.student_name ? `- Name: ${context.student_name}` : ""}
    //     - Proficiency: ${context.level}
    //     - Current Mode: ${context.difficulty === "Challenging" ? "Challenge Mode (Speak slightly above their level)" : "Standard Mode (Stay STRICTLY at their level)"}
    //     ${context.memory ? "- Personality/Memory: No previous history." : ""}

    //     YOUR CHARACTER:
    //     - Name: ${context.character_id}
    //     - Description: ${context.character_description}
    //     - Topic: ${context.topic}
    //     - Scenario: ${context.scenario}

    //     CONVERSATION CONSTRAINTS:
    //     - Length: Exactly ${context.exchanges} exchanges.
    //     ${context.vocabulary ? `- Required Vocabulary: ${context.vocabulary}` : ""}
    //     ${context.grammar ? `- Required Grammar: ${context.grammar}` : ""}

    //     STRICT RULES:
    //     * Stay in character and ONLY speak in ${context.language}. No translations.
    //     * Do NOT ask if they are 'ready' to start; dive straight into the scenario.
    //     * Response length: ${
    //       context.level.includes("Beginner") 
    //         ? "1-2 sentences max." 
    //         : context.level.includes("Intermediate") 
    //         ? "2-3 sentences max." 
    //         : "3-5 sentences max."
    //     }
    //     * You MUST wrap up the conversation naturally RIGHT BEFORE you reachexchange #${context.exchanges}.
    //     ${context.language === "Spanish" ? "* DO NOT use 'vos' or 'vosotros'." : ""}
    //     * Vary your responses; use observations and reactions, not just questions.
    //     * Always focus the conversation on the given topic and scenario, do NOT deviate.
    //   `.trim();

      // Another old system prompt:
    // const systemInstruction = `
    //     You are a foreign student tasked with having a conversation with an English student to improve their 
    //     oral communication and conversational skills in ${context.language}. 
        
    //     The student you are talking to has a ${context.language} profiency of ${context.level}. 
    //     ${context.difficulty == "Challenging" ? `This is a special 'challenge' conversation, so make it a little bit higher level than ${context.level}.` : ""}
        
    //     Your name is: ${context.character_id}
    //     ${context.character_description}
    //     The topic the discussion will be centered around is: ${context.topic}
    //     The specific scenario you will be playing out is: ${context.scenario}

    //     The conversation should be a total of ${context.exchanges} exchanges (back-and-forth messages) long. 

    //     ${context.vocabulary ? `PLEASE include the following vocabulary words in your discussion: ${context.vocabulary}` : ""}
    //     ${context.grammar ? `PLEASE include usage of the following grammar concepts in your discussion: ${context.grammar}` : ""}
        
    //     ${context.memory ? `As you have previously conversed with this student before, here is some information about the student's personality and interests so you can make your conversation more natural: ${context.memory}` : ""}

    //     INSTRUCTIONS:
    //     1. Stay in character at all times.
    //     2. Make sure you are conversing at a level a ${context.language} ${context.level} level can understand${context.difficulty == "Challenging" ? `, but since this is a 'challenge' conversation, feel free to go a little bit higher level.` : ", DO NOT converse above the level of the student"}
    //     3. Keep your response sizes natural, ${
    //       context.level == "Beginner (Year 1)" ? (
    //         "default 1 sentence but extend to max 2 sentences if it feels natural."
    //       ) : ( context.level == "Intermediate (Year 2)" ? (
    //         "default 1-2 sentences but extend to max 3 sentences if it feels natural."
    //         ) : (
    //           "default 2-3 sentences but extend to max 4-5 sentences if it feels natural."
    //         ))
    //     }
    //     4. Always be polite and encouraging. Refrain from inappropriate language.
    //     5. STRICTLY STICK to the topic and scenario${context.vocabulary ? " and vocabulary" : ""}${context.grammar ? " and grammar" : ""} provided. DO NOT deviate from them, even if they do not fit your personality.
    //     DO NOT let the conversation deviate. Also DO NOT ask the student if they are 'ready to have a conversation in ${context.language}'.
    //     6. Keep the conversation as natural as possible, e.g. don't tell the student about how you are going to talk about the given topic.
    //     7. Always respond ONLY in ${context.language}. Do not provide English translations unless the student specifically asks for help.
    //     8. Vary your conversation style. You don't always need to ask a question; you can also share an observation or react to what the student said.
    //     ${context.language === "Spanish" ? "9. Do NOT use the region-specific grammars 'vos' or 'vosotros' in your conversation.\n10." : "9."}
    //      Make sure you naturally wrap up the conversation AS YOU APPROACH the total of ${context.exchanges} exchanges.
    //   `;

    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      systemInstruction: systemInstruction,
    });

    const chat = model.startChat({
      history: chatHistory,
    });

    const result = await callGeminiWithRetry(() => chat.sendMessage(message));
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