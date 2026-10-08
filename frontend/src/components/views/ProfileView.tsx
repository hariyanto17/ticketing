"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetProfileQuery, useUpdateProfileMutation } from "@/services/userApi";
import { useAppDispatch } from "@/store/hooks";
import { setSessionUser } from "@/store/authSlice";
import { useToast } from "@/components/ui/toast";
import { Input, Button } from "@/components/ui/form-controls";
import { Spinner } from "@/components/ui/spinner";
import {
  User,
  Mail,
  Shield,
  Building,
  Key,
  Lock,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const profileFormSchema = (t: (key: string) => string) =>
  z
    .object({
      name: z.string().min(1, t("profile.nameRequired")).max(100),
      phone: z.string().optional().nullable(),
      currentPassword: z.string().optional().nullable(),
      newPassword: z.string().optional().nullable(),
      confirmPassword: z.string().optional().nullable(),
    })
    .refine(
      (data) => {
        if (data.newPassword && data.newPassword.trim().length > 0) {
          if (data.newPassword.length < 6) return false;
        }
        return true;
      },
      {
        message: t("profile.passwordMinLength"),
        path: ["newPassword"],
      }
    )
    .refine(
      (data) => {
        if (data.newPassword && data.newPassword.trim().length > 0) {
          return !!data.currentPassword && data.currentPassword.trim().length > 0;
        }
        return true;
      },
      {
        message: t("profile.currentPasswordRequired"),
        path: ["currentPassword"],
      }
    )
    .refine(
      (data) => {
        if (data.newPassword && data.newPassword.trim().length > 0) {
          return data.newPassword === data.confirmPassword;
        }
        return true;
      },
      {
        message: t("profile.passwordMismatch"),
        path: ["confirmPassword"],
      }
    );

export default function ProfileView() {
  const { t, formatDate } = useTranslation();
  const dispatch = useAppDispatch();
  const { success: toastSuccess, error: toastError } = useToast();

  const { data: profileResponse, isLoading, refetch } = useGetProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateProfileMutation();

  const user = profileResponse?.data;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const schema = profileFormSchema(t);
  type ProfileFormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        phone: user.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [user, reset]);

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      const payload: {
        name?: string;
        phone?: string | null;
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
      } = {
        name: values.name.trim(),
        phone: values.phone ? values.phone.trim() : null,
      };

      if (values.newPassword && values.newPassword.trim().length > 0) {
        payload.currentPassword = values.currentPassword || undefined;
        payload.newPassword = values.newPassword;
        payload.confirmPassword = values.confirmPassword || undefined;
      }

      const response = await updateProfile(payload).unwrap();
      const updatedUser = response.data;

      // Update Redux state
      dispatch(
        setSessionUser({
          id: updatedUser.id,
          username: updatedUser.username,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role?.name || "User",
          isActive: updatedUser.isActive,
        })
      );

      // Reset password fields
      reset({
        name: updatedUser.name,
        phone: updatedUser.phone || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toastSuccess(t("profile.updateSuccess"));
      refetch();
    } catch (err: any) {
      toastError(err?.data?.message || t("profile.updateFailed"));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Spinner className="w-8 h-8" />
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          {t("common.loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2.5">
            <User className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>{t("profile.title")}</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            {t("profile.subtitle")}
          </p>
        </div>
      </div>

      {/* 2. Hero Profile Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-zinc-900 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white/10 backdrop-blur-md border-2 border-white/20 flex items-center justify-center text-4xl sm:text-5xl font-black shadow-inner text-indigo-200">
              {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-indigo-900 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {user?.name}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/15 backdrop-blur-sm text-indigo-100 border border-white/20">
                @{user?.username}
              </span>
            </div>

            <p className="text-sm text-indigo-100/80 flex items-center justify-center sm:justify-start gap-1.5 font-medium">
              <Mail className="w-4 h-4" />
              <span>{user?.email}</span>
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-500/30 border border-indigo-300/30 text-white">
                <Shield className="w-3.5 h-3.5 text-indigo-300" />
                <span>{user?.role?.name || "Admin"}</span>
              </span>

              {user?.branch && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-white/10 border border-white/15 text-zinc-100">
                  <Building className="w-3.5 h-3.5 text-indigo-300" />
                  <span>{user.branch.name}</span>
                </span>
              )}

              {user?.createdAt && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-black/20 text-zinc-300">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(user.createdAt)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Section A: Account Details (Read-only + Editable) */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>{t("profile.personalInfo")}</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("profile.personalInfoDesc")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Username (Disabled) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t("profile.username")}</span>
                </label>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {t("profile.readOnlyBadge")}
                </span>
              </div>
              <input
                type="text"
                disabled
                value={user?.username || ""}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-zinc-400">{t("profile.usernameDisabledHelp")}</p>
            </div>

            {/* Email (Disabled) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{t("profile.email")}</span>
                </label>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                  {t("profile.readOnlyBadge")}
                </span>
              </div>
              <input
                type="text"
                disabled
                value={user?.email || ""}
                className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 rounded-xl text-sm font-semibold text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
              />
              <p className="text-[11px] text-zinc-400">{t("profile.emailDisabledHelp")}</p>
            </div>

            {/* Full Name (Editable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {t("profile.fullName")} <span className="text-rose-500">*</span>
              </label>
              <Input
                type="text"
                placeholder={t("profile.fullName")}
                error={errors.name?.message}
                {...register("name")}
              />
            </div>

            {/* Phone Number (Editable) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {t("profile.phone")}
              </label>
              <Input
                type="tel"
                placeholder={t("profile.phonePlaceholder")}
                error={errors.phone?.message}
                {...register("phone")}
              />
            </div>
          </div>
        </div>

        {/* Section B: Security & Password Change */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-500" />
              <span>{t("profile.securitySettings")}</span>
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("profile.securityDesc")}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/30 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>{t("profile.passwordOptionalNote")}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {t("profile.currentPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  placeholder={t("profile.currentPasswordPlaceholder")}
                  error={errors.currentPassword?.message}
                  className="pr-10"
                  {...register("currentPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {t("profile.newPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  placeholder={t("profile.newPasswordPlaceholder")}
                  error={errors.newPassword?.message}
                  className="pr-10"
                  {...register("newPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                {t("profile.confirmPassword")}
              </label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder={t("profile.confirmPasswordPlaceholder")}
                  error={errors.confirmPassword?.message}
                  className="pr-10"
                  {...register("confirmPassword")}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section C: Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="submit"
            isLoading={isUpdating}
            className="px-8 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 text-sm font-bold flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>{isUpdating ? t("profile.updating") : t("profile.updateButton")}</span>
          </Button>
        </div>
      </form>
    </div>
  );
}
