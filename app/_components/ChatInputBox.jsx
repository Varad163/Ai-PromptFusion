"use client";

import { useState, useContext, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Paperclip,
  Mic,
  Send,
  X,
  FileText,
  ImageIcon,
  MicOff,
  Loader2
} from "lucide-react";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import axios from "axios";
import { uuidv4 } from "@/lib/utils";
import { storage } from "@/config/FirebaseConfig";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { useUser } from "@clerk/nextjs";

// Helper to format bytes
const formatBytes = (bytes, decimals = 2) => {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

function ChatInputBox() {
  const { user } = useUser();
  const {
    currentChatId,
    aiSelectedModels,
    messages,
    setMessages,
    saveChatToFirestore,
  } = useContext(AiSelectetdModelContext);

  const [userInput, setUserInput] = useState("");
  const [attachments, setAttachments] = useState([]); // [{ name, url, type, size }]
  const [uploadProgress, setUploadProgress] = useState(null); // number or null
  const [uploadError, setUploadError] = useState(null); // string or null

  // Voice Speech Recognition State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserInput((prev) => (prev ? prev + " " + transcript : transcript));
      };

      recognition.onerror = (event) => {
        console.error("❌ Speech recognition error:", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  // Upload handler to Server API (with Firebase / Local fallback)
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    console.log("FILE SELECTED", file);
    if (!file) return;

    if (!user) {
      console.log("Upload Failed: User not signed in");
      alert("Please sign in to upload files.");
      return;
    }

    // Size limit check: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      console.log("Upload Failed: File too large", file.size);
      alert(`File is too large (${formatBytes(file.size)}). Maximum allowed size is 10MB.`);
      return;
    }

    // Allowed types check
    const ALLOWED_TYPES = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      console.log("Upload Failed: Unsupported type", file.type);
      alert("Unsupported file type. Please upload a PDF, DOCX, TXT, or Image (PNG/JPG/JPEG).");
      return;
    }

    setUploadError(null);
    setUploadProgress(10); // show initial progress indicator
    console.log("Upload Started");

    try {
      const formData = new FormData();
      formData.append("file", file);
      console.log("FormData Contents:", file.name, file.size, file.type);
      console.log("Upload Request: POST /api/upload");

      const response = await axios.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          console.log("Upload progress event:", percentCompleted);
          setUploadProgress(percentCompleted);
        },
      });

      console.log("Upload Success:", response.data);
      const { url, name, type, size } = response.data;

      setAttachments((prev) => [
        ...prev,
        { name, url, type, size },
      ]);
      setUploadProgress(null);
      setUploadError(null);
    } catch (error) {
      console.log("Upload Failed", error);
      console.error("🔥 Upload request error:", error);
      setUploadError("File upload failed. Server error or network issue.");
      setUploadProgress(null);
      alert(`File upload failed: ${error.response?.data?.error || error.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Animate word-by-word streaming effect on frontend
  const animateResponseStream = (placeholderId, fullResponse, model, parentModel, responseTime, tokenCount) => {
    const words = fullResponse.split(" ");
    let currentText = "";
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: currentText,
                  loading: false,
                  model,
                  parentModel,
                  responseTime,
                  tokenCount,
                }
              : m
          )
        );
        wordIndex++;
      } else {
        clearInterval(interval);
        // Set final content and save to database
        setMessages((prev) => {
          const finalMessages = prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  content: fullResponse,
                  loading: false,
                  model,
                  parentModel,
                  responseTime,
                  tokenCount,
                }
              : m
          );
          saveChatToFirestore(currentChatId, finalMessages, aiSelectedModels);
          return finalMessages;
        });
      }
    }, 25);
  };

  const handleSend = async () => {
    if (!userInput.trim() && attachments.length === 0) return;

    const activeModels = Object.entries(aiSelectedModels).filter(
      ([_, info]) => info.enabled && info.modelId
    );

    if (activeModels.length === 0) {
      alert("⚠️ Please enable at least one AI model column to send requests.");
      return;
    }

    const currentInput = userInput;
    const currentAttachments = [...attachments];

    setUserInput("");
    setAttachments([]);

    // 1. Create and add the user message
    const userMsg = {
      id: uuidv4(),
      role: "user",
      content: currentInput,
      timestamp: Date.now(),
      attachments: currentAttachments,
    };

    const updatedMessages = [...messages, userMsg];

    // 2. Add assistant thinking placeholder messages for each active model
    const placeholders = activeModels.map(([parentModel, modelInfo]) => ({
      id: uuidv4() + "-" + parentModel,
      role: "assistant",
      content: "",
      model: modelInfo.modelId,
      parentModel: parentModel,
      timestamp: Date.now(),
      loading: true,
      responseTime: 0,
      error: false,
    }));

    const finalMessages = [...updatedMessages, ...placeholders];
    setMessages(finalMessages);

    // Save initial state to Firestore
    await saveChatToFirestore(currentChatId, finalMessages, aiSelectedModels);

    // 3. Trigger requests for each model concurrently
    placeholders.forEach(async (placeholder) => {
      const { parentModel, model: subModelId, id: placeholderId } = placeholder;
      const startTime = performance.now();

      // Prepend attachment references to the text prompt if any exist
      let promptText = currentInput;
      if (currentAttachments.length > 0) {
        const attachStrings = currentAttachments
          .map((a) => `[Attachment: ${a.name} (${a.url})]`)
          .join("\n");
        promptText = `${attachStrings}\n\n${currentInput}`;
      }

      try {
        const result = await axios.post("/api/ai-multi-model", {
          model: subModelId,
          msg: [{ role: "user", content: promptText }], // Wrap in array as backend route expects
          parentModel,
        });

        const { aiResponse, model: returnedSubModel } = result.data;
        const endTime = performance.now();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        const estimatedTokens = Math.round((aiResponse || "").length / 4);

        // Start token-by-token streaming animation
        animateResponseStream(
          placeholderId,
          aiResponse || "No response details generated.",
          returnedSubModel || subModelId,
          parentModel,
          durationSec,
          estimatedTokens
        );
      } catch (err) {
        console.error(`🔥 Error fetching from ${parentModel}:`, err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? {
                  ...m,
                  loading: false,
                  error: true,
                  content: "Failed to generate response. Click retry to query again.",
                }
              : m
          )
        );
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-0 right-0 left-0 md:left-[var(--sidebar-width)] z-40 bg-gradient-to-t from-background via-background/95 to-transparent p-4 transition-all duration-150">
      <div className="w-full max-w-4xl mx-auto flex flex-col gap-2">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 bg-muted/40 rounded-lg border border-border backdrop-blur">
            {attachments.map((file, idx) => {
              const isImage = file.type.startsWith("image/");
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 p-2 bg-card border border-border rounded-lg text-xs relative group animate-in fade-in zoom-in-95 duration-100"
                >
                  {isImage ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-8 h-8 rounded object-cover"
                    />
                  ) : (
                    <FileText className="h-5 w-5 text-blue-500" />
                  )}
                  <div className="flex flex-col min-w-0 pr-4">
                    <span className="max-w-[140px] truncate font-semibold text-foreground text-xs leading-none mb-1">
                      {file.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none">
                      {formatBytes(file.size)}
                    </span>
                  </div>
                  <button
                    onClick={() => removeAttachment(idx)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow hover:scale-105 transition cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Upload Progress Bar */}
        {uploadProgress !== null && (
          <div className="w-full space-y-1 bg-muted/40 p-2 rounded-lg border border-border flex items-center gap-3">
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            <div className="flex-1">
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground w-8">
              {uploadProgress}%
            </span>
          </div>
        )}

        {/* Upload Error Banner */}
        {uploadError && (
          <div className="w-full p-2 bg-destructive/10 text-destructive border border-destructive/20 text-xs rounded-lg flex items-center justify-between">
            <span>{uploadError}</span>
            <button onClick={() => setUploadError(null)}>
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Input Text Box */}
        <div className="border border-border rounded-xl shadow-lg flex flex-col px-4 py-2.5 bg-card focus-within:ring-1 focus-within:ring-primary transition-all">
          <textarea
            placeholder={isRecording ? "Listening..." : "Ask your comparison prompt here..."}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground resize-none text-sm leading-relaxed max-h-36 py-1"
          />

          <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-2">
            <div className="flex items-center gap-1">
              {/* Paperclip upload button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="hidden"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  console.log("Paperclip Clicked, ref is:", fileInputRef.current);
                  fileInputRef.current?.click();
                }}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Attach file (PDF, DOCX, TXT, Image)"
              >
                <Paperclip className="h-4 w-4" />
              </Button>

              {/* Microphone speech recognition */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleRecording}
                className={`h-8 w-8 transition ${
                  isRecording
                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 animate-pulse"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title="Voice input"
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>

              {isRecording && (
                <span className="text-xs text-red-500 font-semibold animate-pulse px-2">
                  Recording speech...
                </span>
              )}
            </div>

            {/* Send Button */}
            <Button
              size="icon"
              disabled={!userInput.trim() && attachments.length === 0}
              className="bg-blue-600 text-white hover:bg-blue-700 h-8 w-8 rounded-lg shadow disabled:opacity-40"
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;
