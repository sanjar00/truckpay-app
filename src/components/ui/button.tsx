import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap brutal-border brutal-text text-sm font-medium brutal-shadow brutal-hover brutal-active transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "brutal-border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "brutal-border bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "brutal-border-secondary bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "brutal-border-0 bg-transparent hover:bg-accent hover:text-accent-foreground brutal-shadow-none",
        link: "brutal-border-0 bg-transparent text-primary underline-offset-4 hover:underline brutal-shadow-none",
        success: "brutal-border-success bg-success text-success-foreground hover:bg-success/90",
        warning: "brutal-border bg-warning text-warning-foreground hover:bg-warning/90",
        info: "brutal-border bg-info text-info-foreground hover:bg-info/90",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2",
        lg: "h-16 px-8 py-4",
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
