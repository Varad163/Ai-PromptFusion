"use client";

import React from "react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

function AppHeader() {
  const { isSignedIn } = useUser();

  return (
    <div className="p-3 w-full shadow flex justify-between items-center bg-card border-b border-border">
      <SidebarTrigger />
      {isSignedIn ? (
        <div className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/" />
        </div>
      ) : (
        <SignInButton mode="modal">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">Sign In</Button>
        </SignInButton>
      )}
    </div>
  );
}

export default AppHeader;