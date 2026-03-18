"use client"

import * as React from "react"
import { Clock, CalendarIcon } from "lucide-react"
import { format, parse, isValid } from "date-fns"
import { es } from "date-fns/locale"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Calendar } from "./calendar"
import { cn } from "@/lib/utils"

export interface TimePickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

// value format in/out: "DD/MM/YYYY HH:mm" or legacy "HH:mm"

function parseValue(value: string): { date: Date | undefined; hours: string; minutes: string } {
  if (value.includes(' ')) {
    const [datePart, timePart] = value.split(' ')
    const parsed = parse(datePart, 'dd/MM/yyyy', new Date())
    const [h, m] = timePart.split(':')
    return { date: isValid(parsed) ? parsed : undefined, hours: h ?? '', minutes: m ?? '' }
  }
  if (value.includes(':')) {
    const [h, m] = value.split(':')
    return { date: undefined, hours: h ?? '', minutes: m ?? '' }
  }
  return { date: undefined, hours: '', minutes: '' }
}

function buildValue(date: Date | undefined, hours: string, minutes: string): string {
  const datePart = date ? format(date, 'dd/MM/yyyy') : ''
  const h = hours.padStart(2, '0')
  const m = minutes.padStart(2, '0')
  if (datePart && h && m) return `${datePart} ${h}:${m}`
  if (datePart) return datePart
  if (h && m) return `${h}:${m}`
  return ''
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
  const parsed = parseValue(value)
  const [date, setDate] = React.useState<Date | undefined>(parsed.date ?? new Date())
  const [hours, setHours] = React.useState(parsed.hours)
  const [minutes, setMinutes] = React.useState(parsed.minutes)
  const [open, setOpen] = React.useState(false)

  const emit = (d: Date | undefined, h: string, m: string) => {
    onChange(buildValue(d, h, m))
  }

  const handleSelectDate = (d: Date | undefined) => {
    setDate(d)
    setOpen(false)
    emit(d, hours, minutes)
  }

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let h = e.target.value
    if (h.length > 2) h = h.slice(0, 2)
    if (parseInt(h) > 23) h = '23'
    setHours(h)
    if (h.length === 2 && minutes.length === 2) emit(date, h, minutes)
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let m = e.target.value
    if (m.length > 2) m = m.slice(0, 2)
    if (parseInt(m) > 59) m = '59'
    setMinutes(m)
    if (hours.length === 2 && m.length === 2) emit(date, hours, m)
  }

  const handleBlur = () => {
    const h = hours.length === 1 ? `0${hours}` : hours
    const m = minutes.length === 1 ? `0${minutes}` : minutes
    setHours(h)
    setMinutes(m)
    if (h && m) emit(date, h, m)
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {/* Date picker — ShadCN Calendar in Popover */}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all",
              "hover:border-slate-300 focus-visible:outline-none focus-visible:border-brand-blue focus-visible:ring-1 focus-visible:ring-brand-blue",
              "data-[state=open]:border-brand-blue data-[state=open]:ring-1 data-[state=open]:ring-brand-blue",
              !date && "text-slate-400"
            )}
          >
            <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
            <span className="text-slate-700">
              {date ? format(date, "dd/MM/yyyy") : "Seleccionar fecha"}
            </span>
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            className="z-[9999] rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95"
          >
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelectDate}
              locale={es}
              initialFocus
            />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>

      {/* Time inputs */}
      <div className="flex h-10 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all focus-within:border-brand-blue focus-within:ring-1 focus-within:ring-brand-blue">
        <Clock className="h-4 w-4 text-slate-500 shrink-0" />
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
