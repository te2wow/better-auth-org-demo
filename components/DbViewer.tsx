"use client";

import { useEffect, useState, useCallback } from "react";

type Row = Record<string, unknown>;
type Snapshot = Record<string, Row[]>;

const HIGHLIGHT: Record<string, string[]> = {
  organization: ["id", "name", "slug"],
  member: ["id", "organizationId", "userId", "role"],
  invitation: ["id", "email", "role", "status"],
  session: ["id", "userId", "activeOrganizationId"],
  user: ["id", "email"],
};

/** SQLite は snake_case で返すので、表示用のキーを解決する */
function pick(row: Row, col: string): unknown {
  if (col in row) return row[col];
  const snake = col.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
  return row[snake];
}

function short(value: unknown): string {
  if (value === null || value === undefined) return "null";
  const str = String(value);
  return str.length > 14 ? `${str.slice(0, 8)}…${str.slice(-3)}` : str;
}

export function DbViewer({ refreshKey }: { refreshKey: number }) {
  const [snapshot, setSnapshot] = useState<Snapshot>({});
  const [flash, setFlash] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/db-snapshot", { cache: "no-store" });
    const next: Snapshot = await res.json();
    setSnapshot((prev) => {
      const changed = new Set<string>();
      for (const [table, rows] of Object.entries(next)) {
        const seen = new Set((prev[table] ?? []).map((r) => String(r.id)));
        for (const row of rows) {
          if (!seen.has(String(row.id))) changed.add(`${table}:${row.id}`);
        }
      }
      if (Object.keys(prev).length > 0 && changed.size > 0) {
        setFlash(changed);
        setTimeout(() => setFlash(new Set()), 2500);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(load, 1000);
    return () => clearInterval(timer);
  }, [load, refreshKey]);

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-4 font-mono text-xs text-slate-300">
      <div className="mb-3 flex items-center gap-2 text-slate-400">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        demo.db — live
      </div>
      {Object.entries(snapshot).map(([table, rows]) => (
        <section key={table} className="mb-5">
          <h3 className="mb-1 font-bold text-emerald-400">
            {table}
            <span className="ml-2 font-normal text-slate-500">({rows.length})</span>
          </h3>
          {rows.length === 0 ? (
            <p className="text-slate-600">— empty —</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-slate-500">
                  {(HIGHLIGHT[table] ?? Object.keys(rows[0])).map((col) => (
                    <th key={col} className="border-b border-slate-800 px-1 py-1 text-left font-normal">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isNew = flash.has(`${table}:${row.id}`);
                  return (
                    <tr
                      key={String(row.id)}
                      className={
                        isNew
                          ? "bg-emerald-500/25 text-emerald-200 transition-colors"
                          : "transition-colors"
                      }
                    >
                      {(HIGHLIGHT[table] ?? Object.keys(row)).map((col) => (
                        <td key={col} className="border-b border-slate-900 px-1 py-1">
                          {short(pick(row, col))}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      ))}
    </div>
  );
}
