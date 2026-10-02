"use client";

import React from "react";
import { Radio, Clock, User as UserIcon, ArrowLeft, LogOut } from "lucide-react";

interface KioskHeaderProps {
  kioskId: string;
  onEditKioskId: () => void;
  isConnectedToSocket: boolean;
  currentTime: string;
  user: any;
  isAdmin: boolean;
  onAdminClick: () => void;
  onLogout: () => void;
}

export function KioskHeader({
  kioskId,
  onEditKioskId,
  isConnectedToSocket,
  currentTime,
  user,
  isAdmin,
  onAdminClick,
  onLogout,
}: KioskHeaderProps) {
  return (
    <header className="px-6 lg:px-8 py-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between backdrop-blur-md">
      <div className="flex items-center gap-3">
        <img
          src="/PLANET-CINEMA-LOGO-2-COLOR.png"
          alt="Planet Cinema"
          className="h-10 w-auto object-contain"
        />
        <div>
          <h1 className="text-base font-extrabold tracking-wider text-white">PLANET CINEMA</h1>
          <div className="flex items-center gap-2">
            <p className="text-xs text-zinc-400 font-medium tracking-wide">
              Self-Service Ticket Dispenser Kiosk
            </p>
            <button
              type="button"
              onClick={onEditKioskId}
              className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono font-bold text-rose-400 border border-zinc-700 flex items-center gap-1 transition cursor-pointer"
              title="Klik untuk ubah ID Stasiun Kiosk"
            >
              <Radio className="w-2.5 h-2.5" />
              <span>{kioskId}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-5">
        {/* Socket Realtime Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
            isConnectedToSocket
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnectedToSocket ? "bg-emerald-400 animate-ping" : "bg-amber-400"
            }`}
          />
          <span className="hidden sm:inline">
            {isConnectedToSocket ? "Realtime Socket Siap" : "Menghubungkan Socket..."}
          </span>
        </div>

        <div className="flex items-center gap-2 text-zinc-300 font-mono text-xs sm:text-sm bg-zinc-800/80 px-3 sm:px-4 py-1.5 rounded-xl border border-zinc-700/50">
          <Clock className="w-4 h-4 text-rose-400" />
          <span>{currentTime || "00:00:00"} WIB</span>
        </div>

        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs text-zinc-300">
              <UserIcon className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-zinc-200">{user.name || user.username}</span>
              <span className="text-[10px] text-zinc-500 uppercase px-1.5 py-0.5 rounded bg-zinc-800">
                {user.role}
              </span>
            </div>

            {isAdmin && (
              <button
                type="button"
                onClick={onAdminClick}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-semibold text-zinc-200 flex items-center gap-1.5 transition cursor-pointer"
                title="Kembali ke Dashboard Admin"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700 rounded-xl text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
