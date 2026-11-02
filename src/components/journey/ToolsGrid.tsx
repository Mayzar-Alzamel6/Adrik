"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, Lock } from "lucide-react";
import { TOOLS, TOOL_GROUPS } from "@/lib/tools";
import { useJourney } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { Card, IconTile } from "@/components/ui/primitives";

export function ToolsGrid() {
  const { isToolOpen, stageOfTool } = useJourney();
  return (
    <>
      {TOOL_GROUPS.map((group) => (
        <section key={group.id} aria-labelledby={`g-${group.id}`}>
          <div className="mb-4">
            <h2 id={`g-${group.id}`} className="font-display text-title-sm font-semibold text-ink">
              {group.title}
            </h2>
            <p className="text-ui text-ink-3">{group.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOOLS.filter((t) => t.group === group.id).map((tool) => {
              const open = isToolOpen(tool.id);
              return (
                <Link key={tool.id} href={`/app/tools/${tool.id}`} className="group">
                  <Card
                    className={cn(
                      "h-full p-5 flex flex-col gap-4 transition group-hover:shadow-lift group-hover:-translate-y-0.5",
                      !open && "bg-surface-2/50 shadow-none"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <IconTile icon={open ? tool.icon : Lock} tone={open ? "brand" : "neutral"} />
                      {open ? (
                        <ChevronLeft className="w-4 h-4 text-ink-3 opacity-0 group-hover:opacity-100 transition" />
                      ) : (
                        <span className="text-caption text-ink-3">مرحلة «{stageOfTool(tool.id)?.title}»</span>
                      )}
                    </div>
                    <div>
                      <h3 className={cn("font-display text-lead font-semibold", open ? "text-ink" : "text-ink-2")}>{tool.title}</h3>
                      <p className="text-ui text-ink-2 mt-1 leading-relaxed">{tool.description}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
