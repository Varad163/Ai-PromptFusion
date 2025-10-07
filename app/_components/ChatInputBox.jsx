"use client";

import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Mic, Send } from "lucide-react";
import AiMultiModels from "./AiMultiModels";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import axios from "axios";

function ChatInputBox() {
  const {
    aiSelectedModels,
    setAiSelectedModels,
    messages,
    setMessages, // ✅ fixed name
  } = useContext(AiSelectetdModelContext);

  // ✅ Add state for user input
  const [userInput, setUserInput] = useState("");

  const handleSend = async () => {
    if (!userInput.trim()) return; // ✅ now works because state exists

    const currentInput = userInput;
    setUserInput(""); // clear input after sending

    // ✅ Add user message to all enabled models
    setMessages((prev) => {
      const updated = { ...prev };
      Object.keys(aiSelectedModels).forEach((modelKey) => {
        if (updated[modelKey]) {
          updated[modelKey].push({ role: "user", content: currentInput });
        } else {
          updated[modelKey] = [{ role: "user", content: currentInput }];
        }
      });
      return updated;
    });

    // ✅ Fetch AI responses from all selected models
    Object.entries(aiSelectedModels).forEach(async ([parentModel, modelInfo]) => {
      if (!modelInfo.modelId) return;

      // Add "Thinking..." placeholder
      setMessages((prev) => {
        const updated = { ...prev };
        if (updated[parentModel]) {
          updated[parentModel].push({
            role: "assistant",
            content: "Thinking...",
            model: parentModel,
            loading: true,
          });
        } else {
          updated[parentModel] = [
            {
              role: "assistant",
              content: "Thinking...",
              model: parentModel,
              loading: true,
            },
          ];
        }
        return updated;
      });

      try {
        // ✅ API Call
        const result = await axios.post("/api/ai-multi-model", {
          model: modelInfo.modelId,
          msg: [{ role: "user", content: currentInput }],
          parentModel,
        });

        const { aiResponse, model } = result.data;

        // Replace "Thinking..." with real response
        setMessages((prev) => {
          const updated = { ...prev };
          const loadingIndex = updated[parentModel].findIndex((m) => m.loading);

          if (loadingIndex !== -1) {
            updated[parentModel][loadingIndex] = {
              role: "assistant",
              content: aiResponse,
              model,
              loading: false,
            };
          } else {
            updated[parentModel].push({
              role: "assistant",
              content: aiResponse,
              model,
              loading: false,
            });
          }
          return updated;
        });
      } catch (err) {
        console.error("Error calling API:", err);
        setMessages((prev) => {
          const updated = { ...prev };
          updated[parentModel].push({
            role: "assistant",
            content: "⚠️ Error fetching response.",
            model: parentModel,
          });
          return updated;
        });
      }
    });
  };

  // ✅ Log messages for debugging
  useEffect(() => {
    console.log("📩 Messages:", messages);
  }, [messages]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Page content */}
      <AiMultiModels />
      <div className="p-4"></div>

      {/* Fixed chat input */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center bg-background/60 backdrop-blur-md p-4">
        <div className="w-full max-w-2xl border rounded-xl shadow-md flex items-center gap-2 px-4 py-2 bg-card">
          {/* Attachment Button */}
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* Input field */}
          <input
            type="text"
            placeholder="Ask me anything..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)} // ✅ update state
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
          />

          {/* Mic Button */}
          <Button variant="ghost" size="icon">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>

          {/* Send Button */}
          <Button
            variant="ghost"
            size="icon"
            className="bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSend}
          >
            <Send />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;
