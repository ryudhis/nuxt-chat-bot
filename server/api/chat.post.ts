import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { prisma } from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { messages: chatMessages, sessionId, aiModel } = body;

    if (!chatMessages || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Messages and sessionId are required",
      });
    }

    // Get the latest user message
    const latestMessage = chatMessages[chatMessages.length - 1];
    if (!latestMessage || latestMessage.role !== "user") {
      throw createError({
        statusCode: 400,
        statusMessage: "Latest message must be from user",
      });
    }

    // Get API key from runtime config
    const config = useRuntimeConfig();
    const apiKey = config.googleApiKey;

    if (!apiKey) {
      throw createError({
        statusCode: 500,
        statusMessage: "Google API key not configured",
      });
    }

    // Verify session exists and get user
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session) {
      throw createError({
        statusCode: 404,
        statusMessage: "Session not found",
      });
    }

    // Check if this is the first message in the session
    const existingMessagesCount = await prisma.message.count({
      where: { sessionId: sessionId },
    });
    const isFirstMessage = existingMessagesCount === 0;

    // Save user message to database
    await prisma.message.create({
      data: {
        content: latestMessage.content,
        role: "user",
        sessionId: sessionId,
      },
    });

    // Use conversation history from AI SDK
    const conversationHistory: {
      role: "user" | "assistant";
      content: string;
    }[] = chatMessages.map((msg: any) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: msg.content,
    }));

    const googleAI = createGoogleGenerativeAI({ apiKey });
    // Create Google AI instance with selected model or default
    const selectedModel = aiModel || "gemini-2.5-flash";
    const model = googleAI(selectedModel);

    // Generate streaming response
    const result = await streamText({
      model,
      messages: conversationHistory,
      temperature: 0.7,
    });

    // Set headers for streaming
    setHeader(event, "Content-Type", "text/plain; charset=utf-8");
    setHeader(event, "Cache-Control", "no-cache");
    setHeader(event, "Connection", "keep-alive");

    let fullResponse = "";

    // Create readable stream
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const delta of result.textStream) {
            fullResponse += delta;

            // Send chunk to client
            const chunk = `data: ${JSON.stringify({ content: delta })}\n\n`;
            controller.enqueue(new TextEncoder().encode(chunk));
          }

          // Save complete AI response to database
          await prisma.message.create({
            data: {
              content: fullResponse,
              role: "assistant",
              sessionId: sessionId,
            },
          });

          // Generate session title if this is the first message exchange
          if (isFirstMessage) {
            try {
              const titleResult = await streamText({
                model,
                messages: [
                  {
                    role: "user",
                    content: `Berdasarkan percakapan berikut, buatlah HANYA judul singkat (maksimal 5 kata dalam bahasa Indonesia). Jangan berikan penjelasan atau kalimat lain, hanya judul saja:

User: ${latestMessage.content}
Assistant: ${fullResponse}

Jawab dengan judul singkat saja:`,
                  },
                ],
                temperature: 0.1,
              });

              let generatedTitle = "";
              for await (const delta of titleResult.textStream) {
                generatedTitle += delta;
              }

              // Clean and format the title
              generatedTitle = generatedTitle
                .trim()
                .replace(/^["']|["']$/g, "")
                .replace(/^(judul|title):\s*/i, "") // Remove "Judul:" prefix
                .replace(/^berikut.*?judul.*?:/i, "") // Remove explanatory text
                .split("\n")[0] // Take only first line
                .trim();

              if (generatedTitle.length > 50) {
                generatedTitle = generatedTitle.substring(0, 47) + "...";
              }

              // Fallback if title is empty or too generic
              if (!generatedTitle || generatedTitle.length < 3) {
                generatedTitle = "Chat Baru";
              }

              // Update session title in database
              await prisma.chatSession.update({
                where: { id: sessionId },
                data: { title: generatedTitle },
              });

              // Send title update to client
              const titleChunk = `data: ${JSON.stringify({
                sessionTitle: generatedTitle,
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(titleChunk));
            } catch (titleError) {
              console.error("Title generation error:", titleError);
              // Continue without failing the main response
            }
          }

          // Send completion signal
          controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          controller.error(error);
        }
      },
    });

    return stream;
  } catch (error: any) {
    console.error("Chat API error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || "Internal server error",
    });
  }
});
