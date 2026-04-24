"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, BarChart3, LogOut, TrendingUp, TrendingDown, Award, User, Users, Trophy } from "lucide-react"
import { databases, DB_ID, SCORES_COLLECTION_ID } from "@/lib/appwrite"
import { Query } from "appwrite"
import { ModeToggle } from "@/components/mode-toggle"
import { cn } from "@/lib/utils"

const parseMonth = (m: string): number => {
    const d = new Date(`1 ${m}`)
    return isNaN(d.getTime()) ? 0 : d.getTime()
}

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

const clubBadge = (club?: string) => {
    const c = (club || "").toLowerCase()
    if (c === "platinum") return "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900"
    if (c === "diamond") return "bg-sky-500 text-white"
    if (c === "gold") return "bg-amber-400 text-amber-900"
    if (c === "silver") return "bg-slate-300 text-slate-800"
    if (c === "bronze") return "bg-orange-400 text-white"
    return "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
}

export default function AnalysisPage() {
    const router = useRouter()
    const [allData, setAllData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTeam, setSelectedTeam] = useState<string>("All")
    const [selectedEmployee, setSelectedEmployee] = useState<string>("")

    useEffect(() => {
        fetchAll()
    }, [])

    const fetchAll = async () => {
        try {
            const PAGE_SIZE = 100
            let all: any[] = []
            let offset = 0
            let hasMore = true
            while (hasMore) {
                const res = await databases.listDocuments(DB_ID, SCORES_COLLECTION_ID, [
                    Query.limit(PAGE_SIZE),
                    Query.offset(offset),
                ])
                all = [...all, ...res.documents]
                offset += PAGE_SIZE
                hasMore = res.documents.length === PAGE_SIZE
            }
            setAllData(all)
        } catch (err) {
            console.error("Analysis fetch error", err)
        } finally {
            setLoading(false)
        }
    }

    const availableTeams = useMemo(() => {
        const set = new Set<string>()
        allData.forEach((d: any) => d.team && set.add(d.team))
        return ["All", ...Array.from(set).sort()]
    }, [allData])

    const teamFiltered = useMemo(() => {
        return selectedTeam === "All" ? allData : allData.filter((d: any) => d.team === selectedTeam)
    }, [allData, selectedTeam])

    const employeeNames = useMemo(() => {
        const set = new Set<string>()
        teamFiltered.forEach((d: any) => d.employee_name && set.add(d.employee_name))
        return Array.from(set).sort()
    }, [teamFiltered])

    useEffect(() => {
        if (employeeNames.length === 0) return
        if (!selectedEmployee || !employeeNames.includes(selectedEmployee)) {
            setSelectedEmployee(employeeNames[0])
        }
    }, [employeeNames, selectedEmployee])

    const individualTrend = useMemo(() => {
        if (!selectedEmployee) return []
        return teamFiltered
            .filter((d: any) => d.employee_name === selectedEmployee)
            .map((d: any) => ({
                month: d.month as string,
                score: Math.round(Number(d.total_score) || 0),
                club: d.performance_club as string | undefined,
            }))
            .sort((a, b) => parseMonth(a.month) - parseMonth(b.month))
    }, [teamFiltered, selectedEmployee])

    const averageScores = useMemo(() => {
        const map = new Map<string, { scores: number[]; team: string }>()
        teamFiltered.forEach((d: any) => {
            if (!d.employee_name) return
            const cur: { scores: number[]; team: string } =
                map.get(d.employee_name) || { scores: [], team: d.team || "" }
            cur.scores.push(Number(d.total_score) || 0)
            if (d.team) cur.team = d.team
            map.set(d.employee_name, cur)
        })
        return Array.from(map.entries())
            .map(([name, v]) => ({
                name,
                team: v.team,
                avg: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
                months: v.scores.length,
            }))
            .sort((a, b) => b.avg - a.avg)
    }, [teamFiltered])

    const platinumChampions = useMemo(() => {
        const map = new Map<string, { platinum: number; diamond: number; gold: number; team: string }>()
        teamFiltered.forEach((d: any) => {
            if (!d.employee_name) return
            const cur = map.get(d.employee_name) || { platinum: 0, diamond: 0, gold: 0, team: d.team || "" }
            const c = (d.performance_club || "").toLowerCase()
            if (c === "platinum") cur.platinum++
            else if (c === "diamond") cur.diamond++
            else if (c === "gold") cur.gold++
            if (d.team) cur.team = d.team
            map.set(d.employee_name, cur)
        })
        return Array.from(map.entries())
            .map(([name, v]) => ({ name, ...v }))
            .filter((e) => e.platinum > 0)
            .sort((a, b) => b.platinum - a.platinum || b.diamond - a.diamond || b.gold - a.gold)
    }, [teamFiltered])

    const movers = useMemo(() => {
        const monthSet = new Set<string>()
        teamFiltered.forEach((d: any) => d.month && monthSet.add(d.month))
        const months = Array.from(monthSet).sort((a, b) => parseMonth(a) - parseMonth(b))
        if (months.length < 2) return { climbers: [], droppers: [], prev: "", curr: "" }
        const prev = months[months.length - 2]
        const curr = months[months.length - 1]
        const rankMap = (month: string) => {
            const data = teamFiltered
                .filter((d: any) => d.month === month)
                .sort(compareScorecards)
            const m = new Map<string, number>()
            data.forEach((d: any, i: number) => m.set(d.employee_name, i + 1))
            return m
        }
        const prevRanks = rankMap(prev)
        const currRanks = rankMap(curr)
        const results: { name: string; prevRank: number; currRank: number; change: number }[] = []
        currRanks.forEach((cr, name) => {
            const pr = prevRanks.get(name)
            if (pr !== undefined) results.push({ name, prevRank: pr, currRank: cr, change: pr - cr })
        })
        const climbers = results.filter((r) => r.change > 0).sort((a, b) => b.change - a.change).slice(0, 3)
        const droppers = results.filter((r) => r.change < 0).sort((a, b) => a.change - b.change).slice(0, 3)
        return { climbers, droppers, prev, curr }
    }, [teamFiltered])

    const maxTrendScore = Math.max(100, ...individualTrend.map((t) => t.score))
    const maxPlatinum = Math.max(1, ...platinumChampions.map((c) => c.platinum))

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex font-sans text-slate-900 dark:text-slate-100">
            <aside className="w-64 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col items-start gap-4">
                    <span className="font-extrabold text-2xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">
                        Admin Panel
                    </span>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    <Button
                        variant="ghost"
                        className="w-full justify-start font-medium mb-2"
                        onClick={() => router.push("/admin/dashboard")}
                    >
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Scorecard Data
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-blue-600 bg-blue-50 dark:bg-blue-900/20 font-medium mb-2"
                    >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analysis
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
                        onClick={() => router.push("/")}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </nav>
            </aside>

            <div className="flex-1 p-8 max-w-6xl mx-auto space-y-8 overflow-y-auto">
                <header className="flex justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-primary">Analysis</h1>
                        <p className="text-muted-foreground">Performance trends, averages, and champions.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <ModeToggle />
                    </div>
                </header>

                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium whitespace-nowrap">Filter Team:</span>
                    <select
                        className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950"
                        value={selectedTeam}
                        onChange={(e) => setSelectedTeam(e.target.value)}
                    >
                        {availableTeams.map((t) => (
                            <option key={t} value={t}>
                                {t === "All" ? "All Teams" : t}
                            </option>
                        ))}
                    </select>
                </div>

                {loading && <div className="text-center py-12 text-muted-foreground">Loading data…</div>}

                {!loading && allData.length === 0 && (
                    <div className="text-center py-24 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
                        No data uploaded yet. Go to <span className="font-semibold">Scorecard Data</span> to upload an Excel file.
                    </div>
                )}

                {!loading && allData.length > 0 && (
                    <>
                        {/* 1. Individual Performance Trend */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gradient-primary font-bold">
                                    <User className="w-5 h-5 text-blue-600" />
                                    Individual Performance Trend
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-medium">Employee:</span>
                                    <select
                                        className="h-10 rounded-md border border-slate-300 bg-white px-3 py-1 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 min-w-[220px]"
                                        value={selectedEmployee}
                                        onChange={(e) => setSelectedEmployee(e.target.value)}
                                    >
                                        {employeeNames.length === 0 && <option value="">No employees</option>}
                                        {employeeNames.map((n) => (
                                            <option key={n} value={n}>
                                                {n}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {individualTrend.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No data for this employee.</p>
                                ) : (
                                    <div>
                                        <div className="flex items-end gap-4 sm:gap-8 h-64 border-l border-b border-slate-200 dark:border-slate-800 pl-4 pb-2 pt-2">
                                            {individualTrend.map((t) => {
                                                const heightPct = Math.max(4, (t.score / maxTrendScore) * 100)
                                                return (
                                                    <div
                                                        key={t.month}
                                                        className="flex flex-col items-center gap-2 flex-1 min-w-0 h-full justify-end"
                                                    >
                                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                                                            {t.score}
                                                        </div>
                                                        <div
                                                            className="w-full max-w-[72px] bg-gradient-to-t from-blue-600 to-teal-400 rounded-t-md shadow-md transition-all"
                                                            style={{ height: `${heightPct}%` }}
                                                            title={`${t.month}: ${t.score}${t.club ? ` — ${t.club}` : ""}`}
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="flex items-start gap-4 sm:gap-8 pl-4 pt-3">
                                            {individualTrend.map((t) => (
                                                <div
                                                    key={`${t.month}-label`}
                                                    className="flex-1 min-w-0 flex flex-col items-center gap-1"
                                                >
                                                    <div className="text-[11px] sm:text-xs font-medium text-slate-600 dark:text-slate-400 text-center leading-tight">
                                                        {t.month}
                                                    </div>
                                                    {t.club && t.club !== "-" && (
                                                        <span
                                                            className={cn(
                                                                "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                                                                clubBadge(t.club),
                                                            )}
                                                        >
                                                            {t.club}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 2. Average Scores Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gradient-primary font-bold">
                                    <Users className="w-5 h-5 text-teal-600" />
                                    Average Score Rankings
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Each employee&apos;s average across all uploaded months.
                                </p>
                            </CardHeader>
                            <CardContent className="p-0">
                                {averageScores.length === 0 ? (
                                    <p className="text-sm text-muted-foreground p-6">No data to show.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-xs text-muted-foreground bg-slate-50/50 dark:bg-slate-900/50 border-b">
                                                <tr>
                                                    <th className="px-4 py-3 w-16">Rank</th>
                                                    <th className="px-4 py-3">Employee</th>
                                                    <th className="px-4 py-3">Team</th>
                                                    <th className="px-4 py-3 text-right">Months</th>
                                                    <th className="px-4 py-3 text-right text-black dark:text-white font-bold">
                                                        Avg Score
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {averageScores.map((e, idx) => (
                                                    <tr
                                                        key={e.name}
                                                        className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                                                    >
                                                        <td className="px-4 py-3 tabular-nums">
                                                            <span
                                                                className={cn(
                                                                    "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                                                                    idx === 0
                                                                        ? "bg-amber-400 text-amber-900"
                                                                        : idx === 1
                                                                            ? "bg-slate-300 text-slate-800"
                                                                            : idx === 2
                                                                                ? "bg-orange-400 text-white"
                                                                                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                                                                )}
                                                            >
                                                                {idx + 1}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 font-medium">{e.name}</td>
                                                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                                            {e.team || "—"}
                                                        </td>
                                                        <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                                                            {e.months}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-blue-600 tabular-nums">
                                                            {e.avg.toFixed(1)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 3. Platinum Champions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-gradient-primary font-bold">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    Platinum Champions
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Employees ranked by number of Platinum appearances (Diamond & Gold shown alongside).
                                </p>
                            </CardHeader>
                            <CardContent>
                                {platinumChampions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No Platinum club entries yet.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {platinumChampions.map((c) => {
                                            const widthPct = (c.platinum / maxPlatinum) * 100
                                            return (
                                                <div key={c.name} className="space-y-1">
                                                    <div className="flex items-center justify-between gap-3 text-sm">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <span className="font-medium truncate">{c.name}</span>
                                                            {c.team && (
                                                                <span className="text-xs text-muted-foreground truncate">
                                                                    · {c.team}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            {c.diamond > 0 && (
                                                                <span
                                                                    className={cn(
                                                                        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                                                                        clubBadge("diamond"),
                                                                    )}
                                                                >
                                                                    💎 {c.diamond}
                                                                </span>
                                                            )}
                                                            {c.gold > 0 && (
                                                                <span
                                                                    className={cn(
                                                                        "text-[10px] px-2 py-0.5 rounded-full font-semibold",
                                                                        clubBadge("gold"),
                                                                    )}
                                                                >
                                                                    🥇 {c.gold}
                                                                </span>
                                                            )}
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums text-sm w-8 text-right">
                                                                {c.platinum}×
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="h-7 bg-slate-100 dark:bg-slate-800 rounded-md overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-slate-700 to-slate-500 dark:from-slate-300 dark:to-slate-500 flex items-center px-2 text-[11px] font-bold text-white dark:text-slate-900 transition-all"
                                                            style={{ width: `${Math.max(6, widthPct)}%` }}
                                                        >
                                                            <Award className="w-3 h-3 mr-1" /> Platinum
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* 4. Biggest Movers */}
                        {(movers.climbers.length > 0 || movers.droppers.length > 0) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2 text-gradient-primary font-bold">
                                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                                        Biggest Movers
                                    </CardTitle>
                                    <p className="text-sm text-muted-foreground">
                                        {movers.prev} → {movers.curr} (by rank change).
                                    </p>
                                </CardHeader>
                                <CardContent className="grid sm:grid-cols-2 gap-6">
                                    <div>
                                        <h4 className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                                            <TrendingUp className="w-4 h-4" /> Top Climbers
                                        </h4>
                                        {movers.climbers.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No climbers this period.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {movers.climbers.map((m) => (
                                                    <li
                                                        key={m.name}
                                                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/40"
                                                    >
                                                        <span className="font-medium truncate">{m.name}</span>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 flex-shrink-0 tabular-nums">
                                                            #{m.prevRank} → <span className="font-bold text-emerald-600 dark:text-emerald-400">#{m.currRank}</span>{" "}
                                                            <span className="text-emerald-600 dark:text-emerald-400">(+{m.change})</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div>
                                        <h4 className="flex items-center gap-1.5 text-sm font-bold text-rose-600 dark:text-rose-400 mb-2">
                                            <TrendingDown className="w-4 h-4" /> Top Droppers
                                        </h4>
                                        {movers.droppers.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No droppers this period.</p>
                                        ) : (
                                            <ul className="space-y-2">
                                                {movers.droppers.map((m) => (
                                                    <li
                                                        key={m.name}
                                                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40"
                                                    >
                                                        <span className="font-medium truncate">{m.name}</span>
                                                        <div className="text-xs text-slate-600 dark:text-slate-400 flex-shrink-0 tabular-nums">
                                                            #{m.prevRank} → <span className="font-bold text-rose-600 dark:text-rose-400">#{m.currRank}</span>{" "}
                                                            <span className="text-rose-600 dark:text-rose-400">({m.change})</span>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
