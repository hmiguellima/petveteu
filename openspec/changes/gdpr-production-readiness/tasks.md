## 1. Governance decisions and approvals

- [ ] 1.1 Obtain and record approved controller identity/contact, processing purposes and lawful bases, provider/subprocessor inventory, data locations/transfers and safeguards, privacy wording, concrete retention/review periods, DPIA screening outcome, and DPO determination; track processor agreements and any required full DPIA as launch prerequisites.

## 2. Transparency and individual rights

- [ ] 2.1 Replace the draft Portuguese and English privacy notices with approved wording at registration and in both portals, and deliver the approved notice through the vet-created-client communication flow. **Depends on:** 1.1.
- [ ] 2.2 Verify and document the authenticated clinic-assisted workflow for access/export, correction, objection, restriction, and erasure, including identity checks, minimal auditing, continuing-retention decisions, secure delivery, and cancellation of all future reminders on erasure. **Depends on:** 1.1.

## 3. Retention and disposal

- [ ] 3.1 Configure and verify approved application-data and database-audit retention/disposal using reviewed cutoffs and non-production fixtures; document aligned provider backup and diagnostic-log retention, legal holds, operator authorization, and restoration/rollback expectations. **Depends on:** 1.1.

## 4. Production security and incident readiness

- [ ] 4.1 Document and verify restricted production access, secret placement, backup protection and restoration testing, incident detection/response, processor escalation, and applicable breach-notification workflows; rerun existing vet MFA and structured log-redaction verification. **Depends on:** 1.1. **May proceed concurrently with:** 2.1-3.1.

## 5. Final production gate

- [ ] 5.1 Complete the evidence-based production privacy/security gate; verify all required decisions, agreements, transfer safeguards, retention schedules, DPIA work, MFA, rights/incident workflows, access review, and restoration evidence are complete and current, otherwise keep real-data launch blocked. **Depends on:** 1.1-4.1.
