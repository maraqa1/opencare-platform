"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AssessmentInvitationPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Validating your invitation...");
  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = fragment.get("token");
    if (!token) { setMessage("This invitation link is incomplete."); return; }
    fetch("/api/module01/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async response => ({ response, body: await response.json() }))
      .then(({ response, body }) => {
        if (!response.ok) throw new Error(body.detail || "This invitation is invalid or has expired.");
        router.replace(`/assessment/${body.assessmentId}`);
      })
      .catch(error => setMessage(error instanceof Error ? error.message : "This invitation could not be accepted."));
  }, [router]);
  return <main className="data-ai-diagnostic-page"><section className="panel"><p className="eyebrow">Customer assessment</p><h1>Opening your assessment</h1><p role="status">{message}</p></section></main>;
}
