"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, LogOut, BarChart3, ClipboardList } from "lucide-react"
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

const parseMonth = (m: string): number => {
    const d = new Date(`1 ${m}`)
    return isNaN(d.getTime()) ? 0 : d.getTime()
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
    const [activeTab, setActiveTab] = useState<'scorecard' | 'analysis'>('scorecard')

    // Change PIN State
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
    const [newPin, setNewPin] = useState("")
    const [confirmPin, setConfirmPin] = useState("")
    const [pinError, setPinError] = useState("")
    const [isUpdatingPin, setIsUpdatingPin] = useState(false)

    const getOverallClub = (card: any) => {
        if (!monthlyScores.length) return "N/A"
        const teamScores = card.team
            ? monthlyScores.filter((s: any) => s.team === card.team)
            : monthlyScores
        const rankedScores = [...teamScores].sort(compareScorecards)
        const totalStrength = rankedScores.length
        if (totalStrength === 0) return "N/A"
        const myRank = rankedScores.findIndex((scorecard) => {
            if (card.$id && scorecard.$id === card.$id) return true
            return scorecard.employee_name === card.employee_name && scorecard.month === card.month
        }) + 1
        if (myRank === 0) return "N/A"
        const percentile = ((myRank - 1) / totalStrength) * 100
        if (percentile <= 5) return "Platinum"
        if (percentile <= 15) return "Diamond"
        if (percentile <= 75) return "Gold"
        if (percentile <= 85) return "Silver"
        return "Bronze"
    }

    const currentCard = scorecards.find(s => s.month === selectedMonth)
    const rawClub = currentCard ? getOverallClub(currentCard) : ""
    const overallClub = rawClub

    useEffect(() => {
        if (overallClub === "Platinum") {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) return clearInterval(interval);
                const particleCount = 50 * (timeLeft / duration);
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);
            return () => clearInterval(interval);
        }
    }, [overallClub])

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
        if (selectedMonth) fetchMonthStats(selectedMonth)
    }, [selectedMonth])

    const fetchData = async (username: string, monthOverride?: string) => {
        try {
            setLoading(true)
            const response = await databases.listDocuments(DB_ID, SCORES_COLLECTION_ID, [Query.equal("employee_name", username)])
            const docs = response.documents
            setScorecards(docs)
            if (monthOverride && docs.some(d => d.month === monthOverride)) {
                setSelectedMonth(monthOverride)
            } else if (docs.length > 0) {
                const sorted = [...docs].sort((a, b) => parseMonth(b.month) - parseMonth(a.month))
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
            const response = await databases.listDocuments(DB_ID, SCORES_COLLECTION_ID, [
                Query.equal("month", month),
                Query.limit(1000)
            ])
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
        if (newPin.length !== 4 || isNaN(Number(newPin))) { setPinError("PIN must be exactly 4 digits."); return }
        if (newPin !== confirmPin) { setPinError("PINs do not match."); return }
        try {
            setIsUpdatingPin(true)
            setPinError("")
            const response = await databases.listDocuments(DB_ID, ACCESS_COLLECTION_ID, [Query.equal("employee_name", user)])
            if (response.documents.length > 0) {
                await databases.updateDocument(DB_ID, ACCESS_COLLECTION_ID, response.documents[0].$id, { pin: newPin })
            } else {
                await databases.createDocument(DB_ID, ACCESS_COLLECTION_ID, ID.unique(), { employee_name: user, pin: newPin })
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

    const formatValue = (val: any, isPercentage = false) => {
        if (val === undefined || val === null || val === "") return "-"
        let num = parseFloat(val)
        if (isNaN(num)) return val
        if (isPercentage) {
            if (num < 2) num = num * 100
            return num.toFixed(2) + "%"
        }
        return Number(num.toFixed(2))
    }

    const getClubStatus = (metric: string, value: string | number, team?: string) => {
        let val = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value
        if (isNaN(val)) return "-"
        if ((metric === 'productivity' || metric === 'quality') && val < 2) val *= 100
        let club: string
        switch (metric) {
            case 'productivity':
                if (val >= 105) club = "Platinum"
                else if (val >= 100) club = "Diamond"
                else if (val >= 85) club = "Gold"
                else if (val >= 70) club = "Silver"
                else club = "Bronze"
                break
            case 'quality':
                if (val >= 100) club = "Platinum"
                else if (val >= 99.51) club = "Diamond"
                else if (val >= 99.00) club = "Gold"
                else if (val >= 98.5) club = "Silver"
                else club = "Bronze"
                break
            case 'unscheduled_leave':
                return val === 0 ? "Outstanding" : "Needs Improvement"
            case 'rca':
                return val < 1 ? "Outstanding" : "Needs Improvement"
            case 'pii':
                if (val > 1) return "Outstanding"
                if (val === 1) return "Good"
                return "-"
            default:
                return "-"
        }
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
            const canvas = await html2canvas(element, { scale: 2, useCORS: true })
            const imgData = canvas.toDataURL("image/png")
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
            const pdfWidth = pdf.internal.pageSize.getWidth()
            const contentWidth = pdfWidth - 20
            const contentHeight = (canvas.height * contentWidth) / canvas.width
            pdf.addImage(imgData, 'PNG', 10, 30, contentWidth, contentHeight)
            pdf.save(`${user}_scorecard_${selectedMonth}.pdf`)
        } catch (err) {
            console.error("PDF Download Error", err)
            alert("Failed to download PDF")
        }
    }

    // ── Analysis tab computed values ──────────────────────────────────────────
    const sortedCards = [...scorecards].sort((a, b) => parseMonth(a.month) - parseMonth(b.month))
    const myTeam = scorecards[0]?.team || ''
    const avgScore = sortedCards.length > 0
        ? sortedCards.reduce((s, c) => s + toNumber(c.total_score), 0) / sortedCards.length
        : 0
    const bestCard = sortedCards.length > 0
        ? sortedCards.reduce((best, c) => toNumber(c.total_score) > toNumber(best.total_score) ? c : best)
        : null
    const maxTotalScore = Math.max(100, ...sortedCards.map(c => toNumber(c.total_score)))

    const insights: { type: 'positive' | 'warning' | 'focus'; text: string }[] = []
    if (sortedCards.length >= 2) {
        const last = sortedCards[sortedCards.length - 1]
        const prev = sortedCards[sortedCards.length - 2]
        const diff = Math.round(toNumber(last.total_score) - toNumber(prev.total_score))
        if (diff > 2) insights.push({ type: 'positive', text: `Your total score went up by ${diff} points in ${last.month} compared to ${prev.month} — great progress!` })
        else if (diff < -2) insights.push({ type: 'warning', text: `Your score dropped by ${Math.abs(diff)} points in ${last.month}. The breakdown below will show you where to focus.` })
        if (myTeam !== 'BASF-SLB') {
            const lastQ = toPercent(last.quality_achieved)
            const prevQ = toPercent(prev.quality_achieved)
            if (lastQ < prevQ - 0.3) insights.push({ type: 'warning', text: `Quality slipped from ${prevQ.toFixed(2)}% to ${lastQ.toFixed(2)}% — every decimal point counts here.` })
            else if (lastQ >= 99.5) insights.push({ type: 'positive', text: `Quality is excellent at ${lastQ.toFixed(2)}% — nearly flawless accuracy!` })
        }
        if (sortedCards.length >= 3) {
            const last3 = sortedCards.slice(-3)
            if (toNumber(last3[2].total_score) > toNumber(last3[1].total_score) && toNumber(last3[1].total_score) > toNumber(last3[0].total_score)) {
                insights.push({ type: 'positive', text: `3 months of continuous improvement! You're on a strong upward trend. Keep it going!` })
            }
        }
    }
    if (sortedCards.length >= 1) {
        const latest = sortedCards[sortedCards.length - 1]
        const leaves = toNumber(latest.unplanned_leaves_value)
        if (leaves > 0) insights.push({ type: 'focus', text: `You had ${leaves} unscheduled leave(s) in ${latest.month}. Zero leaves earns full marks on this parameter — plan your time off in advance.` })
        const rca = toNumber(latest.rca_value)
        if (rca >= 2) insights.push({ type: 'warning', text: `${rca} escalations in ${latest.month} — more than 2 RCAs can make your entire scorecard NULL & VOID!` })
        else if (rca === 1) insights.push({ type: 'focus', text: `1 escalation in ${latest.month}. Aim for 0 RCAs every month to protect your score.` })
        if (myTeam !== 'BASF-SLB' && toNumber(latest.pii_approval) === 0) {
            insights.push({ type: 'focus', text: `No PI Ideas shared in ${latest.month}. Sharing even one process improvement idea earns you bonus marks!` })
        }
        const prod = toPercent(latest.productivity_achieved)
        if (prod >= 105) insights.push({ type: 'positive', text: `Outstanding productivity — ${prod.toFixed(1)}% in ${latest.month}!` })
        else if (prod < 85 && prod > 0) insights.push({ type: 'focus', text: `Productivity at ${prod.toFixed(1)}% in ${latest.month}. Aim for 100%+ to maximize your marks here.` })
    }

    const metricDefs = [
        { key: 'productivity', label: 'Productivity', getScore: (c: any) => toNumber(c.productivity_score), maxScore: myTeam === 'BASF-SLB' ? 55 : 30, getVal: (c: any) => toPercent(c.productivity_achieved), fmtVal: (v: number) => `${v.toFixed(1)}%`, color: 'from-blue-600 to-blue-400', show: true },
        { key: 'quality', label: 'Quality', getScore: (c: any) => toNumber(c.quality_score), maxScore: 40, getVal: (c: any) => toPercent(c.quality_achieved), fmtVal: (v: number) => `${v.toFixed(2)}%`, color: 'from-teal-600 to-teal-400', show: myTeam !== 'BASF-SLB' },
        { key: 'unscheduled_leave', label: 'Unscheduled Leave', getScore: (c: any) => toNumber(c.unplanned_leaves_score), maxScore: myTeam === 'BASF-SLB' ? 20 : 10, getVal: (c: any) => toNumber(c.unplanned_leaves_value), fmtVal: (v: number) => `${v} day(s)`, color: 'from-orange-500 to-orange-400', show: true },
        { key: 'rca', label: 'Escalations (RCA)', getScore: (c: any) => toNumber(c.rca_score), maxScore: 10, getVal: (c: any) => toNumber(c.rca_value), fmtVal: (v: number) => `${v}`, color: 'from-rose-500 to-rose-400', show: true },
        { key: 'pii', label: 'PI Ideas', getScore: (c: any) => toNumber(c.pii_score), maxScore: 10, getVal: (c: any) => toNumber(c.pii_approval), fmtVal: (v: number) => `${v} idea(s)`, color: 'from-purple-500 to-purple-400', show: myTeam !== 'BASF-SLB' },
        { key: 'attendance', label: 'Attendance Bonus', getScore: (c: any) => toNumber(c.attendance_bonus_score) || toNumber(c.attendance_score), maxScore: 5, getVal: (c: any) => toNumber(c.attendance_value), fmtVal: (v: number) => `${v.toFixed(1)}%`, color: 'from-green-600 to-green-400', show: true },
        { key: 'schedule', label: 'Schedule Adherence', getScore: (c: any) => toNumber(c.schedule_adherence_score), maxScore: 20, getVal: (c: any) => toNumber(c.schedule_adherence_value), fmtVal: (v: number) => `${v}`, color: 'from-cyan-600 to-cyan-400', show: ['QA', 'BASF-SLB', 'Doc Update'].includes(myTeam) },
    ]
    const visibleMetrics = metricDefs.filter(m => m.show)

    const insightStyle = {
        positive: { bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800', icon: '✅', text: 'text-emerald-800 dark:text-emerald-300' },
        warning:  { bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',   icon: '⚠️', text: 'text-amber-800 dark:text-amber-300' },
        focus:    { bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',       icon: '🎯', text: 'text-blue-800 dark:text-blue-300' },
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!user) return null

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
    const basfOverallClub = basfProdTier?.club ?? 'Bronze'

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
            {overallClub === "Platinum" && <PlatinumWatermark />}

            <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-row items-end gap-4" />
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">Change PIN</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader>
                                    <DialogTitle>Change Login PIN</DialogTitle>
                                    <DialogDescription>Set a new 4-digit PIN for your account.</DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="new-pin" className="text-right">New PIN</Label>
                                        <Input id="new-pin" type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))} className="col-span-3" />
                                    </div>
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="confirm-pin" className="text-right">Confirm</Label>
                                        <Input id="confirm-pin" type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))} className="col-span-3" />
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

                {/* Title + Month Selector Row */}
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
                            {scorecards.length > 0
                                ? scorecards.map(s => <option key={s.$id} value={s.month}>{s.month}</option>)
                                : <option>No Data</option>
                            }
                        </select>
                    </div>
                </div>

                {/* Tab Bar */}
                {!loading && scorecards.length > 0 && (
                    <div className="flex border-b border-slate-200 dark:border-slate-800 mb-2">
                        <button
                            onClick={() => setActiveTab('scorecard')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'scorecard'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            <ClipboardList className="w-4 h-4" /> Scorecard
                        </button>
                        <button
                            onClick={() => setActiveTab('analysis')}
                            className={`flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'analysis'
                                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                        >
                            <BarChart3 className="w-4 h-4" /> My Analysis
                        </button>
                    </div>
                )}

                {/* ── Loading ── */}
                {loading && (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                )}

                {/* ── Scorecard Tab ── */}
                {!loading && activeTab === 'scorecard' && (
                    <>
                        {!currentCard ? (
                            <div className="text-center py-20 text-slate-500">No scorecard data available for this month.</div>
                        ) : (
                            <div id="scorecard-report" className="bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">

                                {/* Report Header */}
                                <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 dark:border-slate-800">
                                    <div>
                                        <h2 className="text-2xl font-bold text-cyan-500 uppercase tracking-wide">Performance Scorecard</h2>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Month Till Date Report</p>
                                    </div>
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

                                            {/* Quality */}
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

                                            {/* Schedule Adherence */}
                                            {['QA', 'BASF-SLB', 'Doc Update'].includes(currentCard.team) && currentCard.schedule_adherence_value !== undefined && currentCard.schedule_adherence_value !== "" && (
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

                                            {/* Shared PII */}
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

                                            {/* Attendance Bonus */}
                                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Attendance Bonus</td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">+5</td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">5</td>
                                                <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{Number(currentCard.attendance_value).toFixed(2)}%</td>
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(Number(currentCard.attendance_bonus_score) || Number(currentCard.attendance_bonus_value) || currentCard.attendance_score || 0)}</td>
                                                <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                            </tr>

                                            {/* Transaction % */}
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
                        {currentCard && (
                            <div className="flex justify-end mt-6 pb-8">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6" onClick={handleDownloadPDF}>
                                    Download PDF Scorecard
                                </Button>
                            </div>
                        )}
                    </>
                )}

                {/* ── Analysis Tab ── */}
                {!loading && activeTab === 'analysis' && (
                    <div className="space-y-6 pb-8">
                        {sortedCards.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">No data yet to analyse.</div>
                        ) : (
                            <>
                                {/* Summary Stat Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                                        <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{avgScore.toFixed(1)}</div>
                                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Avg Score</div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center">
                                        <div className="text-3xl font-extrabold text-teal-600 dark:text-teal-400">{sortedCards.length}</div>
                                        <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Months Tracked</div>
                                    </div>
                                    {bestCard && (
                                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 text-center col-span-2 sm:col-span-1">
                                            <div className="text-3xl font-extrabold text-amber-500">{Math.round(toNumber(bestCard.total_score))}</div>
                                            <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wide">Best Score ({bestCard.month})</div>
                                        </div>
                                    )}
                                </div>

                                {/* Smart Insights */}
                                {insights.length > 0 && (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                                💡 Your Insights
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 pt-0">
                                            {insights.map((ins, i) => {
                                                const s = insightStyle[ins.type]
                                                return (
                                                    <div key={i} className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${s.bg}`}>
                                                        <span className="text-base mt-0.5 shrink-0">{s.icon}</span>
                                                        <span className={s.text}>{ins.text}</span>
                                                    </div>
                                                )
                                            })}
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Overall Score Trend */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                            📈 Overall Score Trend
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        {sortedCards.length < 2 ? (
                                            <p className="text-xs text-slate-500">More months of data needed to show a trend.</p>
                                        ) : (
                                            <>
                                                <div className="flex items-end gap-3 h-52 border-l border-b border-slate-200 dark:border-slate-800 pl-3 pb-2">
                                                    {sortedCards.map(c => {
                                                        const score = toNumber(c.total_score)
                                                        const heightPct = Math.max(4, (score / maxTotalScore) * 100)
                                                        return (
                                                            <div key={c.$id} className="flex flex-col items-center gap-1 flex-1 min-w-0 h-full justify-end">
                                                                <div className="text-xs font-bold text-slate-600 dark:text-slate-300">{Math.round(score)}</div>
                                                                <div
                                                                    className="w-full max-w-[64px] bg-gradient-to-t from-blue-600 to-teal-400 rounded-t-md transition-all shadow-sm"
                                                                    style={{ height: `${heightPct}%` }}
                                                                    title={`${c.month}: ${Math.round(score)}`}
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                <div className="flex gap-3 pl-3 pt-2">
                                                    {sortedCards.map(c => (
                                                        <div key={`${c.$id}-lbl`} className="flex-1 min-w-0 text-center">
                                                            <div className="text-[10px] text-slate-500 leading-tight">{c.month}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Per-Parameter Breakdown */}
                                <div>
                                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3 px-1">
                                        🔍 Parameter Breakdown — Where You Stand
                                    </h3>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {visibleMetrics.map(metric => {
                                            const metricData = sortedCards.map(c => ({
                                                month: c.month as string,
                                                score: metric.getScore(c),
                                                val: metric.getVal(c),
                                                id: c.$id as string,
                                            }))
                                            const avgMetricScore = metricData.reduce((s, d) => s + d.score, 0) / metricData.length
                                            const maxMetricScore = metric.maxScore
                                            const pct = Math.round((avgMetricScore / maxMetricScore) * 100)

                                            return (
                                                <div key={metric.key} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">{metric.label}</div>
                                                            <div className="text-xs text-slate-400 mt-0.5">Max: {maxMetricScore} pts</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-lg font-extrabold text-slate-800 dark:text-slate-100">{avgMetricScore.toFixed(1)}</div>
                                                            <div className="text-xs text-slate-400">avg pts ({pct}%)</div>
                                                        </div>
                                                    </div>

                                                    {/* Avg fill bar */}
                                                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mb-3 overflow-hidden">
                                                        <div
                                                            className={`h-full bg-gradient-to-r ${metric.color} rounded-full transition-all`}
                                                            style={{ width: `${Math.min(100, pct)}%` }}
                                                        />
                                                    </div>

                                                    {metricData.length < 2 ? (
                                                        <div className="text-xs text-slate-400">Only 1 month — more data needed for trend.</div>
                                                    ) : (
                                                        <>
                                                            <div className="flex items-end gap-1.5 h-28 border-l border-b border-slate-200 dark:border-slate-700 pl-2 pb-1">
                                                                {metricData.map(d => {
                                                                    const heightPct = maxMetricScore > 0 ? Math.max(2, (d.score / maxMetricScore) * 100) : 2
                                                                    return (
                                                                        <div key={d.id} className="flex flex-col items-center flex-1 h-full justify-end min-w-0">
                                                                            <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{Math.round(d.score)}</div>
                                                                            <div
                                                                                className={`w-full max-w-[40px] bg-gradient-to-t ${metric.color} rounded-t opacity-90 transition-all`}
                                                                                style={{ height: `${heightPct}%` }}
                                                                                title={`${d.month}: ${metric.fmtVal(d.val)} → ${Math.round(d.score)} pts`}
                                                                            />
                                                                        </div>
                                                                    )
                                                                })}
                                                            </div>
                                                            <div className="flex gap-1.5 pl-2 pt-1">
                                                                {metricData.map(d => (
                                                                    <div key={`${d.id}-l`} className="flex-1 min-w-0 text-center">
                                                                        <div className="text-[9px] text-slate-400 truncate">{d.month.split(' ')[0]?.slice(0, 3)}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <DashboardContent />
        </Suspense>
    )
}
