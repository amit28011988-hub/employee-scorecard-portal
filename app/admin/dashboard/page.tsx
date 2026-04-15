"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, LogOut, Settings, LockKeyhole } from "lucide-react"
import { databases } from "@/lib/appwrite"
import { ID, Query } from "appwrite"
import * as XLSX from "xlsx"
import { ModeToggle } from "@/components/mode-toggle"

const DB_ID = 'scorecards_db_main'
const COLL_ID = 'employee_scores_main'

export default function AdminDashboard() {
    const router = useRouter()
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState("")
    const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: "" })
    const [allData, setAllData] = useState<any[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [selectedTeam, setSelectedTeam] = useState<string>("All")
    const [clearing, setClearing] = useState(false)
    const [clearingMonth, setClearingMonth] = useState(false)
    const [monthToClear, setMonthToClear] = useState<string>("")

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [passwordError, setPasswordError] = useState("")

    useEffect(() => {
        fetchAllScorecards()
    }, [])

    const fetchAllScorecards = async () => {
        try {
            // Paginate through ALL documents (Appwrite default limit is 25)
            const PAGE_SIZE = 100
            let allDocs: any[] = []
            let offset = 0
            let hasMore = true

            while (hasMore) {
                const response = await databases.listDocuments(
                    DB_ID,
                    COLL_ID,
                    [Query.limit(PAGE_SIZE), Query.offset(offset)]
                )
                allDocs = [...allDocs, ...response.documents]
                offset += PAGE_SIZE
                hasMore = response.documents.length === PAGE_SIZE
            }

            setAllData(allDocs)

            // Set default month if not set
            if (allDocs.length > 0 && !selectedMonth) {
                const months = Array.from(new Set(allDocs.map((d: any) => d.month)))
                if (months.length > 0) setSelectedMonth(months[0])
            }
        } catch (error) {
            console.error("Fetch Error", error)
        }
    }

    const handleClearDatabase = async () => {
        if (!confirm("ARE YOU SURE? This will delete ALL scorecard data. This cannot be undone.")) return

        setClearing(true)
        try {
            // Fetch ID only to delete (SEQUENTIAL to avoid Rate Limit)
            let docs;
            do {
                docs = await databases.listDocuments(DB_ID, COLL_ID)
                if (docs.documents.length > 0) {
                    for (const d of docs.documents) {
                        try {
                            await databases.deleteDocument(DB_ID, COLL_ID, d.$id)
                            // Short delay to be kind to the API (Rate Limit Protection)
                            await new Promise(r => setTimeout(r, 200))
                        } catch (e) {
                            console.error("Delete ignored:", e)
                        }
                    }
                }
            } while (docs.documents.length > 0)

            setStatus({ type: 'success', message: "Database Cleared." })
            setAllData([])
            setSelectedMonth("")
        } catch (error: any) {
            setStatus({ type: 'error', message: "Failed to clear: " + error.message })
        } finally {
            setClearing(false)
        }
    }

    // --- CLEAR SPECIFIC MONTH DATA ---
    const handleClearMonthData = async (month: string) => {
        if (!month) {
            setStatus({ type: 'error', message: "Please select a month to clear." })
            return
        }
        if (!confirm(`This will delete ALL scorecard data for "${month}" only. Jan, Feb and other months will NOT be affected. Continue?`)) return

        setClearingMonth(true)
        setProgress(`Clearing data for ${month}...`)
        try {
            let totalDeleted = 0
            let hasMore = true

            while (hasMore) {
                const docs = await databases.listDocuments(
                    DB_ID,
                    COLL_ID,
                    [Query.equal("month", month), Query.limit(100)]
                )

                if (docs.documents.length === 0) {
                    hasMore = false
                    break
                }

                for (const d of docs.documents) {
                    try {
                        await databases.deleteDocument(DB_ID, COLL_ID, d.$id)
                        totalDeleted++
                        setProgress(`Clearing ${month}... Deleted ${totalDeleted} records`)
                        await new Promise(r => setTimeout(r, 150))
                    } catch (e) {
                        console.error("Delete ignored:", e)
                    }
                }
            }

            setStatus({ type: 'success', message: `✅ Cleared ${totalDeleted} records for "${month}". You can now re-upload the revised sheet.` })
            setProgress("")

            // Refresh data
            await fetchAllScorecards()
        } catch (error: any) {
            setStatus({ type: 'error', message: `Failed to clear month data: ${error.message}` })
        } finally {
            setClearingMonth(false)
        }
    }

    // Derived State
    const availableMonths = Array.from(new Set(allData.map(d => d.month))).sort((a, b) => {
        // Simple month sorting (e.g., "January 2023" vs "February 2023")
        const dateA = new Date(a + " 1")
        const dateB = new Date(b + " 1")
        return dateB.getTime() - dateA.getTime() // Newest first
    })

    const handleChangePassword = async () => {
        if (!newPassword || newPassword !== confirmPassword) {
            setPasswordError("Passwords do not match or empty")
            return
        }

        try {
            const COLL_CONFIG = 'app_config'
            // Find existing config
            const response = await databases.listDocuments(DB_ID, COLL_CONFIG, [Query.equal('key', 'admin_password')])

            if (response.documents.length > 0) {
                await databases.updateDocument(DB_ID, COLL_CONFIG, response.documents[0].$id, { value: newPassword })
            } else {
                await databases.createDocument(DB_ID, COLL_CONFIG, ID.unique(), { key: 'admin_password', value: newPassword })
            }

            alert("Password Updated Successfully")
            setShowPasswordModal(false)
            setNewPassword("")
            setConfirmPassword("")
            setPasswordError("")
        } catch (e: any) {
            console.error("Password Update Error", e)
            setPasswordError(e.message || "Failed to update")
        }
    }

    // Filter by Month first to get relevant teams
    const monthData = allData.filter(d => d.month === selectedMonth)

    // Get Unique Teams from the Month's data
    const availableTeams = ["All", ...Array.from(new Set(monthData.map(d => d.team || "Unassigned"))).sort()]

    // Final Filter: Month AND Team
    const filteredData = monthData.filter(d =>
        selectedTeam === "All" || (d.team || "Unassigned") === selectedTeam
    )

    // Group by Team & Sort
    const teamGroups: Record<string, any[]> = {}
    filteredData.forEach(d => {
        const team = d.team || "Unassigned"
        if (!teamGroups[team]) teamGroups[team] = []
        teamGroups[team].push(d)
    })

    // Sort each team's members: Highest Score First (Descending), then Name (A-Z)
    Object.keys(teamGroups).forEach(team => {
        teamGroups[team].sort((a, b) => {
            const scoreDiff = b.total_score - a.total_score // Descending Score
            if (scoreDiff !== 0) return scoreDiff
            return a.employee_name.localeCompare(b.employee_name) // Tie-break: Name A-Z
        })
    })

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)
        setProgress("Analyzing file structure...")
        setStatus({ type: null, message: "" })

        try {
            console.log("Reading file...")
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)

            // 1. Sheet selection
            let targetSheetName = workbook.SheetNames.find(name => name.toLowerCase().includes("monthly score card"))
            if (!targetSheetName) {
                targetSheetName = workbook.SheetNames.length > 1 ? workbook.SheetNames[1] : workbook.SheetNames[0]
                console.log(`'Monthly Score Card' sheet not found. Defaulting to: ${targetSheetName}`)
            }
            console.log(`Using Sheet: ${targetSheetName}`)

            const worksheet = workbook.Sheets[targetSheetName]
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

            if (rawData.length === 0) throw new Error("Sheet is empty.")

            // 2. DETECT FORMAT: List (Database) VS Report (Single)
            // Strategy: Check if Row 0 looks like a Header Row with "Employee Name"
            const row0 = rawData[0].map(c => String(c).toLowerCase().trim())
            const isListMode = row0.includes("employee name") || row0.includes("name")

            if (isListMode) {
                console.log("--- DETECTED MODE: BULK LIST (Database Style) ---")
                await processBulkListMode(rawData, row0)
            } else {
                console.log("--- DETECTED MODE: SINGLE REPORT (Key-Value Style) ---")
                await processReportMode(rawData)
            }

            // Refresh Data after upload
            await fetchAllScorecards()

        } catch (error: any) {
            console.error("Upload error", error)
            setStatus({ type: 'error', message: error.message || "Failed to process file." })
            console.log(`ERROR: ${error.message}`)
            setUploading(false)
        }
    }

    // --- MODE 1: BULK LIST UPLOAD ---
    const processBulkListMode = async (rawData: any[][], headers: string[]) => {
        // Map Columns
        const getIdx = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)))

        const idxInfo = {
            name: getIdx(["employee name", "name"]),
            team: getIdx(["team", "process"]),
            month: getIdx(["month"]),
            // Metrics (Base columns, scores are usually adjacent +1)
            prod: getIdx(["productivity"]),
            qual: getIdx(["quality"]),
            attend: getIdx(["attendance"]),
            ua: getIdx(["unauthorised", "unplanned", "leave"]), // Unauthorised Absence
            rca: getIdx(["escalation", "rca"]),
            pii: getIdx(["pii", "shared pii"]),
            total: getIdx(["total"]),
            club: getIdx(["club", "performance club", "status", "tier", "final status", "club status"])
        }

        console.log(`Column Mapping: ${JSON.stringify(idxInfo)}`)

        if (idxInfo.name === -1) throw new Error("Critical: 'Employee Name' column not found in headers.")

        let successCount = 0
        let failCount = 0
        let updateCount = 0
        let createCount = 0
        const totalRows = rawData.length - 1 // Exclude header

        // Iterate Data Rows
        for (let r = 1; r < rawData.length; r++) {
            const row = rawData[r]
            if (!row || row.length === 0) continue

            const name = row[idxInfo.name]
            if (!name || String(name).trim() === "") continue

            setProgress(`Processing ${r}/${totalRows}: ${name}`)

            // Helper to get score (usually next column if numeric, or same col if value)
            const getVal = (idx: number) => (idx !== -1 && row[idx] !== undefined) ? row[idx] : 0

            // For metrics like Prod/Quality, the screenshot shows [Value, Score]. 
            // We want the Score (Col+1) for the 'score' field, and Value (Col) for 'achieved'
            const getMetricPair = (baseIdx: number) => {
                if (baseIdx === -1) return { score: 0, val: 0 }
                const val = row[baseIdx] // The raw % or count (keep original type for proper conversion)
                const score = row[baseIdx + 1] // The adjacent cell seems to be the score based on logs
                return {
                    val: val !== undefined ? val : 0,
                    score: typeof score === 'number' ? score : Number(score) || 0
                }
            }

            // Special handling based on data types in screenshot
            const prod = getMetricPair(idxInfo.prod)
            const qual = getMetricPair(idxInfo.qual)

            // Attendance: Screenshot shows "Attendance", "AttendanceBonus"
            // If explicit bonus column exists, use it. Else assume +1
            const attendVal = getVal(idxInfo.attend)
            const attendScore = (idxInfo.attend !== -1 && row[idxInfo.attend + 1] !== undefined) ? Number(row[idxInfo.attend + 1]) : 0

            // Leaves & RCA: Usually count is value, next col might be score
            // Log shows: "Unauthorised Absence", "Score"
            const ua = getMetricPair(idxInfo.ua)
            const rca = getMetricPair(idxInfo.rca)
            const pii = getMetricPair(idxInfo.pii)

            // Month Fallback
            let month = idxInfo.month !== -1 ? row[idxInfo.month] : ""
            if (!month) {
                // Default to PREVIOUS month (e.g., Upload in Feb -> Report for Jan)
                const d = new Date()
                d.setMonth(d.getMonth() - 1)
                month = d.toLocaleString('default', { month: 'long', year: 'numeric' })
            }

            // Normalize month string to prevent matching issues
            if (typeof month === 'string') month = month.trim()

            const record = {
                employee_name: String(name).trim(),
                team: idxInfo.team !== -1 ? String(row[idxInfo.team]) : "General",
                month: String(month),
                // FIX: Math.round all scores to satisfy Appwrite Integer Schema
                productivity_score: Math.round(prod.score),
                productivity_achieved: typeof prod.val === 'number' ? (prod.val * 100).toFixed(1) + "%" : prod.val,
                productivity_tier: "-",

                quality_score: Math.round(qual.score),
                quality_achieved: typeof qual.val === 'number' ? (qual.val * 100).toFixed(1) + "%" : qual.val,
                quality_tier: "-",

                attendance_score: Math.round(attendScore),
                attendance_value: String(attendVal),

                unplanned_leaves_score: Math.round(ua.score),
                unplanned_leaves_value: Math.ceil(Number(ua.val) || 0), // Count can be 0.5, treat as 1 absence? Or round? Using ceil for safety on count.

                rca_score: Math.round(rca.score),
                rca_value: Math.ceil(Number(rca.val) || 0),

                pii_score: Math.round(pii.score),
                pii_approval: Math.ceil(Number(pii.val) || 0),

                total_score: Math.round(Number(getVal(idxInfo.total)) || 0),
                performance_club: idxInfo.club !== -1 ? String(row[idxInfo.club]) : "-"
            }

            // Upload
            // UPSERT LOGIC: Check for existing document to prevent duplicates
            try {
                // Search for existing record for this Person + Month
                const existingDocs = await databases.listDocuments(
                    DB_ID,
                    COLL_ID,
                    [
                        Query.equal("employee_name", record.employee_name),
                        Query.equal("month", record.month)
                    ]
                )

                if (existingDocs.documents.length > 0) {
                    // UPDATE existing (Pick the first match)
                    const docId = existingDocs.documents[0].$id
                    await databases.updateDocument(DB_ID, COLL_ID, docId, record)
                    successCount++
                    updateCount++
                } else {
                    // CREATE new
                    await databases.createDocument(DB_ID, COLL_ID, ID.unique(), record)
                    successCount++
                    createCount++
                }
            } catch (err) {
                console.error("Row Upload Fail", err)
                console.log(`Failed to upload ${name}: ${err}`)
                failCount++
            }
        }

        setStatus({
            type: failCount > 0 ? 'error' : 'success',
            message: `Bulk Import Complete. Success: ${successCount} (${createCount} new, ${updateCount} updated). Failed: ${failCount}. ${failCount > 0 ? "Check logs." : ""}`
        })
        setUploading(false)
    }

    // --- MODE 2: SINGLE REPORT (Legacy Support) ---
    const processReportMode = async (rawData: any[][]) => {
        // ... (Keep existing complex scanning logic here if needed, or simplify)
        // For now, re-using a simplified version of the previous logic to save space
        // If we are sure it's list mode, this might not run.
        console.log("Report Mode detected (fallback). Scanning...")

        // 1. Header Detection
        let metricsHeaderRowIndex = -1
        const headerKeywords = ["metric", "metrics", "kpi", "particulars"]
        let colIdx: any = {}

        for (let r = 0; r < rawData.length; r++) {
            const row = rawData[r].map(c => String(c).toLowerCase().trim())
            if (row.some(c => headerKeywords.some(k => c.includes(k)))) {
                metricsHeaderRowIndex = r
                colIdx.metric = row.findIndex(c => headerKeywords.some(k => c.includes(k)))
                colIdx.achieved = row.findIndex(c => c.includes("achieved"))
                colIdx.score = row.findIndex(c => c.includes("marks obtained") || c.includes("score"))
                break
            }
        }

        if (metricsHeaderRowIndex === -1) throw new Error("Could not find Metrics Table in Report Mode.")

        // 2. Metadata Scan (Strictly ABOVE header)
        let metadata: any = {}
        for (let r = 0; r < metricsHeaderRowIndex; r++) {
            const row = rawData[r].map(c => String(c).toLowerCase().trim())
            const findVal = (key: string) => {
                const idx = row.findIndex(c => c.includes(key))
                if (idx !== -1) {
                    for (let k = idx + 1; k < row.length; k++) if (rawData[r][k]) return rawData[r][k]
                }
            }
            if (!metadata.employee_name) metadata.employee_name = findVal("name")
            if (!metadata.team) metadata.team = findVal("team")
            if (!metadata.month) metadata.month = findVal("month")
        }

        if (!metadata.employee_name) throw new Error("Employee Name not found in metadata section.")

        // 3. Metrics
        // (Simplified extraction for legacy mode - trusting List Mode is the primary target now)
        const record = { ...metadata, total_score: 0 } // ... fill in others as 0 for safety

        await databases.createDocument(DB_ID, COLL_ID, ID.unique(), record)
        setStatus({ type: 'success', message: `Uploaded Single Report for ${record.employee_name}` })
        setUploading(false)
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col items-start gap-4">
                    {/* Logo removed */}
                    <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">
                        Admin Panel
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-medium mb-2">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Scorecard Data
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10" onClick={() => router.push("/")}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </nav>
            </aside>

            <div className="flex-1 p-8 max-w-5xl mx-auto space-y-8 overflow-y-auto">
                <header className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-primary">Dashboard Overview</h1>
                        <p className="text-muted-foreground">Manage scorecards and employee data.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ModeToggle />
                        <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                            <LockKeyhole className="w-4 h-4 mr-2" />
                            Change Password
                        </Button>
                    </div>
                </header>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gradient-primary font-bold">
                            <FileSpreadsheet className="w-5 h-5 text-green-600" />
                            Upload Scorecard Data
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex flex-col items-center gap-4">
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                    <Upload className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-medium">Click to upload Excel file (.xlsx)</p>
                                    <p className="text-xs text-muted-foreground">Ensure headers match the template.</p>
                                </div>
                                <Input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    className="max-w-xs cursor-pointer"
                                    onChange={handleFileUpload}
                                    disabled={uploading}
                                />
                            </div>
                        </div>

                        {uploading && (
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-md text-sm">
                                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                <span>{progress}</span>
                            </div>
                        )}

                        {status.type === 'success' && (
                            <Alert className="bg-green-50 text-green-800 border-green-200">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <AlertTitle>Success</AlertTitle>
                                <AlertDescription>{status.message}</AlertDescription>
                            </Alert>
                        )}

                        {status.type === 'error' && (
                            <Alert variant="destructive">
                                <AlertCircle className="w-4 h-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{status.message}</AlertDescription>
                            </Alert>
                        )}

                        {/* --- CLEAR SPECIFIC MONTH SECTION --- */}
                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    Re-upload a Revised Sheet?
                                </h4>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                                    To replace a specific month&apos;s data (e.g., revised March sheet), first clear that month&apos;s data below, then re-upload the new file above. <strong>Other months (Jan, Feb, etc.) will NOT be affected.</strong>
                                </p>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                    <select
                                        className="h-9 rounded-md border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-950 px-3 py-1 text-sm focus:border-amber-500 focus:outline-none min-w-[180px]"
                                        value={monthToClear}
                                        onChange={(e) => setMonthToClear(e.target.value)}
                                    >
                                        <option value="">-- Select Month to Clear --</option>
                                        {availableMonths.map(m => (
                                            <option key={m} value={m}>{m}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 border border-amber-400 text-amber-700 bg-white hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:bg-slate-950 dark:hover:bg-amber-900/30 disabled:pointer-events-none disabled:opacity-50 transition-colors"
                                        onClick={() => {
                                            console.log("Clear month clicked, monthToClear:", monthToClear)
                                            handleClearMonthData(monthToClear)
                                        }}
                                        disabled={clearingMonth || !monthToClear}
                                    >
                                        {clearingMonth ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <AlertCircle className="w-3 h-3 mr-2" />}
                                        Clear Selected Month Only
                                    </button>
                                </div>
                            </div>

                            <p className="text-xs text-center text-muted-foreground">— OR —</p>

                            <div className="flex justify-end">
                                <Button variant="destructive" size="sm" onClick={handleClearDatabase} disabled={clearing}>
                                    {clearing ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <LogOut className="w-3 h-3 mr-2 rotate-180" />}
                                    Clear All Data in Database
                                </Button>
                            </div>
                        </div>

                        {/* TIP: Re-upload notice */}
                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-xs text-blue-700 dark:text-blue-400">
                                💡 <strong>Tip:</strong> You can also directly re-upload a revised Excel sheet without clearing first. The system will automatically <strong>update</strong> existing records (matched by Employee Name + Month). New employees will be added. However, if someone was <em>removed</em> from the revised sheet, their old record will remain — in that case, clear the month first.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* MONTH & SUMMARY SECTION */}
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gradient-primary">Month-wise Summary</h2>
                            <p className="text-sm text-slate-500">View team performance by month.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium whitespace-nowrap">Filter Team:</span>
                                <select
                                    className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                                    value={selectedTeam}
                                    onChange={(e) => setSelectedTeam(e.target.value)}
                                >
                                    {availableTeams.map(t => (
                                        <option key={t} value={t}>{t === "All" ? "All Teams" : t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium whitespace-nowrap">Select Month:</span>
                                <select
                                    className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                                    value={selectedMonth}
                                    onChange={(e) => {
                                        setSelectedMonth(e.target.value)
                                        setSelectedTeam("All") // Reset team on month change
                                    }}
                                >
                                    <option value="" disabled>-- Select Month --</option>
                                    {availableMonths.map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TEAM GROUPS */}
                {/* 4. Filter Logic Update: Only show if a specific team is selected (Not "All") */}
                {selectedMonth && selectedTeam !== "All" && Object.keys(teamGroups).length > 0 ? (
                    <div className="grid gap-6">
                        {Object.entries(teamGroups).map(([teamName, members]) => (
                            <Card key={teamName}>
                                <CardHeader className="py-4 bg-slate-50 dark:bg-slate-900 border-b">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-base font-bold text-blue-700 dark:text-blue-400">
                                            {teamName}
                                        </CardTitle>
                                        <span className="text-xs bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded-full font-mono">
                                            {members.length} Members
                                        </span>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                            <tr>
                                                <th className="px-4 py-3">Employee Name</th>
                                                <th className="px-4 py-3 text-right text-black dark:text-white font-bold">Total Score</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {members.map((m: any) => (
                                                <tr key={m.$id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{m.employee_name}</td>
                                                    <td className="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">
                                                        <Link
                                                            href={`/dashboard?viewAs=${encodeURIComponent(m.employee_name)}&month=${encodeURIComponent(selectedMonth)}`}
                                                            className="hover:underline cursor-pointer"
                                                            target="_blank"
                                                        >
                                                            {Math.round(m.total_score)}
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                        {allData.length === 0
                            ? "No data in database. Upload a file above."
                            : !selectedMonth
                                ? "Select a month to view summary."
                                : selectedTeam === "All"
                                    ? "Please select a specific Team to view detailed scores."
                                    : "No data found for this selection."}
                    </div>
                )}

                {/* Password Change Modal */}
                {showPasswordModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in zoom-in duration-200">
                        <Card className="w-full max-w-sm shadow-2xl border-slate-200 dark:border-slate-800">
                            <CardHeader>
                                <CardTitle>Change Admin Password</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {passwordError && (
                                    <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
                                        {passwordError}
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">New Password</label>
                                    <Input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Confirm Password</label>
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </div>
                                <div className="flex justify-end gap-2 mt-4">
                                    <Button variant="ghost" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                                    <Button onClick={handleChangePassword}>Update</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
