import { aj } from "@/config/Arcjet";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server"; // ✅ Correct import

export async function GET(req) {
  try {
    // ✅ Get authenticated Clerk user
    const { userId } = auth();

    // 🛑 If not signed in
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized: User not signed in" },
        { status: 401 }
      );
    }

    console.log("✅ Authenticated Clerk User:", userId);

    // 🧠 Arcjet protection — 5 tokens requested
    const decision = await aj.protect(req, { userId, requested: 5 });
    console.log("🛡️ Arcjet Decision:", decision);

    if (decision.isDenied()) {
      return NextResponse.json(
        {
          error: "Too Many Requests",
          reason: decision.reason,
        },
        { status: 429 }
      );
    }

    // ✅ Success response
    return NextResponse.json({ message: `Hello ${userId}` });
  } catch (error) {
    console.error("❌ Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
