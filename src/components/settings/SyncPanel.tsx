"use client";

import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Check, Cloud, CloudOff, RefreshCw } from "lucide-react";
import { onLocalChange, syncNow, useSyncStore } from "@/lib/sync/web";
import { Button } from "@/components/ui/Button";
import { Badge, Card, Input, Label } from "@/components/ui/primitives";

const TIME = new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });

/** Mounted once in the app shell: syncs on open, on return to the tab, every two minutes, and shortly after an edit. */
export function SyncWatcher() {
  const connected = useSyncStore((s) => Boolean(s.config && s.session));
  useEffect(() => {
    if (!connected) return;

    let syncDebounceTimer: ReturnType<typeof setTimeout> | undefined;
    let editTimer: ReturnType<typeof setTimeout> | undefined;
    let inFlight = false;

    const runSync = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        await syncNow();
      } finally {
        inFlight = false;
      }
    };

    const triggerDebouncedSync = (delay = 300) => {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = setTimeout(runSync, delay);
    };

    // Initial sync
    runSync();

    const soon = () => {
      clearTimeout(editTimer);
      editTimer = setTimeout(runSync, 8000);
    };

    const onVisibleOrFocus = () => {
      if (document.visibilityState === "visible") {
        triggerDebouncedSync(300);
      }
    };

    const onOnline = () => triggerDebouncedSync(300);

    document.addEventListener("visibilitychange", onVisibleOrFocus);
    window.addEventListener("focus", onVisibleOrFocus);
    window.addEventListener("online", onOnline);
    const every = setInterval(() => {
      if (document.visibilityState === "visible") triggerDebouncedSync(300);
    }, 120_000);
    const stop = onLocalChange(soon);

    return () => {
      clearTimeout(syncDebounceTimer);
      clearTimeout(editTimer);
      clearInterval(every);
      stop();
      document.removeEventListener("visibilitychange", onVisibleOrFocus);
      window.removeEventListener("focus", onVisibleOrFocus);
      window.removeEventListener("online", onOnline);
    };
  }, [connected]);
  return null;
}

/** Personal sync between this computer and the phone app, through the founder's own Supabase project. */
export function SyncPanel() {
  const { config, session, lastSyncAt, lastError, running, connect, disconnect } = useSyncStore(
    useShallow((s) => ({
      config: s.config,
      session: s.session,
      lastSyncAt: s.lastSyncAt,
      lastError: s.lastError,
      running: s.running,
      connect: s.connect,
      disconnect: s.disconnect,
    }))
  );
  const [form, setForm] = useState({
    url: config?.url ?? "",
    key: config?.key ?? "",
    email: config?.email ?? "",
    device: config?.device ?? "الكمبيوتر",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await connect({ url: form.url.trim(), key: form.key.trim(), email: form.email.trim(), device: form.device.trim() || "الكمبيوتر" }, form.password);
      setForm((f) => ({ ...f, password: "" }));
    } catch (err) {
      setError((err as Error).message === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const connected = Boolean(config && session);

  return (
    <Card as="section" className="p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-subtitle font-semibold text-ink">المزامنة مع الهاتف</h2>
          <p className="text-ui text-ink-2 mt-1">
            بياناتك تتزامن بين هذا الكمبيوتر وتطبيق الهاتف عبر مشروع Supabase الخاص بك. ما تعدّله على جهاز يظهر على الآخر، وما
            تغيّر على الجهازين معاً يُدمج سجلاً بسجل.
          </p>
        </div>
        <Badge tone={connected ? "brand" : "neutral"}>{connected ? "مفعّلة" : "متوقفة"}</Badge>
      </div>

      {connected ? (
        <div className="mt-5 space-y-4">
          <p className="text-ui text-ink inline-flex items-center gap-2">
            {lastError ? <CloudOff className="w-4 h-4 text-danger" /> : <Cloud className="w-4 h-4 text-brand" />}
            {running
              ? "تجري المزامنة الآن…"
              : lastSyncAt
              ? `آخر مزامنة: ${TIME.format(new Date(lastSyncAt))}`
              : "لم تتم أول مزامنة بعد."}
          </p>
          {lastError && <p className="rounded-xl bg-danger-soft text-danger px-4 py-2.5 text-ui">{lastError}</p>}
          <p className="text-small text-ink-3">
            {config!.email} · هذا الجهاز: {config!.device}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => syncNow()} disabled={running}>
              <RefreshCw className="w-4 h-4" />
              زامن الآن
            </Button>
            <Button size="sm" variant="ghost" onClick={disconnect}>
              أوقف المزامنة على هذا الجهاز
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          {config && !session && (
            <p className="rounded-xl bg-accent-soft text-accent-strong px-4 py-2.5 text-ui">انتهت جلسة الدخول. أدخل كلمة المرور لتعود المزامنة.</p>
          )}
          <div>
            <Label htmlFor="sync-url" hint="من Supabase: Project Settings ← Data API">رابط المشروع</Label>
            <Input id="sync-url" dir="ltr" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://xxxx.supabase.co" required />
          </div>
          <div>
            <Label htmlFor="sync-key" hint="Project Settings ← API Keys ← Publishable key">المفتاح العام</Label>
            <Input id="sync-key" dir="ltr" value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} placeholder="sb_publishable_…" required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sync-email">البريد</Label>
              <Input id="sync-email" dir="ltr" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="sync-pass" hint="لا تُحفظ على الجهاز">كلمة المرور</Label>
              <Input id="sync-pass" dir="ltr" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
          </div>
          <div>
            <Label htmlFor="sync-device">اسم هذا الجهاز</Label>
            <Input id="sync-device" value={form.device} onChange={(e) => setForm({ ...form, device: e.target.value })} />
          </div>
          {error && <p className="rounded-xl bg-danger-soft text-danger px-4 py-2.5 text-ui">{error}</p>}
          <Button type="submit" disabled={busy}>
            <Check className="w-4 h-4" />
            {busy ? "جارٍ الربط…" : "ربط وبدء المزامنة"}
          </Button>
          <p className="text-small text-ink-3">
            أول مزامنة تجمع ما على الجهازين دون أن تحذف شيئاً. خذ نسخة احتياطية من الأسفل قبلها إن أردت الاطمئنان.
          </p>
        </form>
      )}
    </Card>
  );
}
