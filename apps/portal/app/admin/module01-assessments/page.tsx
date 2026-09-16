"use client";

import { useState } from "react";
import { industryProfiles, INDUSTRY_PROFILE_VERSION, type IndustryProfileId } from "@/lib/module01/module01IndustryProfiles";
import { emptyIndustryAnswers } from "@/lib/module01/module01IndustryAssessment";
import { emptyCustomerContext } from "@/lib/module01/module01SeedData";
import { emptyDiscovery } from "@/lib/module01/module01Discovery";

export default function CreateCustomerAssessmentPage() {
  const [adminToken, setAdminToken] = useState(""), [title, setTitle] = useState("Data and AI capability assessment"), [customerName, setCustomerName] = useState(""), [email, setEmail] = useState(""), [industryId, setIndustryId] = useState<IndustryProfileId>("cross-industry"), [assessmentId, setAssessmentId] = useState(""), [result, setResult] = useState<{ link?: string; message: string }>({ message: "" }), [busy, setBusy] = useState(false);
  const invitationLink = (token: string) => `${window.location.origin}/assessment/invite#token=${encodeURIComponent(token)}`;
  async function create() {
    setBusy(true); setResult({ message: "Creating assessment..." });
    const customerContext = { ...emptyCustomerContext, customerName };
    const initialCapture = { industryId, version: INDUSTRY_PROFILE_VERSION, selectedFunctions: [], functionCatalogueVersion: "1.0.0", answers: emptyIndustryAnswers(industryId), customerContext, discovery: emptyDiscovery(), reviewIds: [], contextReviewRequired: false, profileHistory: [] };
    try {
      const response = await fetch("/api/module01/admin/assessments", { method: "POST", headers: { "content-type": "application/json", "x-module01-admin-token": adminToken }, body: JSON.stringify({ title, customerName, respondentEmail: email, industryId, questionnaireVersion: INDUSTRY_PROFILE_VERSION, initialCapture }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Assessment could not be created.");
      const link = invitationLink(body.invitationToken);
      setAssessmentId(body.assessmentId);
      setResult({ link, message: `Invitation created for ${body.respondentEmail}. It expires ${new Date(body.expiresAt).toLocaleString()}.` });
    } catch (error) { setResult({ message: error instanceof Error ? error.message : "Assessment could not be created." }); }
    finally { setBusy(false); }
  }
  async function reissue() {
    setBusy(true); setResult({ message: "Creating a replacement invitation..." });
    try {
      const response = await fetch(`/api/module01/admin/assessments/${assessmentId}/invitations`, { method: "POST", headers: { "content-type": "application/json", "x-module01-admin-token": adminToken }, body: JSON.stringify({ invitationDays: 14 }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail || "Invitation could not be reissued.");
      setResult({ link: invitationLink(body.invitationToken), message: `Replacement invitation created for ${body.respondentEmail}.` });
    } catch (error) { setResult({ message: error instanceof Error ? error.message : "Invitation could not be reissued." }); }
    finally { setBusy(false); }
  }
  return <main className="data-ai-diagnostic-page"><section className="panel"><p className="eyebrow">Module 01 administration</p><h1>Create customer assessment</h1><p>Create a blank, server-saved assessment. Send the resulting one-time link only to the named respondent.</p>
    <div className="data-ai-context-grid"><label><span>Advisor authorization</span><input type="password" value={adminToken} onChange={e => setAdminToken(e.target.value)} autoComplete="current-password" /></label><label><span>Assessment title</span><input value={title} onChange={e => setTitle(e.target.value)} /></label><label><span>Customer name</span><input value={customerName} onChange={e => setCustomerName(e.target.value)} /></label><label><span>Respondent email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><label><span>Industry</span><select value={industryId} onChange={e => setIndustryId(e.target.value as IndustryProfileId)}>{industryProfiles.map(p => <option key={p.id} value={p.id}>{p.labelEn}</option>)}</select></label></div>
    <button type="button" disabled={busy || !adminToken || !customerName.trim() || !email.includes("@")} onClick={create}>{busy ? "Creating..." : "Create invitation"}</button><p role="status">{result.message}</p>{result.link && <div><label><span>One-time invitation link</span><textarea readOnly value={result.link} rows={4} /></label><button type="button" onClick={() => navigator.clipboard.writeText(result.link!)}>Copy invitation link</button></div>}
    <hr /><h2>Reissue an invitation</h2><p>Create a fresh one-time link for an existing assessment. The respondent and saved work do not change.</p><label><span>Assessment ID</span><input value={assessmentId} onChange={e => setAssessmentId(e.target.value)} /></label><button type="button" disabled={busy || !adminToken || !/^[0-9a-f-]{36}$/i.test(assessmentId)} onClick={reissue}>Create replacement link</button>
  </section></main>;
}
