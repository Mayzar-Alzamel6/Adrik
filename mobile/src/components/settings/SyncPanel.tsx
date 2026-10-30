import React, { useEffect, useState } from "react";
import { AppState, View } from "react-native";
import { PERSONAL_SYNC_ENABLED, onLocalChange, syncNow, useSyncStore } from "@/lib/sync/native";
import { PIN_PATTERN, checkPin, clearPin, hasPin, setPin } from "@/lib/sync/pin";
import { radius, useColors } from "@/theme";
import { Badge, Button, Card, Input, Label, Row, SectionHeader, Txt } from "@/components/ui";

const TIME = new Intl.DateTimeFormat("ar", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" });

/** Mounted once: syncs on launch, when the app returns to the foreground, every two minutes, and shortly after an edit. */
export function SyncWatcher() {
  const connected = useSyncStore((s) => Boolean(s.config && s.session));
  useEffect(() => {
    if (!PERSONAL_SYNC_ENABLED || !connected) return;

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

    runSync();

    const soon = () => {
      clearTimeout(editTimer);
      editTimer = setTimeout(runSync, 8000);
    };

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") triggerDebouncedSync(300);
    });
    const every = setInterval(() => {
      if (AppState.currentState === "active") triggerDebouncedSync(300);
    }, 120_000);
    const stop = onLocalChange(soon);

    return () => {
      clearTimeout(syncDebounceTimer);
      clearTimeout(editTimer);
      clearInterval(every);
      stop();
      sub.remove();
    };
  }, [connected]);
  return null;
}

/**
 * The sync controls sit behind a PIN, so someone holding the phone can't see the connection, sync, or stop it.
 * The PIN locks again whenever the app leaves the foreground.
 */
export function SyncPanel() {
  const c = useColors();
  const [pinSet, setPinSet] = useState<boolean | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPinText] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [forgetting, setForgetting] = useState(false);
  const disconnect = useSyncStore((s) => s.disconnect);

  useEffect(() => {
    hasPin().then(setPinSet);
    const sub = AppState.addEventListener("change", (state) => state !== "active" && setUnlocked(false));
    return () => sub.remove();
  }, []);

  if (!PERSONAL_SYNC_ENABLED || pinSet === null) return null;
  if (unlocked) return <SyncControls onLock={() => setUnlocked(false)} />;

  const create = async () => {
    if (!PIN_PATTERN.test(pin)) return setMessage("الرمز من 4 إلى 8 أرقام.");
    if (pin !== confirm) return setMessage("الرمزان غير متطابقين.");
    await setPin(pin);
    setPinSet(true);
    setUnlocked(true);
    setPinText("");
    setConfirm("");
    setMessage(null);
  };
  const open = async () => {
    const res = await checkPin(pin);
    setPinText("");
    if (res.ok) {
      setMessage(null);
      setUnlocked(true);
    } else if (res.waitMinutes) setMessage(`محاولات كثيرة خاطئة. حاول بعد ${res.waitMinutes} دقائق.`);
    else setMessage(`الرمز غير صحيح. بقيت ${res.triesLeft} محاولات.`);
  };
  const forget = async () => {
    await disconnect();
    await clearPin();
    setPinSet(false);
    setForgetting(false);
    setMessage("أُوقفت المزامنة على هذا الهاتف ومُسح الرمز. بياناتك على الهاتف وفي حسابك باقية كما هي.");
  };

  return (
    <Card style={{ gap: 12 }}>
      <SectionHeader
        title="المزامنة مع الكمبيوتر"
        description={pinSet ? "مقفلة برمز المزامنة." : "اختر رمزاً من 4 إلى 8 أرقام يحمي إعدادات المزامنة على هذا الهاتف."}
        action={<Badge tone="neutral">{pinSet ? "مقفلة" : "رمز جديد"}</Badge>}
      />
      <View>
        <Label>{pinSet ? "رمز المزامنة" : "الرمز"}</Label>
        <Input value={pin} onChangeText={setPinText} keyboardType="number-pad" secureTextEntry maxLength={8} />
      </View>
      {!pinSet ? (
        <View>
          <Label>أعد كتابة الرمز</Label>
          <Input value={confirm} onChangeText={setConfirm} keyboardType="number-pad" secureTextEntry maxLength={8} />
        </View>
      ) : null}
      {message ? (
        <Txt variant="ui" color={message.startsWith("أُوقفت") ? "brand" : "danger"}>
          {message}
        </Txt>
      ) : null}
      <Button title={pinSet ? "افتح" : "احفظ الرمز"} icon={pinSet ? "unlock" : "lock"} disabled={!pin} onPress={pinSet ? open : create} />
      {pinSet ? (
        forgetting ? (
          <View style={{ borderRadius: radius.md, backgroundColor: c.surface2, padding: 12, gap: 8 }}>
            <Txt variant="ui">يوقف المزامنة على هذا الهاتف ويمسح الرمز. لتعيدها ستحتاج بريدك وكلمة مرور حسابك من جديد.</Txt>
            <Row>
              <Button title="أوقفها وامسح الرمز" variant="secondary" size="sm" onPress={forget} />
              <Button title="إلغاء" variant="ghost" size="sm" onPress={() => setForgetting(false)} />
            </Row>
          </View>
        ) : (
          <Button title="نسيت الرمز؟" variant="ghost" size="sm" onPress={() => setForgetting(true)} />
        )
      ) : null}
    </Card>
  );
}

function SyncControls({ onLock }: { onLock: () => void }) {
  const c = useColors();
  const { config, session, lastSyncAt, lastError, running, connect, disconnect } = useSyncStore();
  const [form, setForm] = useState({
    url: config?.url ?? "",
    key: config?.key ?? "",
    email: config?.email ?? "",
    device: config?.device ?? "الهاتف",
    password: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connected = Boolean(config && session);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await connect({ url: form.url.trim(), key: form.key.trim(), email: form.email.trim(), device: form.device.trim() || "الهاتف" }, form.password);
      setForm((f) => ({ ...f, password: "" }));
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg === "Invalid login credentials" ? "البريد أو كلمة المرور غير صحيحة." : msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 12 }}>
      <SectionHeader
        title="المزامنة مع الكمبيوتر"
        description="بياناتك تتزامن بين هذا الهاتف ونسختك على الكمبيوتر، وما تغيّر على الجهازين معاً يُدمج سجلاً بسجل."
        action={<Badge tone={connected ? "brand" : "neutral"}>{connected ? "مفعّلة" : "متوقفة"}</Badge>}
      />
      <Button title="اقفل" icon="lock" variant="ghost" size="sm" onPress={onLock} />

      {connected ? (
        <View style={{ gap: 10 }}>
          <Txt variant="ui">
            {running ? "تجري المزامنة الآن…" : lastSyncAt ? `آخر مزامنة: ${TIME.format(new Date(lastSyncAt))}` : "لم تتم أول مزامنة بعد."}
          </Txt>
          {lastError ? (
            <View style={{ borderRadius: radius.md, backgroundColor: c.dangerSoft, padding: 10 }}>
              <Txt variant="ui" color="danger">
                {lastError}
              </Txt>
            </View>
          ) : null}
          <Txt variant="small" color="ink3">
            {config!.email} · هذا الجهاز: {config!.device}
          </Txt>
          <Row>
            <Button title="زامن الآن" icon="refresh-cw" size="sm" disabled={running} onPress={() => syncNow()} />
            <Button title="أوقفها هنا" variant="ghost" size="sm" onPress={() => disconnect()} />
          </Row>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {config && !session ? (
            <Txt variant="ui" color="accentStrong">
              انتهت جلسة الدخول. أدخل كلمة المرور لتعود المزامنة.
            </Txt>
          ) : null}
          <View>
            <Label hint="من Supabase: Project Settings ← Data API">رابط المشروع</Label>
            <Input value={form.url} onChangeText={(url) => setForm({ ...form, url })} placeholder="https://xxxx.supabase.co" autoCapitalize="none" autoCorrect={false} />
          </View>
          <View>
            <Label hint="Project Settings ← API Keys ← Publishable key">المفتاح العام</Label>
            <Input value={form.key} onChangeText={(key) => setForm({ ...form, key })} placeholder="sb_publishable_…" autoCapitalize="none" autoCorrect={false} />
          </View>
          <View>
            <Label>البريد</Label>
            <Input value={form.email} onChangeText={(email) => setForm({ ...form, email })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          </View>
          <View>
            <Label hint="لا تُحفظ على الهاتف">كلمة المرور</Label>
            <Input value={form.password} onChangeText={(password) => setForm({ ...form, password })} secureTextEntry autoCapitalize="none" />
          </View>
          <View>
            <Label>اسم هذا الجهاز</Label>
            <Input value={form.device} onChangeText={(device) => setForm({ ...form, device })} />
          </View>
          {error ? (
            <Txt variant="ui" color="danger">
              {error}
            </Txt>
          ) : null}
          <Button
            title={busy ? "جارٍ الربط…" : "ربط وبدء المزامنة"}
            icon="check"
            disabled={busy || !form.url || !form.key || !form.email || !form.password}
            onPress={submit}
          />
          <Txt variant="small" color="ink3">
            أول مزامنة تجمع ما على الجهازين دون أن تحذف شيئاً.
          </Txt>
        </View>
      )}
    </Card>
  );
}
