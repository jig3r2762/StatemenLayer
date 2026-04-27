"use client";
import { UserButton } from "@clerk/nextjs";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="header-mobile flex items-center justify-between px-8 py-6 bg-transparent">
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1
          style={{
            fontFamily: "var(--font-display-serif), Georgia, serif",
            fontSize: "clamp(20px, 4vw, 28px)",
            fontWeight: 400,
            color: "#111827",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3" style={{ flexShrink: 0, marginLeft: 12 }}>
        {actions}
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </div>
    </header>
  );
}
