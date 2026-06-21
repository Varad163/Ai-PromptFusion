"use client";

import ChatInputBox from "./_components/ChatInputBox";
import AiMultiModels from "./_components/AiMultiModels";

export default function Home() {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-background">
      <div className="flex-1 overflow-hidden">
        <AiMultiModels />
      </div>
      <ChatInputBox />
    </div>
  );
}
