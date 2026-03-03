"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const SCANNER_ID = "barcode-scanner-root";

/**
 * Mobil ve masaüstünde kamera ile barkod / QR kod okur.
 * onScan(decodedText) ile sonucu döner; onClose ile kapatılır.
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const [status, setStatus] = useState("Kamera açılıyor...");
  const [error, setError] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    let html5QrCode = null;

    async function startScanner() {
      if (typeof window === "undefined") return;
      const container = document.getElementById(SCANNER_ID);
      if (!container) return;

      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        html5QrCode = new Html5Qrcode(SCANNER_ID);

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            if (onScan) onScan(decodedText);
            if (html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().catch(() => {});
            }
          },
          () => {}
        );
        scannerRef.current = html5QrCode;
        setStatus("Barkod veya QR kodu kameraya tutun");
      } catch (err) {
        console.error("Barkod tarayıcı hatası:", err);
        setError(err?.message || "Kamera açılamadı. Tarayıcı izni verin.");
      }
    }

    startScanner();
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      scannerRef.current = null;
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col safe-area-padding">
      <div className="flex items-center justify-between p-3 bg-black/80 text-white shrink-0">
        <span className="text-sm font-medium">{status}</span>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/20 touch-manipulation"
          aria-label="Kapat"
        >
          <X size={24} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center p-4 text-white text-center">
          <p className="text-red-300 mb-4">{error}</p>
          <p className="text-sm text-gray-400 mb-4">
            Cep telefonunda HTTPS ve kamera izni gerekir.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-orange-500 rounded-lg font-medium"
          >
            Kapat
          </button>
        </div>
      ) : (
        <div className="flex-1 min-h-0 flex items-center justify-center p-2">
          <div id={SCANNER_ID} className="w-full max-w-md aspect-square rounded-xl overflow-hidden" />
        </div>
      )}
    </div>
  );
}
