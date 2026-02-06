"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, TrendingUp, Award, Clock, AlertTriangle, Shield, Calendar, LogOut, User } from "lucide-react"
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
                            Welcome, <span className="text-blue-600">{user}</span>
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400">Here is your performance overview.</p>
                    </div>
                    <Button variant="outline" onClick={handleLogout} size="sm">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </div>

                {/* Filters */}
                {scorecards.length > 0 ? (
                    <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <select
                            className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 min-w-[200px]"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {scorecards.map(s => <option key={s.$id} value={s.month}>{s.month}</option>)}
                        </select>
                    </div>
                ) : (
                    !loading && <Alert><AlertTitle>No Data Found</AlertTitle><AlertDescription>No scorecards found for your account yet.</AlertDescription></Alert>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                )}

                {/* Scorecard Grid */}
                {!loading && currentCard && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Total Score - Hero Card */}
                        <Card className="col-span-1 md:col-span-2 lg:col-span-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg">
                            <CardContent className="flex items-center justify-between p-8">
                                <div>
                                    <p className="text-blue-100 font-medium mb-1">Overall Performance</p>
                                    <h2 className="text-5xl font-bold">{Math.round(currentCard.total_score)}<span className="text-2xl opacity-70">/100</span></h2>
                                </div>
                                <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm">
                                    <Award className="w-12 h-12 text-white" />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Productivity */}
                        <MetricCard
                            title="Productivity"
                            score={Math.round(currentCard.productivity_score)}
                            value={currentCard.productivity_achieved}
                            icon={<TrendingUp className="w-5 h-5 text-green-600" />}
                        />

                        {/* Quality */}
                        <MetricCard
                            title="Quality"
                            score={Math.round(currentCard.quality_score)}
                            value={currentCard.quality_achieved}
                            icon={<Shield className="w-5 h-5 text-purple-600" />}
                        />

                        {/* Attendance */}
                        <MetricCard
                            title="Attendance"
                            score={Math.round(currentCard.attendance_score)}
                            value={`${currentCard.attendance_value}%`}
                            icon={<Clock className="w-5 h-5 text-orange-600" />}
                        />

                        {/* Unplanned Leaves (Negative Logic often) */}
                        <MetricCard
                            title="Unplanned Leaves"
                            score={Math.round(currentCard.unplanned_leaves_score)}
                            value={currentCard.unplanned_leaves_value}
                            subtext="Count"
                            icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
                        />

                        {/* RCA */}
                        <MetricCard
                            title="RCA / Escalations"
                            score={Math.round(currentCard.rca_score)}
                            value={currentCard.rca_value}
                            subtext="Count"
                            icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
                        />

                        {/* PII */}
                        <MetricCard
                            title="PII / Compliance"
                            score={Math.round(currentCard.pii_score)}
                            value={currentCard.pii_approval}
                            subtext="Incidents"
                            icon={<Shield className="w-5 h-5 text-slate-600" />}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}

function MetricCard({ title, score, value, icon, subtext }: any) {
    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="flex items-baseline justify-between">
                    <div>
                        <div className="text-2xl font-bold">{score}</div>
                        <p className="text-xs text-muted-foreground">Score</p>
                    </div>
                    {value !== undefined && (
                        <div className="text-right">
                            <div className="text-lg font-semibold text-slate-700 dark:text-slate-200">{value}</div>
                            <p className="text-xs text-muted-foreground">{subtext || "Achieved"}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <DashboardContent />
        </Suspense>
    )
}
