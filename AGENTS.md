# Campus Food Pantry

Read CONTEXT.md, docs/ARCHITECTURE.md and docs/STATUS.md before working. Update STATUS.md with verified results and remaining blockers at the end of each task.

Preserve legacy-console/ byte-for-byte; it is the source snapshot of the CST250 group project. Reuse its Java domain algorithms in backend/. Document adaptations in docs/REUSE.md. Never replace Bubble Sort, linear search, ArrayList/HashMap or FIFO ArrayDeque with framework shortcuts.

Use React Native + Expo + TypeScript, Java Spring Boot, Supabase Auth and PostgreSQL. Open signup. MEMBER for everyone except the one server-configured ADMIN_USER_ID. Do not trust roles or owner IDs supplied by the client. Never put database passwords or privileged keys in mobile code or Git.

Pending requests reserve neither stock nor quota. Approval is atomic, FIFO, idempotent and revalidates the five-unit Monday–Sunday quota in America/Chicago. No payments or pickup scheduling. Follow the approved Stitch visual style while correcting its invented business rules.

Do not claim deployment or successful tests without observed evidence. A visual demo is not proof that the Java/Supabase path works. Avoid paid services unless the user approves the price. Never change the old repository or old Supabase project.
