"use client";
import { useUser } from "@clerk/nextjs";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const { user } = useUser();
  const firstName = user?.firstName ?? "";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display-serif), Georgia, serif", fontSize: 28, fontWeight: 400, color: "#111827", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
        {getGreeting()}{firstName ? `, ${firstName}` : ""}
      </h1>
      <p style={{ fontSize: 13, color: "#9CA3AF", marginTop: 4 }}>{dateStr}</p>
    </div>
  );
}
