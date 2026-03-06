import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@/lib/utils"

const ComboboxContext = React.createContext<{
  items: any[];
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null)

export function Combobox({ 
  items, 
  value, 
  onValueChange, 
  children,
  className
}: { 
  items: any[], 
  value?: string, 
  onValueChange?: (value: string) => void, 
  children: React.ReactNode,
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(value || "")

  const activeValue = value !== undefined ? value : internalValue
  const setActiveValue = onValueChange || setInternalValue

  return (
    <ComboboxContext.Provider value={{ items, value: activeValue, onValueChange: setActiveValue, open, setOpen }}>
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <div className={cn("relative", className)}>
          {children}
        </div>
      </PopoverPrimitive.Root>
    </ComboboxContext.Provider>
  )
}

export const ComboboxInput = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> & { placeholder?: string }
>(({ className, placeholder, ...props }, ref) => {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxInput must be used within a Combobox")

  const selectedItem = context.items.find(item => 
    (typeof item === 'string' ? item : item.value) === context.value
  )
  
  const displayValue = selectedItem 
    ? (typeof selectedItem === 'string' ? selectedItem : selectedItem.label || selectedItem.value)
    : placeholder

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm transition-all placeholder:text-slate-400 focus:outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <span className="truncate">{displayValue}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </PopoverPrimitive.Trigger>
  )
})
ComboboxInput.displayName = "ComboboxInput"

export const ComboboxContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        className={cn(
          "z-50 w-[var(--radix-popover-trigger-width)] min-w-[8rem] overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className
        )}
        align="start"
        sideOffset={4}
        {...props}
      >
        <CommandPrimitive className="flex h-full w-full flex-col overflow-hidden rounded-md bg-transparent">
          <CommandPrimitive.Input 
            placeholder="Buscar..." 
            className="flex h-11 w-full rounded-md bg-transparent py-3 px-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50 border-b border-slate-100"
          />
          {children}
        </CommandPrimitive>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
})
ComboboxContent.displayName = "ComboboxContent"

export const ComboboxEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
))
ComboboxEmpty.displayName = "ComboboxEmpty"

export const ComboboxList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  Omit<React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>, 'children'> & { children: (item: any) => React.ReactNode }
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxList must be used within a Combobox")

  return (
    <CommandPrimitive.List
      ref={ref}
      className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden p-1", className)}
      {...props}
    >
      {context.items.map(children)}
    </CommandPrimitive.List>
  )
})
ComboboxList.displayName = "ComboboxList"

export const ComboboxItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(ComboboxContext)
  if (!context) throw new Error("ComboboxItem must be used within a Combobox")

  return (
    <CommandPrimitive.Item
      ref={ref}
      value={value}
      onSelect={(currentValue) => {
        context.onValueChange(currentValue === context.value ? "" : currentValue)
        context.setOpen(false)
      }}
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-slate-100 data-[selected=true]:text-slate-900 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    >
      <Check
        className={cn(
          "mr-2 h-4 w-4",
          context.value === value ? "opacity-100" : "opacity-0"
        )}
      />
      {children}
    </CommandPrimitive.Item>
  )
})
ComboboxItem.displayName = "ComboboxItem"
