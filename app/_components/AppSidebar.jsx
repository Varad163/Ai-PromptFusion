"use client";

import { useEffect, useState, useContext, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sun,
  Moon,
  User2,
  Bolt,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  MessageSquare,
  Sparkles,
  AlertCircle
} from "lucide-react";
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
import { SignInButton, useUser, useClerk } from "@clerk/nextjs";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import moment from "moment";
import AiModelList from "@/shared/AiModelList";

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [mounted, setMounted] = useState(false);

  const {
    currentChatId,
    chats,
    isLoadingChat,
    loadChat,
    createNewChat,
    deleteChat,
    renameChat,
    clearAllChats,
  } = useContext(AiSelectetdModelContext);

  const [searchQuery, setSearchQuery] = useState("");
  const [editingChatId, setEditingChatId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Bulk actions state
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedChats, setSelectedChats] = useState(new Set());
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Theme mount state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Resize Sidebar Handle Logic
  const handleMouseDown = (e) => {
    e.preventDefault();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    let newWidth = e.clientX;
    if (newWidth < 260) newWidth = 260;
    if (newWidth > 480) newWidth = 480;
    document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`);
  };

  const handleMouseUp = () => {
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Group chats chronologically
  const groupedChats = useMemo(() => {
    const filtered = chats.filter((chat) =>
      (chat.title || "New Chat")
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );

    const groups = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };

    const now = moment().startOf("day");

    filtered.forEach((chat) => {
      const dateVal = chat.updatedAt || chat.createdAt || Date.now();
      const chatDate = moment(dateVal);

      if (chatDate.isSame(now, "d")) {
        groups.Today.push(chat);
      } else if (chatDate.isSame(now.clone().subtract(1, "d"), "d")) {
        groups.Yesterday.push(chat);
      } else if (chatDate.isAfter(now.clone().subtract(7, "d"))) {
        groups["Previous 7 Days"].push(chat);
      } else {
        groups.Older.push(chat);
      }
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, items]) => items.length > 0)
    );
  }, [chats, searchQuery]);

  // Snippet preview helper
  const getPreviewSnippet = (chat) => {
    if (!chat.messages || chat.messages.length === 0) {
      return "Empty chat";
    }
    const lastMsg = chat.messages[chat.messages.length - 1];
    return lastMsg.content || "Attachment details...";
  };

  // Model icons finder
  const getModelIcon = (parentModelName) => {
    const modelItem = AiModelList.find((m) => m.model === parentModelName);
    return modelItem ? modelItem.icon : null;
  };

  // Rename handle actions
  const startEditing = (chatId, title, e) => {
    e.stopPropagation();
    setEditingChatId(chatId);
    setEditingTitle(title || "New Chat");
  };

  const saveRename = async (chatId, e) => {
    e?.stopPropagation();
    if (editingTitle.trim()) {
      await renameChat(chatId, editingTitle.trim());
    }
    setEditingChatId(null);
  };

  const handleRenameKeyDown = (chatId, e) => {
    if (e.key === "Enter") {
      saveRename(chatId, e);
    } else if (e.key === "Escape") {
      setEditingChatId(null);
    }
  };

  // Bulk actions operations
  const toggleSelectChat = (chatId, e) => {
    e.stopPropagation();
    setSelectedChats((prev) => {
      const updated = new Set(prev);
      if (updated.has(chatId)) {
        updated.delete(chatId);
      } else {
        updated.add(chatId);
      }
      return updated;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedChats.size === 0) return;
    for (const id of selectedChats) {
      await deleteChat(id);
    }
    setSelectedChats(new Set());
    setBulkMode(false);
  };

  return (
    <Sidebar className="relative border-r border-border h-full flex flex-col bg-sidebar select-none transition-all duration-150">
      {/* Draggable Divider Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute top-0 right-0 w-[4px] h-full cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50"
      />

      {/* Header */}
      <SidebarHeader className="border-b border-border p-4 bg-sidebar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              alt="logo"
              width={34}
              height={34}
              className="w-[34px] h-[34px] animate-pulse"
            />
            <h2 className="font-bold text-lg text-foreground tracking-tight">
              AI Prompt Fusion
            </h2>
          </div>

          {mounted ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-8 w-8 hover:bg-muted"
            >
              {theme === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-8 h-8 rounded-md bg-muted animate-pulse" />
          )}
        </div>

        {/* New Chat Button */}
        {user ? (
          <Button
            onClick={() => {
              createNewChat();
              setBulkMode(false);
            }}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all flex items-center justify-center gap-2"
            size="lg"
          >
            <Plus className="h-4 w-4" /> New Chat
          </Button>
        ) : (
          <SignInButton mode="modal">
            <Button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
              + New Chat
            </Button>
          </SignInButton>
        )}

        {/* Search Input */}
        {user && chats.length > 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary"
            />
          </div>
        )}
      </SidebarHeader>

      {/* Main Content Area */}
      <SidebarContent className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        <SidebarGroup>
          {!user && (
            <div className="flex flex-col items-center justify-center text-center p-4 py-8 space-y-3 bg-muted/20 rounded-lg border border-dashed border-border m-2">
              <Sparkles className="h-8 w-8 text-blue-500 animate-bounce" />
              <div>
                <p className="text-sm font-semibold">Sign in to save history</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Access your multi-model chats anywhere.
                </p>
              </div>
            </div>
          )}

          {user && chats.length === 0 && (
            <div className="text-center p-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">No conversations yet.</p>
              <p className="text-[10px] opacity-75 mt-1">
                Start by typing a prompt in the input box!
              </p>
            </div>
          )}

          {/* Grouped Chats */}
          {user && chats.length > 0 && (
            <div className="space-y-4">
              {/* Bulk actions header */}
              <div className="flex items-center justify-between px-2 text-xs">
                <span className="font-semibold text-muted-foreground">
                  History
                </span>
                <div className="flex gap-2">
                  {bulkMode ? (
                    <>
                      <button
                        onClick={handleBulkDelete}
                        disabled={selectedChats.size === 0}
                        className="text-red-500 hover:text-red-600 disabled:opacity-50 font-medium"
                      >
                        Delete ({selectedChats.size})
                      </button>
                      <button
                        onClick={() => {
                          setBulkMode(false);
                          setSelectedChats(new Set());
                        }}
                        className="hover:text-foreground text-muted-foreground"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setBulkMode(true)}
                      className="hover:text-foreground text-muted-foreground transition"
                    >
                      Bulk Select
                    </button>
                  )}
                </div>
              </div>

              {Object.entries(groupedChats).map(([groupName, items]) => (
                <div key={groupName} className="space-y-1">
                  <h3 className="px-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {groupName}
                  </h3>
                  <ul className="space-y-1">
                    {items.map((chat) => {
                      const isActive = chat.id === currentChatId;
                      const isEditing = editingChatId === chat.id;

                      // Find enabled models for this chat
                      const activeModels = chat.selectedModels
                        ? Object.entries(chat.selectedModels)
                            .filter(([_, info]) => info.enabled)
                            .map(([name, _]) => name)
                        : [];

                      return (
                        <li
                          key={chat.id}
                          onClick={() => {
                            if (!bulkMode && !isEditing) loadChat(chat.id);
                          }}
                          className={`group relative p-2.5 rounded-lg border transition cursor-pointer flex flex-col gap-1.5 ${
                            isActive
                              ? "bg-blue-500/10 border-blue-500/20 text-foreground"
                              : "bg-card border-transparent hover:bg-muted/40 hover:border-border"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {/* Bulk selection checkbox */}
                            {bulkMode && (
                              <input
                                type="checkbox"
                                checked={selectedChats.has(chat.id)}
                                onChange={(e) => toggleSelectChat(chat.id, e)}
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            )}

                            {/* Chat Title / Editing state */}
                            {isEditing ? (
                              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                                <Input
                                  value={editingTitle}
                                  onChange={(e) => setEditingTitle(e.target.value)}
                                  onKeyDown={(e) => handleRenameKeyDown(chat.id, e)}
                                  className="h-6 text-xs px-1 py-0 border border-input rounded bg-background"
                                  autoFocus
                                />
                                <button
                                  onClick={(e) => saveRename(chat.id, e)}
                                  className="text-green-500 hover:text-green-600 p-0.5"
                                >
                                  <Check className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingChatId(null);
                                  }}
                                  className="text-red-500 hover:text-red-600 p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-xs font-semibold truncate flex-1 leading-tight text-foreground pr-8">
                                {chat.title || "New Chat"}
                              </p>
                            )}
                          </div>

                          {/* Last updated and Preview Snippet */}
                          {!isEditing && (
                            <p className="text-[11px] text-muted-foreground truncate leading-normal">
                              {getPreviewSnippet(chat)}
                            </p>
                          )}

                          {/* Footer with models and timestamp */}
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5">
                            {/* Active Model Badges */}
                            <div className="flex items-center gap-1">
                              {activeModels.slice(0, 4).map((modelName) => {
                                const icon = getModelIcon(modelName);
                                return icon ? (
                                  <div
                                    key={modelName}
                                    className="w-3.5 h-3.5 rounded-full border border-border bg-white dark:bg-zinc-800 flex items-center justify-center overflow-hidden"
                                    title={modelName}
                                  >
                                    <Image
                                      src={icon}
                                      alt={modelName}
                                      width={10}
                                      height={10}
                                      className="object-contain"
                                    />
                                  </div>
                                ) : (
                                  <span
                                    key={modelName}
                                    className="px-1 text-[8px] bg-muted border border-border rounded font-bold"
                                  >
                                    {modelName.charAt(0)}
                                  </span>
                                );
                              })}
                              {activeModels.length > 4 && (
                                <span className="text-[8px] opacity-75 font-semibold">
                                  +{activeModels.length - 4}
                                </span>
                              )}
                            </div>

                            <span>
                              {moment(chat.updatedAt || chat.createdAt).fromNow()}
                            </span>
                          </div>

                          {/* Float Options (Rename/Delete) */}
                          {!bulkMode && !isEditing && (
                            <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-card via-card pl-3">
                              <button
                                onClick={(e) => startEditing(chat.id, chat.title, e)}
                                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition"
                                title="Rename Chat"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChat(chat.id);
                                }}
                                className="p-1 hover:bg-red-500/10 rounded text-muted-foreground hover:text-red-500 transition"
                                title="Delete Chat"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </SidebarGroup>
      </SidebarContent>

      {/* Footer Area */}
      <SidebarFooter className="border-t border-border p-4 bg-sidebar">
        {user ? (
          <div className="space-y-4">
            <UsageCreditProgress />

            {/* Clear All Chats Confirmation */}
            {showClearConfirm ? (
              <div className="p-2.5 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                <div className="flex gap-2 items-start text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-snug">
                    Are you sure you want to clear all conversations? This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="destructive"
                    className="w-full text-xs h-7"
                    onClick={async () => {
                      await clearAllChats();
                      setShowClearConfirm(false);
                    }}
                  >
                    Yes, Clear All
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={() => setShowClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              chats.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setShowClearConfirm(true)}
                  className="w-full text-xs border-dashed border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5 text-red-500 h-8 flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-3 w-3" /> Clear Chat History
                </Button>
              )
            )}

            <Button
              className="w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700 text-white font-medium shadow-sm transition-all"
              size="lg"
            >
              <Bolt className="mr-2 h-4 w-4" /> Upgrade Plan
            </Button>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-2">
                <User2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium truncate max-w-[120px]">
                  {user.fullName || user.primaryEmailAddress.emailAddress}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <SignInButton mode="modal">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium" size="lg">
              Sign In / Sign Up
            </Button>
          </SignInButton>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
