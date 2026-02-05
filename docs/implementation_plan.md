# Implementation Plan - Employee Scorecard Portal

## Goal Description
Build a premium-looking web application for employees to view their monthly performance scorecards. Admins will upload Excel sheets to populate the data.

## User Review Required
> [!IMPORTANT]
> **Authentication Security**: Since we are using a custom Name + PIN system (not email/password), the PINs will be hashed in the database, but this is less secure than standard OAuth. It is acceptable for this internal tool use case.

## Proposed Changes

### Database (Supabase)
#### [NEW] `schema.sql`
- **Table `profiles`**:
    - `id` (UUID, PK)
    - `name` (Text, Unique) - To identify employees from the Excel sheet.
    - `pin_hash` (Text) - Hashed 4-digit PIN.
    - `role` (Text) - 'admin' or 'employee'.
- **Table `scorecards`**:
    - `id` (UUID, PK)
    - `user_id` (UUID, FK -> profiles.id)
    - `month_year` (Date) - e.g., '2023-10-01'
    - `productivity_score` (Numeric)
    - `quality_score` (Numeric)
    - `metrics` (JSONB) - Stores all other raw values (RCA count, Leaves, etc.) to keep schema flexible.
    - `total_score` (Numeric)

### Frontend (Next.js Application)
#### [NEW] `src/app/layout.tsx`
- Setup Root Layout with a premium dark/glassmorphism theme context.

#### [NEW] `src/components/ui`
- Install **shadcn/ui** components: Card, Table, Input, Button, Dialog (for login/upload).

#### [NEW] `src/app/page.tsx` (Login)
- A sleek login screen.
- **Employee View**: Dropdown/Search for Name + PIN Input.
- **Admin View**: Hidden/Separate toggle for Admin Password login.

#### [NEW] `src/app/dashboard/page.tsx`
- **Employee Mode**:
    - Show latest scorecard in a beautiful card format (like the reference image but digital).
    - "Download PDF" button (using `html2canvas` + `jspdf` or `react-pdf`).
    - Month selector to view history.
- **Admin Mode**:
    - File Upload Dropzone (for Excel).
    - Table of all employees with "Reset PIN" action.

#### [NEW] `src/lib/excel-parser.ts`
- Utility to map the Excel columns (from user's screenshot) to our DB fields.

## Verification Plan

### Manual Verification
1.  **Admin Flow**:
    - Log in as Admin.
    - Upload the provided sample Excel sheet.
    - Verify rows in Supabase `scorecards` table.
    - Verify new `profiles` are created for new names.
2.  **Employee Flow**:
    - Log in as "Akash Parashar" (from sheet) with PIN `0000`.
    - Verify the displayed score matches the Excel row (e.g., Total 90.00).
    - Test PDF download.
