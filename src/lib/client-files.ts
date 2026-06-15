import type { ClientFile } from "@/lib/clients-store";

/** Resolve a downloadable href for a client file (storage URL, signed URL, or legacy data URL). */
export function getClientFileHref(
  file: Pick<ClientFile, "signedUrl" | "dataUrl" | "url">,
): string | undefined {
  return file.signedUrl || file.url || file.dataUrl;
}

export async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let b = 0; b < bytes.byteLength; b++) binary += String.fromCharCode(bytes[b]);
  return btoa(binary);
}
