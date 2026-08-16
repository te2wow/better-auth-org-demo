"use client";

import { useState } from "react";
import { OrgDemo } from "@/components/OrgDemo";
import { DbViewer } from "@/components/DbViewer";

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);
  return (
    <main className="grid h-screen grid-cols-[1fr_460px]">
      <OrgDemo onMutate={() => setRefreshKey((k) => k + 1)} />
      <DbViewer refreshKey={refreshKey} />
    </main>
  );
}
