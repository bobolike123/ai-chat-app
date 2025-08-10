import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, apiKey, provider, model, videoParams } = body;

    // Validate required fields
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Messages are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Provider-specific configurations
    let apiUrl = "";
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };

    switch (provider) {
      case "siliconflow":
        apiUrl = "https://api.siliconflow.cn/v1/chat/completions";
        break;
      case "openai":
        apiUrl = "https://api.openai.com/v1/chat/completions";
        break;
      case "anthropic":
        apiUrl = "https://api.anthropic.com/v1/messages";
        headers = {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        };
        break;
      case "doubao":
        if (model === "doubao-seedream-3-0-t2i-250415" || model === "doubao-seededit-3-0-i2i-250628") {
          // Use the correct API endpoint for image generation and editing
          apiUrl = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
        } else if (model === "doubao-seedance-1-0-pro-250528" || model === "doubao-seedance-1-0-lite-i2v-250428") {
          // Use the correct API endpoint for video generation
          apiUrl = "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks";
        } else {
          apiUrl = "https://ark.cn-beijing.volces.com/api/v3/chat/completions";
        }
        headers = {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        };
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Unsupported provider" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }

    // Prepare the request body based on the provider
    let requestBody: any;
    if (provider === "anthropic") {
      // Anthropic has a different API structure
      requestBody = {
        model: model || "claude-3-haiku-20240307",
        messages: messages.map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content
        })),
        stream: true,
        max_tokens: 8192
      };
    } else if (provider === "doubao" && (model === "doubao-seedream-3-0-t2i-250415" || model === "doubao-seededit-3-0-i2i-250628")) {
      // Doubao image generation and editing models
      // Extract the prompt from the last user message
      const lastUserMessage = messages.filter((msg: any) => msg.role === "user").pop();
      const prompt = lastUserMessage?.content || "";
      
      // For image editing, we get the image URL from the request body
      let imageUrl = "";
      if (model === "doubao-seededit-3-0-i2i-250628") {
        // Get base64 image from request body
        imageUrl = body.image || "";
      }
      
      requestBody = {
        model: model,
        prompt: prompt,
        response_format: "url",
        size: "1024x1024",
        seed: 21,
        guidance_scale: 5.5,
        // watermark: true,
        watermark: false,
        stream: false // Image generation doesn't support streaming
      };
      
      // Only add image parameter for image editing model, not for text-to-image model
      if (model === "doubao-seededit-3-0-i2i-250628") {
        requestBody.image = imageUrl || "https://ark-project.tos-cn-beijing.volces.com/doc_image/seedream_i2i.jpeg"; // Default image if none provided
        // Remove size parameter for image editing model
        delete requestBody.size;
      }
    } else if (provider === "doubao" && (model === "doubao-seedance-1-0-pro-250528" || model === "doubao-seedance-1-0-lite-i2v-250428")) {
      // Doubao video generation models (both text-to-video and image-to-video)
      // Extract the prompt from the last user message
      const lastUserMessage = messages.filter((msg: any) => msg.role === "user").pop();
      const prompt = lastUserMessage?.content || "";
      
      // Check if this is the image-to-video model
      if (model === "doubao-seedance-1-0-lite-i2v-250428") {
        // For image-to-video, we need to handle image uploads
        // The images are stored in the messages as base64 data
        // Now we handle multiple images in a single message
        // Get the last user message with images
        const lastUserMessageWithImages = messages.filter((msg: any) => msg.role === "user" && (msg.image || msg.images)).pop();
        
        // Function to convert video parameters to text suffix
        const convertVideoParamsToText = (prompt: string, params: any) => {
          let text = prompt;
          if (params) {
            const paramMappings: Record<string, string> = {
              resolution: 'rs',
              aspectRatio: 'rt',
              duration: 'dur',
              fps: 'fps',
              seed: 'seed'
            };
            
            const paramValues: Record<string, any> = {
              resolution: params.resolution,
              aspectRatio: params.aspectRatio,
              duration: params.duration,
              fps: params.fps,
              seed: params.seed
            };
            
            // Add parameters to the prompt text
            Object.keys(paramMappings).forEach(key => {
              if (paramValues[key] !== undefined && paramValues[key] !== null) {
                text += ` --${paramMappings[key]} ${paramValues[key]}`;
              }
            });
          }
          return text;
        };
        
        // Convert video parameters to text suffix
        const promptWithParams = convertVideoParamsToText(prompt, videoParams);
        
        // Prepare content array with prompt and images
        const content: any[] = [
          {
            type: "text",
            text: promptWithParams
          }
        ];
        
        // Add images to content (1 or 2 images) from the last user message only
        if (lastUserMessageWithImages) {
          // Handle both single image and multiple images
          const images = lastUserMessageWithImages.images ? lastUserMessageWithImages.images : (lastUserMessageWithImages.image ? [lastUserMessageWithImages.image] : []);
          
          images.forEach((image: string, index: number) => {
            const imageContent: any = {
              type: "image_url",
              image_url: {
                url: image // Base64 encoded image
              }
            };
            
            // If we have 2 images, assign roles (first and last frame)
            if (images.length === 2) {
              imageContent.role = index === 0 ? "first_frame" : "last_frame";
            }
            
            content.push(imageContent);
          });
        }
        
        // Use the correct request body format for image-to-video generation
        requestBody = {
          model: "doubao-seedance-1-0-lite-i2v-250428",
          content: content
        };
      } else {
        // For text-to-video model (doubao-seedance-1-0-pro-250528)
        // Function to convert video parameters to text suffix
        const convertVideoParamsToText = (prompt: string, params: any) => {
          let text = prompt;
          if (params) {
            const paramMappings: Record<string, string> = {
              resolution: 'rs',
              aspectRatio: 'rt',
              duration: 'dur',
              fps: 'fps',
              seed: 'seed'
            };
            
            const paramValues: Record<string, any> = {
              resolution: params.resolution,
              aspectRatio: params.aspectRatio,
              duration: params.duration,
              fps: params.fps,
              seed: params.seed
            };
            
            // Add parameters to the prompt text
            Object.keys(paramMappings).forEach(key => {
              if (paramValues[key] !== undefined && paramValues[key] !== null) {
                text += ` --${paramMappings[key]} ${paramValues[key]}`;
              }
            });
          }
          return text;
        };
        
        // Convert video parameters to text suffix
        const promptWithParams = convertVideoParamsToText(prompt, videoParams);
        
        // Use the correct request body format for video generation
        requestBody = {
          model: "doubao-seedance-1-0-pro-250528",
          content: [
            {
              type: "text",
              text: promptWithParams
            }
          ]
        };
      }
    } else {
      // OpenAI and SiliconFlow have similar structures
      requestBody = {
        model: model || (provider === "siliconflow" ? "Qwen/Qwen2-7B-Instruct" : "gpt-3.5-turbo"),
        messages: messages,
        stream: true
      };
      
      // Add specific parameters for SiliconFlow if needed
      if (provider === "siliconflow") {
        requestBody = {
          ...requestBody,
          max_tokens: 8192,
          temperature: 0.7,
          top_p: 0.95
        };
      }
    }

    // Log the request for debugging
    console.log("API Request:", {
      url: apiUrl,
      headers,
      body: requestBody
    });

    // Make the API call
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    console.log("API Response:", {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Provider API error (${response.status}):`, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: `Provider API error: ${response.status}`,
          details: errorText,
          provider,
          model
        }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    // Special handling for Doubao image generation and editing models
    if (provider === "doubao" && (model === "doubao-seedream-3-0-t2i-250415" || model === "doubao-seededit-3-0-i2i-250628")) {
      // For image generation and editing, we return the JSON response directly
      const jsonResponse = await response.json();
      return new Response(JSON.stringify(jsonResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    
    // Special handling for Doubao video generation models
    if (provider === "doubao" && (model === "doubao-seedance-1-0-pro-250528" || model === "doubao-seedance-1-0-lite-i2v-250428")) {
      // For video generation, we need to transform the response to match our expected format
      const jsonResponse = await response.json();
      
      // Transform the response to match our expected format
      const transformedResponse = {
        data: {
          task_id: jsonResponse.id,
          status: jsonResponse.status,
          // ... other fields as needed
        }
      };
      
      return new Response(JSON.stringify(transformedResponse), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }

    // For streaming responses, we need to properly format the data
    if (!response.body) {
      throw new Error("Response body is null");
    }

    const readableStream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                // For providers that return data in SSE format
                controller.enqueue(new TextEncoder().encode(line + "\n\n"));
              } else if (line.trim() !== "") {
                // For providers that return raw data
                controller.enqueue(new TextEncoder().encode("data: " + line + "\n\n"));
              }
            }
          }
          
          // Process any remaining buffer
          if (buffer.trim() !== "") {
            if (buffer.startsWith("data: ")) {
              controller.enqueue(new TextEncoder().encode(buffer + "\n\n"));
            } else {
              controller.enqueue(new TextEncoder().encode("data: " + buffer + "\n\n"));
            }
          }
          
          controller.close();
          reader.releaseLock();
        } catch (error) {
          controller.error(error);
          reader.releaseLock();
        }
      }
    });

    return new Response(readableStream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      }
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
