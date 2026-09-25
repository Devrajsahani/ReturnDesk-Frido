import { NextResponse } from "next/server";
import type { ErrorEnvelope } from "@/lib/api/errors";

export const dynamic = "force-dynamic";

function notFound(): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    {
      error: {
        code: "NOT_FOUND",
        message: "API endpoint not found",
      },
    },
    { status: 404 }
  );
}

export async function GET() {
  return notFound();
}

export async function POST() {
  return notFound();
}

export async function PUT() {
  return notFound();
}

export async function PATCH() {
  return notFound();
}

export async function DELETE() {
  return notFound();
}

export async function HEAD() {
  return notFound();
}

export async function OPTIONS() {
  return notFound();
}
