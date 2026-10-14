"use client";

import React, { useState } from "react";
import { FolderKanban, Heart, Layers, Link2 } from "lucide-react";
import { useAppStore, type FrogLinks } from "@/stores/useAppStore";
import { useProjectsStore } from "@/stores/useProjectsStore";
import { lineageParts, useLineageResolver } from "@/lib/lineage";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/Sheet";

/** "الحرية ← مشروع التطبيق ← البرمجة", showing only the parts that exist. */
export function LineageLine({ links, className }: { links: FrogLinks; className?: string }) {
  const resolve = useLineageResolver();
  const parts = lineageParts(resolve(links));
  if (parts.length === 0) return null;
  return (
    <p className={cn("text-caption text-ink-3 truncate", className)} title={parts.join(" ← ")}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="mx-1 text-ink-3/70">←</span>}
          <span className={i === 0 ? "text-accent-strong" : undefined}>{p}</span>
        </React.Fragment>
      ))}
    </p>
  );
}

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "h-9 px-3 rounded-xl border text-small transition inline-flex items-center gap-1.5 max-w-full",
        selected ? "bg-brand-soft border-brand/40 text-brand font-medium" : "border-line text-ink-2 hover:border-ink-3"
      )}
    >
      <span className="truncate">{children}</span>
    </button>
  );
}

/** Sheet for linking a frog to a project and/or skill. */
export function FrogLinkSheet({
  open,
  title,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  title?: string;
  initial: FrogLinks;
  onClose: () => void;
  onSave: (links: FrogLinks) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="ربط الأولوية" description={title} size="sm">
      {open && <FrogLinkForm initial={initial} onCancel={onClose} onSave={onSave} />}
    </Sheet>
  );
}

function FrogLinkForm({
  initial,
  onCancel,
  onSave,
}: {
  initial: FrogLinks;
  onCancel: () => void;
  onSave: (links: FrogLinks) => void;
}) {
  const projects = useProjectsStore((s) => s.projects);
  const skills = useAppStore((s) => s.skills);
  const [projectId, setProjectId] = useState(initial.projectId);
  const [skillId, setSkillId] = useState(initial.skillId);

  const project = projects.find((p) => p.id === projectId);
  const skillOrder = [...skills].sort(
    (a, b) => Number(Boolean(project?.skillIds?.includes(b.id))) - Number(Boolean(project?.skillIds?.includes(a.id)))
  );

  return (
    <div className="space-y-5 pt-2">
      <div>
        <Label hint="أي مشروع تتقدّم فيه هذه الأولوية؟">
          <span className="inline-flex items-center gap-1.5">
            <FolderKanban className="w-4 h-4 text-brand" />
            المشروع
          </span>
        </Label>
        {projects.length === 0 ? (
          <p className="text-small text-ink-3">لا مشاريع بعد. أنشئها من الأدوات ← إدارة المشاريع.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Chip selected={!projectId} onClick={() => setProjectId(undefined)}>
              بلا مشروع
            </Chip>
            {projects.map((p) => (
              <Chip key={p.id} selected={projectId === p.id} onClick={() => setProjectId(p.id)}>
                {p.name}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label hint="أي مهارة تتدرّب عليها وأنت تنجزها؟">
          <span className="inline-flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-brand" />
            المهارة
          </span>
        </Label>
        {skills.length === 0 ? (
          <p className="text-small text-ink-3">لا مهارات بعد. أضفها من الأدوات ← تعلّم مهارة جديدة.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Chip selected={!skillId} onClick={() => setSkillId(undefined)}>
              بلا مهارة
            </Chip>
            {skillOrder.map((s) => (
              <Chip key={s.id} selected={skillId === s.id} onClick={() => setSkillId(s.id)}>
                {s.title}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl bg-surface-2 px-4 py-3">
        <p className="text-caption text-ink-3 inline-flex items-center gap-1.5">
          <Heart className="w-3.5 h-3.5 text-accent-strong" />
          المسار
        </p>
        <LineageLine links={{ projectId, skillId }} className="text-ui text-ink-2 mt-1 whitespace-normal" />
        {!projectId && !skillId && <p className="text-small text-ink-3 mt-1">اربطها بمشروع لترى القيمة التي تخدمها.</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          إلغاء
        </Button>
        <Button onClick={() => onSave({ projectId, skillId })}>
          <Link2 className="w-4 h-4" />
          حفظ الربط
        </Button>
      </div>
    </div>
  );
}
