import { NextResponse } from "next/server";
import { storage } from "@/config/FirebaseConfig";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import fs from "fs";
import path from "path";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      console.log("🔥 Upload API Error: No file provided in FormData");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    console.log("📦 Upload API Received File:", file.name, file.size, file.type);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique name for the file
    const fileId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    const fileName = `${fileId}_${file.name}`;

    // 1. Try uploading to Firebase Storage (Server-side bypasses client rules if authorized)
    try {
      const storageRef = ref(storage, `uploads/${fileName}`);
      const snapshot = await uploadBytes(storageRef, buffer, {
        contentType: file.type,
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      console.log("✅ Uploaded to Firebase Storage successfully:", downloadUrl);
      return NextResponse.json({
        url: downloadUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    } catch (firebaseError) {
      console.warn(
        "⚠️ Firebase Storage upload failed, falling back to local public storage:",
        firebaseError.message
      );

      // 2. Fallback to saving locally in public/uploads (100% reliable local backup)
      const publicDirectory = path.join(process.cwd(), "public", "uploads");
      if (!fs.existsSync(publicDirectory)) {
        fs.mkdirSync(publicDirectory, { recursive: true });
      }

      const localPath = path.join(publicDirectory, fileName);
      fs.writeFileSync(localPath, buffer);

      const localUrl = `/uploads/${fileName}`;
      console.log("✅ Saved to local public storage successfully:", localUrl);
      return NextResponse.json({
        url: localUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }
  } catch (error) {
    console.error("🔥 Server Upload API General Error:", error);
    return NextResponse.json(
      { error: error.message || "Server upload process failed" },
      { status: 500 }
    );
  }
}
