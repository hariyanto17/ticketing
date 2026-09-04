"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useLoginMutation } from "@/services/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/authSlice";
import { useToast } from "@/components/ui/toast";
import { Input, Button } from "@/components/ui/form-controls";
import { Film } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

const loginSchema = (t: (key: string) => string) =>
  z.object({
    username: z.string().min(1, t("validation.usernameRequired")),
    password: z.string().min(1, t("validation.passwordRequired")),
  });

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { error: toastError, success: toastSuccess } = useToast();
  const [login, { isLoading }] = useLoginMutation();
  const { t, locale } = useTranslation();

  const schema = loginSchema(t);

  type LoginSchemaInput = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginSchemaInput>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: LoginSchemaInput) => {
    try {
      const response = await login(data).unwrap();
      const user = response.data.user;
      dispatch(
        setCredentials({
          user: user,
          token: response.data.token,
        })
      );
      toastSuccess(t("common.welcome"));

      const roleUpper = (user.role || "").toUpperCase();
      const usernameLower = (user.username || "").toLowerCase();
      const isKiosk =
        roleUpper.includes("GATE") ||
        roleUpper.includes("KIOSK") ||
        usernameLower.includes("gate") ||
        usernameLower.includes("kiosk");
      const isCashier =
        roleUpper.includes("CASHIER") ||
        usernameLower.includes("kasir") ||
        usernameLower.includes("cashier");

      if (isKiosk) {
        router.push("/kiosk-print");
      } else if (isCashier) {
        router.push("/cashier/dashboard");
      } else {
        router.push("/admin/dashboard");
      }
    } catch (err: any) {
      toastError(err?.data?.message || t("auth.invalidCredentials"));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 font-sans text-zinc-800 dark:text-zinc-200">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-3">
            <Film className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{t("auth.signIn")}</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 text-center">
            {t("auth.loginSubtitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label={t("auth.username")}
            type="text"
            placeholder="admin"
            error={errors.username?.message}
            {...register("username")}
          />

          <Input
            label={t("auth.password")}
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />

          <Button type="submit" className="w-full py-2.5 mt-2" isLoading={isLoading}>
            {t("auth.signIn")}
          </Button>
        </form>
      </div>
    </div>
  );
}
