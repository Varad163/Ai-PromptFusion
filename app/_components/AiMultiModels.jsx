"use client";

import React, { useContext, useState, useEffect, useRef, useMemo } from "react";
import AiModelList from "@/shared/AiModelList";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/config/FirebaseConfig";
import { useUser } from "@clerk/nextjs";
import { uuidv4 } from "@/lib/utils";
import axios from "axios";
import {
  Copy,
  Check,
  RefreshCw,
  Edit2,
  Trash2,
  FileText,
  Clock,
  Sparkles,
  AlertTriangle,
  Play,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AiMultiModels() {
  const {
    currentChatId,
    aiSelectedModels,
    setAiSelectedModels,
    messages,
    setMessages,
    saveChatToFirestore,
  } = useContext(AiSelectetdModelContext);

  const { user } = useUser();
  const userEmail = user?.primaryEmailAddress?.emailAddress;

  // Unify context's selectedModels into available models list
  const aiModelList = useMemo(() => {
    return AiModelList.map((m) => {
      const chatModelPref = aiSelectedModels[m.model] || {
        modelId: m.subModel[0].id,
        enabled: m.model === "GPT" || m.model === "Gemini", // default enable GPT & Gemini
      };
      const selectedSub = m.subModel.find((sub) => sub.id === chatModelPref.modelId) || m.subModel[0];

      return {
        ...m,
        enabled: !!chatModelPref.enabled,
        selectedSubModelId: chatModelPref.modelId || m.subModel[0].id,
        selectedSubModelName: selectedSub.name,
        selectedSubPremium: selectedSub.premium,
      };
    });
  }, [aiSelectedModels]);

  const saveSelectedModelsToDB = async (updatedModels) => {
    if (!currentChatId) return;
    await saveChatToFirestore(currentChatId, messages, updatedModels);
  };

  const handleToggle = async (modelName) => {
    console.log("Toggle Clicked", modelName);
    console.log("Before:", aiSelectedModels);

    const current = aiSelectedModels[modelName] || {
      modelId: AiModelList.find((x) => x.model === modelName)?.subModel[0].id,
      enabled: false,
    };
    const updated = {
      ...aiSelectedModels,
      [modelName]: {
        ...current,
        enabled: !current.enabled,
      },
    };
    console.log("After:", updated);
    setAiSelectedModels(updated);
    await saveSelectedModelsToDB(updated);
  };

  const handleSubModelChange = async (modelName, subModelName) => {
    const modelMeta = AiModelList.find((x) => x.model === modelName);
    const subMeta = modelMeta?.subModel.find((s) => s.name === subModelName);
    if (!subMeta) return;

    const current = aiSelectedModels[modelName] || { enabled: false };
    const updated = {
      ...aiSelectedModels,
      [modelName]: {
        ...current,
        modelId: subMeta.id,
      },
    };
    setAiSelectedModels(updated);
    await saveSelectedModelsToDB(updated);
  };

  // Streaming animation for a specific message ID
  const animateSingleResponseStream = (messageId, fullResponse, model, parentModel, responseTime, tokenCount) => {
    const words = fullResponse.split(" ");
    let currentText = "";
    let wordIndex = 0;

    const interval = setInterval(() => {
      if (wordIndex < words.length) {
        currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
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
        setMessages((prev) => {
          const finalMessages = prev.map((m) =>
            m.id === messageId
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

  // Edit user prompt: truncates conversation after that point and triggers regeneration for all enabled models
  const handleEditPrompt = async (globalIndex, newContent) => {
    if (!newContent.trim()) return;

    const prefix = messages.slice(0, globalIndex);
    const originalMsg = messages[globalIndex];
    const updatedUserMsg = {
      ...originalMsg,
      content: newContent,
      timestamp: Date.now(),
    };

    const activeModels = Object.entries(aiSelectedModels).filter(
      ([_, info]) => info.enabled && info.modelId
    );

    const placeholders = activeModels.map(([parentModel, modelInfo]) => ({
      id: uuidv4() + "-" + parentModel,
      role: "assistant",
      content: "",
      model: modelInfo.modelId,
      parentModel: parentModel,
      timestamp: Date.now(),
      loading: true,
      error: false,
      responseTime: 0,
    }));

    const finalMessages = [...prefix, updatedUserMsg, ...placeholders];
    setMessages(finalMessages);
    await saveChatToFirestore(currentChatId, finalMessages, aiSelectedModels);

    placeholders.forEach(async (placeholder) => {
      const { parentModel, model: subModelId, id: placeholderId } = placeholder;
      const startTime = performance.now();

      let promptText = newContent;
      if (originalMsg.attachments && originalMsg.attachments.length > 0) {
        const attachStrings = originalMsg.attachments
          .map((a) => `[Attachment: ${a.name} (${a.url})]`)
          .join("\n");
        promptText = `${attachStrings}\n\n${newContent}`;
      }

      try {
        const result = await axios.post("/api/ai-multi-model", {
          model: subModelId,
          msg: [{ role: "user", content: promptText }],
          parentModel,
        });

        const { aiResponse, model: returnedSubModel } = result.data;
        const endTime = performance.now();
        const durationSec = ((endTime - startTime) / 1000).toFixed(2);
        const estimatedTokens = Math.round((aiResponse || "").length / 4);

        animateSingleResponseStream(
          placeholderId,
          aiResponse || "",
          returnedSubModel || subModelId,
          parentModel,
          durationSec,
          estimatedTokens
        );
      } catch (err) {
        console.error(err);
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

  // Regenerate response: triggers API query again for that specific column
  const handleRegenerate = async (targetMsg) => {
    const { parentModel, model: subModelId, id: messageId } = targetMsg;

    // Find preceding user message
    const msgIdx = messages.findIndex((m) => m.id === messageId);
    if (msgIdx < 1) return;
    const userMsg = messages[msgIdx - 1];

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              content: "",
              loading: true,
              error: false,
              responseTime: 0,
            }
          : m
      )
    );

    const startTime = performance.now();

    let promptText = userMsg.content;
    if (userMsg.attachments && userMsg.attachments.length > 0) {
      const attachStrings = userMsg.attachments
        .map((a) => `[Attachment: ${a.name} (${a.url})]`)
        .join("\n");
      promptText = `${attachStrings}\n\n${userMsg.content}`;
    }

    try {
      const result = await axios.post("/api/ai-multi-model", {
        model: subModelId,
        msg: [{ role: "user", content: promptText }],
        parentModel,
      });

      const { aiResponse, model: returnedSubModel } = result.data;
      const endTime = performance.now();
      const durationSec = ((endTime - startTime) / 1000).toFixed(2);
      const estimatedTokens = Math.round((aiResponse || "").length / 4);

      animateSingleResponseStream(
        messageId,
        aiResponse || "",
        returnedSubModel || subModelId,
        parentModel,
        durationSec,
        estimatedTokens
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
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
  };

  return (
    <div className="p-4 h-[calc(100vh-130px)] overflow-x-auto bg-background transition-colors duration-150 border-t border-border">
      {/* HORIZONTAL layout for comparison columns */}
      <div className="flex gap-4 min-w-max h-full">
        {aiModelList.map((model) => {
          const modelMessages = messages
            .map((msg, idx) => ({ ...msg, globalIndex: idx }))
            .filter((m) => m.role === "user" || m.parentModel === model.model);

          return (
            <ModelColumn
              key={model.model}
              model={model}
              modelMessages={modelMessages}
              handleToggle={handleToggle}
              handleSubModelChange={handleSubModelChange}
              handleEditPrompt={handleEditPrompt}
              handleRegenerate={handleRegenerate}
            />
          );
        })}
      </div>
    </div>
  );
}

// Sub-component for individual model comparison columns
function ModelColumn({
  model,
  modelMessages,
  handleToggle,
  handleSubModelChange,
  handleEditPrompt,
  handleRegenerate,
}) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom of column when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [modelMessages]);

  return (
    <div
      onClick={() => {
        if (!model.enabled) {
          handleToggle(model.model);
        }
      }}
      className={`flex flex-col transition-all duration-300 border border-border rounded-2xl bg-card shadow-sm overflow-hidden h-full ${
        model.enabled ? "w-[380px]" : "w-[76px] hover:bg-muted/10 cursor-pointer"
      }`}
    >
      {/* Collapsed Inactive Column View */}
      {!model.enabled ? (
        <div className="flex flex-col items-center justify-between py-6 h-full w-full">
          <div className="flex flex-col items-center gap-5">
            <div className="w-10 h-10 rounded-full border border-border bg-background flex items-center justify-center overflow-hidden">
              <Image
                src={model.icon}
                alt={model.model}
                width={24}
                height={24}
                className="object-contain grayscale opacity-60"
              />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground rotate-90 my-8 inline-block tracking-widest uppercase">
              {model.model}
            </span>
          </div>
          <Switch
            checked={model.enabled}
            onCheckedChange={() => handleToggle(model.model)}
            className="scale-90"
          />
        </div>
      ) : (
        /* Expanded Active Column View */
        <div className="flex flex-col flex-1 h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border/80 bg-muted/20 flex-none gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full border border-border bg-white flex items-center justify-center overflow-hidden shrink-0">
                <Image
                  src={model.icon}
                  alt={model.model}
                  width={14}
                  height={14}
                  className="object-contain"
                />
              </div>
              <Select
                value={model.selectedSubModelName || ""}
                onValueChange={(value) => handleSubModelChange(model.model, value)}
              >
                <SelectTrigger className="w-[170px] h-7 text-xs border-0 bg-transparent hover:bg-muted/50 focus:ring-0 truncate px-1.5 font-semibold text-foreground">
                  <SelectValue placeholder={model.selectedSubModelName} />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectGroup>
                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase">
                      Free models
                    </div>
                    {model.subModel
                      .filter((sub) => !sub.premium)
                      .map((sub) => (
                        <SelectItem key={sub.id} value={sub.name} className="text-xs">
                          {sub.name}
                        </SelectItem>
                      ))}

                    <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground mt-2 border-t border-border uppercase">
                      Premium Models
                    </div>
                    {model.subModel
                      .filter((sub) => sub.premium)
                      .map((sub) => (
                        <SelectItem
                          key={sub.id}
                          value={sub.name}
                          className="text-xs text-yellow-600 dark:text-yellow-400 font-medium"
                        >
                          {sub.name} 💎
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border leading-none uppercase ${
                  model.selectedSubPremium
                    ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                    : "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                }`}
              >
                {model.selectedSubPremium ? "Premium" : "Free"}
              </span>
              <Switch
                checked={model.enabled}
                onCheckedChange={() => handleToggle(model.model)}
                className="scale-90"
              />
            </div>
          </div>

          {/* Messages View */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-card scrollbar-none flex flex-col">
            {modelMessages.length > 0 ? (
              modelMessages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  handleEditPrompt={handleEditPrompt}
                  handleRegenerate={handleRegenerate}
                />
              ))
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-60">
                <Sparkles className="h-6 w-6 text-blue-500 animate-pulse mb-2" />
                <p className="text-xs">Ask a prompt below to see the response comparison.</p>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Column Footer */}
          <div className="border-t border-border/50 p-2.5 text-center text-[10px] font-bold text-muted-foreground bg-muted/10 uppercase flex-none">
            {model.model} Column Active
          </div>
        </div>
      )}
    </div>
  );
}

// Component for rendering message bubbles and handling copy, edit, and metrics
function MessageBubble({ msg, handleEditPrompt, handleRegenerate }) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== msg.content) {
      handleEditPrompt(msg.globalIndex, editText.trim());
    }
    setIsEditing(false);
  };

  const isUser = msg.role === "user";

  if (isUser) {
    return (
      <div className="flex flex-col gap-1.5 self-end max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-150">
        {/* Inline Editing UI */}
        {isEditing ? (
          <div className="flex flex-col gap-2 p-3 bg-muted rounded-xl border border-border w-[280px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-xs leading-relaxed text-foreground resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-1 text-[10px]">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button size="sm" className="h-6 px-2 text-[10px]" onClick={handleSaveEdit}>
                Submit
              </Button>
            </div>
          </div>
        ) : (
          <div className="group relative flex flex-col gap-1">
            <div className="p-3 rounded-2xl bg-blue-600 text-white text-xs leading-relaxed shadow-sm font-medium">
              {msg.content}

              {/* Attachments inside message bubble */}
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="mt-2 pt-2 border-t border-white/20 flex flex-col gap-1">
                  {msg.attachments.map((file, idx) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] text-blue-100 hover:text-white underline"
                    >
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[180px]">{file.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[9px] text-muted-foreground px-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
              <button
                onClick={() => {
                  setEditText(msg.content);
                  setIsEditing(true);
                }}
                className="hover:text-foreground flex items-center gap-0.5"
              >
                <Edit2 className="h-2.5 w-2.5" /> Edit
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Assistant Message UI
  return (
    <div className="flex flex-col gap-1.5 self-start max-w-[90%] w-full animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="group relative p-3 rounded-2xl bg-muted/65 border border-border text-xs leading-relaxed shadow-sm flex flex-col">
        {/* Model Identifier Badge */}
        <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border/40 text-[10px] font-bold text-muted-foreground">
          <Sparkles className="h-3 w-3 text-blue-500" />
          <span className="uppercase text-foreground">{msg.parentModel || "Assistant"}</span>
          <span className="opacity-60">({msg.model})</span>
        </div>

        {/* Message Content */}
        {msg.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground p-1">
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-75" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-150" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce delay-300" />
            </div>
            <span className="text-[10px]">Thinking...</span>
          </div>
        ) : msg.error ? (
          <div className="flex flex-col gap-1 text-red-500 p-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Failed to fetch response.</span>
            </div>
            <button
              onClick={() => handleRegenerate(msg)}
              className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline text-left mt-1.5 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" /> Retry request
            </button>
          </div>
        ) : (
          <div className="whitespace-pre-wrap select-text">{msg.content}</div>
        )}

        {/* Copy/Regenerate toolbar & Metrics */}
        {!msg.loading && !msg.error && (
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/30 text-[9px] text-muted-foreground">
            {/* Model Metrics */}
            <div className="flex items-center gap-2.5">
              {msg.responseTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> {msg.responseTime}s
                </span>
              )}
              {msg.tokenCount && (
                <span>
                  🔢 {msg.tokenCount} tokens
                </span>
              )}
            </div>

            {/* Toolbar Buttons */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="hover:text-foreground flex items-center gap-0.5"
                title="Copy response"
              >
                {copied ? <Check className="h-2.5 w-2.5 text-green-500" /> : <Copy className="h-2.5 w-2.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={() => handleRegenerate(msg)}
                className="hover:text-foreground flex items-center gap-0.5"
                title="Regenerate response"
              >
                <RefreshCw className="h-2.5 w-2.5" /> Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
