"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"
import { useRouter } from "next/navigation"

export default function AdminLoginPage() {
    const router = useRouter()
    const [userId, setUserId] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const handleLogin = async () => {
        if (!userId || !password) {
            setError("Please enter both User ID and Password.")
            return
        }

        setIsLoading(true)
        setError("")

        try {
            // Fetch password from Appwrite
            // dynamic import to avoid server-side issues if any, or just use the lib
            const { databases } = await import("@/lib/appwrite")
            const { Query } = await import("appwrite")
            const DB_ID = 'scorecards_db_main'
            const COLL_ID = 'app_config'

            // Fetch stored password
            const response = await databases.listDocuments(
                DB_ID,
                COLL_ID,
                [Query.equal("key", "admin_password")]
            )

            // Default fallback if config missing (for safety, though script should have run)
            const storedPassword = response.documents.length > 0 ? response.documents[0].value : "admin123"

            // Validate
            // You might want to remove "admin" hardcode too, but user only asked for PW change.
            if (userId === "admin" && password === storedPassword) {
                router.push("/admin/dashboard")
            } else {
                setError("Invalid credentials")
                setIsLoading(false)
            }
        } catch (err) {
            console.error("Login Error", err)
            // Fallback to hardcoded just in case DB fails? No, better to fail secure.
            setError("Login failed. System error.")
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-blue-50/50 relative overflow-hidden">
            {/* Soft Background Blur */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md z-10 p-4"
            >
                <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-lg">
                    <CardContent className="pt-12 px-8 pb-10 flex flex-col items-center">

                        {/* Icon */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/30 mb-6">
                            <Lock className="w-10 h-10 text-white" />
                        </div>

                        {/* Header */}
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-teal-600 mb-2">
                            Admin Portal
                        </h1>
                        <p className="text-gray-500 font-medium mb-10 text-sm">
                            Secure Access Required
                        </p>

                        {/* Inputs */}
                        <div className="w-full space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">User ID</label>
                                <Input
                                    placeholder="Enter your ID"
                                    className="h-12 border-blue-100 bg-blue-50/30 focus:border-blue-400 focus:ring-blue-100 transition-all text-base dark:bg-slate-800 dark:text-white dark:border-slate-700"
                                    value={userId}
                                    onChange={(e) => setUserId(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="h-12 border-blue-100 bg-blue-50/30 focus:border-blue-400 focus:ring-blue-100 transition-all text-base tracking-widest dark:bg-slate-800 dark:text-white dark:border-slate-700"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        {error && <p className="text-red-500 text-sm mt-4 font-medium">{error}</p>}

                        {/* Button */}
                        <Button
                            className="w-full h-12 mt-8 text-lg font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 shadow-lg shadow-blue-500/25 border-0"
                            onClick={handleLogin}
                            disabled={isLoading}
                        >
                            {isLoading ? "Verifying..." : "Login to Dashboard"}
                        </Button>

                    </CardContent>
                </Card>

                <div className="text-center mt-6">
                    <a href="/" className="text-sm font-medium text-gray-400 hover:text-blue-500 transition-colors">← Back to Employee Scorecard</a>
                </div>

            </motion.div>
        </div>
    )
}
