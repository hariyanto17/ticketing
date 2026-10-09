import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://planetsinemaid.com/"),
  title: "Planet Sinema Indonesia",
  description: "Jalan Wahidin Sudirohusodo, Kabupaten Bone",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Planet Sinema Indonesia",
    description: "Jalan Wahidin Sudirohusodo, Kabupaten Bone",
    url: "/",
    siteName: "Planet Sinema Indonesia",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/PLANET-CINEMA-LOGO-2-COLOR.png",
        width: 1080,
        height: 445,
        alt: "Planet Sinema Indonesia",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Planet Sinema Indonesia",
    description: "Jalan Wahidin Sudirohusodo, Kabupaten Bone",
    images: ["/PLANET-CINEMA-LOGO-2-COLOR.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
