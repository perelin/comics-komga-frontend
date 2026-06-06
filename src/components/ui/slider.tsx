"use client"

import { Slider as SliderPrimitive } from "@base-ui/react/slider"

import { cn } from "@/lib/utils"

/**
 * Range-capable slider wrapper around @base-ui/react/slider, styled for the dark
 * theme like the other ui/* primitives. Pass `value`/`onValueChange` with a number
 * for a single thumb or a `[min, max]` tuple for a range (one thumb per entry).
 */
function Slider({
  className,
  value,
  thumbLabels,
  ...props
}: SliderPrimitive.Root.Props & { thumbLabels?: string[] }) {
  const thumbCount = Array.isArray(value) ? value.length : 1
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      className={cn("relative w-full", className)}
      {...props}
    >
      <SliderPrimitive.Control className="flex w-full items-center py-2 touch-none select-none">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-input">
          <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          {Array.from({ length: thumbCount }, (_, i) => (
            <SliderPrimitive.Thumb
              key={i}
              index={i}
              getAriaLabel={() => thumbLabels?.[i] ?? `value ${i + 1}`}
              className="size-4 rounded-full border border-primary bg-background shadow-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
            />
          ))}
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
