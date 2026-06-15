import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

/**
 * Client file storage: Supabase Storage (production) or local disk (dev fallback).
 *
 * - With SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY: files upload to the `client-files` bucket.
 * - Without Supabase: files are written to `public/uploads/` and served at `/uploads/...`.
 *   On serverless (Vercel, etc.) that directory is ephemeral — uploads disappear on redeploy.
 *   Configure Supabase for persistent production file storage.
 */
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const useSupabase = Boolean(supabaseUrl && supabaseServiceKey);

if (!useSupabase && process.env.NODE_ENV === "development") {
  console.warn(
    "[storage] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — using public/uploads/ (local disk). " +
      "Files are ephemeral on serverless; set Supabase env vars for production.",
  );
}

// Initialize Supabase if variables are present
const supabase = useSupabase ? createClient(supabaseUrl!, supabaseServiceKey!) : null;

const BUCKET_NAME = "client-files";

// Ensure local directory exists if falling back to disk
async function ensureUploadsDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

/**
 * Upload a file buffer to storage.
 * Returns the public URL / storage path of the file.
 */
export async function uploadFileToStorage(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const uniqueName = `${crypto.randomUUID()}-${filename.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  if (useSupabase && supabase) {
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(uniqueName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

    if (error) {
      console.error("Supabase storage upload error:", error);
      throw error;
    }

    // We store the unique name path, which we sign when rendering.
    return uniqueName;
  } else {
    // Fallback: local disk storage
    await ensureUploadsDir();
    const destPath = path.join(process.cwd(), "public", "uploads", uniqueName);
    await fs.writeFile(destPath, buffer);
    return `/uploads/${uniqueName}`;
  }
}

/**
 * Delete a file from storage by its URL or path.
 */
export async function deleteFileFromStorage(urlOrPath: string): Promise<void> {
  if (urlOrPath.startsWith("/uploads/")) {
    // Local storage file
    const filename = urlOrPath.replace("/uploads/", "");
    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    try {
      await fs.unlink(filePath);
      console.log("Deleted local file:", filePath);
    } catch (err) {
      if (err && typeof err === "object" && "code" in err && err.code !== "ENOENT") {
        console.error("Failed to delete local file:", err);
      }
    }
  } else if (useSupabase && supabase) {
    // Supabase file (urlOrPath is the uniqueName)
    const { error } = await supabase.storage.from(BUCKET_NAME).remove([urlOrPath]);
    if (error) {
      console.error("Supabase storage delete error:", error);
    }
  }
}

/**
 * Get a signed URL for private access, or the public URL for local uploads.
 */
export async function getSignedUrl(urlOrPath: string): Promise<string> {
  if (
    urlOrPath.startsWith("/uploads/") ||
    urlOrPath.startsWith("http://") ||
    urlOrPath.startsWith("https://") ||
    urlOrPath.startsWith("data:")
  ) {
    // Local uploads, absolute URLs, or base64 dataUrls are served directly
    return urlOrPath;
  }

  if (useSupabase && supabase) {
    // Generate signed URL from Supabase
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(urlOrPath, 3600); // 1 hour expiry

    if (error) {
      console.error("Supabase storage sign error:", error);
      return urlOrPath;
    }

    return data.signedUrl;
  }

  return urlOrPath;
}
