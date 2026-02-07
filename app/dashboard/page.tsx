"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Sun } from "lucide-react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"
import { ModeToggle } from "@/components/mode-toggle"
import confetti from "canvas-confetti"

const DB_ID = 'scorecards_db_main'
const COLL_ID = 'employee_scores_main'

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

    const getOverallClub = (myScore: number) => {
        if (!monthlyScores.length) return "N/A"

        // 1. Filter out invalid scores and sort descending
        const validScores = monthlyScores
            .map(d => Math.round(d.total_score || 0))
            .sort((a, b) => b - a)

        const totalStrength = validScores.length
        if (totalStrength === 0) return "N/A"

        // 2. Find my rank (1-based index)
        // indexOf returns the FIRST occurrence, which handles ties correctly (best rank)
        const myRank = validScores.indexOf(Math.round(myScore)) + 1 // 1st, 2nd, etc.

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
    const overallClub = currentCard ? getOverallClub(Math.round(currentCard.total_score)) : ""

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
        const storedUser = localStorage.getItem("user_name")

        if (viewAsUser) {
            setUser(viewAsUser)
            fetchData(viewAsUser)
        } else if (storedUser) {
            setUser(storedUser)
            fetchData(storedUser)
        } else {
            router.push("/")
        }
    }, [router, searchParams])

    useEffect(() => {
        if (selectedMonth) {
            fetchMonthStats(selectedMonth)
        }
    }, [selectedMonth])

    const fetchData = async (username: string) => {
        try {
            setLoading(true)
            const response = await databases.listDocuments(
                DB_ID,
                COLL_ID,
                [Query.equal("employee_name", username)]
            )
            const docs = response.documents
            setScorecards(docs)

            // Default to most recent month
            if (docs.length > 0 && !selectedMonth) {
                // Sort by date logic (custom sort since month is string)
                // Assuming format "Month Year" e.g., "January 2026"
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
                COLL_ID,
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

    // Get current scorecard


    const formatValue = (val: any, isPercentage = false) => {
        if (val === undefined || val === null || val === "") return "-"
        let num = parseFloat(val)
        if (isNaN(num)) return val

        if (isPercentage) {
            // If value is like 0.81, convert to 81
            // If value is like 81, keep as 81 (heuristic: if < 1.05 likely decimal ratio for scores, BUT 1.00 could be 1% or 100%.. typically scores are ratios 0-1)
            // User's screenshot shows 0.81 -> Wants 81%.
            // Let's assume input is a decimal ratio if less than 1.5 (e.g. 150% is 1.5).
            // However, some might be entered as "81".
            // Safer bet based on screenshot: input is 0.81.
            if (num <= 1) num = num * 100
            return Math.round(num) + "%" // User asked for 81% not 81.00%
        }

        return Number(num.toFixed(2))
    }


    const getClubStatus = (metric: string, value: string | number) => {
        const val = typeof value === 'string' ? parseFloat(value.replace('%', '')) : value
        if (isNaN(val)) return "-"

        switch (metric) {
            case 'productivity':
                // Platinum: > 105, Diamond: 100-104.99, Gold: 85-99.99, Silver: 70-84.99, Bronze: < 70
                if (val > 105) return "Platinum"
                if (val >= 100) return "Diamond"
                if (val >= 85) return "Gold"
                if (val >= 70) return "Silver"
                return "Bronze"

            case 'quality':
                // Platinum: 100, Diamond: 99.51-99.99, Gold: 99.00-99.50, Silver: 98.5-98.99, Bronze: < 98.5
                if (val >= 100) return "Platinum"
                if (val >= 99.51) return "Diamond"
                if (val >= 99.00) return "Gold"
                if (val >= 98.5) return "Silver"
                return "Bronze"

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

            // 3. Add Header Logo to PDF
            // We load the image separately to draw it on the PDF
            const logoImg = new Image()
            // Add cache buster to ensure latest image or force reload
            logoImg.src = "/logo_correct.png"
            logoImg.crossOrigin = "Anonymous"

            await new Promise((resolve) => {
                logoImg.onload = resolve
                logoImg.onerror = (e) => {
                    console.error("Logo failed to load for PDF", e)
                    resolve(null) // proceed anyway
                }
            })

            // Draw Logo (Left Top) - Maintain Aspect Ratio
            // Target height: 15mm. Calculate width based on aspect ratio.
            let logoW = 15;
            let logoH = 15;

            if (logoImg.naturalWidth > 0 && logoImg.naturalHeight > 0) {
                const aspect = logoImg.naturalWidth / logoImg.naturalHeight;
                logoH = 15; // fixed height
                logoW = logoH * aspect; // proportional width
                pdf.addImage(logoImg, 'PNG', 10, 10, logoW, logoH)
            }

            // Draw Title text next to logo (shifted by logo width + margin)
            pdf.setFontSize(16)
            pdf.setTextColor(40, 40, 40)
            // Start text after logo + 5mm gap
            pdf.text("Performance Scorecard", 10 + logoW + 5, 20)

            // Add Club Status to Header if exists
            if (currentCard) { // Ensure currentCard exists before accessing properties
                const overallClub = getOverallClub(currentCard.total_score);
                if (overallClub && overallClub !== "N/A") {
                    pdf.setFontSize(12)
                    pdf.setTextColor(13, 148, 136) // teal
                    pdf.text(`Club: ${overallClub}`, pdfWidth - 40, 20, { align: 'right' })
                }
            }

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



    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden">
            {overallClub === "Platinum" && <PlatinumWatermark />}

            {/* Navbar */}
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex flex-row items-end gap-4">
                        <div className="h-24 w-60 relative">
                            {/* Larger container (Increased again by 15%) */}
                            <img src="/logo_correct.png" alt="Logo" className="object-contain h-full w-full object-left" />
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <ModeToggle />
                        <Button variant="outline" onClick={handleLogout} className="bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700">Logout</Button>
                    </div>
                </div>

                {/* Filters Row (Now contains Title + Month Selector) */}
                <div className="flex justify-between items-end gap-2 mb-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gradient-primary">Scorecard Portal</h1>
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
                                        const club = getOverallClub(currentCard.total_score)
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
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">30</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{formatValue(currentCard.productivity_achieved, true)}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.productivity_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                                            {getClubStatus('productivity', currentCard.productivity_achieved)}
                                        </td>
                                    </tr>

                                    {/* Quality */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Quality</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">99.00% - 99.50%</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">40</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{formatValue(currentCard.quality_achieved, true)}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.quality_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-blue-600 dark:text-blue-400">
                                            {getClubStatus('quality', currentCard.quality_achieved)}
                                        </td>
                                    </tr>

                                    {/* Unscheduled Leave */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Unscheduled Leave</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">0</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.unplanned_leaves_value}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.unplanned_leaves_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {getClubStatus('unscheduled_leave', currentCard.unplanned_leaves_value)}
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
                                            {getClubStatus('rca', currentCard.rca_value)}
                                        </td>
                                    </tr>

                                    {/* Shared PII */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Shared PII</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">&gt; 1</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.pii_approval}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.pii_score)}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600 dark:text-slate-400">
                                            {getClubStatus('pii', currentCard.pii_approval)}
                                        </td>
                                    </tr>

                                    {/* Attendance */}
                                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">Attendance</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">100%</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">5</td>
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{currentCard.attendance_value}%</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-slate-100 text-lg">{Math.round(currentCard.attendance_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">-</td>
                                    </tr>

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
                                                const club = getOverallClub(currentCard.total_score)
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
                                Points to Note: &gt;2 RCAs = 0 Score. 100% Attendance is top-up.
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
