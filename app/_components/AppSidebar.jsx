import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { useTheme } from "next-themes";

export function AppSidebar() {
  const { theme, setTheme } = useTheme(); // ✅ Correct destructuring

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-3">
        <div className="flex items-center justify-between ">
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
          {/* ✅ Theme Toggle Button */}
          <Button
            variant="ghost"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Sun /> : <Moon />}
          </Button>

        </div><Button className="mt-7 w-full size-lg"> + New Chat</Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
            <div className="p-3">
          <h2 className="font-bold text-lg">Chat</h2>
          <p className="text-sm text-gray-400">Sign in to start chatting with multiple model</p>
        </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="p-3 mb-10">
            <Button className={'w-full'} size={'lg'}>Sign In/Sign Up</Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
