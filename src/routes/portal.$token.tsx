import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getPortalData, submitPortalInfo } from "@/lib/portal.functions";
import { uploadPortalFile } from "@/lib/clients.functions";
import {
  Check,
  Loader2,
  ArrowUpTray,
  Document,
  GlobeAlt,
  User,
  Phone,
  Mail,
} from "@/components/heroicons";
import { toast } from "sonner";

export const Route = createFileRoute("/portal/$token")({
  head: () => ({ meta: [{ title: "Client Portal — Formline" }] }),
  component: ClientPortal,
});

function ClientPortal() {
  const { token } = Route.useParams();
  const queryClient = useQueryClient();

  const getPortal = useServerFn(getPortalData);
  const updateInfo = useServerFn(submitPortalInfo);
  const uploadFile = useServerFn(uploadPortalFile);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["portal-data", token],
    queryFn: () => getPortal({ data: { token } }),
    retry: 1,
  });

  // Contact info form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Sync state with query data when loaded
  useEffect(() => {
    if (data?.client) {
      setFullName(data.client.fullName || "");
      setEmail(data.client.email || "");
      setPhone(data.client.phone || "");
    }
  }, [data]);

  // Drag and drop state
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Update contact info mutation
  const updateInfoMut = useMutation({
    mutationFn: async () =>
      updateInfo({
        data: {
          token,
          fullName,
          email,
          phone,
        },
      }),
    onSuccess: () => {
      toast.success("Contact information updated successfully");
      queryClient.invalidateQueries({ queryKey: ["portal-data", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to update information"),
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    setUploading(true);
    const toastId = toast.loading("Uploading asset...");
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let b = 0; b < bytes.byteLength; b++) binary += String.fromCharCode(bytes[b]);
        const fileBase64 = btoa(binary);

        await uploadFile({
          data: {
            token,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileBase64,
          },
        });
      }
      toast.success("File uploaded successfully", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["portal-data", token] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "File upload failed", { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#7C5CFF]" />
      </div>
    );
  }

  if (isError || !data?.client) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white">
        <div className="mx-auto max-w-xl px-6 py-20 text-center">
          <h1 className="text-2xl font-semibold">Access Denied</h1>
          <p className="mt-2 text-white/60">
            {error instanceof Error ? error.message : "This link may have expired or is invalid."}
          </p>
        </div>
      </div>
    );
  }

  const { client, files = [] } = data;

  const inp =
    "h-11 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-3.5 text-sm text-white placeholder:text-white/30 focus:border-[#7C5CFF] focus:outline-none transition-all";

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E5E5E7] relative pb-20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(124,92,255,0.15),transparent_70%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white tracking-wider uppercase text-sm border-r border-white/10 pr-4">
              Formline
            </span>
            <span className="text-white/60 text-sm">{client.company} Portal</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
            Secure Client Workspace
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 mt-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Welcome, {client.fullName}
          </h1>
          <p className="mt-2 text-white/60">
            Use this portal to upload requested assets, files, or keep your contact details up to
            date with {client.company}.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Contact Info Form */}
          <div className="lg:col-span-1 bg-white/[0.02] border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-medium text-white mb-5 flex items-center gap-2">
              <User className="size-5 text-[#7C5CFF]" />
              Your Information
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateInfoMut.mutate();
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1.5 block text-xs text-white/60 font-medium uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <input
                    className={inp}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/60 font-medium uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <input
                    type="email"
                    className={inp}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs text-white/60 font-medium uppercase tracking-wider">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <input
                    type="tel"
                    className={inp}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={updateInfoMut.isPending}
                className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-[#7C5CFF] text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 mt-2 cursor-pointer transition-all"
              >
                {updateInfoMut.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save Profile Details"
                )}
              </button>
            </form>
          </div>

          {/* Right: Asset & File uploads */}
          <div className="lg:col-span-2 space-y-6">
            {/* Drag & Drop File Zone */}
            <div
              className={`border border-dashed rounded-xl p-8 text-center transition-all ${
                dragActive
                  ? "border-[#7C5CFF] bg-[#7C5CFF]/5"
                  : "border-white/10 bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="portal-file-upload"
                multiple
                className="hidden"
                onChange={handleFileInput}
                disabled={uploading}
              />
              <label
                htmlFor="portal-file-upload"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="size-12 rounded-full bg-[#7C5CFF]/10 text-[#7C5CFF] flex items-center justify-center mb-4">
                  {uploading ? (
                    <Loader2 className="size-6 animate-spin" />
                  ) : (
                    <ArrowUpTray className="size-6" />
                  )}
                </div>
                <h3 className="text-base font-medium text-white">Drag & drop files here</h3>
                <p className="mt-1 text-sm text-white/40">or click to browse your computer</p>
                <span className="mt-4 inline-flex items-center rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-white/60">
                  Any file type allowed
                </span>
              </label>
            </div>

            {/* List of Files */}
            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-medium text-white mb-4 flex items-center justify-between">
                <span>Uploaded Files</span>
                <span className="text-xs font-normal text-white/40">{files.length} items</span>
              </h2>

              {files.length === 0 ? (
                <div className="py-10 text-center text-white/30 text-sm">
                  No files uploaded yet. Drop some files above to begin onboarding.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {files.map((file) => (
                    <div key={file.id} className="py-3 flex items-center justify-between group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-9 rounded bg-white/5 flex items-center justify-center text-white/40">
                          <Document className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate max-w-[250px] sm:max-w-[400px]">
                            {file.name}
                          </p>
                          <p className="text-xs text-white/40">
                            {formatBytes(file.size)} &bull; {file.type || "Unknown type"}
                          </p>
                        </div>
                      </div>
                      <div>
                        {file.signedUrl ? (
                          <a
                            href={file.signedUrl}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#7C5CFF] hover:underline"
                          >
                            Download
                          </a>
                        ) : (
                          <span className="text-xs text-white/20">Processing</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
