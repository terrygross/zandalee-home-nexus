
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 lcars-button text-lcars",
  {
    variants: {
      variant: {
        default: "bg-lcars-orange text-black hover:bg-lcars-yellow",
        destructive: "bg-lcars-red text-black hover:bg-red-400",
        outline: "bg-lcars-blue text-black hover:bg-lcars-cyan border-2 border-lcars-blue",
        secondary: "bg-lcars-purple text-black hover:bg-lcars-pink",
        ghost: "bg-transparent text-lcars-text-primary hover:bg-lcars-blue hover:text-black border-2 border-lcars-blue",
        link: "text-lcars-orange underline-offset-4 hover:underline bg-transparent",
      },
      size: {
        default: "h-12 px-8 py-3 min-w-24",
        sm: "h-10 px-6 py-2 min-w-20",
        lg: "h-14 px-10 py-4 min-w-28",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
