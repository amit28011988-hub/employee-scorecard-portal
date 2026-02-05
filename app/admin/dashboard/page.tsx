"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileSpreadsheet, Users, LogOut, Settings } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminDashboard() {
    const router = useRouter()
    const [isUploading, setIsUploading] = useState(false)

    const handleLogout = () => {
        router.push("/admin")
    }

    const handleUpload = () => {
        setIsUploading(true)
        // Mock upload delay
        setTimeout(() => {
            setIsUploading(false)
            alert("File uploaded successfully! (Mock)")
        }, 2000)
    }

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">

            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-teal-500 flex items-center justify-center">
                        <Settings className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600">
                        Admin Panel
                    </span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Button variant="ghost" className="w-full justify-start text-blue-600 bg-blue-50 font-medium">
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                        Scorecard Data
                    </Button>
                    <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-blue-600 hover:bg-slate-50">
                        <Users className="w-4 h-4 mr-2" />
                        Employees
                    </Button>
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <Button variant="ghost" className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-2" />
                        Logout
                    </Button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                {/* Top Bar for Mobile */}
                <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
                    <span className="font-bold">Admin Panel</span>
                    <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
                </div>

                <div className="p-8 max-w-5xl mx-auto space-y-8">

                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-800">Dashboard Overview</h1>
                        <p className="text-slate-500">Manage scorecards and employee data.</p>
                    </header>

                    {/* Quick Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="border-none shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-blue-100 text-sm font-medium">Total Employees</p>
                                        <h3 className="text-3xl font-bold mt-2">42</h3>
                                    </div>
                                    <Users className="w-8 h-8 text-blue-200" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium">Last Upload</p>
                                        <h3 className="text-3xl font-bold text-slate-800 mt-2">Oct 24</h3>
                                    </div>
                                    <FileSpreadsheet className="w-8 h-8 text-teal-500" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-slate-500 text-sm font-medium">Pending Reviews</p>
                                        <h3 className="text-3xl font-bold text-slate-800 mt-2">0</h3>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                        <span className="text-orange-600 font-bold">!</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Upload Section */}
                    <section>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-800">Upload Monthly Scorecards</h2>
                        </div>

                        <Card className="border-dashed border-2 border-blue-200 bg-blue-50/50">
                            <CardContent className="p-12 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                                    <Upload className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Upload Excel / CSV File</h3>
                                <p className="text-slate-500 max-w-sm mb-6">
                                    Drag and drop your monthly scorecard file here, or click to browse. Supported formats: .xlsx, .csv
                                </p>

                                <div className="flex gap-4">
                                    <input type="file" className="hidden" id="file-upload" accept=".xlsx,.csv" />
                                    <Button
                                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                    >
                                        Select File
                                    </Button>

                                    {/* Hidden Upload Trigger for Mock */}
                                    <Button variant="outline" onClick={handleUpload} disabled={isUploading}>
                                        {isUploading ? "Uploading..." : "Simulate Upload"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </section>

                </div>
            </main>
        </div>
    )
}
