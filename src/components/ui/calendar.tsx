import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-semibold text-slate-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "inline-flex items-center justify-center h-7 w-7 rounded-md border border-slate-200 bg-white",
          "hover:bg-slate-100 transition-colors opacity-70 hover:opacity-100"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell: "text-slate-400 rounded-md w-9 font-normal text-[0.8rem] text-center",
        row: "flex w-full mt-2",
        cell: cn(
          "h-9 w-9 text-center text-sm p-0 relative",
          "[&:has([aria-selected])]:bg-brand-blue/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md"
        ),
        day: cn(
          "h-9 w-9 p-0 font-normal rounded-md inline-flex items-center justify-center",
          "hover:bg-slate-100 transition-colors aria-selected:opacity-100"
        ),
        day_selected: "bg-brand-navy text-white hover:bg-brand-navy hover:text-white focus:bg-brand-navy focus:text-white rounded-md",
        day_today: "bg-slate-100 text-slate-900 font-semibold",
        day_outside: "text-slate-300 aria-selected:bg-brand-navy/50 aria-selected:text-white",
        day_disabled: "text-slate-300 opacity-50",
        day_range_middle: "aria-selected:bg-brand-blue/10 aria-selected:text-slate-900 rounded-none",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
