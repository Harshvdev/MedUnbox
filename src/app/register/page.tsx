"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/login?tab=register")
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center text-muted-foreground text-sm">
        Redirecting to registration...
      </div>
    </div>
  )
}
