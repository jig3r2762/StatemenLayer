"use client";
import { UserButton } from "@clerk/nextjs";

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-6 bg-transparent">
      <div>
        <h1
          style={{
            fontFamily: "var(--font-display-serif), Georgia, serif",
            fontSize: 28,
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
      <div className="flex items-center gap-3">
        {actions}
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
      </div>
    </header>
  );
}
