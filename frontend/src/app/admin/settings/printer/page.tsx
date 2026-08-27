"use client";

import React, { useEffect, useState } from "react";
import { Printer, RefreshCw, CheckCircle2, AlertTriangle, Settings as SettingsIcon } from "lucide-react";
import { createPrinterAgentClient, getPrinterAgentDeviceId, type PrinterAgentConfig, type PrinterAgentPrinter } from "@/services/printerAgentClient";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { useTranslation } from "@/lib/i18n";

export default function PrinterSetupPage() {
  const { t } = useTranslation();
  const { success: toastSuccess, error: toastError } = useToast();
  const [printers, setPrinters] = useState<PrinterAgentPrinter[]>([]);
  const [config, setConfig] = useState<PrinterAgentConfig>({ ticketPrinterId: null, ticketPrinter: null, paperWidth: 80, autoCut: true });
  const [health, setHealth] = useState<Awaited<ReturnType<ReturnType<typeof createPrinterAgentClient>["getHealth"]>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [agentStatus, setAgentStatus] = useState<"connected" | "not-running" | "not-found" | "ready" | "error">("not-running");
  const refreshStatus = async () => {
    if (!getPrinterAgentDeviceId()) {
      setIsLoading(false);
      return;
    }

    const client = createPrinterAgentClient();
    try {
      const nextHealth = await client.getHealth();
      setHealth(nextHealth);
      setAgentStatus(nextHealth.status === "ok" ? "connected" : "error");
    } catch {
      setAgentStatus("not-running");
    }

    try {
      const result = await client.getPrinters();
      setPrinters(result);
    } catch {
      setPrinters([]);
    }

    try {
      const currentConfig = await client.getConfig();
      setConfig(currentConfig);
      setAgentStatus((prev) => (prev === "connected" ? "ready" : prev));
    } catch {
      setAgentStatus("not-found");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const handleSave = async () => {
    const client = createPrinterAgentClient();
    try {
      setSaving(true);
      const next = await client.updateConfig(config);
      setConfig(next);
      toastSuccess(t("settings.saveSuccess"));
    } catch (error: any) {
      toastError(error?.message || t("settings.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleTestPrint = async () => {
    const client = createPrinterAgentClient();
    try {
      await client.testPrint();
      toastSuccess("Test print completed");
    } catch (error: any) {
      toastError(error?.message || "Unable to print test ticket");
    }
  };

  const statusText =
    agentStatus === "connected" || agentStatus === "ready"
      ? health?.hardwarePrintingSupported ? t("settings.printerStatusConnected") : "Connected, hardware printing unavailable"
      : agentStatus === "not-running"
        ? t("settings.printerStatusNotRunning")
        : agentStatus === "not-found"
          ? t("settings.printerStatusNotFound")
          : t("settings.printerStatusError");

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">{t("settings.printer")}</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">{t("settings.subtitle")}</p>
        </div>
        <button
          onClick={() => void refreshStatus()}
          className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${agentStatus === "connected" || agentStatus === "ready" ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"}`}>
              {agentStatus === "connected" || agentStatus === "ready" ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-zinc-400 font-bold">Printer Status</div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{statusText}</div>
            </div>
          </div>
          <div className="text-right text-sm text-zinc-500">
            <div>{t("settings.ticketPrinter")}</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{config.ticketPrinter || "No printer selected"}</div>
            {config.ticketPrinterId && printers.find((printer) => printer.id === config.ticketPrinterId)?.status && (
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {printers.find((printer) => printer.id === config.ticketPrinterId)?.status}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner className="w-10 h-10" /></div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("settings.ticketPrinter")}</label>
              <select
                value={config.ticketPrinterId || ""}
                onChange={(e) => {
                  const selected = printers.find((printer) => printer.id === e.target.value);
                  setConfig((prev) => ({ ...prev, ticketPrinterId: selected?.id || null, ticketPrinter: selected?.name || null }));
                }}
                className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-semibold"
              >
                <option value="">Select printer</option>
                {printers.length === 0 ? (
                  <option value="" disabled>{t("settings.noPrinters")}</option>
                ) : (
                  printers.map((printer) => (
                    <option key={printer.id} value={printer.id}>{printer.name} ({printer.status})</option>
                  ))
                )}
              </select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">{t("settings.paperWidth")}</label>
                <div className="flex gap-3">
                  {([58, 80] as const).map((value) => (
                    <label key={value} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm font-semibold">
                      <input
                        type="radio"
                        checked={config.paperWidth === value}
                        onChange={() => setConfig((prev) => ({ ...prev, paperWidth: value }))}
                      />
                      {value}mm
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-5">
                <label className="inline-flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={config.autoCut}
                    onChange={(e) => setConfig((prev) => ({ ...prev, autoCut: e.target.checked }))}
                  />
                  {t("settings.autoCut")}
                </label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void handleSave()}
                disabled={saving}
                className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white rounded-xl font-bold"
              >
                {saving ? <Spinner className="w-4 h-4" /> : t("settings.saveConfig")}
              </button>
              <button
                onClick={() => void handleTestPrint()}
                className="px-5 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-700 dark:text-zinc-200"
              >
                <span className="inline-flex items-center gap-2"><Printer className="w-4 h-4" />{t("settings.testPrint")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
