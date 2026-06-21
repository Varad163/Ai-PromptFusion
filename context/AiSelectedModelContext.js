import { createContext } from "react";

/**
 * Context for managing selected AI models, active chat ID, messages, and sidebar chat history.
 * 
 * Shape of values:
 * - currentChatId: string (active chat session ID)
 * - chats: Array of chat objects: { chatId, title, createdAt, updatedAt, selectedModels }
 * - selectedModels: Map of model name to { modelId, enabled }
 * - messages: Array of flat message objects: { id, role, content, model, parentModel, timestamp, responseTime, tokenCount, attachments }
 * - isLoadingChat: boolean
 * - setCurrentChatId: Function
 * - setSelectedModels: Function
 * - setMessages: Function
 * - setChats: Function
 * - loadChat: Function (loads messages and models for a chatId)
 * - createNewChat: Function (creates a blank new chat)
 * - deleteChat: Function (deletes a chat by id)
 * - renameChat: Function (renames a chat by id)
 * - clearAllChats: Function (clears all chat history for user)
 */
export const AiSelectetdModelContext = createContext();