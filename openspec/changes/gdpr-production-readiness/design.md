## Context

PetVet EU already has the application mechanisms needed for privacy operations: draft bilingual notice surfaces, authenticated clinic-assisted rights-request functions, an operator retention function, vet MFA, structured redacted logging, and readiness/runbook documents. The remaining work is deliberately incomplete because controller identity, lawful bases, provider agreements and transfers, retention periods, DPIA/DPO outcomes, and production evidence require practice and legal approval.

This change isolates those launch-gating decisions and the implementation/verification that follows them from the completed client, pet, vaccination, and SMS product change. The veterinary practice is the expected controller; Supabase, Vercel, Twilio, and other applicable providers require documented assessment.

## Goals / Non-Goals

**Goals:**

- Make every unresolved GDPR decision and dependent implementation step explicit and auditable.
- Replace placeholders only from approved source material, keeping Portuguese primary and English equivalent.
- Verify that rights requests, erasure, retention, security operations, incident response, and restoration work end to end.
- Keep production use of real personal data blocked until objective evidence satisfies the final gate.
- Reuse and reverify existing MFA and log-redaction controls.

**Non-Goals:**

- Providing legal advice or inventing controller, lawful-basis, retention, transfer, DPIA, or DPO decisions.
- Treating consent as the default lawful basis for all processing.
- Building a fully self-service rights portal when the authenticated clinic-assisted workflow satisfies the approved process.
- Scheduling destructive retention before approved cutoffs and rollback/backup expectations exist.

## Decisions

### 1. Approved decision record is the policy source of truth

`docs/data-protection-decisions.md` records controller, processing, provider, transfer, retention, DPIA/DPO, and approval evidence. Product copy, operational configuration, and retention inputs derive from that record rather than embedding guessed policy values in code.

Alternative considered: shipping reasonable defaults. Rejected because these values depend on the practice's circumstances and qualified Portuguese legal review.

### 2. Keep policy-dependent automation inert until approval

The existing operator-only retention function remains parameterized and unscheduled while retention values are unresolved. After approval, an operator supplies reviewed cutoffs and first validates against non-production data. Provider-side backup and diagnostic-log disposal remains configured in the respective provider consoles and evidenced in the gate.

Alternative considered: fixed application retention constants. Rejected because they would silently turn provisional assumptions into destructive production behavior.

### 3. Use a clinic-assisted rights workflow with minimal audit data

Authenticated vet-only functions record request type, verification state, decision, dates, and concise lawful refusal/retention reasons. Exports and corrections use authoritative records; restriction and erasure stop future reminder processing. Audit records do not duplicate unnecessary personal data.

Alternative considered: complete client self-service automation. Deferred because it broadens authorization and deletion risk without being necessary for the initial approved workflow.

### 4. Treat production readiness as evidence, not a checkbox assertion

The final gate links approvals, agreements, transfer safeguards, test results, access review, incident exercise, and restoration evidence. Any missing or expired item keeps launch blocked. Existing MFA and logging tests are referenced and rerun rather than reimplemented.

Alternative considered: a prose launch declaration. Rejected because it is difficult to review, repeat, or audit.

## Risks / Trade-offs

- **[External decisions delay completion]** Legal and controller inputs cannot be produced by engineering. → Keep placeholders explicit, identify owners/evidence, and block only the privacy-readiness change and production launch.
- **[Destructive retention]** Incorrect cutoffs could erase required data. → Require approved inputs, operator-only execution, non-production rehearsal, backups/restoration evidence, and documented holds.
- **[Sensitive exports]** Rights exports can create additional copies of personal data. → Verify identity, minimize scope, use an approved secure delivery route, and apply documented disposal.
- **[Provider configuration drift]** Agreements, subprocessors, regions, logs, or backups can change outside the repository. → Date the evidence and repeat provider/access review at the final gate.
- **[Draft notice mistaken for approval]** Existing localized copy may look production-ready. → Preserve visible draft status until approved wording and approval evidence are recorded together.

## Migration Plan

1. Obtain and record approved governance decisions without enabling real-data production.
2. Update localized privacy copy and vet-created-client delivery from the approved notice; verify both locales and access points.
3. Exercise the rights workflow and retention function against non-production fixtures, including reminder cancellation and legal-hold behavior.
4. Complete production access, secrets, backup/restore, monitoring, incident, processor-escalation, and breach-response evidence.
5. Run the final gate, including existing MFA and log-redaction verification; authorize real-data launch only if every prerequisite passes.

Rollback consists of leaving production blocked, reverting policy-dependent copy/configuration, and not scheduling retention. Database migrations must preserve existing records until approved disposal is explicitly exercised.

## Open Questions

- What are the approved controller identity and privacy contact details?
- Which lawful basis applies to each processing purpose?
- Which providers/subprocessors, locations, transfers, agreements, and safeguards are approved?
- What retention/review period applies to each data class, backup, and diagnostic log?
- Does DPIA screening require a full DPIA, and is a DPO or other formal privacy role required?
- Which secure channel will deliver notices and data-subject exports to vet-created clients?
