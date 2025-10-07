"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, User2, Bolt } from "lucide-react";
import UsageCreditProgress from "./UsageCreditProgress";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useTheme } from "next-themes";
import { SignInButton, useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import moment from "moment";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // ✅ no TypeScript here

  // ✅ Fetch chat history from Firestore
  const GetChatHistory = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "chatHistory"),
        where("userEmail", "==", user?.primaryEmailAddress?.emailAddress)
      );

      const querySnapshot = await getDocs(q);
      const chats = [];
      querySnapshot.forEach((doc) => {
        chats.push({ id: doc.id, ...doc.data() });
      });

      console.log("🧠 Chat History:", chats);
      setChatHistory(chats);
    } catch (error) {
      console.error("❌ Error fetching chat history:", error);
    }
  };

  // ✅ Extract last user message
  const GetLastUserMessageFromChat = (chat) => {
    if (!chat?.messages) return null;

    let allMessages = [];
    if (Array.isArray(chat.messages)) {
      allMessages = chat.messages;
    } else {
      allMessages = Object.values(chat.messages).flat();
    }

    const userMessages = allMessages.filter((msg) => msg.role === "user");
    if (userMessages.length === 0) return null;

    const lastUserMsg = userMessages[userMessages.length - 1].content || "";
    const lastUpdated = chat.lastUpdated || Date.now();
    const formatted = moment(lastUpdated).fromNow();

    return {
      message: lastUserMsg,
      lastMsgDate: formatted,
    };
  };

  useEffect(() => {
    if (user) GetChatHistory();
  }, [user]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Sidebar>
      {/* Header */}
      <SidebarHeader>
        <div className="p-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="logo"
                width={40}
                height={40}
                className="w-[40px] h-[40px]"
              />
              <h2 className="font-bold text-xl text-foreground">AI Fusion</h2>
            </div>

            {/* Theme Switch */}
            {mounted ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <Sun /> : <Moon />}
              </Button>
            ) : (
              <div className="w-9 h-9 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
          </div>

          {/* New Chat */}
          {user ? (
            <Button className="mt-7 w-full" size="lg">
              + New Chat
            </Button>
          ) : (
            <SignInButton>
              <Button className="mt-7 w-full" size="lg">
                + New Chat
              </Button>
            </SignInButton>
          )}
        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
        <SidebarGroup>
          <div className="p-3">
            <h2 className="font-bold text-lg">Chat</h2>
            {!user && (
              <p className="text-sm text-gray-400">
                Sign in to view your chat history
              </p>
            )}

            {/* ✅ Chat History */}
            {user && chatHistory.length > 0 && (
              <ul className="mt-3 space-y-3">
                {chatHistory.map((chat) => {
                  const last = GetLastUserMessageFromChat(chat);
                  if (!last) return null;

                  return (
                    <li
                      key={chat.id}
                      className="p-2 rounded-md bg-muted hover:bg-muted/70 transition cursor-pointer"
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                        💬 {last.message}
                      </p>
                      <p className="text-xs text-gray-500">{last.lastMsgDate}</p>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* No chat fallback */}
            {user && chatHistory.length === 0 && (
              <p className="text-sm text-gray-400 mt-2">
                No previous chats found.
              </p>
            )}
          </div>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter>
        <div className="p-3 mb-6">
          {!user ? (
            <SignInButton mode="modal">
              <Button className="w-full" size="lg">
                Sign In / Sign Up
              </Button>
            </SignInButton>
          ) : (
            <div className="space-y-3">
              <UsageCreditProgress />
              <Button className="w-full" size="lg">
                <Bolt className="mr-2" /> Upgrade Plan
              </Button>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-start gap-2"
              >
                <User2 />
                <span>Settings</span>
              </Button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
