"use client";

import { use, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [message, setMessage] = useState("");

  return (
    <main className="mx-auto max-w-md p-10 text-slate-900">
      <h1 className="mb-4 text-lg font-bold">招待を承諾する</h1>
      <p className="mb-4 text-sm text-slate-500">
        invitationId: <code className="rounded bg-slate-100 px-1">{id}</code>
      </p>
      <button
        className="rounded bg-emerald-600 px-4 py-2 text-white"
        onClick={async () => {
          const res = await authClient.organization.acceptInvitation({ invitationId: id });
          setMessage(res.error ? JSON.stringify(res.error) : "承諾しました。member が 1 行増えます。");
        }}
      >
        acceptInvitation
      </button>
      {message && <p className="mt-4 text-sm">{message}</p>}
    </main>
  );
}
