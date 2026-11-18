# Working on Campus Food Pantry

Start with [the build plan](docs/BUILD.md). Pick an unclaimed issue whose prerequisites are satisfied or whose row lists a fixture that lets you start. Read [project decisions](CONTEXT.md), [architecture](docs/ARCHITECTURE.md), [verified status](docs/STATUS.md) and [wire contracts](docs/CONTRACTS.md). The issue identifies the deliverable and its owner by function. A contributor can cover more than one function.

## Ownership and handoffs

| Role | Primary paths | Provides to other roles | Coordinate before changing |
| --- | --- | --- | --- |
| Java API and business logic | `backend/src/{main,test}/java/`, `backend/pom.xml` | HTTP responses, authorization and transactional decisions consumed by Expo | Coordinate routes, fields, status codes and error semantics with Mobile. Coordinate JDBC mappings, locks, constraints and JWT validation with Data/Auth. |
| Expo / TypeScript | `mobile/` | Member and administrator flows, typed API calls and consumer checks | Coordinate response assumptions and retries with Java, session/redirect changes with Data/Auth and environment or bundle changes with Integration. |
| Supabase data and auth | `backend/src/main/resources/db/migration/`, `backend/db/`; Auth settings documented in `docs/` | Private schema, grants, isolated fixtures, Auth issuer and identity requirements for Java and Expo | Agree on migration order and DTO impact with Java. Agree on issuer, redirects and email-flow changes with Mobile. Coordinate deployment variables with Integration. |
| Integration and release | `.github/`, `scripts/`, `vercel.json`, `backend/Dockerfile`, deployment properties and runbooks | Integrated CI results linked to a revision, blocker list and release evidence | Coordinate runner, build context, required-check name, environment or release changes with the affected roles. |

The role producing a contract updates its documented example and tests with the consuming role in the same PR. For a breaking change, identify affected callers and a rollout order that keeps them working. Review both sides even if one person holds both roles.

## One issue, one branch or worktree, one PR

1. Claim the issue in GitHub by assigning yourself or leaving a claim comment. Check its dependencies and existing PRs. If blocked, record the missing input and the role that provides it. Use the fixture identified in the plan where available.
2. Start from the integrating branch. While setup PR #1 is open, stack application work on `setup/app-ci-cd`. Once #1 merges, use `main`. For an explicitly stacked dependency, use its branch and link its PR. From a clone, use the following Bash commands, substituting the issue number, short description and base.

   ```bash
   issue=42
   topic=request-history
   base=setup/app-ci-cd
   branch="issue/$issue-$topic"
   git fetch origin
   git worktree add -b "$branch" "../pantry-$issue" "origin/$base"
   cd "../pantry-$issue"
   ```

   For a single working directory use `git switch -c "$branch" "origin/$base"` instead of the last two commands.
3. Make the change and run the checks below. Record the command and observable result in the PR. Update [status](docs/STATUS.md) with new verification or remaining blockers. Keep cross-role fixture, implementation and contract updates together.
4. Commit and push the topic branch, then open a PR to the same base. With GitHub CLI signed in, run `git push -u origin "$branch"` and `gh pr create --base "$base" --head "$branch" --web`. Link the issue, the blocks it unblocks and any remaining device or service checks. Once a parent PR lands, compare the stacked diff against its new base before retargeting.
5. The integrator checks the current PR revision and aggregate CI result before merge. Record completion or the blocking job on the issue. For PRs integrated through a non-default base, close the issue when the agreed completion condition is met.

## Checks from a clean checkout

- **Java:** use the [backend commands](backend/AGENTS.md#java-and-domain-checks) with JDK 21 and Maven.
- **Mobile:** use the [Expo commands](mobile/AGENTS.md) with Node 22.13+ and npm.
- **Data/Auth:** use the [disposable PostgreSQL procedure](backend/AGENTS.md#disposable-database-checks) with Docker. It supplies a minimal Auth table for foreign keys. Exercise real sign-in, confirmation and recovery separately where the build plan calls for them.
- **Integration:** from the root with Git and authenticated GitHub CLI, run the checks below (`pr` is the PR number). Inspect failing jobs and the job list in the linked run. A missing or pending check is an open blocker. The release job and required check are defined in [CI/CD](docs/CI_CD.md).

  ```bash
  pr=42
  git diff --check
  gh issue list --state open
  gh pr list --state open
  gh pr view "$pr" --json baseRefName,headRefOid,statusCheckRollup,url
  gh pr checks "$pr" --watch
  gh api 'repos/{owner}/{repo}/rules/branches/main'
  ```

## Project constraints

Keep `legacy-console/` byte-for-byte. Reuse the course algorithms in the API path, including Bubble Sort, linear search, ArrayList/HashMap and FIFO ArrayDeque. Document adaptations in [course code reuse](docs/REUSE.md).

Use Expo/React Native with TypeScript, Java Spring Boot and Supabase Auth/PostgreSQL. Signup is open and ordinary accounts are MEMBER. Only the verified Supabase identity matching the server-configured ADMIN_USER_ID grants ADMIN access. Derive ownership from the verified JWT. Keep privileged keys and database passwords outside the mobile bundle and Git.

A pending request reserves neither stock nor quota. Approval is atomic, FIFO and idempotent and rechecks the five-unit Monday–Sunday allowance in America/Chicago. Keep payments and pickup scheduling outside the product. Follow [the design handoff](docs/DESIGN.md) for proposed changes. Report what is implemented separately from what has been observed on an iPhone or in production.

Use isolated test services. Changes to live Supabase, paid resources and production deployment require their own task scope. Preserve the original repository and previous Supabase project.

## Prompts to reuse

**Issue agent**

> Take issue #___ and its block in docs/BUILD.md. Read AGENTS.md, your local instructions and docs/CONTRACTS.md. Check dependencies and claim the issue. Work on its branch, coordinate changed interfaces, run the role checks, then open a PR with evidence for “Done when” and links to the work it unlocks.

**Integrator**

> Read AGENTS.md, docs/BUILD.md, docs/STATUS.md and docs/CI_CD.md. Compare open issues, dependencies and PRs with the checks on each current head. Review contract changes on both sides. Report which blocks can proceed, which role owns each blocker, and the run or reproduction proving each completed handoff.
