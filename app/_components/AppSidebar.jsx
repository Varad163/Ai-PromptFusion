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

export function AppSidebar() {
  const { theme, setTheme } = useTheme();
  const { user } = useUser();
  const [mounted, setMounted] = useState(false);

  // ✅ Prevent hydration mismatch
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

            {/* ✅ Render nothing until mounted to avoid mismatch */}
            {mounted ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <Sun /> : <Moon />}
              </Button>
            ) : (
              // Placeholder to preserve layout
              <div className="w-9 h-9 rounded-md bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}
          </div>

          {/* New Chat */}
          {user?
          <Button className="mt-7 w-full" size="lg">
            + New Chat
          </Button>:
          <SignInButton>
            <Button className="mt-7 w-full" size="lg">
            + New Chat
          </Button>
          </SignInButton>}

        </div>
      </SidebarHeader>

      {/* Content */}
      <SidebarContent>
  <SidebarGroup>
    <div className="p-3">
      <h2 className="font-bold text-lg">Chat</h2>

      {!user && (
        <p className="text-sm text-gray-400">
          Sign in to start chatting with multiple models
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
              <UsageCreditProgress/>
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
