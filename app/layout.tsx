import type { Metadata } from "next";
import { Anton, Noto_Sans_TC } from "next/font/google";
import { NavigationProvider } from "@/components/NavigationProvider";
import "./globals.css";

const noto = Noto_Sans_TC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "500", "900"],
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "路上觀察",
  description: "即時任務發布、拍照回傳、線上成果展覽",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className={`${noto.variable} ${anton.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <NavigationProvider>{children}</NavigationProvider>
      </body>
    </html>
  );
}
