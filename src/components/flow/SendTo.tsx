"use client";

import React, { useState } from "react";
import { FolderKanban, Inbox, Target } from "lucide-react";
import type { FrogLinks } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { sendToInbox, sendToToday } from "@/lib/flow";
import { cn } from "@/lib/utils";

const chip =
  "h-8 px-2.5 rounded-lg border border-line bg-surface text-small text-ink-2 hover:border-brand/50 hover:text-brand inline-flex items-center gap-1.5 transition disabled:opacity-50";

/**
 * "Take this somewhere": the same three exits in every tool — today's priorities, the inbox, or a project.
 * `once` hides the buttons after the first send, for one-off suggestions.
 */
export function SendTo({
  title,
  links,
  label = "حوّلها إلى فعل:",
  once = true,
  className,
  onSent,
}: {
  title: string;
  links?: FrogLinks;
  label?: string;
  once?: boolean;
  className?: string;
  onSent?: (where: "today" | "inbox" | "project") => void;
}) {
  const projects = useProjectsStore((s) => s.projects);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);

  const done = (where: "today" | "inbox" | "project", res: { ok: boolean; message: string }) => {
    setStatus(res);
    if (res.ok) onSent?.(where);
  };

  if (once && status?.ok) {
    return (
      <p role="status" className={cn("text-small text-brand", className)}>
        {status.message}
      </p>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        {label && <span className="text-caption text-ink-3 ml-1">{label}</span>}
        <button type="button" className={chip} onClick={() => done("today", sendToToday(title, links))}>
          <Target className="w-3.5 h-3.5" />
          أولويات اليوم
        </button>
        <button type="button" className={chip} onClick={() => done("inbox", sendToInbox(title, links?.projectId))}>
          {links?.projectId ? <FolderKanban className="w-3.5 h-3.5" /> : <Inbox className="w-3.5 h-3.5" />}
          {links?.projectId ? "مهام المشروع" : "صندوق المهام"}
        </button>
        {!links?.projectId && projects.length > 0 && (
          <select
            aria-label="أرسلها إلى مشروع"
            value=""
            onChange={(e) => e.target.value && done("project", sendToInbox(title, e.target.value))}
            className="h-8 rounded-lg border border-line bg-surface px-2 text-small text-ink-2 focus:outline-none focus:border-brand max-w-[10rem]"
          >
            <option value="">مشروع…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>
      {status && (
        <p role="status" className={cn("text-small", status.ok ? "text-brand" : "text-accent-strong")}>
          {status.message}
        </p>
      )}
    </div>
  );
}
