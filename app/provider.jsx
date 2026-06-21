"use client";

import React, { useEffect, useState, useRef } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/AppSidebar";
import AppHeader from "./_components/AppHeader";

// 🔹 Clerk + Firebase imports
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  getDocs,
  writeBatch
} from "firebase/firestore";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import { DefaultModel } from "@/shared/AiModelsShared";
import { uuidv4 } from "@/lib/utils";

const ALL_MODELS = ["GPT", "Gemini", "DeepSeek", "Mistral", "Grok", "Cohere", "Llama"];

export default function Provider({ children, ...props }) {
  const { user } = useUser();
  const [currentChatId, setCurrentChatId] = useState("");
  const [chats, setChats] = useState([]);
  const [aiSelectedModels, setAiSelectedModels] = useState({});
  const [messages, setMessages] = useState([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const hasCreatedUser = useRef(false);

  // Helper to normalize message list (handles old object format gracefully)
  const normalizeMessages = (loadedMessages) => {
    if (Array.isArray(loadedMessages)) {
      return loadedMessages;
    }
    if (loadedMessages && typeof loadedMessages === "object") {
      const tempMessages = [];
      Object.entries(loadedMessages).forEach(([parentModel, list]) => {
        if (Array.isArray(list)) {
          list.forEach((msg) => {
            tempMessages.push({
              id: msg.id || uuidv4() + "-" + Math.random().toString(36).substr(2, 9),
              role: msg.role,
              content: msg.content,
              model: msg.model || DefaultModel[parentModel]?.modelId || "",
              parentModel: parentModel,
              timestamp: msg.timestamp || Date.now(),
              attachments: msg.attachments || [],
            });
          });
        }
      });
      // Deduplicate user messages
      const unique = [];
      const seenUserMsgs = new Set();
      tempMessages.forEach((msg) => {
        if (msg.role === "user") {
          const key = msg.content;
          if (!seenUserMsgs.has(key)) {
            seenUserMsgs.add(key);
            unique.push(msg);
          }
        } else {
          unique.push(msg);
        }
      });
      unique.sort((a, b) => a.timestamp - b.timestamp);
      return unique;
    }
    return [];
  };

  // Helper to format model states
  const getInitialModels = (userPref = null) => {
    const models = {};
    const defaultIds = {
      GPT: "gpt-4.1-mini",
      Gemini: "gemini-2.5-flash-lite",
      DeepSeek: "DeepSeek-R1",
      Mistral: "mistral-medium-2505",
      Grok: "grok-3-mini",
      Cohere: "cohere-command-a",
      Llama: "llama-3.3-70B-Instruct"
    };

    ALL_MODELS.forEach((key) => {
      if (userPref && userPref[key]) {
        models[key] = {
          modelId: userPref[key].modelId || defaultIds[key],
          enabled: userPref[key].enabled !== undefined ? !!userPref[key].enabled : true,
        };
      } else {
        models[key] = {
          modelId: defaultIds[key],
          enabled: key === "GPT" || key === "Gemini",
        };
      }
    });
    return models;
  };

  // Helper: auto-generate title from first user prompt
  const generateTitle = (prompt) => {
    if (!prompt) return "New Chat";
    const cleaned = prompt.replace(/[^\w\s-]/g, "").trim();
    const words = cleaned.split(/\s+/);
    if (words.length <= 5) {
      return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
    }
    return (
      words
        .slice(0, 5)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ") + "..."
    );
  };

  // ✅ Create a new blank chat session
  const createNewChat = () => {
    const newId = uuidv4();
    setCurrentChatId(newId);
    setMessages([]);
    setAiSelectedModels(getInitialModels());
    return newId;
  };

  // ✅ Create user profile in Firestore
  const createNewUser = async () => {
    if (!user) return;

    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    const userRef = doc(db, "users", userEmail);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      console.log("👤 Existing user");
      const pref = userSnap.data().selectedModelPref;
      if (pref) {
        setAiSelectedModels((current) => {
          const initial = getInitialModels();
          const merged = { ...initial, ...current };
          Object.entries(pref).forEach(([key, val]) => {
            merged[key] = {
              modelId: val.modelId || merged[key]?.modelId || initial[key].modelId,
              enabled: true,
            };
          });
          return merged;
        });
      }
      return;
    }

    const userData = {
      name: user?.fullName || "Unnamed User",
      email: userEmail,
      createdAt: new Date(),
      remainingMsg: 5,
      plan: "Free",
      credits: 1000,
    };

    await setDoc(userRef, userData);
    console.log("✅ New user data saved");
    if (!currentChatId) {
      setAiSelectedModels(getInitialModels());
    }
  };

  // ✅ Load a specific chat session from DB
  const loadChat = async (chatId) => {
    if (!user) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    setIsLoadingChat(true);
    try {
      const docRef = doc(db, "users", userEmail, "chats", chatId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setMessages(normalizeMessages(data.messages));
        
        const initial = getInitialModels();
        const loaded = data.selectedModels || {};
        const mergedModels = {};
        ALL_MODELS.forEach((key) => {
          const loadedModel = loaded[key];
          let isEnabled = false;
          if (loadedModel) {
            if (loadedModel.enabled !== undefined) {
              isEnabled = !!loadedModel.enabled;
            } else {
              isEnabled = key === "GPT" || key === "Gemini";
            }
          } else {
            isEnabled = key === "GPT" || key === "Gemini";
          }

          mergedModels[key] = {
            modelId: loadedModel?.modelId || initial[key].modelId,
            enabled: isEnabled,
          };
        });

        setAiSelectedModels(mergedModels);
        setCurrentChatId(chatId);
      } else {
        console.warn(`Chat ${chatId} not found`);
      }
    } catch (err) {
      console.error("❌ Error loading chat:", err);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // ✅ Delete a specific chat session
  const deleteChat = async (chatId) => {
    if (!user) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    try {
      const docRef = doc(db, "users", userEmail, "chats", chatId);
      await deleteDoc(docRef);
      console.log(`✅ Deleted chat ${chatId}`);
      if (currentChatId === chatId) {
        createNewChat();
      }
    } catch (err) {
      console.error("❌ Error deleting chat:", err);
    }
  };

  // ✅ Rename a specific chat title
  const renameChat = async (chatId, newTitle) => {
    if (!user) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    try {
      const docRef = doc(db, "users", userEmail, "chats", chatId);
      await updateDoc(docRef, {
        title: newTitle,
        updatedAt: Date.now(),
      });
      console.log(`✅ Renamed chat ${chatId} to: ${newTitle}`);
    } catch (err) {
      console.error("❌ Error renaming chat:", err);
    }
  };

  // ✅ Clear all chats for the user
  const clearAllChats = async () => {
    if (!user) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    try {
      const chatsRef = collection(db, "users", userEmail, "chats");
      const snap = await getDocs(chatsRef);
      const batch = writeBatch(db);
      snap.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      console.log("✅ Cleared all chats");
      createNewChat();
    } catch (err) {
      console.error("❌ Error clearing chats:", err);
    }
  };

  // Initial user signup + generate initial chatId
  useEffect(() => {
    if (user && !hasCreatedUser.current) {
      hasCreatedUser.current = true;
      createNewUser();
    }
  }, [user]);

  useEffect(() => {
    createNewChat();
  }, []);

  // Listen to chats subcollection in real-time
  useEffect(() => {
    if (!user) {
      setChats([]);
      return;
    }
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    const chatsQuery = query(
      collection(db, "users", userEmail, "chats"),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      chatsQuery,
      (snapshot) => {
        const chatList = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          chatList.push({
            id: doc.id,
            ...data,
            messages: normalizeMessages(data.messages),
          });
        });
        setChats(chatList);
      },
      (error) => {
        console.error("❌ Error listening to chats subcollection:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ✅ Save current chat state to Firestore
  const saveChatToFirestore = async (chatId, currentMessages, currentModels, customTitle = null) => {
    if (!user || !chatId) return;
    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    try {
      const docRef = doc(db, "users", userEmail, "chats", chatId);
      const docSnap = await getDoc(docRef);

      const updateData = {
        chatId,
        messages: currentMessages,
        selectedModels: currentModels,
        updatedAt: Date.now(),
      };

      if (!docSnap.exists()) {
        let title = customTitle;
        if (!title && currentMessages.length > 0) {
          const firstUserMsg = currentMessages.find((m) => m.role === "user");
          title = firstUserMsg ? generateTitle(firstUserMsg.content) : "New Chat";
        }
        updateData.title = title || "New Chat";
        updateData.createdAt = Date.now();
        await setDoc(docRef, updateData);
        console.log("✅ Created new chat document in Firestore");
      } else {
        if (customTitle) {
          updateData.title = customTitle;
        }
        await updateDoc(docRef, updateData);
        console.log("✅ Updated chat document in Firestore");
      }
    } catch (err) {
      console.error("❌ Error saving chat:", err);
    }
  };

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <AiSelectetdModelContext.Provider
        value={{
          currentChatId,
          setCurrentChatId,
          chats,
          setChats,
          aiSelectedModels,
          setAiSelectedModels,
          messages,
          setMessages,
          isLoadingChat,
          loadChat,
          createNewChat,
          deleteChat,
          renameChat,
          clearAllChats,
          saveChatToFirestore,
        }}
      >
        <SidebarProvider>
          <AppSidebar />
          <div className="w-full flex flex-col min-h-screen overflow-hidden">
            <AppHeader />
            <div className="flex-1 overflow-hidden">{children}</div>
          </div>
        </SidebarProvider>
      </AiSelectetdModelContext.Provider>
    </NextThemesProvider>
  );
}
