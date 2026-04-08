"use client";

import NextTopLoader from "nextjs-toploader";

export default function ProgressBarProvider() {
  return (
    <NextTopLoader
      color="#2563eb"
      height={3}
      showSpinner={false}
      shadow={false}
    />
  );
}
