import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 btn-shimmer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground border border-primary-border gold-glow hover:-translate-y-0.5 hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-destructive-foreground border border-destructive-border hover:-translate-y-0.5 active:scale-[0.98]",
        outline:
          "border [border-color:var(--button-outline)] shadow-xs hover:-translate-y-0.5 hover:shadow-md active:shadow-none active:scale-[0.98]",
        secondary: "border bg-secondary text-secondary-foreground border-secondary-border hover:-translate-y-0.5 active:scale-[0.98]",
        ghost: "border border-transparent hover:bg-accent/60",
      },
      size: {
        default: "min-h-9 px-5 py-2",
        sm: "min-h-8 px-4 text-xs",
        lg: "min-h-10 px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
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
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
