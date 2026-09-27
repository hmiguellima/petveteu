## Why

The product capabilities are implemented, but production use with real client data remains blocked by unresolved GDPR governance decisions and the controls that depend on them. Separating this work keeps the delivered veterinary portal change finishable while preserving privacy and security readiness as an explicit launch gate.

## What Changes

- Record approved controller details, processing purposes and lawful bases, provider and transfer decisions, retention periods, DPIA screening, and DPO determination.
- Replace draft privacy copy with approved Portuguese and English notices and deliver it through registration, authenticated portals, and vet-created-client communications.
- Complete and verify clinic-assisted data-subject rights handling, approved retention and disposal, production security operations, incident response, and restoration evidence.
- Maintain a production-readiness gate that blocks real-data launch until every required decision, agreement, safeguard, workflow, and item of evidence is complete.
- Reuse the already implemented vet MFA and structured log-redaction controls as prerequisites rather than reimplementing them.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `data-protection`: Complete the approved transparency, governance, individual-rights, retention/disposal, production security, incident-readiness, and evidence-based launch-gate requirements established by the archived product change.

## Impact

- Affects privacy UI and localized copy, vet-created-client communications, data-subject request workflows, retention database functions/jobs, operational documentation, and production-readiness evidence.
- Requires decisions and approvals from the veterinary practice and qualified Portuguese legal advice before policy-dependent tasks can be completed.
- Production must continue to use synthetic/test data until the readiness gate passes.
