import { NextResponse } from "next/server";

export async function GET() {
  const response = NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_URL || "http://localhost:3000"));
  response.cookies.set("auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
