import React from "react";
import { Modal } from "./modal";
import { AlertTriangle, Trash2, AlertCircle, HelpCircle } from "lucide-react";
import { Spinner } from "./spinner";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "warning" | "danger" | "info" | "primary";
  icon?: React.ReactNode;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  isLoading = false,
  variant = "warning",
  icon,
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          iconBg: "bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/50 dark:border-rose-900/40",
          btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20",
          defaultIcon: <Trash2 className="w-8 h-8" />,
        };
      case "info":
        return {
          iconBg: "bg-sky-50 dark:bg-sky-950/40 text-sky-500 border border-sky-200/50 dark:border-sky-900/40",
          btnColor: "bg-sky-600 hover:bg-sky-700 text-white shadow-sky-500/20",
          defaultIcon: <AlertCircle className="w-8 h-8" />,
        };
      case "primary":
        return {
          iconBg: "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-200/50 dark:border-indigo-900/40",
          btnColor: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20",
          defaultIcon: <HelpCircle className="w-8 h-8" />,
        };
      case "warning":
      default:
        return {
          iconBg: "bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200/50 dark:border-amber-900/40",
          btnColor: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20",
          defaultIcon: <AlertTriangle className="w-8 h-8" />,
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center py-2">
        <div className={`p-4 rounded-3xl mb-4 shadow-sm ${styles.iconBg}`}>
          {icon || styles.defaultIcon}
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed font-medium">
          {message}
        </p>
        <div className="flex w-full gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 text-sm cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-xl transition-all font-semibold shadow-md disabled:opacity-50 text-sm flex items-center justify-center gap-2 cursor-pointer ${styles.btnColor}`}
          >
            {isLoading ? <Spinner className="w-4 h-4 text-white" /> : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function DeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Hapus Item",
  message = "Apakah Anda yakin ingin menghapus item ini? Tindakan ini tidak dapat dibatalkan.",
  confirmText = "Hapus",
  cancelText = "Batal",
  isLoading = false,
}: ConfirmationDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      message={message}
      confirmText={confirmText}
      cancelText={cancelText}
      isLoading={isLoading}
      variant="danger"
    />
  );
}
