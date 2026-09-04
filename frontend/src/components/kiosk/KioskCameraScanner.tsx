"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from "html5-qrcode";
import { Camera, RefreshCw, AlertCircle } from "lucide-react";

interface KioskCameraScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isScanningPaused?: boolean;
}

export const KioskCameraScanner: React.FC<KioskCameraScannerProps> = ({
  onScanSuccess,
  isScanningPaused = false,
}) => {
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "kiosk-qr-reader";
  const lastScannedRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;

    async function initCameraList() {
      try {
        setIsInitializing(true);
        setCameraError(null);

        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment / back camera or primary webcam
          const defaultCam = devices[0].id;
          setSelectedCameraId(defaultCam);
        } else {
          setCameraError("Kamera tidak terdeteksi. Harap hubungkan webcam atau gunakan input kode booking.");
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.error("Camera detection error:", err);
        setCameraError("Izin kamera ditolak atau perangkat kamera tidak tersedia.");
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    }

    initCameraList();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCameraId || isScanningPaused) return;

    let html5QrCode: Html5Qrcode;

    try {
      html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
    } catch (e) {
      console.error("Failed to construct Html5Qrcode", e);
      return;
    }

    const config: Html5QrcodeCameraScanConfig = {
      fps: 15,
      qrbox: { width: 280, height: 280 },
      aspectRatio: 1.0,
    };

    const handleSuccess = (decodedText: string) => {
      const now = Date.now();
      // Debounce duplicate scans within 2.5 seconds
      if (lastScannedRef.current === decodedText && now - lastScanTimeRef.current < 2500) {
        return;
      }
      lastScannedRef.current = decodedText;
      lastScanTimeRef.current = now;
      onScanSuccess(decodedText);
    };

    html5QrCode
      .start(
        selectedCameraId,
        config,
        handleSuccess,
        () => {
          // Frame error (silently ignore while seeking QR)
        }
      )
      .catch((err) => {
        console.error("Error starting camera scanner:", err);
        setCameraError("Gagal memulai feed kamera. Pastikan kamera tidak digunakan aplikasi lain.");
      });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode
          .stop()
          .then(() => html5QrCode.clear())
          .catch((err) => console.warn("Error stopping scanner", err));
      }
    };
  }, [selectedCameraId, isScanningPaused]);

  const handleSwitchCamera = () => {
    if (cameras.length <= 1) return;
    const currentIndex = cameras.findIndex((c) => c.id === selectedCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCameraId(cameras[nextIndex].id);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl">
      {/* Scanner Element Container */}
      <div id={containerId} className="w-full h-full object-cover" />

      {/* Target Guide Frame & Animated Scanning Line */}
      {!cameraError && !isInitializing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-rose-500/80 rounded-2xl shadow-[0_0_25px_rgba(225,29,72,0.35)] flex items-center justify-center">
            {/* Corner Indicators */}
            <span className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-lg" />
            <span className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-lg" />
            <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-lg" />
            <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-lg" />

            {/* Laser Scanning Animation */}
            <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isInitializing && (
        <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <RefreshCw className="w-10 h-10 text-rose-500 animate-spin" />
          <p className="text-zinc-300 font-medium">Mengaktifkan kamera pemindai barcode...</p>
        </div>
      )}

      {/* Error Overlay */}
      {cameraError && (
        <div className="absolute inset-0 bg-zinc-950/95 flex flex-col items-center justify-center gap-4 p-8 text-center z-10">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white mb-1">Kamera Tidak Tersedia</h4>
            <p className="text-sm text-zinc-400 max-w-xs">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Bottom Bar: Camera Switcher */}
      {cameras.length > 1 && !cameraError && (
        <div className="absolute bottom-4 z-20">
          <button
            type="button"
            onClick={handleSwitchCamera}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold backdrop-blur border border-zinc-700 transition"
          >
            <Camera className="w-4 h-4 text-rose-400" />
            <span>Ganti Kamera ({cameras.findIndex((c) => c.id === selectedCameraId) + 1}/{cameras.length})</span>
          </button>
        </div>
      )}
    </div>
  );
};
