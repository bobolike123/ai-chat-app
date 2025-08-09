import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    const { taskId } = params;
    
    // Get the Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Validate taskId
    if (!taskId) {
      return new Response(
        JSON.stringify({ error: "Task ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Call the Doubao API to get task status
    const response = await fetch(
      `https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        }
      }
    );
    
    const responseData = await response.json();
    
    // Transform the response to match our expected format
    let transformedData: any = {
      task_id: responseData.id,
      status: responseData.status,
      video_url: null,
      // Add video parameters
      video_params: responseData.video_params || null
    };
    
    // If the task is successful, extract the video URL and parameters
    if (responseData.status === "succeeded" && responseData.content?.video_url) {
      transformedData.video_url = responseData.content.video_url;
      // Extract video parameters if available
      if (responseData.content?.video_parameters) {
        transformedData.video_params = responseData.content.video_parameters;
      }
    }
    
    // If the task failed, include error details
    if (responseData.status === "failed" && responseData.error) {
      return new Response(
        JSON.stringify({ 
          data: transformedData,
          error: responseData.error
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ data: transformedData }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Task status API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
