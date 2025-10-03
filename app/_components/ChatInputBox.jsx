import { Button } from '@/components/ui/button'
import { Paperclip, Mic, Send } from 'lucide-react'
import React from 'react'
import AiMultiModels from './AiMultiModels'
function ChatInputBox() {
  return (
    <div className="relative min-h-screen bg-background">
      {/* Page content */}
      <AiMultiModels/>
      <div className="p-4">
        {/* Chat messages or page content can go here */}
      </div>

      {/* Fixed chat input */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center bg-background/60 backdrop-blur-md p-4">
        <div className="w-full max-w-2xl border rounded-xl shadow-md flex items-center gap-2 px-4 py-2 bg-card">
          
          {/* Attachment Button */}
          <Button variant="ghost" size="icon">
            <Paperclip className="h-5 w-5 text-muted-foreground" />
          </Button>
          
          {/* Input */}
          <input
            type="text"
            placeholder="Ask me anything..."
            className="flex-1 bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
          />

          {/* Mic Button */}
          <Button variant="ghost" size="icon">
            <Mic className="h-5 w-5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className={'bg-blue-600'}>
            <Send />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ChatInputBox
