
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center px-3 py-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 lcars-badge text-lcars",
  {
    variants: {
      variant: {
        default: "bg-lcars-orange text-black hover:brightness-110",
        secondary: "bg-lcars-purple text-black hover:brightness-110",
        destructive: "bg-lcars-red text-black hover:brightness-110",
        outline: "bg-lcars-blue text-black border-2 border-lcars-blue",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
