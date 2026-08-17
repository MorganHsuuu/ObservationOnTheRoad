import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "yellow" | "danger";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-[#2B2B28] disabled:bg-muted",
    ghost: "bg-card text-ink",
    yellow: "bg-yellow text-ink",
    danger: "bg-danger text-white",
  }[variant];

  return (
    <button
      className={`w-full min-h-14 border-2 border-ink font-black text-lg disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] ${styles} ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`border-2 border-ink bg-card ${className}`}>{children}</section>
  );
}

export function BlockHead({
  title,
  extra,
}: {
  title: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-ink px-3.5 py-2.5">
      <h2 className="text-[13px] font-black tracking-[0.2em] text-muted">{title}</h2>
      {extra}
    </div>
  );
}

export function Modal({
  open,
  title,
  kicker,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  kicker?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-5"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-[440px] overflow-y-auto border-2 border-ink bg-card p-5">
        {kicker ? (
          <div className="text-xs font-black tracking-[0.2em] text-muted">{kicker}</div>
        ) : null}
        <h3 className="mt-1 mb-2.5 text-[22px] font-black leading-tight">{title}</h3>
        {children}
      </div>
    </div>
  );
}

export function Prompt({ children }: { children: ReactNode }) {
  return (
    <p className="whitespace-pre-line border-l-[6px] border-yellow pl-3 text-[15px] font-medium">
      {children}
    </p>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-7 border-2 border-ink bg-card px-6 py-10 text-center">
      <b className="mb-1.5 block text-xl font-black">{title}</b>
      <span className="text-sm text-muted">{body}</span>
    </div>
  );
}

export function Rail({ text }: { text: string }) {
  return (
    <div className="fixed top-0 bottom-0 left-0 z-40 hidden w-11 items-start justify-center border-r-2 border-ink bg-paper pt-[18px] md:flex">
      <span className="text-[13px] font-black tracking-[0.34em] text-muted [writing-mode:vertical-rl] whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}
