"use client";

import { useEffect, useRef, useState } from "react";
import { Banner, Button, LayerCard } from "@cloudflare/kumo";
import { CameraIcon, ImageIcon } from "@phosphor-icons/react";
import { detectIsbn } from "@/lib/isbn";

type BarcodeScannerProps = {
  onDetect: (isbn: string) => void;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

export function BarcodeScanner({ onDetect }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let cancelled = false;

    async function start() {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!videoRef.current || cancelled) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (!window.BarcodeDetector) {
          setError("このブラウザはライブ読取に未対応です。下からバーコード画像を選んでください。");
          return;
        }

        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "upc_a"],
        });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            for (const code of codes) {
              const isbn = code.rawValue ? detectIsbn(code.rawValue) : null;
              if (isbn) {
                onDetect(isbn);
                setActive(false);
                return;
              }
            }
          } catch {
            // keep scanning
          }
          timer = window.setTimeout(tick, 250);
        };
        tick();
      } catch {
        setError("カメラを起動できませんでした。画像アップロードを使ってください。");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, onDetect]);

  async function handleFile(file: File) {
    setError(null);
    try {
      if (window.BarcodeDetector) {
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "code_128", "upc_a"],
        });
        const bitmap = await createImageBitmap(file);
        const codes = await detector.detect(bitmap);
        const isbn = codes.map((code) => detectIsbn(code.rawValue ?? "")).find(Boolean);
        if (isbn) {
          onDetect(isbn);
          return;
        }
      }

      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("file-barcode-reader");
      const result = await scanner.scanFile(file, true);
      const isbn = detectIsbn(result);
      await scanner.clear();
      if (isbn) onDetect(isbn);
      else setError("ISBNバーコードを読み取れませんでした");
    } catch {
      setError("画像からバーコードを読めませんでした");
    }
  }

  return (
    <div className="space-y-4">
      <LayerCard className="overflow-hidden">
        <video ref={videoRef} className="aspect-video w-full bg-kumo-contrast object-cover" muted playsInline />
      </LayerCard>
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="primary" icon={CameraIcon} onClick={() => setActive((value) => !value)}>
          {active ? "カメラを止める" : "カメラで読み取る"}
        </Button>
        <Button type="button" variant="secondary" icon={ImageIcon} onClick={() => fileRef.current?.click()}>
          画像を選ぶ
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>
      <div id="file-barcode-reader" className="hidden" />
      {error ? <Banner variant="error" title={error} /> : null}
      <p className="text-sm text-kumo-subtle">
        裏表紙の ISBN / EAN-13 バーコードを読み取ります。978 または 979 から始まるコードに対応しています。
      </p>
    </div>
  );
}
