import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

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

// Applied before first paint so Arabic sessions never flash an LTR layout:
// cookie first (consistent with LocaleProvider's client snapshot), then the
// legacy localStorage key, then the browser language. Text is corrected
// right after hydration (server snapshot = en is pinned during hydration),
// so the pre-paint script only needs to align lang/dir.
const localeScript = `try{var d=document.documentElement,p;try{var m=document.cookie.match(/(?:^|; )${LOCALE_COOKIE}=(en|ar)/);p=m?m[1]:null;}catch(e){}if(p!=="ar"&&p!=="en"){try{var s=localStorage.getItem("tr_locale");if(s==="ar"||s==="en")p=s;}catch(e){}}if(p!=="ar"&&p!=="en"){p=navigator.language&&navigator.language.indexOf("ar")===0?"ar":"en";}d.lang=p;d.dir=p==="ar"?"rtl":"ltr";}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: localeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
