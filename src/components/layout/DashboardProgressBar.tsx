"use client";

import { AppProgressBar as ProgressBar } from "next-nprogress-bar";

export function DashboardProgressBar() {
  return (
    <ProgressBar
      color="#F59E0B"
      height="2px"
      options={{ showSpinner: false }}
      shallowRouting={false}
    />
  );
}
