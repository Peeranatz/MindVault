import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple pass-through middleware placeholder for future auth checks.
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/user/:path*", "/doctor/:path*"],
};
