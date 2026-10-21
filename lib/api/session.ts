import { cookies } from "next/headers";

const TOKEN = "tr_token";
const TENANT = "tr_tenant";

export async function getSession() {
  const store = await cookies();
  const token = store.get(TOKEN)?.value;
  const tenant = store.get(TENANT)?.value;
  return { token, tenant, isAuthenticated: Boolean(token) };
}

export async function setSession(token: string, tenant: string) {
  const store = await cookies();
  store.set(TOKEN, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  store.set(TENANT, tenant, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(TOKEN);
  store.delete(TENANT);
}
