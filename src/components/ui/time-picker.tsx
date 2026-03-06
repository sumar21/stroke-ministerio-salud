"use client"

import * as React from "react"
import { Clock } from "lucide-react"

import { cn } from "@/lib/utils"

export interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const [hours, setHours] = React.useState(value ? value.split(":")[0] : "")
  const [minutes, setMinutes] = React.useState(value ? value.split(":")[1] : "")

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newHours = e.target.value
    if (newHours.length > 2) newHours = newHours.slice(0, 2)
    if (parseInt(newHours) > 23) newHours = "23"
    setHours(newHours)
    if (newHours.length === 2 && minutes.length === 2) {
      onChange(`${newHours}:${minutes}`)
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newMinutes = e.target.value
    if (newMinutes.length > 2) newMinutes = newMinutes.slice(0, 2)
    if (parseInt(newMinutes) > 59) newMinutes = "59"
    setMinutes(newMinutes)
    if (hours.length === 2 && newMinutes.length === 2) {
      onChange(`${hours}:${newMinutes}`)
    }
  }

  const handleBlur = () => {
    let h = hours
    let m = minutes
    if (h && h.length === 1) h = `0${h}`
    if (m && m.length === 1) m = `0${m}`
    setHours(h)
    setMinutes(m)
    if (h && m) {
      onChange(`${h}:${m}`)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus-within:border-red-400 focus-within:ring-1 focus-within:ring-red-400">
        <Clock className="h-4 w-4 text-slate-500" />
        <input
          type="text"
          inputMode="numeric"
          placeholder="00"
          value={hours}
          onChange={handleHoursChange}
          onBlur={handleBlur}
          className="w-6 bg-transparent text-center text-sm outline-none placeholder:text-slate-400"
        />
        <span className="text-slate-500">:</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="00"
          value={minutes}
          onChange={handleMinutesChange}
          onBlur={handleBlur}
          className="w-6 bg-transparent text-center text-sm outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  )
}
