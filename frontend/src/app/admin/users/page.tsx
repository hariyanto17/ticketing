"use client";

import React, { useState } from "react";
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useGetRolesQuery,
  useGetBranchesQuery,
  UserDetail,
} from "@/services/userApi";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/components/ui/toast";
import { DataTable } from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { DeleteDialog } from "@/components/ui/dialogs";
import { Input, Select, Button } from "@/components/ui/form-controls";
import { Edit, Trash, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n";

// Form Zod schemas
const userFormSchema = (t: (key: string) => string) => z.object({
  username: z.string().min(3, t("users.usernameMin")).max(50),
  name: z.string().min(1, t("users.nameRequired")).max(100),
  email: z.string().email(t("users.emailInvalid")),
  phone: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  roleId: z.string().uuid(t("users.roleRequired")),
  branchId: z.string().uuid(t("users.branchRequired")),
});

export default function UserManagement() {
  const { t } = useTranslation();
  const schema = userFormSchema(t);
  type UserFormValues = z.infer<typeof schema>;
  const { data: usersResponse, isLoading: usersLoading } = useGetUsersQuery();
  const { data: rolesResponse } = useGetRolesQuery();
  const { data: branchesResponse } = useGetBranchesQuery();

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();

  const { success: toastSuccess, error: toastError } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
  });

  // Prepare selects options
  const roleOptions = [
    { value: "", label: t("users.selectRole") },
    ...(rolesResponse?.data?.map((r) => ({ value: r.id, label: r.name })) || []),
  ];

  const branchOptions = [
    { value: "", label: t("users.selectBranch") },
    ...(branchesResponse?.data?.map((b) => ({ value: b.id, label: `${b.name} (${b.code})` })) || []),
  ];

  const handleOpenAdd = () => {
    setSelectedUser(null);
    reset({
      username: "",
      name: "",
      email: "",
      phone: "",
      password: "",
      roleId: "",
      branchId: "",
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (user: UserDetail) => {
    setSelectedUser(user);
    reset({
      username: user.username,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "", // Optional during edit
      roleId: user.roleId,
      branchId: user.branchId,
    });
    setIsFormOpen(true);
  };

  const handleOpenDelete = (user: UserDetail) => {
    setSelectedUser(user);
    setIsDeleteOpen(true);
  };

  const onSubmit = async (data: UserFormValues) => {
    try {
      if (selectedUser) {
        // Edit flow
        const payload: any = { ...data };
        if (!payload.password) delete payload.password; // Do not update password if left empty
        await updateUser({ id: selectedUser.id, body: payload }).unwrap();
        toastSuccess(t("users.updated"));
      } else {
        // Add flow
        if (!data.password || data.password.length < 6) {
          toastError(t("users.passwordMin"));
          return;
        }
        await createUser(data as any).unwrap();
        toastSuccess(t("users.created"));
      }
      setIsFormOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("users.saveFailed"));
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser.id).unwrap();
      toastSuccess(t("users.deleted"));
      setIsDeleteOpen(false);
    } catch (err: any) {
      toastError(err?.data?.message || t("users.deleteFailed"));
    }
  };

  // Filter query
  const filteredUsers =
    usersResponse?.data?.filter(
      (u) =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const columns = [
    { key: "username", header: t("common.username") },
    { key: "name", header: t("users.fullName") },
    { key: "email", header: t("users.email") },
    {
      key: "role",
      header: t("users.role"),
      render: (u: UserDetail) => (
        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
          {u.role.name}
        </span>
      ),
    },
    {
      key: "branch",
      header: t("users.branch"),
      render: (u: UserDetail) => (
        <span className="text-zinc-600 dark:text-zinc-400 font-medium">
          {u.branch.name}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("users.actions"),
      render: (u: UserDetail) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleOpenEdit(u)}
            className="p-1 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(u)}
            className="p-1 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <Trash className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("users.title")}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            {t("users.subtitle")}
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> {t("users.add")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={filteredUsers}
        isLoading={usersLoading}
        onSearch={setSearchQuery}
        searchPlaceholder={t("users.searchPlaceholder")}
      />

      {/* User Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={selectedUser ? t("users.editTitle") : t("users.addTitle")}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("common.username")}
              type="text"
              error={errors.username?.message}
              {...register("username")}
            />
            <Input
              label={t("users.fullName")}
              type="text"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("users.email")}
              type="email"
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label={t("users.phone")}
              type="text"
              error={errors.phone?.message}
              {...register("phone")}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label={t("users.role")}
              options={roleOptions}
              error={errors.roleId?.message}
              {...register("roleId")}
            />
            <Select
              label={t("users.branch")}
              options={branchOptions}
              error={errors.branchId?.message}
              {...register("branchId")}
            />
          </div>

          <Input
            label={selectedUser ? t("users.changePassword") : t("common.password")}
            type="password"
            placeholder={selectedUser ? t("users.keepPassword") : "••••••••"}
            error={errors.password?.message}
            {...register("password")}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <Button variant="secondary" type="button" onClick={() => setIsFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={selectedUser ? isUpdating : isCreating}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <DeleteDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("users.deleteTitle")}
        message={`${t("users.deleteConfirm")} "${selectedUser?.name}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
}
