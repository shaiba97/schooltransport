import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Geist, Geist_Mono } from "next/font/google";
import { directionOf, isPortalLocale, LOCALE_COOKIE, type PortalLocale } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";

// The locale cookie decides <html lang>/dir and every server-rendered
// string, so the layout segment has no meaningful static shell before it
// is known. connection() stops prerendering before the cookie read, and
// instant = false permits the layout segment to block and render per
// request (the documented pairing; Cache Components rejects either alone).
export const instant = false;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "School Transport Portal",
  description: "Manage the school fleet, bus routes, student transport assignments, and live trips",
};

// Applied before first paint. With the server now rendering the request's
// locale, the script only matters for legacy clients whose preference sits
// in localStorage but has not yet been mirrored into the cookie.
const localeScript = `try{var d=document.documentElement,p;try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(en|ar)/);p=m?m[1]:null;}catch(e){}if(p!=="ar"&&p!=="en"){try{var s=localStorage.getItem("tr_locale");if(s==="ar"||s==="en")p=s;}catch(e){}}if(p!=="ar"&&p!=="en"){p=navigator.language&&navigator.language.indexOf("ar")===0?"ar":"en";}d.lang=p;d.dir=p==="ar"?"rtl":"ltr";}catch(e){}`;

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const jar = await cookies();
  const raw = jar.get(LOCALE_COOKIE)?.value;
  const locale: PortalLocale = isPortalLocale(raw) ? raw : "en";

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider initialLocale={locale}>{children}</LocaleProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
