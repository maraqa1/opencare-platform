"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function UseCaseTemplateUploadPanel() {
  const router = useRouter();
  const [message, setMessage] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  function parseUploadPayload(raw: string) {
    if (!raw.trim()) {
      return {};
    }
    try {
      return JSON.parse(raw) as {
        status?: string;
        package_id?: string;
        record_id?: string;
        package?: { id?: string };
        detail?: string;
        message?: string;
      };
    } catch {
      return { detail: raw.trim() };
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("package");
    if (!(file instanceof File) || !file.name) {
      setMessage("Select a ZIP package first.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/portal/api/v1/admin/use-case-templates/upload", {
          method: "POST",
          body: formData,
        });
        const payload = parseUploadPayload(await response.text());
        const targetId = payload.package?.id ?? payload.record_id ?? payload.package_id;
        if (!response.ok || payload.status !== "ok" || !targetId) {
          throw new Error(payload.detail ?? payload.message ?? `Upload failed (${response.status}).`);
        }
        setMessage("Package uploaded successfully.");
        router.push(`/admin/use-case-templates/${encodeURIComponent(targetId)}`);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Upload failed.");
      }
    });
  }

  return (
    <article className="panel span-12">
      <p className="eyebrow">Upload Template</p>
      <h3 className="section-heading">Stage a zipped OpenCare use-case package</h3>
      <p className="section-subtitle">
        Upload a package ZIP, validate it safely, preview its assets, then decide whether to install or apply it.
      </p>
      <form className="compact-feed" onSubmit={onSubmit}>
        <input accept=".zip,application/zip" name="package" type="file" />
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="button primary" disabled={isPending} type="submit">
            {isPending ? "Uploading..." : "Upload Template"}
          </button>
          <Link className="secondary-link" href="/admin/configuration">
            Back to Configuration
          </Link>
        </div>
      </form>
      {message ? <p className="section-subtitle">{message}</p> : null}
    </article>
  );
}
