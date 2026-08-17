import Markdown from "react-markdown";

export function Md({ source }: { source: string }) {
  return (
    <div className="space-y-3 text-[15px] font-medium leading-relaxed [&_p]:whitespace-pre-line [&_strong]:font-black">
      <Markdown>{source}</Markdown>
    </div>
  );
}
