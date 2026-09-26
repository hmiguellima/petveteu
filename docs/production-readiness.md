# Production readiness gate

Production is blocked until every item below contains an owner, approval date, and evidence link. Place no personal data or secrets in this file. Use [data-protection-decisions.md](data-protection-decisions.md) for legal/governance decisions, [data-subject-rights-runbook.md](data-subject-rights-runbook.md) for rights exercises, and [security-operations.md](security-operations.md) for operational evidence.

## Legal and governance decisions (approval required)

- [ ] Controller legal identity, address, and privacy contact approved.
- [ ] Processing record maps account management, clinical records, security auditing, and SMS reminders to counsel-approved lawful bases.
- [ ] Portuguese and English privacy wording approved by qualified Portuguese counsel.
- [ ] Supabase, Vercel, Twilio, and subprocessor inventory records region, transfer mechanism, safeguards, and signed DPA.
- [ ] Concrete retention/review periods approved for profiles, pets, vaccines, reminders/attempts, job/admin audits, backups, and diagnostic logs.
- [ ] DPIA screening recorded; full DPIA and mitigations complete if the screening finds likely high risk.
- [ ] DPO requirement determination recorded.

## Security and operations evidence

- [ ] Vet has a verified TOTP factor and production policy requires AAL2.
- [ ] Production access is least-privilege, named, reviewed, and audited.
- [ ] Supabase service role and Twilio credentials exist only as Edge Function secrets; Vercel contains only public Supabase URL/anon key.
- [ ] Encrypted backup retention matches the approved schedule and a dated restoration test succeeded.
- [ ] Missing/failed daily-run alert reaches the named on-call contact.
- [ ] Incident procedure covers containment, processor escalation, evidence preservation, risk assessment, CNPD notification (where applicable), and affected-person notification.
- [ ] Rights workflow has been exercised for access/export, correction, objection, restriction, and erasure; erasure cancels pending reminders.

## Logging standard

Operational logs use event name, severity, timestamp, request correlation ID, and non-identifying error code only. Never log SMS bodies, credentials, authorization headers, cookies, session tokens, names, email addresses, phone numbers, pet names, or raw database rows.

## Rights workflow

Authenticate the requester, create a `data_subject_requests` record, document only outcome/retention basis codes, export scoped data through a protected operator procedure, and record completion. For erasure, disable both SMS flags, cancel pending reminders immediately, erase eligible data, and retain only fields backed by the recorded legal basis/hold.

## Gate decision

- Gate owner: TBD
- Review date: TBD
- Decision: **BLOCKED**
- Evidence bundle: TBD

The default and current decision is blocked. It may change to `APPROVED` only when every item above is checked with dated evidence and all required legal/operational approvers have signed off. Deployment success, passing tests, draft notices, and empty templates are not approval evidence.
