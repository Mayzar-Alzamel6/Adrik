import React, { useState } from "react";
import { View } from "react-native";
import type { FrogLinks } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { sendToInbox, sendToToday } from "@/lib/flow";
import { ROW } from "@/theme";
import { MiniChip, Txt } from "@/components/ui";

/**
 * "Take this somewhere": the same three exits in every tool — today's priorities, the inbox, or a project.
 * `once` hides the chips after the first send, for one-off suggestions. Mirrors the web app's SendTo.
 */
export function SendTo({
  title,
  links,
  label = "حوّلها إلى فعل:",
  once = true,
  onSent,
}: {
  title: string;
  links?: FrogLinks;
  label?: string;
  once?: boolean;
  onSent?: (where: "today" | "inbox" | "project") => void;
}) {
  const projects = useProjectsStore((s) => s.projects);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [picking, setPicking] = useState(false);

  const done = (where: "today" | "inbox" | "project", res: { ok: boolean; message: string }) => {
    setStatus(res);
    setPicking(false);
    if (res.ok) onSent?.(where);
  };

  if (once && status?.ok) {
    return (
      <Txt variant="small" color="brand">
        {status.message}
      </Txt>
    );
  }

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Txt variant="caption" color="ink3">
          {label}
        </Txt>
      ) : null}
      <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
        <MiniChip label="أولويات اليوم" icon="target" onPress={() => done("today", sendToToday(title, links))} />
        <MiniChip
          label={links?.projectId ? "مهام المشروع" : "صندوق المهام"}
          icon={links?.projectId ? "folder" : "inbox"}
          onPress={() => done("inbox", sendToInbox(title, links?.projectId))}
        />
        {!links?.projectId && projects.length > 0 ? (
          <MiniChip label="مشروع…" icon="folder" selected={picking} onPress={() => setPicking((v) => !v)} />
        ) : null}
      </View>
      {picking ? (
        <View style={{ flexDirection: ROW, flexWrap: "wrap", gap: 6 }}>
          {projects.map((p) => (
            <MiniChip key={p.id} label={p.name} onPress={() => done("project", sendToInbox(title, p.id))} />
          ))}
        </View>
      ) : null}
      {status ? (
        <Txt variant="small" color={status.ok ? "brand" : "accentStrong"}>
          {status.message}
        </Txt>
      ) : null}
    </View>
  );
}
