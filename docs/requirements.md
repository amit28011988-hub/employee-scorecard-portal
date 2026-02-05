# Employee Score Card Portal - Requirements Draft

## Overview
A web application for sharing monthly employee scorecards.
- **Roles**: Admin, Employee.
- **Platform**: Web (Vercel).
- **Database**: Supabase.

## Confirmed Features
- **Authentication**:
    - **Employees**: Login via **Employee Name** + **4-digit PIN**.
    - **Default PIN**: `0000` for all new users.
    - **PIN Reset**: Employees contact Admin; Admin updates it in the dashboard.
- **Data Ingestion**:
    - **Method**: Admin uploads the monthly Excel sheet.
    - **Processing**: The App ingests the **calculated scores** from the sheet (Productivity Score, Quality Score, etc.) to ensure consistency with the user's Excel formulas.
    - **User Creation**: If an uploaded name doesn't exist, auto-create the user with default PIN.
- **Reporting**:
    - **Web View**: Interactive, premium monthly scorecard.
    - **Export**: Download Scorecard as PDF.
    - **History**: View past months' scorecards.

## Data Structure (Based on images)
- **Primary Keys**: Employee Name + Month.
- **Metrics Stored**:
    - Productivity % & Score
    - Quality % & Score
    - Unauthorized Absence (Count & Score)
    - Escalation/RCA (Count & Score)
    - Shared PII (Count & Score)
    - Attendance Bonus
    - Implemented PII Bonus
    - **Total Score**
    - Transaction %
    - Team / Club Status

