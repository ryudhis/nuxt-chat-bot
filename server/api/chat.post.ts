import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";
import { prisma } from "~/lib/prisma";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { messages: chatMessages, sessionId, aiModel, attachments } = body;

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

    // Process multimodal attachments if present
    let multimodalData: any = {
      content: latestMessage.content,
      role: "user",
      sessionId: sessionId,
    };

    let enhancedPrompt = latestMessage.content;
    let messageContent: any = latestMessage.content;

    if (attachments && attachments.length > 0) {
      const attachment = attachments[0]; // Handle first attachment
      
      if (attachment.type === 'image' && attachment.data) {
        // For image: store base64 data and prepare for Gemini Vision
        multimodalData.imageData = attachment.data;
        multimodalData.mimeType = attachment.mimeType;
        multimodalData.fileName = attachment.fileName;
        
        // For Gemini Vision API, we need to format the content differently
        messageContent = {
          type: 'multimodal',
          text: latestMessage.content,
          image: attachment.data
        };
        
      } else if (attachment.type === 'pdf' && attachment.extractedText) {
        // For PDF: add extracted text to prompt
        multimodalData.pdfText = attachment.extractedText;
        multimodalData.fileName = attachment.fileName;
        
        enhancedPrompt = `${latestMessage.content}\n\n[Konten PDF "${attachment.fileName}"]:\n${attachment.extractedText}`;
        
      } else if (attachment.type === 'audio' && attachment.extractedText) {
        // For Audio: add transcribed text to prompt
        multimodalData.audioData = attachment.data;
        multimodalData.fileName = attachment.fileName;
        
        enhancedPrompt = `${latestMessage.content}\n\n[Transkrip Audio "${attachment.fileName}"]:\n${attachment.extractedText}`;
      }
    }

    // Save user message to database with multimodal data
    await prisma.message.create({
      data: multimodalData,
    });

    // Build conversation history - use enhanced prompt for text-based models
    const conversationHistory: {
      role: "user" | "assistant";
      content: any;
    }[] = chatMessages.map((msg: any, index: number) => {
      // For the latest message with attachments, use appropriate content
      if (index === chatMessages.length - 1 && attachments && attachments.length > 0) {
        const attachment = attachments[0];
        
        if (attachment.type === 'image' && attachment.data) {
          // For image messages, use multimodal format
          return {
            role: msg.role === "user" ? "user" : "assistant",
            content: [
              { type: "text", text: enhancedPrompt },
              { 
                type: "image", 
                image: attachment.data // Base64 data URL
              }
            ]
          };
        } else {
          // For PDF/Audio, use enhanced text prompt
          return {
            role: msg.role === "user" ? "user" : "assistant",
            content: enhancedPrompt
          };
        }
      }
      
      return {
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      };
    });

    const googleAI = createGoogleGenerativeAI({ apiKey });
    
    // Auto-select model based on content type
    let selectedModel = aiModel || "gemini-2.5-flash";
    const hasImageContent = attachments && attachments.some((att: any) => att.type === 'image');
    
    // Use vision model for images
    if (hasImageContent) {
      selectedModel = "gemini-2.5-flash"; // gemini-2.5-flash supports vision
      console.log('Using vision-enabled model for image content');
    }
    
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
