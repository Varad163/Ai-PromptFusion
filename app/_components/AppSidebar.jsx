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
        <div className="flex items-center justify-between p-3">
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
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          {/* Add sidebar menu items here */}
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {/* Add footer content if needed */}
      </SidebarFooter>
    </Sidebar>
  );
}
