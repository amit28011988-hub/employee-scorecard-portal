"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { UserCog } from "lucide-react"
import { DB_ID, ACCESS_COLLECTION_ID, databases } from '@/lib/appwrite';
import { Query } from "appwrite"
import { ModeToggle } from "@/components/mode-toggle"

// Mock Data for Demo (Will be replaced by Supabase fetch)
const TEAMS = [
  "Preprocessing",
  "Intake",
  "Doc Update",
  "QA",
  "BASF-SLB",
  "SPL Project"
]

const DEMO_EMPLOYEES = [
  // Preprocessing
  { name: "Vikash Raghav", team: "Preprocessing" },
  { name: "Akash Parashar", team: "Preprocessing" },
  { name: "Shweta Saini", team: "Preprocessing" },
  { name: "Nikhil Sachdeva", team: "Preprocessing" },
  { name: "Nimesh Sharma", team: "Preprocessing" },
  { name: "Manish Das", team: "Preprocessing" },
  { name: "Aman Mishra", team: "Preprocessing" },
  { name: "Vinod Kumar", team: "Preprocessing" },
  { name: "Arif Ahmed", team: "Preprocessing" },
  { name: "Fazal Pathan", team: "Preprocessing" },
  { name: "Arpit Singhal", team: "Preprocessing" },
  { name: "Deepanshu Rawat", team: "Preprocessing" },
  { name: "Mohd Sameer", team: "Preprocessing" },
  { name: "Himanshu Chaudhary", team: "Preprocessing" },
  { name: "Deepak Bhardwaj", team: "Preprocessing" },
  { name: "Gaurav Sinha", team: "Preprocessing" },
  { name: "Akhil Gupta", team: "Preprocessing" },

  // Intake
  { name: "Priyanka Sharma", team: "Intake" },
  { name: "Renu Chaudhary", team: "Intake" },
  { name: "Shivang Gupta", team: "Intake" },
  { name: "Nisha Kumari", team: "Intake" },
  { name: "Sudhanshu Bhushan", team: "Intake" },
  { name: "Ankit Kumar", team: "Intake" },
  { name: "Ankit Panwar", team: "Intake" },
  { name: "Karan Suri", team: "Intake" },
  { name: "Sumit Nandi", team: "Intake" },
  { name: "Kamal Singh", team: "Intake" },
  { name: "Tushar Saini", team: "Intake" },
  { name: "Neeraj Rawat", team: "Intake" },
  { name: "Rana Kumar", team: "Intake" },
  { name: "Shivansh Suhane", team: "Intake" },
  { name: "Ankit Durhan", team: "Intake" },
  { name: "Navjot", team: "Intake" },
  { name: "Syed Murtuza Ahmed", team: "Intake" },
  { name: "Smrati Singh", team: "Intake" },
  { name: "Harish Singh", team: "Intake" },
  { name: "Ambar Sharma", team: "Intake" },
  { name: "Abhishek Sharma", team: "Intake" },
  { name: "Shubham Kumar", team: "Intake" },
  { name: "Salman Faruqui", team: "Intake" },

  // Doc Update
  { name: "Sneha Singh", team: "Doc Update" },
  { name: "Shankar Bisht", team: "Doc Update" },
  { name: "Mohit Chhikara", team: "Doc Update" },
  { name: "Shailly Narang", team: "Doc Update" },
  { name: "Himalaya Singh", team: "Doc Update" },
  { name: "Arun Sharma", team: "Doc Update" },
  { name: "Dinesh Kaintura", team: "Doc Update" },
  { name: "Sachin Sharma", team: "Doc Update" },
  { name: "Rupesh Kumar Singh", team: "Doc Update" },
  { name: "Vishnu Dubey", team: "Doc Update" },

  // QA
  { name: "Anand Dasauni", team: "QA" },
  { name: "Meenakshi Mattoo", team: "QA" },
  { name: "Megha Rathore", team: "QA" },
  { name: "Mohit Joshi", team: "QA" },
  { name: "Neha Sharma", team: "QA" },
  { name: "Sachin Sharma", team: "QA" },
  { name: "Sobhit Pandey", team: "QA" },

  // BASF-SLB
  { name: "Rajesh Kumar", team: "BASF-SLB" },
  { name: "Ravi Panchal", team: "BASF-SLB" },
  { name: "Rishabh Malhotra", team: "BASF-SLB" },
  { name: "Vikas Yadav", team: "BASF-SLB" },
  { name: "Deepak Garg", team: "BASF-SLB" },

  // SPL Project
  { name: "Himanshu Rawat", team: "SPL Project" },
  { name: "Nikhil Bisht", team: "SPL Project" },
  { name: "Sahil Kashyap", team: "SPL Project" },
  { name: "Rahul Singh", team: "SPL Project" }
]

export default function LoginPage() {
  const router = useRouter()
  const [selectedTeam, setSelectedTeam] = useState("")
  const [selectedName, setSelectedName] = useState("")
  const [pin, setPin] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Filter employees by team
  const filteredEmployees = selectedTeam
    ? DEMO_EMPLOYEES.filter(emp => emp.team === selectedTeam)
    : []

  const handleLogin = async () => {
    if (!selectedName || pin.length < 4) {
      setError("Please select a name and enter a 4-digit PIN.")
      return
    }

    setIsLoading(true)
    setError("")

    // Supabase Auth Check
    try {
      // 1. Check if user has a custom PIN set
      const response = await databases.listDocuments(
        DB_ID,
        ACCESS_COLLECTION_ID,
        [Query.equal("employee_name", selectedName)]
      )

      let isValid = false;

      if (response.documents.length > 0) {
        // User has a custom PIN
        const userDoc = response.documents[0]
        if (userDoc.pin === pin) {
          isValid = true
        }
      } else {
        // User has NO custom PIN -> Default is "0000"
        if (pin === "0000") {
          isValid = true
        }
      }

      if (isValid) {
        // Save session (mock)
        localStorage.setItem("user_name", selectedName)
        router.push("/dashboard")
      } else {
        setError("Invalid PIN.")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Login Error", error)
      setError("Login failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50/30 p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-400/20 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-teal-500 mb-2">
            Employee Portal
          </h1>
          <p className="text-slate-500 font-medium">Secure Dashboard Access</p>
        </div>

        <Card className="glass-panel border-white/60 shadow-2xl backdrop-blur-xl bg-white/80">
          <CardHeader>
            <CardTitle className="text-xl text-center text-slate-800">Select Your Name</CardTitle>
            <CardDescription className="text-center text-slate-500">
              Please identify yourself to proceed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Team Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Select Team</label>
              <select
                className="w-full p-3 rounded-xl border border-blue-100 bg-blue-50/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-slate-700"
                value={selectedTeam}
                onChange={(e) => {
                  setSelectedTeam(e.target.value)
                  setSelectedName("") // Reset name when team changes
                }}
              >
                <option value="">-- All Teams --</option>
                {TEAMS.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* Name Selector */}
            <motion.div
              className="space-y-2"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: selectedTeam ? 1 : 0.5 }}
            >
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Employee Name</label>
              <select
                className="w-full p-3 rounded-xl border border-blue-100 bg-blue-50/50 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all text-slate-700"
                value={selectedName}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedName(e.target.value)}
                disabled={!selectedTeam}
              >
                <option value="" disabled>-- Choose Your Name --</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp.name} value={emp.name}>{emp.name}</option>
                ))}
              </select>
            </motion.div>

            {/* PIN Input */}
            {selectedName && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Enter PIN</label>
                <Input
                  type="password"
                  maxLength={4}
                  placeholder="• • • •"
                  className="text-center text-2xl tracking-[0.5em] h-14 font-bold border-blue-100 bg-white text-slate-900 focus:ring-blue-400 focus:border-blue-400"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <div className="flex justify-end">
                  <button className="text-xs text-blue-500 hover:text-blue-700 font-semibold transition-colors">Forgot PIN?</button>
                </div>
              </motion.div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center font-bold bg-red-50 p-2 rounded-lg animate-pulse">
                {error}
              </p>
            )}

          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full text-lg h-12 font-bold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 shadow-lg shadow-blue-500/20 transition-all transform hover:scale-[1.02]"
              onClick={handleLogin}
              disabled={isLoading || !selectedName || pin.length < 4}
            >
              {isLoading ? "Verifying..." : "Access Dashboard"}
            </Button>

            <div className="w-full flex items-center justify-center pt-2 border-t border-slate-100">
              <Link href="/admin" className="flex items-center gap-2 text-sm text-slate-400 hover:text-blue-600 transition-colors py-2 px-4 rounded-full hover:bg-blue-50">
                <UserCog className="w-4 h-4" />
                <span>Admin Login</span>
              </Link>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Protected Area. Authorized Personnel Only. <br />
            <span className="opacity-70">v1.0.0</span>
          </p>
        </div>

      </motion.div>
    </div>
  )
}
