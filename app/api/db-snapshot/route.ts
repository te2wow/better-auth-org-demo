import { NextResponse } from "next/server";
import { sqlite } from "@/db";

export const dynamic = "force-dynamic";

const TABLES = ["user", "session", "organization", "member", "invitation"] as const;

export function GET() {
  const snapshot = Object.fromEntries(
    TABLES.map((table) => [
      table,
      sqlite.prepare(`SELECT * FROM "${table}" ORDER BY rowid DESC LIMIT 20`).all(),
    ]),
  );
  return NextResponse.json(snapshot);
}
