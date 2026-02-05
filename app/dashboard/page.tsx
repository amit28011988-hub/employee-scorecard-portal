"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ModeToggle } from "@/components/mode-toggle"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

// Mock Data Structure matching the Excel Sheet
const MOCK_SCORECARD = {
    month: "October 2023",
    productivity: { score: 30, achieved: "101.12%", tier: "Diamond" },
    quality: { score: 40, achieved: "99.87%", tier: "Gold" },
    attendance: { score: 5, value: "95%" },
    unplanned_leaves: { score: 10, value: 0 },
    rca: { score: 10, value: 0 },
    pii: { score: 10, approval: 2 },
    total: 105,
    transaction_percent: "90%",
    team: "Pre-processing"
}

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState<string | null>(null)
    const scorecardRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const storedUser = localStorage.getItem("user_name")
        if (!storedUser) {
            router.push("/")
        } else {
            setUser(storedUser)
        }
    }, [router])

    const handleDownloadPDF = async () => {
        if (!scorecardRef.current) return

        const canvas = await html2canvas(scorecardRef.current, {
            scale: 2, // Higher resolution
            backgroundColor: null // Transparent background handling
        })
        const imgData = canvas.toDataURL("image/png")
        const pdf = new jsPDF("p", "mm", "a4")
        const pdfWidth = pdf.internal.pageSize.getWidth()
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight)
        pdf.save(`${user || "Employee"}_Scorecard.pdf`)
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

                {/* Month Selector Wrapper */}
                {/* Month Selector Wrapper */}
                <div className="flex justify-end items-center">
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-muted-foreground">Select Month:</label>
                        <select className="p-2 border rounded-md text-sm bg-card focus:ring-2 focus:ring-primary outline-none">
                            <option>October 2023</option>
                            <option>September 2023</option>
                        </select>
                    </div>
                </div>

                {/* Scorecard Table - Matching the Image Logic */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
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
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{user}</div>

                                    <div className="text-muted-foreground font-medium">Team:</div>
                                    <div className="font-bold text-slate-700 dark:text-slate-200">{MOCK_SCORECARD.team}</div>

                                    <div className="text-muted-foreground font-medium">Month:</div>
                                    <div className="font-bold text-blue-600 dark:text-blue-400">{MOCK_SCORECARD.month}</div>
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
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.productivity.achieved}</td>
                                            <td className="px-6 py-4 text-right font-bold text-lg">{MOCK_SCORECARD.productivity.score}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">{MOCK_SCORECARD.productivity.tier}</td>
                                        </tr>

                                        {/* Quality */}
                                        <tr className="bg-blue-50/50 dark:bg-blue-900/10">
                                            <td className="px-6 py-4 font-medium">Quality</td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"99.00% - 99.50%"}</td>
                                            <td className="px-6 py-4">40</td>
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.quality.achieved}</td>
                                            <td className="px-6 py-4 text-right font-bold text-lg">{MOCK_SCORECARD.quality.score}</td>
                                            <td className="px-6 py-4 text-right text-blue-600 font-bold">{MOCK_SCORECARD.quality.tier}</td>
                                        </tr>

                                        {/* Unscheduled Leave */}
                                        <tr>
                                            <td className="px-6 py-4">Unscheduled Leave</td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"0"}</td>
                                            <td className="px-6 py-4">10</td>
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.unplanned_leaves.value}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.unplanned_leaves.score}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.unplanned_leaves.value === 0 ? "Outstanding" : "Does not meet"}</td>
                                        </tr>

                                        {/* Escalations */}
                                        <tr>
                                            <td className="px-6 py-4">Escalations (RCAs)</td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">{"< 1"}</td>
                                            <td className="px-6 py-4">10</td>
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.rca.value}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.rca.score}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.rca.value < 1 ? "Outstanding" : "Does not meet"}</td>
                                        </tr>

                                        {/* PII */}
                                        <tr>
                                            <td className="px-6 py-4">Shared PII</td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground">
                                                {MOCK_SCORECARD.pii.approval > 1 ? "> 1" : (MOCK_SCORECARD.pii.approval === 1 ? "1" : "< 1")}
                                            </td>
                                            <td className="px-6 py-4">10</td>
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.pii.approval}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.pii.score}</td>
                                            <td className="px-6 py-4 text-right">-</td>
                                        </tr>

                                        {/* Attendance Bonus */}
                                        <tr className="bg-blue-100/30 dark:bg-blue-900/20">
                                            <td className="px-6 py-4">Perfect Attendance</td>
                                            <td className="px-6 py-4 text-xs text-muted-foreground"></td>
                                            <td className="px-6 py-4">5</td>
                                            <td className="px-6 py-4 font-bold">{MOCK_SCORECARD.attendance.value}</td>
                                            <td className="px-6 py-4 text-right">{MOCK_SCORECARD.attendance.score}</td>
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
                                            <td className="px-6 py-4 text-right text-primary">{MOCK_SCORECARD.total}</td>
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

            </main>
        </div>
    )
}
