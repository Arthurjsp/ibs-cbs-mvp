"use client";

import { useEffect, useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface FieldHelpProps {
  htmlFor: string;
  label: string;
  tooltip: string;
  microcopy: string;
  microcopyId: string;
  iconAriaLabel?: string;
  className?: string;
}

export function FieldHelp({
  htmlFor,
  label,
  tooltip,
  microcopy,
  microcopyId,
  iconAriaLabel,
  className
}: FieldHelpProps) {
  const [open, setOpen] = useState(false);
  const [openReason, setOpenReason] = useState<"hover" | "click" | null>(null);
  const [supportsHover, setSupportsHover] = useState(false);
  const tooltipId = useId();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = () => setSupportsHover(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const triggerLabel = iconAriaLabel ?? `Ajuda sobre ${label}`;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) {
              setOpenReason(null);
              return;
            }
            if (!openReason) {
              setOpenReason("click");
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={triggerLabel}
              aria-describedby={open ? tooltipId : undefined}
              className="inline-flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              onMouseEnter={() => {
                if (!supportsHover) return;
                if (openReason === "click") return;
                setOpen(true);
                setOpenReason("hover");
              }}
              onMouseLeave={() => {
                if (!supportsHover) return;
                if (openReason !== "hover") return;
                setOpen(false);
                setOpenReason(null);
              }}
            >
              <HelpCircle className="h-4 w-4 cursor-pointer" aria-hidden="true" />
              <span className="sr-only">{triggerLabel}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent
            id={tooltipId}
            role="note"
            side="top"
            align="start"
            className="max-w-xs text-sm leading-relaxed"
            onMouseEnter={() => {
              if (!supportsHover) return;
              if (openReason === "hover") setOpen(true);
            }}
            onMouseLeave={() => {
              if (!supportsHover) return;
              if (openReason === "hover") {
                setOpen(false);
                setOpenReason(null);
              }
            }}
          >
            {tooltip}
          </PopoverContent>
        </Popover>
      </div>
      <p id={microcopyId} className="text-xs text-muted-foreground">
        {microcopy}
      </p>
    </div>
  );
}
