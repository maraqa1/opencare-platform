# Module 01 customer assessment delivery

Status: secure persistence MVP implemented locally; production deployment and the hardening items listed below remain pending.

## Implemented MVP

- Advisor page at `/admin/module01-assessments` creates a blank industry-specific assessment and a one-time invitation link.
- Invitation secrets are carried in the browser fragment, exchanged once, stored only as hashes by the backend, and replaced by a 30-day secure HttpOnly session cookie.
- Every customer API request is scoped to the assessment encoded in the server-side session. A session for one assessment cannot access another.
- PostgreSQL stores an authoritative assessment record plus immutable JSONB revisions. Saves use an expected revision and operation UUID for conflict detection and retry idempotency.
- The customer workspace restores the latest server revision, autosaves after 1.5 seconds, provides Save now, warns on unsaved navigation, retains a namespaced browser recovery copy, and clearly shows saving, saved, offline, conflict and submitted states.
- Submission is revision-checked and locks further customer editing. The customer route removes the admin shell, demo seeds, reset controls and AI-report generation.
- Advisors can create a replacement one-time invitation for the same assessment without replacing its saved work.
- Automated tests cover invitation reuse, cross-assessment isolation, autosave, idempotent retry, revision conflict, submission locking, replacement invitations, malformed captures and missing security configuration.

This MVP uses a shared advisor secret and bearer invitation/session model. It does not yet provide Keycloak customer accounts, automatic email delivery, an advisor assessment register, multiple collaborators, private file attachments, a durable IndexedDB offline queue, or operational database backup/PITR. Those remain production release gates; the longer-term Keycloak design below is still the recommended target.

Deployment requires `MODULE01_ASSESSMENT_ADMIN_TOKEN` and `MODULE01_ASSESSMENT_TOKEN_SECRET` in `secret/opencare-secrets`. `scripts/bootstrap/apply_base.sh` preserves existing values and generates strong values when they are absent. The advisor token may be retrieved by an authorized operator; the token-hashing secret must remain backend-only and must not be exposed in the portal or invitation message.

## Recommendation

Evolve the MVP into an authenticated customer assessment workspace within the existing single-tenant deployment. Reuse Keycloak for customer identity, FastAPI for authorization and persistence, PostgreSQL for the authoritative assessment and immutable revisions, and private MinIO storage for attachments. Do not send a customer the public demo workbench as their saved assessment.

Each invitation assigns a named customer contact to one assessment. An assessment URL is a locator, not an access credential. Possession of the URL alone must not authorize reading, writing, exporting or downloading attachments. Use Keycloak's supported email-verification/account-setup flow, not a custom password system or an assumed built-in email OTP feature. Subsequent visits use normal sign-in. Reuse an existing verified account when appropriate.

## Findings from this repository

- `workspace-client.tsx` currently stores assessment state under the browser-wide `module01:industry-assessment:v1` localStorage key. It is not a shared, server-saved customer assessment.
- Portal middleware currently sets `x-pathname`; it does not authenticate customers.
- Root layout builds the admin navigation unconditionally. Debug/admin query parameters are presentation flags, not authorization.
- FastAPI already uses psycopg and PostgreSQL; Keycloak and MinIO are part of the existing deployment.
- SMTP settings exist for other platform functions, but this does not establish working Keycloak invitation delivery. Realm/client configuration and actual email delivery must be verified.

Do not turn the current browser-storage implementation into customer sharing merely by adding an assessment ID or a public secret URL.

## Customer and advisor journeys

### Advisor

1. Sign in with an authorized advisor role.
2. Create assessment: customer, title, industry, functional scope, named respondent email, optional due date.
3. Preview the blank questionnaire. Demo data must not be included by default.
4. Send invitation through the configured mail channel; allow copying the assessment locator for an already-provisioned recipient. Never expose account-setup secrets in logs or lists.
5. Track invited, opened, in progress, submitted and reviewed states, last server save and progress.
6. Review a submitted revision, add feedback, reopen when necessary, or generate a report from that saved revision.
7. Revoke access, resend an expired invitation, or invite another named collaborator with explicit permissions.

### Customer

1. Open the invitation and complete email verification/account setup when necessary.
2. See only assigned assessments in a minimal customer workspace, not the admin/demo navigation.
3. Complete existing scores/evidence, customer context, platform essentials, pain points, use cases, architecture and attachments.
4. See `Saving`, `Saved at ...`, `Offline - changes pending`, or an actionable save/conflict error.
5. Close and resume on the same or another authorized device after server save.
6. Submit for review after all pending edits are acknowledged. Submission is not allowed while offline or conflicted.

Use browser-local time for display and UTC for stored timestamps. The customer may leave unknown answers explicitly unknown; submission requirements must distinguish unanswered from not applicable/not known.

## Access boundaries

- Authenticate through an established OIDC integration with Keycloak, using authorization code flow, state/nonce protections, secure HttpOnly cookies and no tokens in browser localStorage.
- Backend validates issuer, audience, signature and expiry; it must not trust a caller-supplied admin header, email, customer ID or query flag.
- Every assessment operation checks a persisted assignment keyed by immutable Keycloak subject. Also check expiry, revocation and draft/submitted status on every operation.
- Explicit advisor role controls creation, invitations, reopening, history restoration and report generation. An ordinary customer cannot self-assign or promote their role.
- Protect write operations against CSRF and enforce same-origin transport. Do not return credentials, raw customer facts or draft answers in operational logs.
- Apply rate limits to invitation creation and authentication-related endpoints. Audit access changes without storing raw invitation tokens.
- Private attachment downloads require the same assignment check; object names and URLs are not permission checks.
- Isolate customer navigation and enforce authorization server-side. Hiding admin controls alone is insufficient. Review existing publicly accessible routes before customer release so this workflow does not expose privileged platform data.

## Persistence model

Use a dedicated operational PostgreSQL schema; do not put customer assessment drafts into analytical marts.

| Record | Purpose |
| --- | --- |
| assessments | UUID, customer/title, pinned industry/function/questionnaire versions, lifecycle status, latest revision, creator and timestamps |
| assessment_access | Assessment UUID, Keycloak subject, respondent/reviewer permission, expiry and revocation |
| assessment_invitations | Intended verified recipient, provisioning/acceptance state, expiry, send status; no plaintext bearer secrets |
| assessment_revisions | Immutable revision number, JSONB capture snapshot, actor, timestamp, base revision and operation ID |
| assessment_attachments | Private object reference, assessment UUID, size/type, checksum, uploader and scanning state |
| assessment_reports | Exact source revision, questionnaire/report schema versions, generated JSON/Markdown, AI metadata and export references |
| assessment_events | Created/invited/submitted/reopened/restored/revoked audit events |

Store every current capture field, including `customerContext`, `industryId`, `selectedFunctions`, scores, evidence strengths, evidence notes, actions, `discovery`, diagram confirmation and profile history. Preserve stable question/evidence/use-case/component IDs. Pin questionnaire versions so later question updates cannot silently rewrite an assessment in progress.

Use private MinIO objects for attachments rather than unbounded data URLs in every revision. Preserve references needed by older revisions, enforce type/size limits and scanning, and coordinate object retention with revision retention.

## Autosave contract

1. Queue each edit durably in IndexedDB, isolated by authenticated subject and assessment ID. Indicate local-storage failures explicitly.
2. Debounce server writes around 1.5 seconds, with a maximum pending-save interval of 15 seconds during continuous typing. Coalesce changes; allow only one save request in flight per browser instance.
3. Send a validated patch/capture with `expectedRevision` and a unique idempotency/operation ID. Server-side field/version validation must reject unknown or malformed fields without silently dropping data.
4. In one database transaction, check authorization and lifecycle, compare the revision, append an immutable revision and advance the latest-revision pointer. Return the committed revision and server timestamp.
5. Only display `Saved` for the exact edit batch acknowledged by the server. Edits made during a save remain queued and the status remains pending until acknowledged.
6. Retry timeouts/network errors with bounded exponential backoff. Retrying an operation already committed must return its previous result instead of creating a duplicate revision.
7. On stale revision return 409. Preserve local changes, show the newer server version and provide a review/reapply workflow; never silently use last-write-wins.
8. On refresh or sign-in, load the latest server revision and reconcile any pending local queue for that same user/assessment. Never overwrite the server with the old global demo localStorage record.
9. On expiry/revocation/401, stop writes, keep unsent changes isolated and display the access problem. Do not flush one user's queue under another user's session.
10. Warn on navigation with pending changes. Do not rely on an unload request to save the assessment.

Provide `Save now` and a permitted draft export as recovery tools. Logout on shared devices must remove acknowledged cached customer data; warn before discarding unsynced work and follow an agreed cache-retention policy.

No honest design can guarantee zero data loss under every failure. Offline edits still depend on that device until synchronized. Server-acknowledged writes depend on the database durability/backup configuration. The interface must distinguish these states.

## Submission, history and reports

- Submission is a version-checked transaction after the current queue is flushed. It freezes the submitted revision and prevents further respondent writes until an authorized reopen.
- A reviewer restores an old revision by creating a new revision; never delete or rewrite the history.
- Report generation starts from a saved revision fetched server-side under authorization, not an arbitrary browser-provided customer snapshot.
- Store `assessmentId`, `assessmentRevision`, `questionnaireVersion` and `reportSchemaVersion` in the report. Later edits cannot change an already generated report.
- Customers do not trigger paid/long-running AI report generation by default; advisor review controls this. Saving customer answers never depends on AI2 availability.

## Reliability and operations

- PostgreSQL remains the source of truth; browser caches are recovery aids, not backups.
- Configure encrypted backups and WAL archiving for point-in-time recovery to an approved off-VM destination. MinIO on the same VM is not protection against loss of the VM.
- Agree recovery-point, recovery-time, data-residency and retention requirements before enabling customer invitations. Test database plus attachment restoration into an isolated environment.
- Monitor save error rate/latency, retry backlog, invitation delivery, storage capacity and last successful backup. Alert on failures without exposing customer answers.
- Audit logging and immutable revisions help recover mistakes but do not replace infrastructure backups.

## Delivery order and acceptance gates

1. Identity and access: advisor/customer sign-in, protected layout, assignment checks, mail delivery, revocation. Tests must prove customer A cannot read/write/export customer B's assessment, including direct API requests.
2. Durable drafts: schema/migrations, transactional revision API, IndexedDB queue, autosave status and resume. Test browser crash, offline edits, refresh, double-click/retry, delayed responses, expired sessions, disk/storage failures and two devices editing simultaneously.
3. Handoff and review: advisor list, invitations, blank customer questionnaire, submit/reopen, revision history and immutable report snapshots. Confirm demo/reset tools are not exposed to customers.
4. Files and recovery: private attachments, backup/restore drill, access audit and staging end-to-end tests with a fictional customer.
5. Public release only after the preceding gates pass. Send a real invitation only after verifying the intended address and that delivery is requested.

## Inputs needed for deployment

- Approved sender identity and working Keycloak SMTP configuration.
- Public Keycloak issuer/client and least-privilege provisioning credentials through server-side secrets.
- Which staff are advisors and whether customers may invite additional collaborators (default: advisor-managed invitations only).
- Approved backup destination, retention/data-residency policy and recovery objectives.

No customer email address or secret needs to be embedded in source code or supplied in this document.

## Official references

- Keycloak account actions and email settings: https://www.keycloak.org/docs/latest/server_admin/
- Keycloak invitation/account-action API: https://www.keycloak.org/docs-api/latest/javadocs/org/keycloak/admin/client/resource/UserResource.html
- PostgreSQL point-in-time recovery: https://www.postgresql.org/docs/current/continuous-archiving.html
