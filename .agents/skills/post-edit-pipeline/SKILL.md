---
name: post-edit-pipeline
description: Automated post-edit pipeline that runs after every editing session. Performs code review, updates replit.md, pushes to GitHub, generates updated comprehensive features PDF and text file, uploads both to Google Drive, and emails download links to the owner. Activate after completing any code changes.
---

# Post-Edit Pipeline

Run this full pipeline after every editing session where code or features were changed. Execute all steps in order. Do not skip steps.

## Pipeline Steps

### Step 1: Code Review
Run the architect code review on all changed files:
```javascript
const result = await architect({
  task: "Thorough code review of recent changes. Check for: security issues, admin enforcement, tenant isolation, error handling, input validation, SQL injection, performance, and code style consistency.",
  relevantFiles: [/* list changed files */],
  includeGitDiff: true,
  responsibility: "evaluate_task"
});
```
Fix any critical or high-severity issues found. Re-run review if major fixes were made.

### Step 2: Update replit.md
Read the current `replit.md` and update:
- Platform stats (file count, line count, tool count, table count, skill count)
- Any new features, tools, or architectural changes
- Any new env vars or configuration changes
Keep it accurate to the current state of the platform.

### Step 3: Push to GitHub
Run the secret-scanner push script:
```bash
bash /tmp/push-gh.sh
```
If the push script doesn't exist (server hasn't created it yet), use the manual push flow:
1. `git add -A`
2. Commit with descriptive message
3. Force push via: `git push --force "https://${GITHUB_TOKEN}@github.com/Huskyauto/VisionClaw-Agent.git" main`

NEVER commit secrets. The push script scans for 10+ patterns and blocks if found.

### Step 4: Generate Comprehensive Features Files
Generate two files from the current state of the platform:

**PDF** (`VisionClaw-Comprehensive-Features.pdf`):
- Use pdfkit to create a formatted PDF
- Cover ALL platform features, tools (current count), personas, models, tables
- Include sections: Overview, Auth, Multi-Tenant, Chat Engine, AI Routing, Personas, Tools, Memory, Heartbeat, Deep Research, Browser, Voice, Email, Payments, Security, Tech Stack, Pages
- Update all numbers to current platform stats

**Text** (`VisionClaw-Comprehensive-Features.txt`):
- Plain text version with the same content
- This is what gets uploaded to Felix for presentation context

### Step 5: Upload to Google Drive
Upload both files using the server's Google Drive module:
```typescript
import { uploadAndShare } from './server/google-drive';

const pdfResult = await uploadAndShare({
  filePath: 'VisionClaw-Comprehensive-Features.pdf',
  fileName: 'VisionClaw-Comprehensive-Features.pdf',
  description: 'VisionClaw Agent Platform - Complete Feature Document (PDF)',
  folderLabel: 'Platform Documentation',
  share: true
});

const txtResult = await uploadAndShare({
  filePath: 'VisionClaw-Comprehensive-Features.txt',
  fileName: 'VisionClaw-Comprehensive-Features.txt',
  description: 'VisionClaw Agent Platform - Complete Feature Document (Text)',
  folderLabel: 'Platform Documentation',
  share: true
});
```
Save the `viewUrl` from both results.

### Step 6: Register in Project DB
Register both files in project 15 for Felix access:
```sql
INSERT INTO project_files (project_id, file_name, file_path, file_type, file_size, uploaded_by)
VALUES (15, 'filename', 'drive_view_url', 'mime_type', size, 'VisionClaw Agent')
ON CONFLICT DO NOTHING;
```

### Step 7: Email Links
Send email with both Drive links to the owner:
```typescript
import { getOrCreateTenantInbox, sendEmail } from './server/email';

const inboxResult = await getOrCreateTenantInbox(1);
const inboxId = typeof inboxResult === "string" ? inboxResult : inboxResult.inboxId || inboxResult.email;

await sendEmail({
  inboxId,
  to: process.env.OWNER_ALERT_EMAIL || "huskyauto@gmail.com",
  subject: "VisionClaw Updated Features - PDF + Text",
  text: `... include both Drive viewUrl links ...`
});
// IMPORTANT: The parameter is "text" NOT "body". Using "body" results in blank emails.
```

### Step 8: Present Files
Use the present_asset tool to show both files to the user in chat.

## Key Rules
- NEVER skip the code review step
- NEVER push secrets to GitHub
- ALWAYS use `uploadAndShare` with named object syntax for Google Drive
- ALWAYS use the `getOrCreateTenantInbox(1)` pattern for email (returns object, extract inboxId)
- The owner email comes from env var `OWNER_ALERT_EMAIL`
- Felix is persona 2, project 15 is the presentation project
- PDF uses pdfkit (already installed)
- Drive upload returns `viewUrl`, `fileId`, `downloadUrl` — use `viewUrl` for sharing
