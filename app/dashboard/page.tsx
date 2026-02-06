"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, LogOut, Sun } from "lucide-react"
import { databases } from "@/lib/appwrite"
import { Query } from "appwrite"

const DB_ID = 'scorecards_db_main'
const COLL_ID = 'employee_scores_main'

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [user, setUser] = useState<string | null>(null)
    const [scorecards, setScorecards] = useState<any[]>([])
    const [selectedMonth, setSelectedMonth] = useState<string>("")
    const [loading, setLoading] = useState(true)

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
            if (docs.length > 0) {
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

    const handleLogout = () => {
        localStorage.removeItem("user_name")
        router.push("/")
    }

    // Get current scorecard
    const currentCard = scorecards.find(s => s.month === selectedMonth)

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900 p-6">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-blue-600">Scorecard Portal</h1>
                        <p className="text-slate-500">Welcome, {user}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Sun className="w-5 h-5 text-yellow-500" />
                        <Button variant="outline" onClick={handleLogout} className="bg-white">Logout</Button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="flex justify-end items-center gap-2 mb-4">
                    <span className="text-sm font-medium text-slate-600">Select Month:</span>
                    <select
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none min-w-[150px]"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        {scorecards.length > 0 ? (
                            scorecards.map(s => <option key={s.$id} value={s.month}>{s.month}</option>
                            )) : (
                            <option>No Data</option>
                        )}
                    </select>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
                ) : !currentCard ? (
                    <div className="text-center py-20 text-slate-500">No scorecard data available for this month.</div>
                ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

                        {/* Report Header */}
                        <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100">
                            <div>
                                <h2 className="text-2xl font-bold text-cyan-500 uppercase tracking-wide">Performance Scorecard</h2>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Month Till Date Report</p>
                            </div>

                            {/* Employee Info Box */}
                            <div className="mt-4 md:mt-0 bg-slate-50 rounded-lg p-4 border border-slate-100 min-w-[250px] text-sm">
                                <div className="grid grid-cols-[80px_1fr] gap-y-1">
                                    <span className="text-slate-500">Employee:</span>
                                    <span className="font-bold text-slate-800">{user}</span>

                                    <span className="text-slate-500">Team:</span>
                                    <span className="font-bold text-slate-800">{currentCard.team || "Operations"}</span>

                                    <span className="text-slate-500">Month:</span>
                                    <span className="font-bold text-blue-600">{currentCard.month}</span>
                                </div>
                            </div>
                        </div>

                        {/* Main Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-white uppercase bg-teal-600">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold">Metrics</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100">Break Up</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100">Marks Allocation</th>
                                        <th className="px-6 py-4 font-bold">Achieved</th>
                                        <th className="px-6 py-4 font-bold">Marks Obtained</th>
                                        <th className="px-6 py-4 font-semibold text-teal-100 text-right">Performance Club</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {/* Productivity */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Productivity</td>
                                        <td className="px-6 py-4 text-slate-500">&gt;105%</td>
                                        <td className="px-6 py-4 text-slate-500">30</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.productivity_achieved}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.productivity_score)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600">-</td>
                                    </tr>

                                    {/* Quality */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Quality</td>
                                        <td className="px-6 py-4 text-slate-500">99.00% - 99.50%</td>
                                        <td className="px-6 py-4 text-slate-500">40</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.quality_achieved}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.quality_score)}</td>
                                        <td className="px-6 py-4 text-right text-emerald-600">-</td>
                                    </tr>

                                    {/* Unscheduled Leave */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Unscheduled Leave</td>
                                        <td className="px-6 py-4 text-slate-500">0</td>
                                        <td className="px-6 py-4 text-slate-500">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.unplanned_leaves_value}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.unplanned_leaves_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400">Outstanding</td>
                                    </tr>

                                    {/* Escalations (RCAs) */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Escalations (RCAs)</td>
                                        <td className="px-6 py-4 text-slate-500">&lt; 1</td>
                                        <td className="px-6 py-4 text-slate-500">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.rca_value}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.rca_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400">Outstanding</td>
                                    </tr>

                                    {/* Shared PII */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Shared PII</td>
                                        <td className="px-6 py-4 text-slate-500">&lt; 1</td>
                                        <td className="px-6 py-4 text-slate-500">10</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.pii_approval}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.pii_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400">-</td>
                                    </tr>

                                    {/* Attendance */}
                                    <tr className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">Attendance</td>
                                        <td className="px-6 py-4 text-slate-500">100%</td>
                                        <td className="px-6 py-4 text-slate-500">5</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{currentCard.attendance_value}%</td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-lg">{Math.round(currentCard.attendance_score)}</td>
                                        <td className="px-6 py-4 text-right text-slate-400">-</td>
                                    </tr>

                                </tbody>

                                {/* Total Footers */}
                                <tfoot>
                                    <tr className="bg-blue-50 border-t border-blue-100">
                                        <td colSpan={4} className="px-6 py-5 font-bold text-slate-800 uppercase tracking-wider">Total Score</td>
                                        <td colSpan={2} className="px-6 py-5">
                                            <span className="text-3xl font-bold text-blue-600">{Math.round(currentCard.total_score)}</span>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Footer Notes */}
                        <div className="bg-orange-50 px-6 py-4 text-center border-t border-orange-100">
                            <p className="text-xs font-semibold text-orange-700">
                                Points to Note: &gt;2 RCAs = 0 Score. 100% Attendance is top-up.
                            </p>
                        </div>
                    </div>
                )}

                {/* Download Button */}
                {!loading && currentCard && (
                    <div className="flex justify-end mt-6">
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6">
                            Download PDF Scorecard
                        </Button>
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
