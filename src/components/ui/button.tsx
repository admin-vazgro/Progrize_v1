import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[#0a2412] text-[#dee2df] hover:bg-[#0a2412]/90 rounded-[10px]",
        secondary: "bg-[#c1cc5a] text-[#0a2412] hover:bg-[#c1cc5a]/90 rounded-[10px]",
        outline: "border bg-white text-[#292929] hover:bg-[#f5f5f5] rounded-[10px]",
        ghost: "text-[#292929] hover:bg-[#e8e8e8] rounded-[10px]",
        link: "text-[#0a2412] underline-offset-4 hover:underline",
        destructive: "bg-red-600 text-white hover:bg-red-700 rounded-[10px]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-10 px-6",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
