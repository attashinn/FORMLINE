import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, Users, FileText, ClipboardList, X } from "@/components/heroicons";
import { useClients } from "@/lib/clients-store";
import { listForms, listAllSubmissions } from "@/lib/forms.functions";
import { motion, AnimatePresence } from "framer-motion";

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  
  const { clients } = useClients();
  const getForms = useServerFn(listForms);
  const getSubs = useServerFn(listAllSubmissions);

  const { data: forms = [] } = useQuery({
    queryKey: ["forms"],
    queryFn: () => getForms(),
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ["all-submissions"],
    queryFn: () => getSubs(),
  });

  // Toggle modal on Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
    }
  }, [isOpen]);

  const filteredResults = useMemo(() => {
    if (!query.trim()) return { clients: [], forms: [], submissions: [] };
    const q = query.toLowerCase();

    const matchedClients = clients.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    );

    const matchedForms = forms.filter((f) => f.title.toLowerCase().includes(q));

    const matchedSubmissions = submissions.filter(
      (s) =>
        s.submitter_name?.toLowerCase().includes(q) ||
        s.submitter_email?.toLowerCase().includes(q) ||
        s.form_title?.toLowerCase().includes(q)
    );

    return {
      clients: matchedClients.slice(0, 5),
      forms: matchedForms.slice(0, 5),
      submissions: matchedSubmissions.slice(0, 5),
    };
  }, [query, clients, forms, submissions]);

  const hasResults =
    filteredResults.clients.length > 0 ||
    filteredResults.forms.length > 0 ||
    filteredResults.submissions.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
          />

          {/* Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-xl rounded-2xl bg-surface border border-hairline shadow-[0_24px_70px_rgba(0,0,0,0.3)] overflow-hidden flex flex-col max-h-[500px]"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 border-b border-hairline h-14 shrink-0">
              <Search className="size-5 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search clients, forms, responses..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground/60 h-full focus:outline-none"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!query.trim() ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Fuzzy Workspace Search</p>
                  <p>Type to find clients, intake forms, or form submissions.</p>
                </div>
              ) : !hasResults ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">No matches found</p>
                  <p>Try searching for a different keyword.</p>
                </div>
              ) : (
                <>
                  {/* Clients Section */}
                  {filteredResults.clients.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">
                        Clients
                      </h3>
                      <div className="space-y-0.5">
                        {filteredResults.clients.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              navigate({ to: "/clients/$id", params: { id: c.id } });
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#7C5CFF]/10 text-sm transition-colors group"
                          >
                            <Users className="size-4 text-muted-foreground group-hover:text-[#7C5CFF]" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{c.company}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {c.fullName} · {c.email}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Forms Section */}
                  {filteredResults.forms.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">
                        Forms
                      </h3>
                      <div className="space-y-0.5">
                        {filteredResults.forms.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              navigate({ to: "/forms/$id", params: { id: f.id } });
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#7C5CFF]/10 text-sm transition-colors group"
                          >
                            <FileText className="size-4 text-muted-foreground group-hover:text-[#7C5CFF]" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">{f.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {f.fields.length} fields · {f.is_published ? "Published" : "Draft"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submissions Section */}
                  {filteredResults.submissions.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="px-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60">
                        Submissions
                      </h3>
                      <div className="space-y-0.5">
                        {filteredResults.submissions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => {
                              navigate({ to: "/responses" });
                              setIsOpen(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[#7C5CFF]/10 text-sm transition-colors group"
                          >
                            <ClipboardList className="size-4 text-muted-foreground group-hover:text-[#7C5CFF]" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-foreground truncate">
                                Response on &quot;{s.form_title}&quot;
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {s.submitter_name || "Anonymous"} ({s.submitter_email || "no email"})
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
