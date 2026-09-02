"use client";

import { ArrowUpRight, ArrowDownRight, WalletCards } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect } from "react";
import useFetch from "@/hooks/use-fetch";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateDefaultAccount } from "@/actions/account";
import { toast } from "sonner";

export function AccountCard({ account }) {
  const router = useRouter();
  const { name, type, balance, id, isDefault } = account;

  const {
    loading: updateDefaultLoading,
    fn: updateDefaultFn,
    data: updatedAccount,
    error,
  } = useFetch(updateDefaultAccount);

  const handleDefaultChange = async (checked) => {
    if (!checked || isDefault) {
      if (isDefault) {
        toast.warning("You need at least 1 default account");
      }
      return;
    }

    await updateDefaultFn(id);
  };

  useEffect(() => {
    if (updatedAccount?.success) {
      toast.success("Default account updated successfully");
      router.refresh();
    }
  }, [updatedAccount, router]);

  useEffect(() => {
    if (error) {
      toast.error(error.message || "Failed to update default account");
    }
  }, [error]);

  return (
    <Card className="group relative overflow-hidden border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/10">
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-gradient-to-bl from-blue-100/70 to-transparent blur-2xl" />
      <Link href={`/account/${id}`}>
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2.5"><span className="rounded-xl bg-slate-100 p-2 text-slate-600"><WalletCards className="h-4 w-4" /></span><CardTitle className="text-sm font-semibold capitalize text-slate-800">{name}</CardTitle></div>
          <Switch
            checked={isDefault}
            onCheckedChange={handleDefaultChange}
            disabled={updateDefaultLoading}
            onClick={(event) => event.stopPropagation()}
          />
        </CardHeader>
        <CardContent className="relative">
          <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-slate-400">Available balance</p>
          <div className="text-2xl font-bold tracking-tight text-slate-950">
          ₹{parseFloat(balance).toFixed(2)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {type.charAt(0) + type.slice(1).toLowerCase()} Account
          </p>
        </CardContent>
        <CardFooter className="relative mx-6 mb-5 rounded-xl bg-slate-50 px-3 py-2.5 flex justify-between text-xs font-medium text-muted-foreground">
          <div className="flex items-center">
            <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
            Income
          </div>
          <div className="flex items-center">
            <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
            Expense
          </div>
        </CardFooter>
      </Link>
    </Card>
  );
}
