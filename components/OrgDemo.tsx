"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type LogEntry = { at: string; text: string; kind: "info" | "error" };

export function OrgDemo({ onMutate }: { onMutate: () => void }) {
  const { data: session } = authClient.useSession();
  const { data: organizations } = authClient.useListOrganizations();
  const { data: activeOrg } = authClient.useActiveOrganization();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("password1234");
  const [orgName, setOrgName] = useState("Acme Inc");
  const [inviteEmail, setInviteEmail] = useState("bob@example.com");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");

  const log = (text: string, kind: LogEntry["kind"] = "info") => {
    const at = new Date().toLocaleTimeString("ja-JP");
    setLogs((prev) => [{ at, text, kind }, ...prev].slice(0, 12));
    onMutate();
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    try {
      const result = await fn();
      // better-auth の atom は fetch 系の呼び出し後に自動更新されないケースがあるので、
      // 明示的にセッションと組織一覧を取り直す
      await authClient.getSession({ query: { disableCookieCache: true } });
      if (result && typeof result === "object" && "error" in result && result.error) {
        log(`${label} → ${JSON.stringify(result.error)}`, "error");
      } else {
        log(`${label} → OK`);
      }
    } catch (e) {
      log(`${label} → ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  };

  const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto bg-white p-6 text-slate-900">
      <header>
        <h1 className="text-xl font-bold">better-auth organization plugin デモ</h1>
        <p className="text-sm text-slate-500">
          右のパネルは demo.db を 1 秒ごとに読み直しています
        </p>
      </header>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 font-bold">1. サインイン</h2>
        {session ? (
          <div className="flex items-center justify-between text-sm">
            <span>
              <b>{session.user.email}</b> でログイン中 / activeOrganizationId:{" "}
              <code className="rounded bg-slate-100 px-1">
                {session.session.activeOrganizationId ?? "null"}
              </code>
            </span>
            <button
              className="rounded bg-slate-200 px-3 py-1"
              onClick={() => run("signOut", () => authClient.signOut())}
            >
              サインアウト
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="rounded bg-slate-800 px-3 py-1 text-sm text-white"
              onClick={() =>
                run("signUp.email", () =>
                  authClient.signUp.email({ email, password, name: email.split("@")[0] }),
                )
              }
            >
              サインアップ
            </button>
            <button
              className="rounded bg-blue-600 px-3 py-1 text-sm text-white"
              onClick={() => run("signIn.email", () => authClient.signIn.email({ email, password }))}
            >
              サインイン
            </button>
          </div>
        )}
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 font-bold">2. 組織を作る</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
          />
          <code className="rounded bg-slate-100 px-2 py-1 text-xs">slug: {slug}</code>
          <button
            className="rounded bg-emerald-600 px-3 py-1 text-sm text-white disabled:opacity-40"
            disabled={!session}
            onClick={() =>
              run("organization.create", () =>
                authClient.organization.create({ name: orgName, slug, keepCurrentActiveOrganization: false }),
              )
            }
          >
            createOrganization
          </button>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {(organizations ?? []).map((org) => (
            <li key={org.id} className="flex items-center gap-2">
              <button
                className={`rounded px-2 py-0.5 text-xs ${
                  activeOrg?.id === org.id ? "bg-emerald-100 text-emerald-800" : "bg-slate-100"
                }`}
                onClick={() =>
                  run(`setActive(${org.slug})`, () =>
                    authClient.organization.setActive({ organizationId: org.id }),
                  )
                }
              >
                {activeOrg?.id === org.id ? "active" : "setActive"}
              </button>
              <span>{org.name}</span>
              <code className="text-xs text-slate-400">{org.slug}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 font-bold">3. メンバーを招待する</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value === "admin" ? "admin" : "member")}
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
          </select>
          <button
            className="rounded bg-indigo-600 px-3 py-1 text-sm text-white disabled:opacity-40"
            disabled={!activeOrg}
            onClick={() =>
              run("inviteMember", () =>
                authClient.organization.inviteMember({ email: inviteEmail, role: inviteRole }),
              )
            }
          >
            inviteMember
          </button>
        </div>
        <div className="mt-3 space-y-1 text-sm">
          {(activeOrg?.members ?? []).map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <code className="rounded bg-slate-100 px-1 text-xs">{m.role}</code>
              <span>{m.user.email}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-slate-200 p-4">
        <h2 className="mb-2 font-bold">4. 権限を確認する</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded bg-slate-700 px-3 py-1 text-sm text-white"
            onClick={() =>
              run("hasPermission(organization:delete)", async () => {
                const res = await authClient.organization.hasPermission({
                  permissions: { organization: ["delete"] },
                });
                log(`サーバ判定: ${res.data?.success ? "許可" : "拒否"}`);
                return res;
              })
            }
          >
            hasPermission
          </button>
          <button
            className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-40"
            disabled={!activeOrg}
            onClick={() =>
              run("organization.delete", () =>
                authClient.organization.delete({ organizationId: activeOrg!.id }),
              )
            }
          >
            組織を削除
          </button>
        </div>
      </section>

      <section className="rounded border border-slate-200 bg-slate-50 p-4">
        <h2 className="mb-2 font-bold">API ログ</h2>
        <ul className="space-y-1 text-xs">
          {logs.map((entry, i) => (
            <li key={i} className={entry.kind === "error" ? "text-red-600" : "text-slate-700"}>
              <span className="text-slate-400">{entry.at}</span> {entry.text}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
