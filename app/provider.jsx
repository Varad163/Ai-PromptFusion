"use client";

import React, { useEffect, useState } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./_components/AppSidebar";
import AppHeader from "./_components/AppHeader";

// 🔹 Clerk + Firebase imports
import { useUser } from "@clerk/nextjs";
import { db } from "@/config/FirebaseConfig"; // ✅ make sure you have this file
import { doc, getDoc, setDoc } from "firebase/firestore";
import { AiSelectetdModelContext } from "@/context/AiSelectedModelContext";
import { DefaultModel } from "@/shared/AiModelsShared";

export default function Provider({ children, ...props }) {
  const { user } = useUser();
  const [aiSelectedModels,setAiSelectedModels]=useState(DefaultModel)
  const [messages,setMessages]=useState({})

  // 👇 Define function once
  const createNewUser = async () => {
    if (!user) return;

    const userEmail = user?.primaryEmailAddress?.emailAddress;
    if (!userEmail) return;

    const userRef = doc(db, "users", userEmail);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
<<<<<<< HEAD
        console.log("👤 Existing user");
        const userInfo = userSnap.data();
        setAiSelectedModels(userInfo?.selectedModelPref ?? DefaultModel);
        return;
      }
=======
      console.log("👤 Existing user");
      return;
    }
>>>>>>> master

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
  };

  // 🌀 Call once when `user` is loaded
  useEffect(() => {
    createNewUser();
  }, [user]);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <AiSelectetdModelContext.Provider value={{aiSelectedModels,setAiSelectedModels,messages,setMessages}}>
      <SidebarProvider>
        <AppSidebar />
        <div className="w-full">
          <AppHeader />
          {children}
        </div>
      </SidebarProvider>
      </AiSelectetdModelContext.Provider>
    </NextThemesProvider>
  );
}
