"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "@/components/ui";

export function QrModal({
  open,
  slug,
  onClose,
}: {
  open: boolean;
  slug: string;
  onClose: () => void;
}) {
  const [src, setSrc] = useState("");
  const url = typeof window === "undefined" ? "" : `${window.location.origin}/e/${slug}`;

  useEffect(() => {
    if (!open || !url) return;
    void QRCode.toDataURL(url, { width: 512, margin: 1, color: { dark: "#111110", light: "#F0EFEA" } }).then(
      setSrc,
    );
  }, [open, url]);

  return (
    <Modal open={open} title="學生端 QR code" kicker="投影給現場掃" onClose={onClose}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={url} className="mx-auto w-full max-w-xs border-2 border-ink" />
      ) : (
        <p className="font-black">產生中…</p>
      )}
      <p className="mt-3 break-all text-center text-sm font-black">{url}</p>
      <button type="button" className="mt-4 min-h-11 w-full border-2 border-ink font-black" onClick={onClose}>
        關閉
      </button>
    </Modal>
  );
}
