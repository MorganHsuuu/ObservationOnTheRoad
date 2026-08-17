import { BroadcastGate } from "@/components/student/BroadcastGate";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function EventLayout({
  children,
  params,
}: LayoutProps<"/e/[slug]">) {
  const { slug } = await params;

  return (
    <>
      <BroadcastGate slug={slug} />
      {children}
    </>
  );
}
