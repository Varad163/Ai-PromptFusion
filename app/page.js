"use client"
import Image from "next/image";
import {useTheme} from "next-themes";
import {Button} from "@/components/ui/button"
import ChatInputBox from "./_components/ChatInputBox";
export default function Home() {
  const {setTheme}=useTheme();
  console.log(process.env.NEXT_PUBLIC_KRAVIXSTUDIO_API_KEY);

  return (
 <div>
 <ChatInputBox/>
 </div>
  );
}
