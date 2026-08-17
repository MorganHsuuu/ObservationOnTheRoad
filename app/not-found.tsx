import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-full max-w-[540px] flex-col justify-center px-4">
      <h1 className="text-5xl font-black">找不到這一頁</h1>
      <p className="mt-3 font-medium">活動可能還沒建立，或網址打錯了。</p>
      <Link href="/" className="mt-6 inline-flex min-h-14 items-center font-black">
        回首頁
      </Link>
    </div>
  );
}
