"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Sun } from "lucide-react"
import { DB_ID, SCORES_COLLECTION_ID, ACCESS_COLLECTION_ID, databases } from '@/lib/appwrite';
import { ID, Query } from "appwrite"
import { ModeToggle } from "@/components/mode-toggle"
import confetti from "canvas-confetti"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type BasfTier = { club: string; breakUp: string; marks: number; match: (v: number) => boolean }
const toNumber = (value: any) => {
    const parsed = typeof value === 'string' ? parseFloat(value.replace('%', '')) : Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const toPercent = (value: any) => {
    const parsed = toNumber(value)
    return parsed < 2 ? parsed * 100 : parsed
}

const compareScorecards = (a: any, b: any) => {
    const scoreDiff = Math.round(toNumber(b.total_score)) - Math.round(toNumber(a.total_score))
    if (scoreDiff !== 0) return scoreDiff

    const qualityDiff = toPercent(b.quality_achieved) - toPercent(a.quality_achieved)
    if (qualityDiff !== 0) return qualityDiff

    const leaveDiff = toNumber(a.unplanned_leaves_value) - toNumber(b.unplanned_leaves_value)
    if (leaveDiff !== 0) return leaveDiff

    return String(a.employee_name || '').localeCompare(String(b.employee_name || ''))
}

const BASF_TIERS: Record<string, BasfTier[]> = {
    productivity: [
        { club: 'Bronze',  breakUp: '70% - 84.99%',   marks: 30, match: v => v >= 70 && v < 85 },
        { club: 'Silver',  breakUp: '85% - 99.99%',   marks: 40, match: v => v >= 85 && v < 100 },
        { club: 'Gold',    breakUp: '100% - 104.99%', marks: 50, match: v => v >= 100 && v < 105 },
        { club: 'Diamond', breakUp: '>105%',          marks: 55, match: v => v >= 105 },
    ],
    scheduleAdherence: [
        { club: 'Outstanding',                 breakUp: '0',   marks: 20, match: v => v === 0 },
        { club: 'Very Good',                   breakUp: '0-1', marks: 10, match: v => v > 0 && v <= 1 },
        { club: 'Needs Improvement',           breakUp: '1-2', marks: 5,  match: v => v > 1 && v <= 2 },
        { club: 'Poor / Requires Improvement', breakUp: '>2',  marks: 0,  match: v => v > 2 },
    ],
    unscheduledLeave: [
        { club: 'Outstanding',       breakUp: '0',    marks: 20, match: v => v === 0 },
        { club: 'Needs Improvement', breakUp: '>= 1', marks: 0,  match: v => v >= 1 },
    ],
    rca: [
        { club: 'Outstanding',       breakUp: '< 1',  marks: 10, match: v => v < 1 },
        { club: 'Needs Improvement', breakUp: '>= 1', marks: 0,  match: v => v >= 1 },
    ],
}

const PlatinumWatermark = () => (
    <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center overflow-hidden">
        <div className="opacity-10 dark:opacity-20 transform -rotate-12 scale-[5]">
            <span className="text-[20rem]">🏆</span>
        </div>
    </div>
)

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [user, setUser] = useState<string | null>(null)
    const [scorecards, setScorecards] = useState<any[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [monthlyScores, setMonthlyScores] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Change PIN State
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
    const [newPin, setNewPin] = useState("")
    const [confirmPin, setConfirmPin] = useState("")
    const [pinError, setPinError] = useState("")
    const [isUpdatingPin, setIsUpdatingPin] = useState(false)

    const getOverallClub = (card: any) => {
        if (!monthlyScores.length) return "N/A"

        const rankedScores = [...monthlyScores].sort(compareScorecards)

        const totalStrength = rankedScores.length
        if (totalStrength === 0) return "N/A"

        const myRank = rankedScores.findIndex((scorecard) => {
            if (card.$id && scorecard.$id === card.$id) return true
            return scorecard.employee_name === card.employee_name && scorecard.month === card.month
        }) + 1

        if (myRank === 0) return "N/A"

        // 3. Calculate Percentile Rank (lower is better rank)
        // We use position/total. Top 10% means index is within first 10% of items.
        const percentile = (myRank / totalStrength) * 100

        // 4. Determine Club
        // Platinum: Top 10%
        if (percentile <= 10) return "Platinum"

        // Diamond: Top 15% (Next 15% -> up to 25%)
        if (percentile <= 25) return "Diamond"

        // Gold: Middle 50% (Next 50% -> up to 75%)
        if (percentile <= 75) return "Gold"

        // Silver: Bottom 15% (Next 15% -> up to 90%)
        if (percentile <= 90) return "Silver"

        // Bronze: Bottom 10%
        return "Bronze"
    }

    // Get current scorecard
    const currentCard = scorecards.find(s => s.month === selectedMonth)

    // Calculate overall club for effects
    // BASF-SLB max club is Diamond (no Platinum)
    const rawClub = currentCard ? getOverallClub(currentCard) : ""
    const overallClub = (currentCard?.team === 'BASF-SLB' && rawClub === 'Platinum') ? 'Diamond' : rawClub

    useEffect(() => {
        if (overallClub === "Platinum") {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [overallClub])

    // ... existing useEffects ...

    useEffect(() => {
        const viewAsUser = searchParams.get("viewAs")
        const monthParam = searchParams.get("month")
        const storedUser = localStorage.getItem("user_name")

        if (viewAsUser) {
            setUser(viewAsUser)
            fetchData(viewAsUser, monthParam || undefined)
        } else if (storedUser) {
            setUser(storedUser)
            fetchData(storedUser, monthParam || undefined)
        } else {
            router.push("/")
        }
    }, [router, searchParams])

    useEffect(() => {
        if (selectedMonth) {
            fetchMonthStats(selectedMonth)
        }
    }, [selectedMonth])

    const fetchData = async (username: string, monthOverride?: string) => {
        try {
            setLoading(true)
            const response = await databases.listDocuments(
                DB_ID,
                SCORES_COLLECTION_ID,
                [Query.equal("employee_name", username)]
            )
            const docs = response.documents
            setScorecards(docs)

            // Use month from URL if provided, otherwise default to most recent
            if (monthOverride && docs.some(d => d.month === monthOverride)) {
                setSelectedMonth(monthOverride)
            } else if (docs.length > 0) {
                const sorted = [...docs].sort((a, b) => {
                    return new Date(b.month).getTime() - new Date(a.month).getTime()
                })
                setSelectedMonth(sorted[0].month)
            }
        } catch (error) {
            console.error("Fetch Error", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchMonthStats = async (month: string) => {
        try {
            // Fetch all scores for the month to calculate rank
            const response = await databases.listDocuments(
                DB_ID,
                SCORES_COLLECTION_ID,
                [
                    Query.equal("month", month),
                    Query.limit(1000) // Support up to 1000 employees for ranking
                ]
            )
            setMonthlyScores(response.documents)
        } catch (error) {
            console.error("Month Stats Fetch Error", error)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem("user_name")
        router.push("/")
    }

    const handleChangePin = async () => {
        if (!user) return
        if (newPin.length !== 4 || isNaN(Number(newPin))) {
            setPinError("PIN must be exactly 4 digits.")
            return
        }
        if (newPin !== confirmPin) {
            setPinError("PINs do not match.")
            return
        }

        try {
            setIsUpdatingPin(true)
            setPinError("")
            // Check if user already has an entry
            const response = await databases.listDocuments(
                DB_ID,
                ACCESS_COLLECTION_ID,
                [Query.equal("employee_name", user)]
            )

            if (response.documents.length > 0) {
                // Update existing
                const docId = response.documents[0].$id
                await databases.updateDocument(
                    DB_ID,
                    ACCESS_COLLECTION_ID,
                    docId,
                    { pin: newPin }
                )
            } else {
                // Create new
                await databases.createDocument(
                    DB_ID,
                    ACCESS_COLLECTION_ID,
                    ID.unique(),
                    {
                        employee_name: user,
                        pin: newPin
                    }
                )
            }

            alert("PIN updated successfully!")
            setIsPinDialogOpen(false)
            setNewPin("")
            setConfirmPin("")
        } catch (error) {
            console.error("Failed to update PIN", error)
            setPinError("Failed to update PIN. Please try again.")
        } finally {
            setIsUpdatingPin(false)
        }
    }

    // Get current scorecard


    const formatValue = (val: any, isPercentage = false) => {
        if (val === undefined || val === null || val === "") return "-"
        let num = parseFloat(val)
        if (isNaN(num)) return val

        if (isPercentage) {
            // Excel stores percentages as decimals (e.g., 118.49% → 1.1849, 51.67% → 0.5167)
            // If value is a decimal ratio (< 2), convert to percentage by multiplying by 100
            // Values >= 2 are already in percentage form (e.g., 99.60 means 99.60%)
            if (num < 2) num = num * 100
            return num.toFixed(2) + "%"
        }

        return Number(num.toFixed(2))
    }

    const getClubStatus = (metric: string, value: string | number, team?: string) => {
        let val = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value
        if (isNaN(val)) return "-"

        // Normalize decimal ratios to percentage scale (0-100+) for Productivity/Quality
        if ((metric === 'productivity' || metric === 'quality') && val < 2) {
            val *= 100
        }

        let club: string
        switch (metric) {
            case 'productivity':
                // Platinum: > 105, Diamond: 100-104.99, Gold: 85-99.99, Silver: 70-84.99, Bronze: < 70
                if (val >= 105) club = "Platinum"
                else if (val >= 100) club = "Diamond"
                else if (val >= 85) club = "Gold"
                else if (val >= 70) club = "Silver"
                else club = "Bronze"
                break

            case 'quality':
                // Platinum: 100, Diamond: 99.51-99.99, Gold: 99.00-99.50, Silver: 98.5-98.99, Bronze: < 98.5
                if (val >= 100) club = "Platinum"
                else if (val >= 99.51) club = "Diamond"
                else if (val >= 99.00) club = "Gold"
                else if (val >= 98.5) club = "Silver"
                else club = "Bronze"
                break

            case 'unscheduled_leave':
                // Outstanding: 0, Does not meet: >= 1
                return val === 0 ? "Outstanding" : "Needs Improvement"

            case 'rca':
                // Outstanding: < 1 (0), Does not meet: >= 1
                return val < 1 ? "Outstanding" : "Needs Improvement"

            case 'pii':
                // Per Matrix screenshot: Outstanding > 1, Good = 1. 
                // Note: This differs from current dashboard logic (<1) but following Matrix visual.
                if (val > 1) return "Outstanding"
                if (val === 1) return "Good"
                return "-" // Or Does not meet?

            default:
                return "-"
        }

        // BASF-SLB max club is Diamond
        if (team === 'BASF-SLB' && club === 'Platinum') club = 'Diamond'
        return club
    }

    const getClubStyle = (club: string) => {
        switch (club) {
            case "Platinum": return { icon: "🏆", label: "Platinum", decoration: "✨", color: "text-violet-600 dark:text-violet-400" }
            case "Diamond": return { icon: "💎", label: "Diamond", decoration: "", color: "text-cyan-600 dark:text-cyan-400" }
            case "Gold": return { icon: "🥇", label: "Gold", decoration: "", color: "text-yellow-600 dark:text-yellow-400" }
            case "Silver": return { icon: "🥈", label: "Silver", decoration: "", color: "text-slate-500 dark:text-slate-400" }
            case "Bronze": return { icon: "🥉", label: "Bronze", decoration: "", color: "text-orange-700 dark:text-orange-500" }
            default: return { icon: "", label: club, decoration: "", color: "text-slate-600 dark:text-slate-400" }
        }
    }

    const handleDownloadPDF = async () => {
        const element = document.getElementById("scorecard-report")
        if (!element) return

        try {
            const html2canvas = (await import("html2canvas")).default
            const jsPDF = (await import("jspdf")).default

            // 1. Capture the Dashboard Table
            const canvas = await html2canvas(element, { scale: 2, useCORS: true })
            const imgData = canvas.toDataURL("image/png")

            // 2. Create PDF (Landscape A4)
            // Explicitly use object options for reliability
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            const pdfWidth = pdf.internal.pageSize.getWidth()
            // const pdfHeight = pdf.internal.pageSize.getHeight() // unused

            // 4. Add the Scorecard Image below header
            // Calculate ratio to fit width
            const contentWidth = pdfWidth - 20 // 10mm margin each side
            const contentHeight = (canvas.height * contentWidth) / canvas.width

            pdf.addImage(imgData, 'PNG', 10, 30, contentWidth, contentHeight)

            pdf.save(`${user}_scorecard_${selectedMonth}.pdf`)
        } catch (err) {
            console.error("PDF Download Error", err)
            alert("Failed to download PDF")
        }
    }

    if (!user) return null

    // BASF-SLB computed values (safe defaults when currentCard is missing)
    const isBasfSlb = currentCard?.team === 'BASF-SLB'
    const basfProdVal = parseFloat(String(currentCard?.productivity_achieved || '0').replace('%', '')) || 0
    const basfSchedVal = Number(currentCard?.schedule_adherence_value ?? 0)
    const basfLeaveVal = Number(currentCard?.unplanned_leaves_value ?? 0)
    const basfRcaVal = Number(currentCard?.rca_value ?? 0)
    const basfProdTier = BASF_TIERS.productivity.find(t => t.match(basfProdVal))
    const basfSchedTier = BASF_TIERS.scheduleAdherence.find(t => t.match(basfSchedVal))
    const basfLeaveTier = BASF_TIERS.unscheduledLeave.find(t => t.match(basfLeaveVal))
    const basfRcaTier = BASF_TIERS.rca.find(t => t.match(basfRcaVal))
    const basfNullVoid = basfRcaVal > 2
    const basfDisplayTotal = basfNullVoid ? 0 : Math.round(currentCard?.total_score || 0)
    const basfOverallClub = basfProdTier?.club ?? 'Bronze' // BASF-SLB caps at Diamond; no Platinum

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
            {overallClub === "Platinum" && <PlatinumWatermark />}

            {/* Navbar */}
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-row items-end gap-4">
                        {/* Logo removed */}
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">Change PIN</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Change Login PIN</DialogTitle>
                                    <DialogDescription>
                                        Set a new 4-digit PIN for your account.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="new-pin" className="text-right">
                                            New PIN
                                        </Label>
                                        <Input
                                            id="new-pin"
                                            type="password"
                                            maxLength={4}
                                            value={newPin}
                                            onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="col-span-3"
                                        />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="confirm-pin" className="text-right">
                                            Confirm
                                        </Label>
                                        <Input
                                            id="confirm-pin"
                                            type="password"
                                            maxLength={4}
                                            value={confirmPin}
                                            onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
                                            className="col-span-3"
                                        />
                                    </div>
                                    {pinError && <p className="text-red-500 text-sm text-center">{pinError}</p>}
                                </div>
                                <DialogFooter>
                                    <Button type="submit" onClick={handleChangePin} disabled={isUpdatingPin}>
                                        {isUpdatingPin ? "Updating..." : "Save changes"}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                        <Button variant="outline" onClick={handleLogout} className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">Logout</Button>
                    </div>
                </div>

                {/* Filters Row (Now contains Title + Month Selector) */}
                <div className="flex justify-between items-end gap-2 mb-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gradient-primary">Podium</h1>
                        <p className="text-slate-500 dark:text-slate-400">Welcome, {user}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Select Month:</span>
                        <select
                            className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none min-w-[150px] dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                            value={selectedMonth || ''}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {scorecards.length > 0 ? (
                                scorecards.map(s => <option key={s.$id} value={s.month}>{s.month}</option>
                                )) : (
                                <option>No Data</option>
                            )}
                        </select>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : !currentCard ? (
                    <div className="text-center py-20 text-slate-500">No scorecard data available for this month.</div>
                ) : (
                    <div id="scorecard-report" className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

                        {/* Report Header */}
                        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h2 className="text-2xl font-bold text-cyan-500 uppercase tracking-wide">Performance Scorecard</h2>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Month Till Date Report</p>
                            </div>

                            {/* Employee Info Box */}
                            <div className="mt-4 md:mt-0 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-100 dark:border-slate-800 min-w-[250px] text-sm">
                                <div className="grid grid-cols-[80px_1fr] gap-y-1">
                                    <span className="text-slate-500 dark:text-slate-400">Employee:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{user}</span>

                                    <span className="text-slate-500 dark:text-slate-400">Team:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{currentCard.team || "Operations"}</span>

                                    <span className="text-slate-500 dark:text-slate-400">Month:</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{currentCard.month}</span>

                                    <span className="text-slate-500 dark:text-slate-400">Club:</span>
                                    {(() => {
                                        const club = overallClub
                                        const style = getClubStyle(club)
                                        return (
                                            <span className={`font-bold flex items-center gap-1 ${style.color}`}>
                                                <span>{style.icon}</span>
                                                <span>{style.label}</span>
                                                {style.decoration && <span className="animate-pulse">{style.decoration}</span>}
                                            </span>
                                        )
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Main Table */}
                        <div className="overflow-x-auto">
                            {(
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-white uppercase bg-teal-600 dark:bg-teal-700">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Metrics</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100">Break Up</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100">Marks Allocation</th>
                                        <th className="px-6 py-4 font-bold">Achieved</th>
                                        <th className="px-6 py-4 font-bold">Marks Obtained</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100 text-right">Performance Club</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {/* Productivity */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Productivity</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">&gt;105%</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{currentCard.team === 'BASF-SLB' ? 55 : 30}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{formatValue(currentCard.productivity_achieved, true)}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.productivity_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                                            {getClubStatus('productivity', currentCard.productivity_achieved, currentCard.team)}
                                        </td>
                                    </tr>

                                    {/* Quality — hidden for BASF-SLB (not in their sheet) */}
                                    {currentCard.team !== 'BASF-SLB' && (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Quality</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">99.00% - 99.50%</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">40</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{formatValue(currentCard.quality_achieved, true)}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.quality_score)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                                                {getClubStatus('quality', currentCard.quality_achieved, currentCard.team)}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Schedule Adherence (optional — BASF-SLB) */}
                                    {currentCard.schedule_adherence_value !== undefined && currentCard.schedule_adherence_value !== "" && (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Schedule Adherence</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">0</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">20</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.schedule_adherence_value}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(Number(currentCard.schedule_adherence_score) || 0)}</td>
                                            <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                        </tr>
                                    )}

                                    {/* Unscheduled Leave */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Unscheduled Leave</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">0</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{currentCard.team === 'BASF-SLB' ? 20 : 10}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.unplanned_leaves_value}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.unplanned_leaves_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {getClubStatus('unscheduled_leave', currentCard.unplanned_leaves_value, currentCard.team)}
                                        </td>
                                    </tr>

                                    {/* Escalations (RCAs) */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Escalations (RCAs)</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">&lt; 1</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.rca_value}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.rca_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {getClubStatus('rca', currentCard.rca_value, currentCard.team)}
                                        </td>
                                    </tr>

                                    {/* Shared PII — hidden for BASF-SLB (not in their sheet) */}
                                    {currentCard.team !== 'BASF-SLB' && (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Shared PII</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">&gt; 1</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">10</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.pii_approval}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.pii_score)}</td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                                {getClubStatus('pii', currentCard.pii_approval, currentCard.team)}
                                            </td>
                                        </tr>
                                    )}

                                    {/* Attendance */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Attendance</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">100%</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{currentCard.team === 'BASF-SLB' ? '-' : 5}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{Number(currentCard.attendance_value).toFixed(2)}%</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{currentCard.team === 'BASF-SLB' ? '-' : Math.round(currentCard.attendance_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                    </tr>

                                    {/* Attendance Bonus (optional — BASF-SLB) */}
                                    {currentCard.attendance_bonus_value !== undefined && currentCard.attendance_bonus_value !== "" && (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Attendance Bonus</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">+5</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">5</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.attendance_bonus_value}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(Number(currentCard.attendance_bonus_score) || 0)}</td>
                                            <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                        </tr>
                                    )}

                                    {/* Transaction % (optional — BASF-SLB, display only) */}
                                    {currentCard.transaction_percentage !== undefined && currentCard.transaction_percentage !== "" && (
                                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Transaction %</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">-</td>
                                            <td className="px-6 py-4 text-slate-500 dark:text-slate-400">-</td>
                                            <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.transaction_percentage}</td>
                                            <td className="px-6 py-4 text-slate-400 dark:text-slate-500">-</td>
                                            <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                        </tr>
                                    )}

                                </tbody>

                                {/* Total Footers */}
                                <tfoot>
                                    <tr className="bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900">
                                        <td colSpan={4} className="px-6 py-5 font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Total Score</td>
                                        <td className="px-6 py-5">
                                            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">{Math.round(currentCard.total_score)}</span>
                                        </td>
                                        <td className="px-6 py-6 text-right">
                                            {(() => {
                                                const club = overallClub
                                                const style = getClubStyle(club)
                                                return (
                                                    <div className={`flex flex-col items-end ${style.color} leading-none`}>
                                                        <div className="text-3xl -mb-1">{style.icon}</div>
                                                        <div className="font-extrabold text-xl flex items-center gap-1 mt-1">
                                                            {style.label}
                                                            {style.decoration && <span className="animate-pulse">{style.decoration}</span>}
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                            )}
                        </div>

                        {/* Footer Notes */}
                        <div className="bg-orange-50 dark:bg-orange-950/30 px-6 py-4 text-center border-t border-orange-100 dark:border-orange-900/50">
                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                                {isBasfSlb
                                    ? "Points to Note: More than 2 RCAs in a month = scorecard is NULL & VOID (score = 0). 100% Attendance & Approved PII is a top-up; denominator stays 100."
                                    : "Points to Note: >2 RCAs = 0 Score. 100% Attendance is top-up."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Download Button */}
                {!loading && currentCard && (
                    <div className="flex justify-end mt-6">
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                            onClick={handleDownloadPDF}
                        >
                            Download PDF Scorecard
                        </Button>
                    </div>
                )}

            </div>
        </div >
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <DashboardContent />
        </Suspense>
    )
}
