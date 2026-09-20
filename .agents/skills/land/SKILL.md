---
name: land
description: >-
  Run the project's local verification for an explicitly requested Land Changes
  action, then leave the verified changes uncommitted in the working tree for
  the human developer to review and commit manually. Invoke this skill only
  when the user has explicitly requested landing or chosen Land Changes; do
  not invoke it for review, preparation, or ordinary verification requests.
metadata:
  delta-action: land
---

# Verify and export changes for human-controlled landing

This project uses `npm run lint` and `npm run build` as its local verification
commands. Their exact definitions are in the repository root `package.json`.
This workflow intentionally does not perform the landing operation: it exports
the changed files to the developer's local working directory, while the human
developer controls commit scope, commit messages, and push timing.

## Workflow

1. Confirm the request is an explicit Land Changes request. This skill is
   already invoked only after that request; do not ask for landing permission
   again.
2. Identify the files changed by this task from the worktree's file state and
   the task context. Do not use Git commands to do so. Do not reset, stash,
   amend, commit, push, merge, create branches, or create pull requests.
3. If unrelated changes are present or the intended export scope is unclear,
   stop and ask the user before copying anything. Preserve every existing
   change in the destination.
4. Run `npm run lint` from the repository root. This command is defined in
   `package.json` as the project's lint task.
5. If lint fails, stop. Report the failure and leave the working tree
   untouched.
6. Run `npm run build` from the repository root. This command is defined in
   `package.json` and runs the TypeScript build followed by the Vite build.
7. If the build fails, stop. Report the failure and leave the working tree
   untouched.
8. After both commands pass, copy the changed files to the developer's local
   working directory, preserving their relative paths and creating missing
   parent directories as needed. Use ordinary file operations, not Git
   commands. Do not overwrite files outside the approved export scope.
9. Verify that the exported files exist in the local working directory. Leave
   the changes uncommitted and report that the developer may now review and
   manually commit or push them.

## Conflict and external-change policy

The user chose to pause for all conflicts. If an external edit, ambiguous
working-tree change, or destination file collision is detected, stop without
resolving it automatically and ask the user what to do. Never discard or
overwrite unrelated work.

## Reporting

This workflow is successful only when both local commands pass and every
approved changed file has been copied to the local working directory. Do not
claim that the changes were committed, pushed, merged, or landed on a remote.
If either check fails or export verification fails, report failure and identify
the failed step.

When running in a subthread and `report_subthread_status` is available, report
`status: "success"` only after verification and local export, with a concise
description such as “Lint and build passed; changes were exported locally and
remain uncommitted.” Report `status: "failure"` for a failed check or a genuine
blocker. Do not include fabricated commit or CI links.
