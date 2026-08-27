"use client";

import React, { useState, useEffect } from "react";
import { useGetSettingsQuery, useUpdateSettingsMutation } from "@/services/opsApi";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { DateTimePicker } from "@/components/ui/DateTimePicker";
import { Settings, Film, Receipt, ShieldCheck, HelpCircle } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useGetSettingsQuery();
  const [updateSettings, { isLoading: isUpdating }] = useUpdateSettingsMutation();
  const { success: toastSuccess, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState<"general" | "ticket" | "business">("general");

  // Form State
  const [formData, setFormData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      setFormData(settings as any);
    }
  }, [settings]);

  const handleChange = (k: string, v: string) => {
    setFormData((prev) => ({ ...prev, [k]: v }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettings(formData).unwrap();
      toastSuccess(t("settings.saveSuccess"));
    } catch (err: any) {
      toastError(err?.data?.message || t("settings.saveFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  const tabs = [
    { id: "general", label: t("settings.general"), icon: <Settings className="w-4 h-4" /> },
    { id: "ticket", label: t("settings.receipt"), icon: <Receipt className="w-4 h-4" /> },
    { id: "business", label: t("settings.business"), icon: <ShieldCheck className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 font-sans max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          {t("settings.title")}
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">
          {t("settings.subtitle")}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === t.id
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm">
        {activeTab === "general" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.cinemaName")}</label>
              <input
                type="text"
                value={formData.cinemaName || ""}
                onChange={(e) => handleChange("cinemaName", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.logoUrl")}</label>
              <input
                type="text"
                value={formData.logo || ""}
                onChange={(e) => handleChange("logo", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.address")}</label>
              <textarea
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none h-20 resize-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.phone")}</label>
              <input
                type="text"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.email")}</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>
        )}

        {activeTab === "ticket" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.ticketPrefix")}</label>
              <input
                type="text"
                value={formData.ticketPrefix || ""}
                onChange={(e) => handleChange("ticketPrefix", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.paperWidth")}</label>
              <input
                type="number"
                value={formData.paperWidth || ""}
                onChange={(e) => handleChange("paperWidth", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.footerMessage")}</label>
              <input
                type="text"
                value={formData.footerMessage || ""}
                onChange={(e) => handleChange("footerMessage", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.terms")}</label>
              <textarea
                value={formData.termsAndConditions || ""}
                onChange={(e) => handleChange("termsAndConditions", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none h-20 resize-none"
              />
            </div>
            <div className="flex gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.printLogo === "true"}
                  onChange={(e) => handleChange("printLogo", String(e.target.checked))}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                {t("settings.printLogo")}
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.printQrCode === "true"}
                  onChange={(e) => handleChange("printQrCode", String(e.target.checked))}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                {t("settings.printQrCode")}
              </label>
            </div>
          </div>
        )}

        {activeTab === "business" && (
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <DateTimePicker
                mode="date"
                label={t("settings.operationalBusinessDate")}
                value={formData.businessDate || ""}
                onChange={(val) => handleChange("businessDate", val || "")}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.currencySymbol")}</label>
              <input
                type="text"
                value={formData.currency || "IDR"}
                onChange={(e) => handleChange("currency", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t("settings.taxPercentage")}</label>
              <input
                type="number"
                value={formData.taxPercentage || ""}
                onChange={(e) => handleChange("taxPercentage", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Timezone</label>
              <select
                value={formData.timezone || "Asia/Jakarta"}
                onChange={(e) => handleChange("timezone", e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:outline-none text-sm font-semibold"
              >
                <option value="Asia/Jakarta">WIB (Asia/Jakarta)</option>
                <option value="Asia/Makassar">WITA (Asia/Makassar)</option>
                <option value="Asia/Jayapura">WIT (Asia/Jayapura)</option>
              </select>
            </div>
            <div className="flex gap-6 sm:col-span-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={formData.taxEnabled === "true"}
                  onChange={(e) => handleChange("taxEnabled", String(e.target.checked))}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                />
                {t("settings.applyTaxes")}
              </label>
            </div>
          </div>
        )}

        <div className="border-t border-zinc-150 dark:border-zinc-800 pt-6 flex justify-end">
          <button
            type="submit"
            disabled={isUpdating}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-bold rounded-2xl transition-all shadow-md cursor-pointer text-sm"
          >
            {isUpdating ? <Spinner className="w-5 h-5 mx-auto" /> : t("common.save")}
          </button>
        </div>
      </form>
    </div>
  );
}
