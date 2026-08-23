import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleApiError, getClientIp } from "@/lib/api-utils";
import { logSecurityEvent, type SecurityAction } from "@/lib/services/security";

const ALLOWED: SecurityAction[] = ["auth.login", "auth.logout"];

// Thin endpoint the client calls right after a client-driven Supabase Auth
// action (sign-in/sign-out) so we get an audit trail entry. Only accepts a
// fixed allow-list of actions and always uses the session's own user id —
// a caller can never log an event on someone else's behalf.
export async function POST(request: Request) {
  try {
    const { user } = await requireUser();
    const { action } = await request.json();

    if (!ALLOWED.includes(action)) {
      return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
    }

    await logSecurityEvent({
      userId: user.id,
      action,
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent"),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
