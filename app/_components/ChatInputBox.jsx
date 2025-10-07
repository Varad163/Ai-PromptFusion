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
    setMessages,
  } = useContext(AiSelectetdModelContext);

  const [userInput, setUserInput] = useState("");

  const handleSend = async () => {
    if (!userInput.trim()) return;

    const currentInput = userInput;
    setUserInput("");

    // Add user message
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

    // Call API for each selected model
    Object.entries(aiSelectedModels).forEach(async ([parentModel, modelInfo]) => {
      if (!modelInfo.modelId) return;

      // Add placeholder
      setMessages((prev) => {
        const updated = { ...prev };
        if (!updated[parentModel]) updated[parentModel] = [];
        updated[parentModel].push({
          role: "assistant",
          content: "Thinking...",
          model: parentModel,
          loading: true,
        });
        return updated;
      });

      try {
        console.log("📤 Sending:", {
          msg: [{ role: "user", content: currentInput }],
          model: modelInfo.modelId,
          parentModel,
        });

        



      const result = await axios.post("/api/ai-multi-model", {
        msg: [{ role: "user", content: currentInput }],
        model: modelInfo.modelId,
        parentModel,
      });
// ...existing code...
        console.log("📥 Result:", result.data);

        const { aiResponse, model } = result.data;

        // Replace placeholder with actual response
        setMessages((prev) => {
          const updated = { ...prev };
          const index = updated[parentModel].findIndex((m) => m.loading);
          if (index !== -1) {
            updated[parentModel][index] = {
              role: "assistant",
              content: aiResponse,
              model,
              loading: false,
            };
          }
          return updated;
        });
      } catch (err) {
        console.error("❌ Error calling API:", err);
        setMessages((prev) => {
          const updated = { ...prev };
          if (!updated[parentModel]) updated[parentModel] = [];
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

  useEffect(() => {
    console.log("📩 Messages:", messages);
  }, [messages]);

  return (
    <div className="relative min-h-screen bg-background">
      <AiMultiModels />
      <div className="p-4"></div>
      <div className="fixed bottom-0 left-0 w-full flex justify-center bg-background/60 backdrop-blur-md p-4">
        <div className="w-full max-w-2xl border rounded-xl shadow-md flex items-center gap-2 px-4 py-2 bg-card">
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          <input
            type="text"
            placeholder="Ask me anything..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
          />
          <Button variant="ghost" size="icon">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
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
