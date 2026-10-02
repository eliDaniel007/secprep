import "server-only";
import { cookies } from "next/headers";
import { getIronSession, type IronSession } from "iron-session";

export interface SessionData {
  userId?: string;
}

const password = process.env.SESSION_PASSWORD ?? "";
if (password.length < 32) {
  // Avertissement explicite : sans secret robuste, les sessions ne sont pas sures.
  console.warn(
    "[SecPrep] SESSION_PASSWORD manquant ou trop court (>= 32 caracteres requis). Voir .env.example.",
  );
}

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(cookies(), {
    password,
    cookieName: "secprep_session",
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}
