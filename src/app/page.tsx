"use client";

import { useState, useRef, useEffect } from "react";
import VideoParamsModal from "./components/VideoParamsModal";

// Simple Markdown parser
const parseMarkdown = (text: string) => {
  if (!text) return text;

  // Convert blockquotes (> quote)
  text = text.replace(/^> (.*)$/gm, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 my-2">$1</blockquote>');

  // Convert horizontal rules (--- or ***)
  text = text.replace(/^[-*]{3,}$/gm, '<hr class="my-4 border-gray-300 dark:border-gray-600">');

  // Convert code blocks (```code```)
  text = text.replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-800 text-gray-100 p-4 rounded-lg my-2 overflow-x-auto"><code>$1</code></pre>');

  // Convert inline code (`code`)
  text = text.replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded">$1</code>');

  // Convert bold (**bold** or __bold__)
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/__(.*?)__/g, '<strong>$1</strong>');

  // Convert italic (*italic* or _italic_)
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  text = text.replace(/_(.*?)_/g, '<em>$1</em>');

  // Convert strikethrough (~~strikethrough~~)
  text = text.replace(/~~(.*?)~~/g, '<del>$1</del>');

  // Convert headers (# Header)
  text = text.replace(/^###### (.*$)/gm, '<h6 class="text-base font-bold my-2">$1</h6>');
  text = text.replace(/^##### (.*$)/gm, '<h5 class="text-lg font-bold my-2">$1</h5>');
  text = text.replace(/^#### (.*$)/gm, '<h4 class="text-xl font-bold my-2">$1</h4>');
  text = text.replace(/^### (.*$)/gm, '<h3 class="text-2xl font-bold my-2">$1</h3>');
  text = text.replace(/^## (.*$)/gm, '<h2 class="text-3xl font-bold my-3">$1</h2>');
  text = text.replace(/^# (.*$)/gm, '<h1 class="text-4xl font-bold my-4">$1</h1>');

  // Convert links ([text](url))
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');

  // Convert images (![alt](url))
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-2">');

  // Convert tables
  text = text.replace(/(\|(?:[^\n]*\|)+)(?:\r?\n\|(?:(:?-+:?)\|)+)(?:\r?\n(\|(?:[^\n]*\|)+))+/g, (match) => {
    const lines = match.split('\n');
    if (lines.length < 2) return match;

    // Parse header
    const headerLine = lines[0].trim();
    const headerCells = headerLine.split('|').filter(cell => cell !== '').map(cell => cell.trim());

    // Parse alignment from separator line
    const separatorLine = lines[1].trim();
    const separators = separatorLine.split('|').filter(cell => cell !== '').map(cell => cell.trim());
    const alignments = separators.map(separator => {
      if (separator.startsWith(':') && separator.endsWith(':')) return 'center';
      if (separator.startsWith(':')) return 'left';
      if (separator.endsWith(':')) return 'right';
      return 'left';
    });

    // Parse body rows
    const bodyLines = lines.slice(2);
    const bodyRows = bodyLines.map(line => {
      const cells = line.trim().split('|').filter(cell => cell !== '').map(cell => cell.trim());
      return cells;
    });

    // Generate HTML table
    let tableHtml = '<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';

    // Table head
    tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800">';
    tableHtml += '<tr>';
    headerCells.forEach((cell, index) => {
      const alignClass = alignments[index] === 'center' ? 'text-center' :
        alignments[index] === 'right' ? 'text-right' : 'text-left';
      tableHtml += `<th scope="col" class="px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${alignClass}">${parseMarkdown(cell)}</th>`;
    });
    tableHtml += '</tr>';
    tableHtml += '</thead>';

    // Table body
    tableHtml += '<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">';
    bodyRows.forEach((row, rowIndex) => {
      const bgClass = rowIndex % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-800';
      tableHtml += `<tr class="${bgClass}">`;
      row.forEach((cell, cellIndex) => {
        const alignClass = alignments[cellIndex] === 'center' ? 'text-center' :
          alignments[cellIndex] === 'right' ? 'text-right' : 'text-left';
        tableHtml += `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 ${alignClass}">${parseMarkdown(cell)}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody>';
    tableHtml += '</table>';

    return tableHtml;
  });

  // Convert task lists (- [ ] item or - [x] item or * [ ] item or * [x] item)
  text = text.replace(/^([\*\-]) \[ \] (.*)$/gm, '<li class="ml-4 flex items-start"><input type="checkbox" disabled class="mr-2 mt-1"> $2</li>');
  text = text.replace(/^([\*\-]) \[x\] (.*)$/gm, '<li class="ml-4 flex items-start"><input type="checkbox" checked disabled class="mr-2 mt-1"> $2</li>');

  // Convert unordered lists (* item or - item or + item)
  text = text.replace(/^[\*\-\+] (.*$)/gm, '<li class="ml-4">$1</li>');
  text = text.replace(/<li class="ml-4">(.*)<\/li>/g, '<ul class="list-disc my-2 ml-4"><li class="ml-4">$1</li></ul>');
  text = text.replace(/<\/ul>\n<ul class="list-disc my-2 ml-4">/g, '');

  // Convert ordered lists (1. item)
  text = text.replace(/^\d+\. (.*$)/gm, '<li class="ml-4">$1</li>');
  text = text.replace(/<li class="ml-4">(.*)<\/li>/g, '<ol class="list-decimal my-2 ml-4"><li class="ml-4">$1</li></ol>');
  text = text.replace(/<\/ol>\n<ol class="list-decimal my-2 ml-4">/g, '');

  // Convert line breaks to <br> tags (but not before closing tags)
  text = text.replace(/\n/g, '<br>');
  text = text.replace(/<br>(<\/?(h1|h2|h3|h4|h5|h6|ul|ol|pre|code|strong|em|a|table|thead|tbody|tr|th|td|blockquote|hr|del|img)[^>]*>)/g, '$1');

  return text;
};

export default function Home() {
  // State for API configuration
  const [provider, setProvider] = useState("siliconflow");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    siliconflow: "",
    doubao: "",
    openai: "",
    anthropic: ""
  });
  
  // Get the current API key for the selected provider
  const apiKey = apiKeys[provider] || "";
  
  // Update the API key for the selected provider
  const updateApiKey = (key: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: key
    }));
  };
  const [models, setModels] = useState<Array<string>>([]);
  const [selectedModel, setSelectedModel] = useState("");

  // State for chat functionality
  const [messages, setMessages] = useState<Array<{
    role: string,
    content: string,
    image?: string, // Base64 image for user messages (single image)
    images?: string[], // Base64 images for user messages (multiple images)
    thinkingProcess?: string,
    showThinking?: boolean
  }>>([]);

  // State for file upload
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<Array<{file: File, base64: string}>>([]);

  // State for chat history
  const [chatHistory, setChatHistory] = useState<Array<{
    id: string,
    title: string,
    messages: Array<{
      role: string,
      content: string,
      image?: string, // Base64 image for user messages (single image)
      images?: string[], // Base64 images for user messages (multiple images)
      thinkingProcess?: string,
      showThinking?: boolean
    }>,
    createdAt: Date
  }>>([]);
  const [currentChatId, setCurrentChatId] = useState<string>("");
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // State for theme
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [colorScheme, setColorScheme] = useState<"blue" | "green" | "purple">("blue");

  // State for video generation
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isImageToVideoModalOpen, setIsImageToVideoModalOpen] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [imageToVideoParams, setImageToVideoParams] = useState<any>(null);

  // Ref for auto-scrolling to bottom of chat
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  // Load saved data from localStorage on component mount
  useEffect(() => {
    const savedApiKeys = localStorage.getItem("apiKeys");
    const savedProvider = localStorage.getItem("provider");
    const savedModel = localStorage.getItem("selectedModel");
    const savedChatHistory = localStorage.getItem("chatHistory");
    const savedCurrentChatId = localStorage.getItem("currentChatId");

    if (savedApiKeys) {
      // Load saved API keys for all providers
      try {
        const parsedKeys = JSON.parse(savedApiKeys);
        setApiKeys(parsedKeys);
      } catch (e) {
        console.error("Failed to parse API keys:", e);
      }
    }
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) setSelectedModel(savedModel);
    if (savedChatHistory) {
      try {
        const parsedHistory = JSON.parse(savedChatHistory);
        // When loading from localStorage, we need to handle base64 images properly
        // For now, we'll just load the chat history as is, but in a real implementation
        // we might want to handle image restoration differently
        setChatHistory(parsedHistory);
      } catch (e) {
        console.error("Failed to parse chat history:", e);
      }
    }
    if (savedCurrentChatId) {
      setCurrentChatId(savedCurrentChatId);
      // Load messages for the current chat
      try {
        const history = JSON.parse(savedChatHistory || "[]");
        const currentChat = history.find((chat: any) => chat.id === savedCurrentChatId);
        if (currentChat) setMessages(currentChat.messages);
      } catch (e) {
        console.error("Failed to load current chat:", e);
      }
    }
  }, []);

  // Auto-scroll to the latest chat in the sidebar
  const chatHistoryRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (chatHistoryRef.current) {
      // Scroll to the bottom of the chat history
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [chatHistory]);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("apiKeys", JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save provider to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("provider", provider);
  }, [provider]);

  // Save selected model to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("selectedModel", selectedModel);
  }, [selectedModel]);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    // When saving to localStorage, we need to handle base64 images properly
    // to avoid localStorage size limits
    const chatHistoryToSave = chatHistory.map(chat => ({
      ...chat,
      messages: chat.messages.map(message => {
        // For user messages with images, we'll save a placeholder instead of the full base64
        if (message.role === "user" && (message.image || message.images)) {
          return {
            ...message,
            // Remove the base64 image data to reduce storage size
            image: message.image ? "[image_data]" : undefined,
            images: message.images ? message.images.map(() => "[image_data]") : undefined
          };
        }
        return message;
      })
    }));
    
    try {
      localStorage.setItem("chatHistory", JSON.stringify(chatHistoryToSave));
    } catch (e) {
      console.error("Failed to save chat history to localStorage:", e);
      // If we can't save to localStorage, we'll just not save the history
      // In a real implementation, we might want to show an error message to the user
    }
  }, [chatHistory]);

  // Save current chat ID to localStorage whenever it changes
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem("currentChatId", currentChatId);
    }
  }, [currentChatId]);

  // Update chat history when messages change
  useEffect(() => {
    if (messages.length > 0 || currentChatId) {
      // If we have a current chat ID, update that chat
      if (currentChatId) {
        setChatHistory(prev => {
          const existingChatIndex = prev.findIndex(chat => chat.id === currentChatId);
          if (existingChatIndex >= 0) {
            // Update existing chat
            const updatedHistory = [...prev];
            // Generate title from the first user message
            let newTitle = "新聊天";
            // First, try to get title from the current chat's first user message
            const firstUserMessage = updatedHistory[existingChatIndex].messages.find(msg => msg.role === "user");
            if (firstUserMessage && firstUserMessage.content) {
              newTitle = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "");
            } 
            // If no title found in existing chat, try to get it from current messages
            else if (messages.length > 0) {
              const firstUserMessageInCurrent = messages.find(msg => msg.role === "user");
              if (firstUserMessageInCurrent && firstUserMessageInCurrent.content) {
                newTitle = firstUserMessageInCurrent.content.substring(0, 30) + (firstUserMessageInCurrent.content.length > 30 ? "..." : "");
              }
            }
            
            updatedHistory[existingChatIndex] = {
              ...updatedHistory[existingChatIndex],
              messages,
              title: updatedHistory[existingChatIndex].title || newTitle
            };
            return updatedHistory;
          } else {
            // Create new chat - get title from current messages
            let title = "新聊天";
            const firstUserMessage = messages.find(msg => msg.role === "user");
            if (firstUserMessage && firstUserMessage.content) {
              title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "");
            }
            
            const newChat = {
              id: currentChatId,
              title,
              messages,
              createdAt: new Date()
            };
            return [...prev, newChat];
          }
        });
      } else {
        // No current chat ID - this happens when we have messages but no chat ID yet
        // This should create a new chat ID
        if (messages.length > 0) {
          const newChatId = Date.now().toString();
          setCurrentChatId(newChatId);
          
          let title = "新聊天";
          const firstUserMessage = messages.find(msg => msg.role === "user");
          if (firstUserMessage && firstUserMessage.content) {
            title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? "..." : "");
          }
          
          setChatHistory(prev => [
            ...prev,
            {
              id: newChatId,
              title,
              messages,
              createdAt: new Date()
            }
          ]);
        }
      }
    }
  }, [messages, currentChatId]);

  // Define model tags
  const getModelTag = (model: string) => {
    // SiliconFlow models - chat models
    if (model.includes("Qwen/Qwen3-235B-A22B-Thinking-2507") || 
        model.includes("Qwen/Qwen3-235B-A22B-Instruct-2507") || 
        model.includes("deepseek-ai/DeepSeek-R1") || 
        model.includes("deepseek-ai/DeepSeek-V3")) {
      return { tag: "聊天模型", color: "blue" };
    }
    
    // Doubao models
    if (model === "doubao-seedream-3-0-t2i-250415") {
      return { tag: "文生图", color: "green" };
    }
    
    if (model === "doubao-seedance-1-0-pro-250528") {
      return { tag: "文生视频", color: "purple" };
    }
    
    if (model === "doubao-seededit-3-0-i2i-250628") {
      return { tag: "图片编辑", color: "orange" };
    }
    
    if (model === "doubao-seedance-1-0-lite-i2v-250428") {
      return { tag: "图生视频", color: "red" };
    }
    
    // Default chat models
    if (provider === "openai" || provider === "anthropic" || provider === "siliconflow") {
      return { tag: "聊天模型", color: "blue" };
    }
    
    return { tag: "聊天模型", color: "blue" };
  };

  // Fetch models when provider or API key changes
  useEffect(() => {
    if (!apiKey) {
      setModels([]);
      setSelectedModel("");
      return;
    }

    // Set default models based on provider
    let defaultModels: string[] = [];
    switch (provider) {
      case "siliconflow":
        defaultModels = [
          "Qwen/Qwen3-235B-A22B-Thinking-2507",
          "Qwen/Qwen3-235B-A22B-Instruct-2507",
          "deepseek-ai/DeepSeek-R1",
          "deepseek-ai/DeepSeek-V3",
          // "Qwen/Qwen2.5-7B-Instruct",
          // "Qwen/Qwen2-7B-Instruct",
          // "THUDM/glm-4-9b-chat",
          // "THUDM/chatglm3-6b",
          // "01-ai/Yi-1.5-9B-Chat-16K",
          // "01-ai/Yi-1.5-34B-Chat-16K"
        ];
        break;
      case "doubao":
        defaultModels = [
          "doubao-seedream-3-0-t2i-250415",
          "doubao-seedance-1-0-pro-250528",
          "doubao-seededit-3-0-i2i-250628",
          "doubao-seedance-1-0-lite-i2v-250428"
        ];
        break;
      case "openai":
        defaultModels = [
          "gpt-4o",
          "gpt-4o-mini",
          "gpt-4-turbo",
          "gpt-4",
          "gpt-3.5-turbo"
        ];
        break;
      case "anthropic":
        defaultModels = [
          "claude-3-5-sonnet-20240620",
          "claude-3-opus-20240229",
          "claude-3-sonnet-20240229",
          "claude-3-haiku-20240307"
        ];
        break;
      default:
        defaultModels = [];
    }

    setModels(defaultModels);
    setSelectedModel(defaultModels[0] || "");
  }, [provider, apiKey]);

  // Auto-scroll to bottom of chat when messages change, but only if user is near the bottom
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      // Check if user is near the bottom (within 100px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      // Fallback to auto-scroll if we can't determine scroll position
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Test Markdown functionality
  //   const testMarkdown = () => {
  //     const testMessage = {
  //       role: "assistant",
  //       content: `
  // # Markdown 测试

  // ## 标题测试

  // ### 这是一个 H3 标题

  // **粗体文本** 和 *斜体文本* 以及 ~~删除线文本~~

  // [链接测试](https://www.example.com)

  // ![图片测试](https://via.placeholder.com/150)

  // > 这是一个引用块
  // ---
  // \`\`\`javascript
  // console.log('代码块测试');
  // \`

  // 任务列表:
  // - [ ] 未完成任务项 1
  // - [x] 已完成任务项 2
  // - [ ] 未完成任务项 3

  // 无序列表:
  // - 无序列表项 1
  // - 无序列表项 2
  //   - 嵌套列表项

  // 有序列表:
  // 1. 有序列表项 1
  // 2. 有序列表项 2

  // 表格:
  // | 列 1 | 列 2 | 列 3 |
  // | ---- | ---- | ---- |
  // | 单元格 1 | 单元格 2 | 单元格 3 |
  // | 单元格 4 | 单元格 5 | 单元格 6 |
  // `
  //     };

  //     setMessages([testMessage]);
  //   };

  // Ref for aborting fetch requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Function to handle file upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);
    setUploadedFiles(fileArray);

    // Process each file
    let fileContents = "";
    for (const file of fileArray) {
      try {
        // For image files, create a preview URL
        if (file.type.startsWith("image/")) {
          // Validate image file
          if (!["image/jpeg", "image/png"].includes(file.type)) {
            alert("图片格式不支持。仅支持 JPEG 和 PNG 格式。");
            continue;
          }
          
          // Check file size (10MB limit)
          if (file.size > 10 * 1024 * 1024) {
            alert("图片文件大小超过 10MB 限制。");
            continue;
          }
          
          // Create a preview URL for the image
          const imageUrl = URL.createObjectURL(file);
          
          // For Doubao image editing model, we need to validate dimensions
          if (provider === "doubao" && (selectedModel === "doubao-seededit-3-0-i2i-250628" || selectedModel === "doubao-seedance-1-0-lite-i2v-250428")) {
            // Create an image element to check dimensions
            const img = new Image();
            img.onload = () => {
              // Validate image properties based on the model
              if (selectedModel === "doubao-seededit-3-0-i2i-250628") {
                // Image editing model validation
                const aspectRatio = img.width / img.height;
                if (aspectRatio <= 1/3 || aspectRatio >= 3) {
                  alert("图片宽高比不符合要求。宽高比（宽/高）应在范围 (1/3, 3) 内。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
                
                if (img.width <= 14 || img.height <= 14) {
                  alert("图片宽高长度不符合要求。宽高长度（px）应大于 14。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
              } else if (selectedModel === "doubao-seedance-1-0-lite-i2v-250428") {
                // Image-to-video model validation
                // Check file size (30MB limit)
                if (file.size > 30 * 1024 * 1024) {
                  alert("图片文件大小超过 30MB 限制。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
                
                // Check dimensions
                const aspectRatio = img.width / img.height;
                if (aspectRatio <= 0.4 || aspectRatio >= 2.5) {
                  alert("图片宽高比不符合要求。宽高比（宽/高）应在范围 (0.4, 2.5) 内。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
                
                if (img.width <= 300 || img.width >= 6000 || img.height <= 300 || img.height >= 6000) {
                  alert("图片宽高长度不符合要求。宽高长度（px）应在范围 (300, 6000) 内。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
              }
              
              // Convert image to base64
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (ctx) {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Convert to base64 with proper format
                const base64 = canvas.toDataURL(file.type);
                // Limit to 2 images for image-to-video model
                if (selectedModel === "doubao-seedance-1-0-lite-i2v-250428" && uploadedImages.length >= 2) {
                  alert("图生视频模型最多支持上传2张图片。");
                  URL.revokeObjectURL(imageUrl); // Clean up the object URL
                  return;
                }
                setUploadedImages(prev => [...prev, { file, base64 }]);
              } else {
                alert("无法读取图片文件。");
                URL.revokeObjectURL(imageUrl); // Clean up the object URL
                return;
              }
            };
            img.onerror = () => {
              alert("无法读取图片文件。");
              URL.revokeObjectURL(imageUrl); // Clean up the object URL
            };
            img.src = imageUrl;
          } else {
            // For other models, just add the image to input as markdown
            const imageMarkdown = `\n![${file.name}](${imageUrl})\n`;
            setInput(prevInput => prevInput + imageMarkdown);
          }
        } else {
          // For text files, read directly
          let content = ""; // Declare the content variable
          if (file.type === "text/plain" || file.name.endsWith(".txt")) {
            content = await file.text();
          } 
          // For PDF files
          else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            content = await file.text(); // For now, we'll just read them as text
            // In a real implementation, we would use a library like pdfjs-dist to parse PDF files
          }
          // For Word documents
          else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || 
                   file.name.endsWith(".docx")) {
            content = await file.text(); // For now, we'll just read them as text
            // In a real implementation, we would use a library like mammoth to parse DOCX files
          }
          else if (file.type === "application/msword" || file.name.endsWith(".doc")) {
            content = await file.text(); // For now, we'll just read them as text
            // In a real implementation, we would use a library like mammoth to parse DOC files
          }
          // For Excel files
          else if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
                   file.name.endsWith(".xlsx")) {
            content = await file.text(); // For now, we'll just read them as text
            // In a real implementation, we would use a library like xlsx to parse XLSX files
          }
          else if (file.type === "application/vnd.ms-excel" || file.name.endsWith(".xls")) {
            content = await file.text(); // For now, we'll just read them as text
            // In a real implementation, we would use a library like xlsx to parse XLS files
          }
          // For other file types, we would need to use a library to parse them
          else {
            content = await file.text();
          }
          
          fileContents += `\n\n文件名: ${file.name}\n文件内容:\n${content}`;
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        fileContents += `\n\n文件名: ${file.name}\n文件内容: 读取文件时发生错误`;
      }
    }

    // Add file contents to input (for non-image files)
    if (fileContents) {
      setInput(prevInput => prevInput + fileContents);
    }
  };

  // Function to reset file input to allow selecting the same file again
  const resetFileInput = (input: HTMLInputElement | null) => {
    if (input) {
      input.value = '';
    }
  };

  // Function to handle video generation
  const handleVideoGeneration = async (params: any) => {
    // Add user message to chat
    const userMessage = { role: "user", content: videoPrompt };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Add a placeholder for the assistant's response
    const assistantMessage = { role: "assistant", content: "正在生成视频，请稍候..." };
    setMessages([...newMessages, assistantMessage]);
    setIsLoading(true);
    setInput(""); // Clear input after sending

    try {
      // Call the API for video generation
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          apiKey,
          provider,
          model: selectedModel,
          videoParams: params // Pass video parameters
        })
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // For video generation, we don't stream the response
      const responseData = await response.json();
      
      // Check if we have an error in the response
      if (responseData.error) {
        // Handle error case and display error details in the chat
        let errorMessage = `错误: ${responseData.error}`;
        if (responseData.details) {
          try {
            // Try to parse the details as JSON
            const details = JSON.parse(responseData.details);
            if (details.error && details.error.message) {
              errorMessage += `\n详细信息: ${details.error.message}`;
            } else {
              errorMessage += `\n详细信息: ${responseData.details}`;
            }
          } catch (e) {
            // If parsing fails, display the details as-is
            errorMessage += `\n详细信息: ${responseData.details}`;
          }
        }
        
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: errorMessage }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check if we have task data
      if (responseData.data && responseData.data.task_id) {
        // Update message to show that task is in progress
        setMessages(prev => {
          const updatedMessages = [...prev];
          if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
            updatedMessages[updatedMessages.length - 1].content = "视频正在生成，请稍等...";
          }
          return updatedMessages;
        });
        
        // Start polling for task completion using setInterval
        const taskId = responseData.data.task_id;
        let pollInterval: NodeJS.Timeout | null = null;
        const startTime = Date.now(); // Record start time
        
        // Function to check task status
        const checkTaskStatus = async () => {
          try {
            // Query task status
            const taskResponse = await fetch(`/api/chat/task/${taskId}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            });
            
            const taskData = await taskResponse.json();
            
            // Update progress in the chat
            if (taskData.data) {
              // Calculate elapsed time
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              let progressMessage = `视频正在生成中，请稍等... (已等待 ${elapsedTime} 秒)`;
              
              // Add status information if available
              if (taskData.data.status) {
                progressMessage += `\n状态: ${taskData.data.status}`;
              }
              
              setMessages(prev => {
                const updatedMessages = [...prev];
                if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                  updatedMessages[updatedMessages.length - 1].content = progressMessage;
                }
                return updatedMessages;
              });
              
              // Check task status and handle accordingly
              switch (taskData.data.status) {
                case "succeeded":
                  // Task succeeded, display the video with parameters
                  if (taskData.data.video_url) {
                    // Clear the polling interval
                    if (pollInterval) {
                      clearInterval(pollInterval);
                    }
                    
                    // Calculate generation time
                    const generationTime = Math.floor((Date.now() - startTime) / 1000);
                    
                    // Create video display with parameters
                    let videoElement = `<div class="video-container">`;
                    
                    // Add video parameters
                    videoElement += `<div class="video-params text-sm text-gray-600 dark:text-gray-400 mb-2">`;
                    videoElement += `生成耗时: ${generationTime}秒`;
                    
                    // Add video parameters if available
                    if (taskData.data.video_params) {
                      const params = taskData.data.video_params;
                      if (params.file_size) {
                        // Convert file size to MB
                        const fileSizeMB = (params.file_size / (1024 * 1024)).toFixed(2);
                        videoElement += ` | 文件大小: ${fileSizeMB} MB`;
                      }
                      if (params.duration) {
                        videoElement += ` | 视频时长: ${params.duration}秒`;
                      }
                      if (params.fps) {
                        videoElement += ` | 帧率: ${params.fps} FPS`;
                      }
                      if (params.resolution) {
                        videoElement += ` | 分辨率: ${params.resolution}`;
                      }
                    }
                    
                    videoElement += `</div>`;
                    
                    // Add video element
                    videoElement += `<video controls class="max-w-full h-auto rounded-lg my-2">
                      <source src="${taskData.data.video_url}" type="video/mp4">
                      您的浏览器不支持视频播放。
                    </video>`;
                    
                    videoElement += `</div>`;
                    
                    setMessages(prev => {
                      const updatedMessages = [...prev];
                      if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                        updatedMessages[updatedMessages.length - 1].content = videoElement;
                      }
                      return updatedMessages;
                    });
                  }
                  setIsLoading(false);
                  break;
                  
                case "failed":
                  // Task failed, show error message with details
                  if (pollInterval) {
                    clearInterval(pollInterval);
                  }
                  
                  // Extract error details if available
                  let errorMessage = "抱歉，视频生成失败。";
                  if (taskData.error) {
                    errorMessage += `\n错误详情: ${taskData.error.message || taskData.error}`;
                  }
                  
                  setMessages(prev => [
                    ...prev,
                    { role: "assistant", content: errorMessage }
                  ]);
                  setIsLoading(false);
                  break;
                  
                case "queued":
                case "running":
                  // Task is still in progress, continue polling
                  // We don't need to do anything here, the interval will continue
                  break;
                  
                default:
                  // Unknown status, but we'll continue polling
                  break;
              }
            }
          } catch (error) {
            console.error("Error checking task status:", error);
            
            // Clear the polling interval on error
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            
            setMessages(prev => [
              ...prev,
              { role: "assistant", content: "抱歉，视频生成过程中出现错误，请检查您的API密钥并重试。" }
            ]);
            setIsLoading(false);
          }
        };
        
        // Start polling every 2 seconds (infinite polling until success or failure)
        pollInterval = setInterval(checkTaskStatus, 2000);
      } else {
        // Handle error case
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "抱歉，视频生成失败，请稍后重试。" }
        ]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "抱歉，视频生成过程中出现错误，请检查您的API密钥并重试。" }
      ]);
      setIsLoading(false);
    }
  };

  // Function to handle image-to-video generation
  const handleImageToVideoGeneration = async (params: any) => {
    // Add user message to chat with uploaded images
    const userMessage = { 
      role: "user", 
      content: videoPrompt,
      // For image-to-video model, we need to store all uploaded images
      images: uploadedImages.length > 0 ? uploadedImages.map(img => img.base64) : undefined
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput(""); // Clear input after sending
    setUploadedFiles([]); // Clear uploaded files
    setUploadedImages([]); // Clear uploaded images
    setIsLoading(true);

    try {
      // Add a placeholder for the assistant's response
      const assistantMessage = { role: "assistant", content: "正在生成视频，请稍候..." };
      setMessages([...newMessages, assistantMessage]);

      // Call the API for image-to-video generation
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          apiKey,
          provider,
          model: selectedModel,
          videoParams: params // Pass video parameters
        })
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // For video generation, we don't stream the response
      const responseData = await response.json();
      
      // Check if we have an error in the response
      if (responseData.error) {
        // Handle error case and display error details in the chat
        let errorMessage = `错误: ${responseData.error}`;
        if (responseData.details) {
          try {
            // Try to parse the details as JSON
            const details = JSON.parse(responseData.details);
            if (details.error && details.error.message) {
              errorMessage += `\n详细信息: ${details.error.message}`;
            } else {
              errorMessage += `\n详细信息: ${responseData.details}`;
            }
          } catch (e) {
            // If parsing fails, display the details as-is
            errorMessage += `\n详细信息: ${responseData.details}`;
          }
        }
        
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: errorMessage }
        ]);
        setIsLoading(false);
        return;
      }
      
      // Check if we have task data
      if (responseData.data && responseData.data.task_id) {
        // Update message to show that task is in progress
        setMessages(prev => {
          const updatedMessages = [...prev];
          if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
            updatedMessages[updatedMessages.length - 1].content = "视频正在生成，请稍等...";
          }
          return updatedMessages;
        });
        
        // Start polling for task completion using setInterval
        const taskId = responseData.data.task_id;
        let pollInterval: NodeJS.Timeout | null = null;
        const startTime = Date.now(); // Record start time
        
        // Function to check task status
        const checkTaskStatus = async () => {
          try {
            // Query task status
            const taskResponse = await fetch(`/api/chat/task/${taskId}`, {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              }
            });
            
            const taskData = await taskResponse.json();
            
            // Update progress in the chat
            if (taskData.data) {
              // Calculate elapsed time
              const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
              let progressMessage = `视频正在生成中，请稍等... (已等待 ${elapsedTime} 秒)`;
              
              // Add status information if available
              if (taskData.data.status) {
                progressMessage += `\n状态: ${taskData.data.status}`;
              }
              
              setMessages(prev => {
                const updatedMessages = [...prev];
                if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                  updatedMessages[updatedMessages.length - 1].content = progressMessage;
                }
                return updatedMessages;
              });
              
              // Check task status and handle accordingly
              switch (taskData.data.status) {
                case "succeeded":
                  // Task succeeded, display the video with parameters
                  if (taskData.data.video_url) {
                    // Clear the polling interval
                    if (pollInterval) {
                      clearInterval(pollInterval);
                    }
                    
                    // Calculate generation time
                    const generationTime = Math.floor((Date.now() - startTime) / 1000);
                    
                    // Create video display with parameters
                    let videoElement = `<div class="video-container">`;
                    
                    // Add video parameters
                    videoElement += `<div class="video-params text-sm text-gray-600 dark:text-gray-400 mb-2">`;
                    videoElement += `生成耗时: ${generationTime}秒`;
                    
                    // Add video parameters if available
                    if (taskData.data.video_params) {
                      const params = taskData.data.video_params;
                      if (params.file_size) {
                        // Convert file size to MB
                        const fileSizeMB = (params.file_size / (1024 * 1024)).toFixed(2);
                        videoElement += ` | 文件大小: ${fileSizeMB} MB`;
                      }
                      if (params.duration) {
                        videoElement += ` | 视频时长: ${params.duration}秒`;
                      }
                      if (params.fps) {
                        videoElement += ` | 帧率: ${params.fps} FPS`;
                      }
                      if (params.resolution) {
                        videoElement += ` | 分辨率: ${params.resolution}`;
                      }
                    }
                    
                    videoElement += `</div>`;
                    
                    // Add video element
                    videoElement += `<video controls class="max-w-full h-auto rounded-lg my-2">
                      <source src="${taskData.data.video_url}" type="video/mp4">
                      您的浏览器不支持视频播放。
                    </video>`;
                    
                    videoElement += `</div>`;
                    
                    setMessages(prev => {
                      const updatedMessages = [...prev];
                      if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                        updatedMessages[updatedMessages.length - 1].content = videoElement;
                      }
                      return updatedMessages;
                    });
                  }
                  setIsLoading(false);
                  break;
                  
                case "failed":
                  // Task failed, show error message with details
                  if (pollInterval) {
                    clearInterval(pollInterval);
                  }
                  
                  // Extract error details if available
                  let errorMessage = "抱歉，视频生成失败。";
                  if (taskData.error) {
                    errorMessage += `\n错误详情: ${taskData.error.message || taskData.error}`;
                  }
                  
                  setMessages(prev => [
                    ...prev,
                    { role: "assistant", content: errorMessage }
                  ]);
                  setIsLoading(false);
                  break;
                  
                case "queued":
                case "running":
                  // Task is still in progress, continue polling
                  // We don't need to do anything here, the interval will continue
                  break;
                  
                default:
                  // Unknown status, but we'll continue polling
                  break;
              }
            }
          } catch (error) {
            console.error("Error checking task status:", error);
            
            // Clear the polling interval on error
            if (pollInterval) {
              clearInterval(pollInterval);
            }
            
            setMessages(prev => [
              ...prev,
              { role: "assistant", content: "抱歉，视频生成过程中出现错误，请检查您的API密钥并重试。" }
            ]);
            setIsLoading(false);
          }
        };
        
        // Start polling every 2 seconds (infinite polling until success or failure)
        pollInterval = setInterval(checkTaskStatus, 2000);
      } else {
        // Handle error case
        setMessages(prev => [
          ...prev,
          { role: "assistant", content: "抱歉，视频生成失败，请稍后重试。" }
        ]);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "抱歉，视频生成过程中出现错误，请检查您的API密钥并重试。" }
      ]);
      setIsLoading(false);
    }
  };

  // Function to handle sending messages
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check if we're using the Doubao video generation model (both text-to-video and image-to-video)
    if (provider === "doubao" && (selectedModel === "doubao-seedance-1-0-pro-250528" || selectedModel === "doubao-seedance-1-0-lite-i2v-250428")) {
      // For image-to-video model, open the video parameters modal
      if (selectedModel === "doubao-seedance-1-0-lite-i2v-250428") {
        // Check if we have uploaded images for image-to-video
        if (uploadedImages.length > 0) {
          // Open video parameters modal for image-to-video
          setVideoPrompt(input);
          setIsImageToVideoModalOpen(true);
          // Don't clear input here, we'll clear it after the modal is confirmed
          return;
        }
      } else {
        // Open video parameters modal for text-to-video
        setVideoPrompt(input);
        setIsVideoModalOpen(true);
        setInput("");
        return;
      }
    }

    // Add user message to chat
    const userMessage = { 
      role: "user", 
      content: input,
      // For image-to-video model, we need to store all uploaded images
      images: uploadedImages.length > 0 ? uploadedImages.map(img => img.base64) : undefined
    };
    
    // For image-to-video model, we might want to store all images in separate messages
    // But for now, we'll keep the existing structure and handle multiple images in the API
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setUploadedFiles([]); // Clear uploaded files
    setUploadedImages([]); // Clear uploaded images
    setIsLoading(true);

    // Update chat title with the first user message content if it's the first message
    if (messages.length === 0 && currentChatId) {
      // Get the first 30 characters of the user's message as the title
      const title = userMessage.content.substring(0, 30) + (userMessage.content.length > 30 ? "..." : "");
      
      // Update the chat history with the new title
      setChatHistory(prev => {
        const updatedHistory = [...prev];
        const chatIndex = updatedHistory.findIndex(chat => chat.id === currentChatId);
        if (chatIndex >= 0) {
          updatedHistory[chatIndex] = {
            ...updatedHistory[chatIndex],
            title: title
          };
        }
        return updatedHistory;
      });
    }

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();

    try {
      // Add a placeholder for the assistant's response
      const assistantMessage = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMessage]);

      // For Doubao image editing model, we need to include the image URL in the request
      const requestBody: any = {
        messages: newMessages,
        apiKey,
        provider,
        model: selectedModel,
      };
      
      // If we have an uploaded image for the Doubao image editing model, include it in the request
      if (provider === "doubao" && selectedModel === "doubao-seededit-3-0-i2i-250628" && uploadedImages.length > 0) {
        // Add the base64 image to the request body with proper format
        requestBody.image = uploadedImages[0].base64;
      }

      // Call the API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!response.body) {
        throw new Error("Response body is null");
      }

      // Check if we're using DeepSeek-R1 model or Qwen/Qwen3-235B-A22B-Thinking-2507 model
      const isDeepSeekR1 = selectedModel.includes("DeepSeek-R1");
      const isQwenThinking = selectedModel.includes("Qwen/Qwen3-235B-A22B-Thinking-2507");

      // Special handling for Doubao video generation models (both text-to-video and image-to-video)
      if (provider === "doubao" && (selectedModel === "doubao-seedance-1-0-pro-250528" || selectedModel === "doubao-seedance-1-0-lite-i2v-250428")) {
        // For video generation, we don't stream the response
        const responseData = await response.json();
        
        // Check if we have an error in the response
        if (responseData.error) {
          // Handle error case and display error details in the chat
          let errorMessage = `错误: ${responseData.error}`;
          if (responseData.details) {
            try {
              // Try to parse the details as JSON
              const details = JSON.parse(responseData.details);
              if (details.error && details.error.message) {
                errorMessage += `\n详细信息: ${details.error.message}`;
              } else {
                errorMessage += `\n详细信息: ${responseData.details}`;
              }
            } catch (e) {
              // If parsing fails, display the details as-is
              errorMessage += `\n详细信息: ${responseData.details}`;
            }
          }
          
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: errorMessage }
          ]);
          setIsLoading(false);
          return;
        }
        
        // Check if we have task data
        if (responseData.data && responseData.data.task_id) {
          // Update message to show that task is in progress
          setMessages(prev => {
            const updatedMessages = [...prev];
            if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
              updatedMessages[updatedMessages.length - 1].content = "视频正在生成，请稍等...";
            }
            return updatedMessages;
          });
          
          // Start polling for task completion using setInterval
          const taskId = responseData.data.task_id;
          let pollInterval: NodeJS.Timeout | null = null;
          const startTime = Date.now(); // Record start time
          
          // Function to check task status
          const checkTaskStatus = async () => {
            try {
              // Query task status
              const taskResponse = await fetch(`/api/chat/task/${taskId}`, {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
                }
              });
              
              const taskData = await taskResponse.json();
              
              // Update progress in the chat
              if (taskData.data) {
                // Calculate elapsed time
                const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
                let progressMessage = `视频正在生成中，请稍等... (已等待 ${elapsedTime} 秒)`;
                
                // Add status information if available
                if (taskData.data.status) {
                  progressMessage += `\n状态: ${taskData.data.status}`;
                }
                
                setMessages(prev => {
                  const updatedMessages = [...prev];
                  if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                    updatedMessages[updatedMessages.length - 1].content = progressMessage;
                  }
                  return updatedMessages;
                });
                
                // Check task status and handle accordingly
                switch (taskData.data.status) {
                  case "succeeded":
                    // Task succeeded, display the video with parameters
                    if (taskData.data.video_url) {
                      // Clear the polling interval
                      if (pollInterval) {
                        clearInterval(pollInterval);
                      }
                      
                      // Calculate generation time
                      const generationTime = Math.floor((Date.now() - startTime) / 1000);
                      
                      // Create video display with parameters
                      let videoElement = `<div class="video-container">`;
                      
                      // Add video parameters
                      videoElement += `<div class="video-params text-sm text-gray-600 dark:text-gray-400 mb-2">`;
                      videoElement += `生成耗时: ${generationTime}秒`;
                      
                      // Add video parameters if available
                      if (taskData.data.video_params) {
                        const params = taskData.data.video_params;
                        if (params.file_size) {
                          // Convert file size to MB
                          const fileSizeMB = (params.file_size / (1024 * 1024)).toFixed(2);
                          videoElement += ` | 文件大小: ${fileSizeMB} MB`;
                        }
                        if (params.duration) {
                          videoElement += ` | 视频时长: ${params.duration}秒`;
                        }
                        if (params.fps) {
                          videoElement += ` | 帧率: ${params.fps} FPS`;
                        }
                        if (params.resolution) {
                          videoElement += ` | 分辨率: ${params.resolution}`;
                        }
                      }
                      
                      videoElement += `</div>`;
                      
                      // Add video element
                      videoElement += `<video controls class="max-w-full h-auto rounded-lg my-2">
                        <source src="${taskData.data.video_url}" type="video/mp4">
                        您的浏览器不支持视频播放。
                      </video>`;
                      
                      videoElement += `</div>`;
                      
                      setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                          updatedMessages[updatedMessages.length - 1].content = videoElement;
                        }
                        return updatedMessages;
                      });
                    }
                    setIsLoading(false);
                    break;
                    
                  case "failed":
                    // Task failed, show error message with details
                    if (pollInterval) {
                      clearInterval(pollInterval);
                    }
                    
                    // Extract error details if available
                    let errorMessage = "抱歉，视频生成失败。";
                    if (taskData.error) {
                      errorMessage += `\n错误详情: ${taskData.error.message || taskData.error}`;
                    }
                    
                    setMessages(prev => [
                      ...prev,
                      { role: "assistant", content: errorMessage }
                    ]);
                    setIsLoading(false);
                    break;
                    
                  case "queued":
                  case "running":
                    // Task is still in progress, continue polling
                    // We don't need to do anything here, the interval will continue
                    break;
                    
                  default:
                    // Unknown status, but we'll continue polling
                    break;
                }
              }
            } catch (error) {
              console.error("Error checking task status:", error);
              
              // Clear the polling interval on error
              if (pollInterval) {
                clearInterval(pollInterval);
              }
              
              setMessages(prev => [
                ...prev,
                { role: "assistant", content: "抱歉，视频生成过程中出现错误，请检查您的API密钥并重试。" }
              ]);
              setIsLoading(false);
            }
          };
          
          // Start polling every 2 seconds (infinite polling until success or failure)
          pollInterval = setInterval(checkTaskStatus, 2000);
        } else {
          // Handle error case
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "抱歉，视频生成失败，请稍后重试。" }
          ]);
          setIsLoading(false);
        }
      } 
      // Special handling for Doubao image generation and editing models
      else if (provider === "doubao" && (selectedModel === "doubao-seedream-3-0-t2i-250415" || selectedModel === "doubao-seededit-3-0-i2i-250628")) {
        // For image generation and editing, we don't stream the response
        const responseData = await response.json();
        
        // Check if we have an error in the response
        if (responseData.error) {
          // Handle error case and display error details in the chat
          let errorMessage = `错误: ${responseData.error}`;
          if (responseData.details) {
            try {
              // Try to parse the details as JSON
              const details = JSON.parse(responseData.details);
              if (details.error && details.error.message) {
                errorMessage += `\n详细信息: ${details.error.message}`;
              } else {
                errorMessage += `\n详细信息: ${responseData.details}`;
              }
            } catch (e) {
              // If parsing fails, display the details as-is
              errorMessage += `\n详细信息: ${responseData.details}`;
            }
          }
          
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: errorMessage }
          ]);
          setIsLoading(false);
          return;
        }
        
        // Check if we have image data
        if (responseData.data && Array.isArray(responseData.data) && responseData.data.length > 0) {
          // Create markdown image display
          const imageUrls = responseData.data.map((item: any) => item.url).filter(Boolean);
          // Create direct img tags to avoid markdown parsing issues with URLs
          const imageMarkdown = imageUrls.map((url: string) => `<img src="${url}" alt="Generated Image" class="max-w-full h-auto rounded-lg my-2">`).join('\n\n');
          
          setMessages(prev => {
            const updatedMessages = [...prev];
            if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
              updatedMessages[updatedMessages.length - 1].content = imageMarkdown;
            }
            return updatedMessages;
          });
        } else {
          // Handle error case
          setMessages(prev => [
            ...prev,
            { role: "assistant", content: "Sorry, I couldn't generate an image. Please try again." }
          ]);
        }
      } else {
        // Process the stream for other models
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let assistantResponse = "";
        let thinkingProcess = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // Parse SSE format
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);

                if (data === '[DONE]') {
                  done = true;
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  // Extract content based on provider format
                  let content = '';
                  let reasoningContent = '';

                  if (parsed.choices && parsed.choices[0]) {
                    // OpenAI/SiliconFlow format
                    content = parsed.choices[0].delta?.content || parsed.choices[0].text || '';
                    // For DeepSeek-R1, reasoning content is in a separate field
                    reasoningContent = parsed.choices[0].delta?.reasoning_content || '';
                  } else if (parsed.type === 'content_block_delta') {
                    // Anthropic format
                    content = parsed.delta?.text || '';
                  }

                  // Special handling for DeepSeek-R1 and Qwen/Qwen3-235B-A22B-Thinking-2507
                  if (isDeepSeekR1 || isQwenThinking) {
                    // If we have reasoning content, it's part of the thinking process
                    if (reasoningContent) {
                      thinkingProcess += reasoningContent;
                      // Update thinking process in real-time
                      setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                          updatedMessages[updatedMessages.length - 1].thinkingProcess = thinkingProcess;
                          updatedMessages[updatedMessages.length - 1].showThinking = true;
                        }
                        return updatedMessages;
                      });
                    }

                    // If we have regular content, it's part of the final answer
                    if (content) {
                      assistantResponse += content;
                      // Update final answer in real-time
                      setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                          updatedMessages[updatedMessages.length - 1].content = assistantResponse;
                        }
                        return updatedMessages;
                      });
                    }

                    // Auto-hide thinking process when done
                    if (done && isQwenThinking && thinkingProcess) {
                      setTimeout(() => {
                        setMessages(prev => {
                          const updatedMessages = [...prev];
                          if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                            updatedMessages[updatedMessages.length - 1].showThinking = false;
                          }
                          return updatedMessages;
                        });
                      }, 1000); // Wait 1 second before hiding
                    }
                  } else {
                    // Normal handling for other models
                    if (content) {
                      assistantResponse += content;

                      // Update the last message with the new content
                      setMessages(prev => {
                        const updatedMessages = [...prev];
                        if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                          updatedMessages[updatedMessages.length - 1].content = assistantResponse;
                        }
                        return updatedMessages;
                      });
                    }
                  }
                } catch (e) {
                  // Handle non-JSON lines or other parsing errors
                  console.warn('Failed to parse SSE data:', data);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please check your API key and try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key press (but allow Shift+Enter for new lines)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Theme classes mapping
  const getThemeClasses = () => {
    const themes = {
      light: {
        blue: "from-blue-400 to-blue-600",
        green: "from-green-400 to-green-600",
        purple: "from-purple-400 to-purple-600"
      },
      dark: {
        blue: "from-blue-600 to-blue-800",
        green: "from-green-600 to-green-800",
        purple: "from-purple-600 to-purple-800"
      }
    };

    return themes[theme][colorScheme];
  };

  const getBackgroundClasses = () => {
    return theme === "light"
      ? "bg-white text-gray-900"
      : "bg-gray-900 text-gray-100";
  };

  const getSidebarClasses = () => {
    return theme === "light"
      ? "bg-gray-100 border-gray-200"
      : "bg-gray-800 border-gray-700";
  };

  return (
    <div className={`flex h-screen ${getBackgroundClasses()}`}>
      {/* Sidebar for chat history */}
      <div className={`w-64 ${getSidebarClasses()} border-r flex flex-col shadow-lg`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="flex-1 py-2 px-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg text-sm transition-all duration-200 shadow-sm"
            >
              {theme === "light" ? "☀️ 白天" : "🌙 夜间"}
            </button>
            <button
              onClick={() => {
                // Create a new chat session
                const newChatId = Date.now().toString();
                setCurrentChatId(newChatId);
                setMessages([]);
                // Focus on input field
                setTimeout(() => {
                  const inputField = document.querySelector('textarea');
                  if (inputField) inputField.focus();
                }, 0);
              }}
              className="flex-1 py-2 px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-all duration-200 shadow-sm"
            >
              新建
            </button>
          </div>

          {/* Color scheme selector */}
          <div className="flex justify-center gap-4 mb-4">
            <button
              onClick={() => setColorScheme("blue")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg ${
                colorScheme === "blue"
                  ? "ring-2 ring-offset-2 ring-blue-500 ring-offset-gray-100 dark:ring-offset-gray-800"
                  : "hover:scale-110"
              }`}
              title="蓝色主题"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500"></div>
            </button>
            <button
              onClick={() => setColorScheme("green")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg ${
                colorScheme === "green"
                  ? "ring-2 ring-offset-2 ring-green-500 ring-offset-gray-100 dark:ring-offset-gray-800"
                  : "hover:scale-110"
              }`}
              title="绿色主题"
            >
              <div className="w-6 h-6 rounded-full bg-green-500"></div>
            </button>
            <button
              onClick={() => setColorScheme("purple")}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg ${
                colorScheme === "purple"
                  ? "ring-2 ring-offset-2 ring-purple-500 ring-offset-gray-100 dark:ring-offset-gray-800"
                  : "hover:scale-110"
              }`}
              title="紫色主题"
            >
              <div className="w-6 h-6 rounded-full bg-purple-500"></div>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2" ref={chatHistoryRef}>
          <div
            onClick={() => {
              // Create a new chat session
              const newChatId = Date.now().toString();
              setCurrentChatId(newChatId);
              setMessages([]);
            }}
            className={`p-3 rounded-lg cursor-pointer mb-2 truncate transition-all duration-200 hover:shadow-md ${
              theme === "light"
                ? "hover:bg-gray-200 bg-gray-50"
                : "hover:bg-gray-700 bg-gray-800"
            }`}
          >
            + 新建聊天
          </div>

          {chatHistory.length > 0 ? (
            [...chatHistory]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((chat) => (
                <div
                  key={chat.id}
                  className={`p-3 rounded-lg cursor-pointer mb-2 truncate relative transition-all duration-200 hover:shadow-md ${
                    currentChatId === chat.id
                      ? theme === "light"
                        ? "bg-blue-100 border border-blue-300 shadow-sm"
                        : "bg-blue-900/50 border border-blue-700 shadow-sm"
                      : theme === "light"
                        ? "hover:bg-gray-200 bg-gray-50"
                        : "hover:bg-gray-700 bg-gray-800"
                  }`}
                >
                  <div
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      setMessages(chat.messages);
                    }}
                  >
                    {chat.title || "新聊天"}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setChatHistory(prev => prev.filter(c => c.id !== chat.id));
                      if (currentChatId === chat.id) {
                        setCurrentChatId("");
                        setMessages([]);
                      }
                    }}
                    className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))
          ) : (
            <div className="p-3 text-gray-500 text-sm text-center">
              暂无聊天记录
            </div>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Win11-style header with theme gradient */}
        <header className={`bg-gradient-to-r ${getThemeClasses()} text-white p-4 shadow-lg`}>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold">LLM聊天助手</h1>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {/* API Configuration */}
          <div className={`${getSidebarClasses()} p-4 shadow-sm border-b`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium mb-1">
                  API密钥
                </label>
                <input
                  type="text"
                  id="apiKey"
                  value={apiKey}
                  onChange={(e) => updateApiKey(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 shadow-sm`}
                  placeholder="请输入您的API密钥"
                />
              </div>

              <div>
                <label htmlFor="provider" className="block text-sm font-medium mb-1">
                  模型提供商
                </label>
                <select
                  id="provider"
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 shadow-sm`}
                >
<option value="siliconflow">SiliconFlow (硅基流动)</option>
<option value="doubao">Doubao</option>
<option value="openai">OpenAI</option>
<option value="anthropic">Anthropic</option>
                </select>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <label htmlFor="model" className="block text-sm font-medium">
                    模型
                  </label>
                  {selectedModel && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      getModelTag(selectedModel).color === "blue" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100" :
                      getModelTag(selectedModel).color === "green" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" :
                      getModelTag(selectedModel).color === "orange" ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100" :
                      getModelTag(selectedModel).color === "red" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100" :
                      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100"
                    }`}>
                      {getModelTag(selectedModel).tag}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <select
                    id="model"
                    value={selectedModel}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      const oldModel = selectedModel;
                      
                      // Check if we're switching to or from the video generation models (VedioGenerator class)
                      const isOldModelVG = oldModel === "doubao-seedance-1-0-pro-250528" || oldModel === "doubao-seedance-1-0-lite-i2v-250428";
                      const isNewModelVG = newModel === "doubao-seedance-1-0-pro-250528" || newModel === "doubao-seedance-1-0-lite-i2v-250428";
                      
                      // If switching between video generator models and other models, create a new chat
                      // But only if there are messages in the current chat
                      if (((isOldModelVG && !isNewModelVG) || (!isOldModelVG && isNewModelVG)) && messages.length > 0) {
                        // Create a new chat session
                        const newChatId = Date.now().toString();
                        setCurrentChatId(newChatId);
                        setMessages([]);
                      }
                      
                      setSelectedModel(newModel);
                    }}
                    className={`flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 shadow-sm`}
                    disabled={!apiKey}
                  >
<option value="">请选择或输入模型名称</option>
{models.map((model) => (
  <option key={model} value={model}>
    {model}
  </option>
))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setSelectedModel("")}
                    className={`px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 shadow-sm`}
                  >
                    清除
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className={`flex-1 overflow-y-auto p-4 ${theme === "light" ? "bg-gray-50" : "bg-gray-900"}`}>
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-6xl mb-4">🤖</div>
                  <p className="text-lg">通过发送消息开始对话</p>
                  <p className="text-sm mt-2">选择模型提供商并输入API密钥开始聊天</p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-xl mb-4 shadow-sm transition-all duration-200 ${
                    message.role === "user"
                      ? `${theme === "light"
                          ? "bg-white border border-blue-200 ml-8"
                          : "bg-gray-800 border border-blue-800 ml-8"
                        }`
                      : `${theme === "light"
                          ? "bg-white border border-gray-200 mr-8"
                          : "bg-gray-800 border border-gray-700 mr-8"
                        }`
                  }`}
                >
                  <div className="font-semibold mb-2 flex items-center">
                    {message.role === "user" ? (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-3 ${
                          colorScheme === "blue" ? "bg-blue-500" :
                          colorScheme === "green" ? "bg-green-500" : "bg-purple-500"
                        }`}>
                          您
                        </div>
                        您
                      </>
                    ) : (
                      <>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm mr-3 ${
                          colorScheme === "blue" ? "bg-green-500" :
                          colorScheme === "green" ? "bg-blue-500" : "bg-purple-500"
                        }`}>
                          助
                        </div>
                        助手
                      </>
                    )}
                  </div>

                  {/* Thinking process for DeepSeek-R1 and Qwen/Qwen3-235B-A22B-Thinking-2507 */}
                  {message.thinkingProcess && message.role === "assistant" && (
                    <div className="mb-3">
                      <button
                        onClick={() => {
                          setMessages(prev => {
                            const updatedMessages = [...prev];
                            if (updatedMessages.length > 0 && updatedMessages[updatedMessages.length - 1].role === "assistant") {
                              updatedMessages[updatedMessages.length - 1].showThinking = !updatedMessages[updatedMessages.length - 1].showThinking;
                            }
                            return updatedMessages;
                          });
                        }}
                        className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                      >
                        <span>{message.showThinking ? '隐藏' : '显示'}思考过程</span>
                        <svg
                          className={`w-4 h-4 ml-1 transform transition-transform duration-200 ${
                            message.showThinking ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {message.showThinking && (
                        <div className={`mt-2 p-3 rounded-lg border transition-all duration-200 ${
                          theme === "light"
                            ? "bg-yellow-50 border-yellow-200"
                            : "bg-yellow-900/20 border-yellow-800"
                        }`}>
                          <div className={`text-xs font-semibold mb-1 ${
                            theme === "light"
                              ? "text-yellow-700"
                              : "text-yellow-300"
                          }`}>
                            思考过程:
                          </div>
                          <div
                            className="prose prose-sm dark:prose-invert max-w-none text-xs"
                            dangerouslySetInnerHTML={{
                              __html: parseMarkdown(message.thinkingProcess)
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* User images for Doubao image editing and image-to-video models */}
                  {message.role === "user" && provider === "doubao" && (selectedModel === "doubao-seededit-3-0-i2i-250628" || selectedModel === "doubao-seedance-1-0-lite-i2v-250428") && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {/* Single image for image editing model */}
                      {message.image && selectedModel === "doubao-seededit-3-0-i2i-250628" && (
                        <img 
                          src={message.image} 
                          alt="Uploaded" 
                          className="max-h-40 rounded-lg border border-gray-300 dark:border-gray-600"
                        />
                      )}
                      
                      {/* Multiple images for image-to-video model */}
                      {message.images && selectedModel === "doubao-seedance-1-0-lite-i2v-250428" && (
                        message.images.map((image: string, index: number) => (
                          <div key={index} className="relative">
                            <img 
                              src={image} 
                              alt={`Uploaded ${index + 1}`} 
                              className="max-h-40 rounded-lg border border-gray-300 dark:border-gray-600"
                            />
                            <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                              {index === 0 ? "首帧" : "尾帧"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Final answer */}
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: message.role === "assistant" ? 
                        (message.content.startsWith("<img") || message.content.startsWith("<div class=\"video-container") ? 
                          message.content : 
                          parseMarkdown(message.content)) : 
                        message.content.replace(/\n/g, '<br>')
                    }}
                  />

                  {/* Loading indicator and stop button for the last assistant message */}
                  {index === messages.length - 1 && isLoading && (
                    <div className="flex items-center mt-2">
                      <div className="flex space-x-1 ml-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                      </div>
                      <button
                        onClick={() => {
                          // Abort the fetch request if it exists
                          if (abortControllerRef.current) {
                            abortControllerRef.current.abort();
                          }
                          setIsLoading(false);
                        }}
                        className="text-xs text-gray-500 hover:text-red-500 flex items-center ml-2 transition-colors duration-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                        </svg>
                        停止响应
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className={`border-t p-4 ${theme === "light"
              ? "bg-white border-gray-200"
              : "bg-gray-800 border-gray-700"
            }`}>
            <div className="flex">
              <div className="flex-1 relative">
                {/* File upload icon on the first line */}
                <div className="flex items-center">
                  <input
                    type="file"
                    accept=".txt,.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      handleFileUpload(e.target.files);
                      // Reset the input value to allow selecting the same file again
                      resetFileInput(e.target);
                    }}
                    className="absolute top-2 left-2 opacity-0 w-8 h-8 cursor-pointer"
                    id="file-upload"
                    multiple
                  />
                  <label 
                    htmlFor="file-upload"
                    className="absolute top-2 left-2 w-8 h-8 flex items-center justify-center text-gray-500 hover:text-blue-500 cursor-pointer transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </label>
                </div>
                
                {/* Textarea with placeholder on the second line */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    selectedModel.startsWith("doubao-seedance-1-0-lite-i2v") 
                      ? "请点击左侧按钮上传1到2张图片，上传1张将使用【首帧生成】，上传2张将使用【首尾帧生成】。并在输入框内提出生成视频的要求（按回车键发送，Shift+回车键换行）" 
                      : selectedModel.startsWith("doubao-seededit-3-0-i2i") 
                        ? "请点击左侧按钮上传1张图片，并在输入框内提出要求（按回车键发送，Shift+回车键换行）" 
                        : "在这里输入提示词...（按回车键发送，Shift+回车键换行）"
                  }
                  className={`w-full px-4 py-3 pl-12 border border-gray-300 dark:border-gray-600 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 resize-none shadow-sm`}
                  rows={3}
                  disabled={isLoading}
                />
                
                {/* Thumbnail preview for uploaded images */}
                {uploadedImages.length > 0 && provider === "doubao" && (selectedModel === "doubao-seededit-3-0-i2i-250628" || selectedModel === "doubao-seedance-1-0-lite-i2v-250428") && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="flex items-center ml-2">
                        <img 
                          src={image.base64} 
                          alt={`Preview ${index + 1}`} 
                          className="max-h-10 rounded border border-gray-300 dark:border-gray-600"
                        />
                        <button
                          onClick={() => {
                            // Remove the image at the specific index
                            setUploadedImages(prev => {
                              const newImages = [...prev];
                              newImages.splice(index, 1);
                              return newImages;
                            });
                          }}
                          className="ml-1 text-gray-500 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                className={`px-6 py-3 rounded-r-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all duration-200 shadow-sm ${
                  theme === "light"
                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </main>
      </div>
      
      {/* Video Parameters Modal for text-to-video */}
      <VideoParamsModal
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        onGenerate={handleVideoGeneration}
      />
      
      {/* Video Parameters Modal for image-to-video */}
      <VideoParamsModal
        isOpen={isImageToVideoModalOpen}
        onClose={() => setIsImageToVideoModalOpen(false)}
        onGenerate={handleImageToVideoGeneration}
      />
    </div>
  );
}
