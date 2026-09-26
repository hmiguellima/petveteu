# Data-protection decision record

Status: **unapproved — production blocker**

This is an evidence template, not legal advice or an assertion about the practice. The controller and qualified Portuguese counsel must complete and approve every field. Store signed agreements and evidence in the practice's restricted governance system; record links here, never personal data or secrets.

## Controller and privacy contacts

| Decision                              | Owner | Approved value | Approval date | Evidence |
| ------------------------------------- | ----- | -------------- | ------------- | -------- |
| Controller legal identity and address | TBD   | TBD            | TBD           | TBD      |
| Privacy request contact               | TBD   | TBD            | TBD           | TBD      |
| DPO requirement and rationale         | TBD   | TBD            | TBD           | TBD      |
| DPO/contact details, if applicable    | TBD   | TBD            | TBD           | TBD      |

## Processing record

Counsel must approve a lawful basis for each purpose; consent must not be assumed as the universal basis.

| Purpose                                | Data/categories                          | Data subjects | Lawful basis | Recipients            | Retention/review | Approval/evidence |
| -------------------------------------- | ---------------------------------------- | ------------- | ------------ | --------------------- | ---------------- | ----------------- |
| Account and portal administration      | TBD                                      | Clients, vet  | TBD          | TBD                   | TBD              | TBD               |
| Pet and vaccination record management  | TBD                                      | Clients       | TBD          | TBD                   | TBD              | TBD               |
| Transactional vaccine reminders        | Contact and reminder data; confirm scope | Clients       | TBD          | Twilio; confirm chain | TBD              | TBD               |
| Security, audit, and incident response | Minimal technical/audit data             | Users         | TBD          | TBD                   | TBD              | TBD               |

## Providers, locations, and transfers

Validate the actual contracted products, configured regions, current subprocessors, and transfer mechanisms rather than relying on vendor marketing pages.

| Provider        | Service/purpose                | Contracting entity | Processing/storage locations | Subprocessors | Transfer mechanism/safeguards | DPA signed/evidence |
| --------------- | ------------------------------ | ------------------ | ---------------------------- | ------------- | ----------------------------- | ------------------- |
| Supabase        | Auth, database, Edge Functions | TBD                | TBD                          | TBD           | TBD                           | TBD                 |
| Vercel          | Web hosting                    | TBD                | TBD                          | TBD           | TBD                           | TBD                 |
| Twilio          | Transactional SMS              | TBD                | TBD                          | TBD           | TBD                           | TBD                 |
| Other providers | TBD                            | TBD                | TBD                          | TBD           | TBD                           | TBD                 |

## Retention schedule

All periods below must be concrete and approved before `apply_approved_retention` is scheduled. A legal hold overrides disposal only for the records in scope and must have a review date.

| Record                                 | Trigger                          | Approved period/review | Disposal                        | Owner | Approval/evidence |
| -------------------------------------- | -------------------------------- | ---------------------- | ------------------------------- | ----- | ----------------- |
| Profiles/accounts                      | TBD                              | TBD                    | Erase/anonymize as approved     | TBD   | TBD               |
| Pets and vaccination records           | Soft deletion/request/other: TBD | TBD                    | Cascading secure deletion       | TBD   | TBD               |
| Reminders and attempts                 | Creation/completion: TBD         | TBD                    | Secure deletion                 | TBD   | TBD               |
| Job runs                               | Completion: TBD                  | TBD                    | Secure deletion                 | TBD   | TBD               |
| Administrative/rights audits           | Creation: TBD                    | TBD                    | Secure deletion                 | TBD   | TBD               |
| Supabase backups                       | Backup creation: TBD             | TBD                    | Provider expiry/secure deletion | TBD   | TBD               |
| Vercel/Supabase/Twilio diagnostic logs | Event: TBD                       | TBD                    | Provider expiry/secure deletion | TBD   | TBD               |

## DPIA screening

| Question/outcome                             | Owner | Decision/date | Evidence |
| -------------------------------------------- | ----- | ------------- | -------- |
| Screening completed using an approved method | TBD   | TBD           | TBD      |
| Likely high-risk processing identified?      | TBD   | TBD           | TBD      |
| Full DPIA required and completed?            | TBD   | TBD           | TBD      |
| Residual risks and approved mitigations      | TBD   | TBD           | TBD      |

## Privacy notice approval

The final Portuguese-first and English notices must cover controller/contact, purposes, categories, lawful bases, recipients, transfers/safeguards, retention, rights, and the CNPD complaint route.

| Artifact          | Version | Legal approver | Approval date | Evidence |
| ----------------- | ------- | -------------- | ------------- | -------- |
| Portuguese notice | TBD     | TBD            | TBD           | TBD      |
| English notice    | TBD     | TBD            | TBD           | TBD      |
