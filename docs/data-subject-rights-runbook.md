# Clinic-assisted data-subject rights runbook

Only the authenticated vet handles requests. Do not place identity documents, free-form correspondence, or exported personal data in audit fields.

1. Receive the request through the approved privacy contact and create it with `vet_open_data_subject_request`. The database records only its subject and type.
2. Verify identity using the clinic's approved method. Record completion with `vet_verify_data_subject_request`; never record document numbers or copies in the database audit.
3. Triage access/export, correction, objection, restriction, or erasure. Record decisions using controlled codes, not prose. Obtain legal review for a refusal or continuing retention basis.
4. For restriction, call `vet_restrict_client_processing`. This sets the account restriction flag and cancels pending reminders. Do not lift it until the approved decision permits that.
5. For access/export, query only the verified client's profile, pets, vaccinations, reminder lifecycle, and request history through a restricted operator session. Deliver through an approved secure channel and destroy working copies under the diagnostic/temporary-file policy.
6. Use the existing role-specific mutations for approved corrections. Canonical email changes remain an Auth administrative operation.
7. Complete the request with `vet_complete_data_subject_request`, using an approved decision code and, only where applicable, an approved retention-basis code. Completing any erasure request disables both SMS flags, restricts processing, and cancels pending reminders even when some records must be retained.
8. Physical account erasure is a separate service-role operation after the retention/hold decision and Auth-account deletion plan are approved. Do not claim erasure is complete while retained data or the Auth identity remains.

Exercise all five request types before launch and retain dated, non-personal evidence of the exercise.
