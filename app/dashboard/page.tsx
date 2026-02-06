"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"
import { ModeToggle } from "@/components/mode-toggle"
import { Loader2, AlertCircle } from "lucide-react"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"

const DB_ID = 'scorecards_db_main'
const COLL_ID = 'employee_scores_main'

import { useSearchParams } from "next/navigation"

export default function DashboardPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [user, setUser] = useState<string | null>(null)
    const [scorecards, setScorecards] = useState<any[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const scorecardRef = useRef<HTMLDivElement>(null)

    // 1. Auth Check & Data Fetch
    useEffect(() => {
        const viewAsUser = searchParams.get("viewAs")
        const storedUser = localStorage.getItem("user_name")

        if (viewAsUser) {
            // Admin "Impersonation" Mode
            setUser(viewAsUser)
            fetchUserScorecards(viewAsUser)
        } else if (storedUser) {
            // Normal Employee Login
            setUser(storedUser)
            fetchUserScorecards(storedUser)
        } else {
            router.push("/")
            return
        }
    }, [router, searchParams])

    const fetchUserScorecards = async (username: string) => {
        try {
            setLoading(true)
            const response = await databases.listDocuments(
                DB_ID,
                COLL_ID,
                [
                    Query.equal('employee_name', username),
                    Query.orderDesc('$createdAt') // Latest uploads first
                ]
            )

            if (response.documents.length > 0) {
                setScorecards(response.documents)
                // Default to the most recent month uploaded
                setSelectedMonth(response.documents[0].month)
            }
        } catch (error) {
            console.error("Failed to fetch scorecards:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleDownloadPDF = async () => {
        if (!scorecardRef.current) return

        const canvas = await html2canvas(scorecardRef.current, {
            scale: 2,
            backgroundColor: null
        })
        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${user || "Employee"}_Scorecard_${selectedMonth}.pdf`)
    }

    // Get current data based on selection
    const currentData = scorecards.find(s => s.month === selectedMonth)

    // Helper to extract unique months for dropdown
    const availableMonths = Array.from(new Set(scorecards.map(s => s.month)))

    // Helper to format percentage values (e.g. 0.95 -> 95.00%)
    const formatPercentage = (val: string | number) => {
        const num = Number(val)
        if (isNaN(num)) return val
        // Assume values < 5 are ratios (e.g. 0.95), values > 5 are whole percentages (e.g. 95)
        const ratio = num < 5 ? num * 100 : num
        return ratio.toFixed(2) + "%"
    }

    if (!user) return null

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-2xl font-bold text-primary">Scorecard Portal</h1>
                    <p className="text-muted-foreground">Welcome, {user}</p>
                </div>
                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <Button variant="outline" onClick={() => {
                        localStorage.removeItem("user_name")
                        router.push("/")
                    }}>Logout</Button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto space-y-6">

                {/* Loading State */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        <p className="text-muted-foreground">Fetching your scorecard...</p>
                    </div>
                ) : scorecards.length === 0 ? (
                    // Empty State
                    <div className="text-center py-20 bg-card rounded-lg border border-dashed">
                        <div className="flex justify-center mb-4">
                            <AlertCircle className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-medium">No Scorecards Found</h3>
                        <p className="text-muted-foreground">
                            We couldn't find any data for <strong>{user}</strong>. <br />
                            Please check with your Lead or Administrator.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Month Selector Wrapper */}
                        <div className="flex justify-end items-center">
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground">Select Month:</label>
                                <select
                                    className="p-2 border rounded-md text-sm bg-card focus:ring-2 focus:ring-primary outline-none"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                >
                                    {availableMonths.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Scorecard Table */}
                        <AnimatePresence mode="wait">
                            {currentData && (
                                <motion.div
                                    key={selectedMonth}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div ref={scorecardRef}>
                                        <Card className="overflow-hidden border-none shadow-xl glass-panel">
                                            {/* Scorecard Header for PDF & View */}
                                            <div className="p-6 border-b border-border/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-slate-900/50">
                                                <div>
                                                    <h2 className="text-2xl font-extrabold uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500">
                                                        Performance Scorecard
                                                    </h2>
                                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
                                                        Month Till Date Report
                                                    </p>
                                                </div>
                                                <div className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-1 text-sm bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                                    <div className="text-muted-foreground font-medium">Employee:</div>
                                                    <div className="font-bold text-slate-700 dark:text-slate-200">{currentData.employee_name}</div>

                                                    <div className="text-muted-foreground font-medium">Team:</div>
                                                    <div className="font-bold text-slate-700 dark:text-slate-200">{currentData.team}</div>

                                                    <div className="text-muted-foreground font-medium">Month:</div>
                                                    <div className="font-bold text-blue-600 dark:text-blue-400">{currentData.month}</div>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="text-xs uppercase bg-gradient-to-r from-blue-600 to-teal-500 text-white">
                                                        <tr>
                                                            <th className="px-6 py-4">Metrics</th>
                                                            <th className="px-6 py-4">Break Up</th>
                                                            <th className="px-6 py-4">Marks Allocation</th>
                                                            <th className="px-6 py-4">Achieved</th>
                                                            <th className="px-6 py-4 text-right">Marks Obtained</th>
                                                            <th className="px-6 py-4 text-right">Performance Club</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/50 bg-card/50">
                                                        {/* Productivity */}
                                                        <tr className="bg-emerald-50/50 dark:bg-emerald-900/10">
                                                            <td className="px-6 py-4 font-medium">Productivity</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground">{">105%"}</td>
                                                            <td className="px-6 py-4">30</td>
                                                            <td className="px-6 py-4 font-bold">{formatPercentage(currentData.productivity_achieved)}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-lg">{currentData.productivity_score}</td>
                                                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">{currentData.productivity_tier}</td>
                                                        </tr>

                                                        {/* Quality */}
                                                        <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                                                            <td className="px-6 py-4 font-medium">Quality</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"99.00% - 99.50%"}</td>
                                                            <td className="px-6 py-4">40</td>
                                                            <td className="px-6 py-4 font-bold">{formatPercentage(currentData.quality_achieved)}</td>
                                                            <td className="px-6 py-4 text-right font-bold text-lg">{currentData.quality_score}</td>
                                                            <td className="px-6 py-4 text-right text-blue-600 font-bold">{currentData.quality_tier}</td>
                                                        </tr>

                                                        {/* Unscheduled Leave */}
                                                        <tr>
                                                            <td className="px-6 py-4">Unscheduled Leave</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"0"}</td>
                                                            <td className="px-6 py-4">10</td>
                                                            <td className="px-6 py-4 font-bold">{currentData.unplanned_leaves_value}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.unplanned_leaves_score}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.unplanned_leaves_value === 0 ? "Outstanding" : "Does not meet"}</td>
                                                        </tr>

                                                        {/* Escalations */}
                                                        <tr>
                                                            <td className="px-6 py-4">Escalations (RCAs)</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"< 1"}</td>
                                                            <td className="px-6 py-4">10</td>
                                                            <td className="px-6 py-4 font-bold">{currentData.rca_value}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.rca_score}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.rca_value < 1 ? "Outstanding" : "Does not meet"}</td>
                                                        </tr>

                                                        {/* PII */}
                                                        <tr>
                                                            <td className="px-6 py-4">Shared PII</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground">
                                                                {currentData.pii_approval > 1 ? "> 1" : (currentData.pii_approval === 1 ? "1" : "< 1")}
                                                            </td>
                                                            <td className="px-6 py-4">10</td>
                                                            <td className="px-6 py-4 font-bold">{currentData.pii_approval}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.pii_score}</td>
                                                            <td className="px-6 py-4 text-right">-</td>
                                                        </tr>

                                                        {/* Attendance Bonus */}
                                                        <tr className="bg-blue-100/30 dark:bg-blue-900/20">
                                                            <td className="px-6 py-4">Perfect Attendance</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground"></td>
                                                            <td className="px-6 py-4">5</td>
                                                            <td className="px-6 py-4 font-bold">{currentData.attendance_value}</td>
                                                            <td className="px-6 py-4 text-right">{currentData.attendance_score}</td>
                                                            <td className="px-6 py-4 text-right"></td>
                                                        </tr>

                                                        {/* Implemented PII */}
                                                        <tr className="bg-blue-100/30 dark:bg-blue-900/20">
                                                            <td className="px-6 py-4">Implemented PII</td>
                                                            <td className="px-6 py-4 text-xs text-muted-foreground"></td>
                                                            <td className="px-6 py-4">10</td>
                                                            <td className="px-6 py-4 font-bold">0</td>
                                                            <td className="px-6 py-4 text-right">0</td>
                                                            <td className="px-6 py-4 text-right"></td>
                                                        </tr>

                                                        {/* Total */}
                                                        <tr className="bg-primary/10 font-bold text-lg border-t-2 border-primary">
                                                            <td className="px-6 py-4" colSpan={4}>TOTAL SCORE</td>
                                                            <td className="px-6 py-4 text-right text-primary">{currentData.total_score}</td>
                                                            <td className="px-6 py-4"></td>
                                                        </tr>

                                                    </tbody>
                                                </table>
                                            </div>

                                            <div className="p-4 bg-orange-100/50 dark:bg-orange-900/20 text-xs text-orange-800 dark:text-orange-200 text-center">
                                                Points to Note: &gt;2 RCAs = 0 Score. 100% Attendance is top-up.
                                            </div>

                                        </Card>
                                    </div>

                                    <div className="mt-6 flex justify-end">
                                        <Button className="shadow-lg" onClick={handleDownloadPDF}>Download PDF Scorecard</Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </>
                )}
            </main>
        </div>
    )
}
