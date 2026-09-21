// The shared vocabulary. Before this, every button in the app spelled out its
// own padding, radius and colour, which is why no two of them matched. A
// component here is deliberately small: it holds a decision, not a framework.

import type { ButtonHTMLAttributes, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type Variant = "primary" | "secondary" | "tertiary" | "destructive";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-sage text-white hover:bg-sage-deep disabled:hover:bg-sage",
  secondary:
    "bg-white text-navy ring-1 ring-line hover:ring-navy-soft",
  tertiary:
    "bg-transparent text-slate hover:text-navy hover:bg-black/[0.03]",
  destructive: "bg-danger text-white hover:opacity-90",
};

const SIZE: Record<Size, string> = {
  // Every interactive target stays at least 44px high, including compact
  // controls inside cards.
  md: "min-h-11 px-4 text-base",
  sm: "min-h-11 px-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}) {
  return (
    <button
      {...rest}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-control",
        "font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-45",
        VARIANT[variant],
        SIZE[size],
        full ? "w-full" : "",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// Same shape as Button, for when the thing is genuinely a link. A link that
// looks like a button still has to be a link, or the keyboard and the context
// menu both behave wrongly.
export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  external = false,
  className = "",
  children,
  onClick,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  external?: boolean;
  className?: string;
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <a
      href={href}
      onClick={onClick}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-control",
        "font-semibold transition-colors no-underline",
        VARIANT[variant],
        SIZE[size],
        className,
      ].join(" ")}
    >
      {children}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

// Tone is never the only signal. Every badge carries a word, so a reader who
// cannot tell teal from amber still knows what it says.
type Tone = "neutral" | "accent" | "highlight" | "danger" | "success";

const TONE: Record<Tone, string> = {
  neutral: "bg-ivory text-navy-soft ring-line",
  accent: "bg-[#4f7c6218] text-sage-deep ring-[#4f7c6240]",
  highlight: "bg-[#e2a12b1f] text-[#8a5f10] ring-[#e2a12b4d]",
  danger: "bg-[#c94f4514] text-danger ring-[#c94f4533]",
  success: "bg-[#2f7d5b14] text-success ring-[#2f7d5b33]",
};

export function Badge({
  tone = "neutral",
  pill = false,
  children,
}: {
  tone?: Tone;
  pill?: boolean;
  children: ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center px-2.5 py-1",
        pill ? "self-start rounded-full" : "rounded-md",
        "text-sm font-semibold tracking-wide ring-1 ring-inset",
        TONE[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                    */
/* -------------------------------------------------------------------------- */

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={[
        "rounded-card border border-line bg-white",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

// A small caps label above a block. Used instead of a fourth heading level,
// because the page only needs three.
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-semibold tracking-[0.08em] text-slate uppercase">
      {children}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className}`} aria-hidden />;
}

// The shape of a card, shown while the real one loads. A spinner tells the
// reader to wait; this tells them what is coming.
export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <Skeleton className="h-36 w-full rounded-none" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/5" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-[48ch] text-base text-slate">
        {body}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

// role="alert" rather than a coloured box alone, so it is announced and not
// only seen. The word "Something went wrong" carries the meaning; the coral
// only reinforces it.
export function ErrorNotice({
  children,
  onRetry,
}: {
  children: ReactNode;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-3 rounded-control border border-[#c94f4540] bg-[#c94f450d] px-4 py-3"
    >
      <p className="flex-1 text-base text-danger">{children}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
