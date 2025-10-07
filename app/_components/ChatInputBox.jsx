"use client";

import { useState, useContext, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Mic, Send } from "lucide-react";
import AiMultiModels from "./AiMultiModels";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import { useUser } from "@clerk/nextjs";

function ChatInputBox() {
  const [chatId, setChatId] = useState("");
  const { user } = useUser();
  const {
    aiSelectedModels,
    messages,
    setMessages,
  } = useContext(AiSelectetdModelContext);

  const [userInput, setUserInput] = useState("");

  // ✅ Generate unique chatId once
  useEffect(() => {
    setChatId(uuidv4());
  }, []);

  const handleSend = async () => {
    if (!userInput.trim()) return;
    const currentInput = userInput;
    setUserInput("");

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

    // ✅ Fetch responses
    Object.entries(aiSelectedModels).forEach(async ([parentModel, modelInfo]) => {
      if (!modelInfo.modelId) return;

      // Add "Thinking..."
      setMessages((prev) => {
        const updated = { ...prev };
        updated[parentModel] = updated[parentModel] || [];
        updated[parentModel].push({
          role: "assistant",
          content: "Thinking...",
          loading: true,
        });
        return updated;
      });

      try {
        const result = await axios.post("/api/ai-multi-model", {
          model: modelInfo.modelId,
          msg: [{ role: "user", content: currentInput }],
          parentModel,
        });

        const { aiResponse, model } = result.data;

        // Replace "Thinking..."
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
          }
          return updated;
        });
      } catch (err) {
        console.error("Error calling API:", err);
      }
    });
  };

  // ✅ Save messages to Firestore safely
  const SaveMessages = async () => {
    try {
      if (!chatId || !user?.primaryEmailAddress?.emailAddress) {
        console.warn("⏳ Waiting for chatId/user...");
        return;
      }

      const docRef = doc(db, "chatHistory", chatId); // ✅ valid path

      await setDoc(docRef, {
        chatId,
        userEmail: user.primaryEmailAddress.emailAddress,
        messages: messages || {},
        lastUpdated: Date.now(),
      });

      console.log("✅ Saved messages to Firestore");
    } catch (error) {
      console.error("🔥 Firestore save error:", error);
    }
  };

  // ✅ Save whenever messages change (but only if ready)
  useEffect(() => {
    if (Object.keys(messages || {}).length > 0 && chatId && user) {
      SaveMessages();
    }
  }, [messages, chatId, user]);

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
