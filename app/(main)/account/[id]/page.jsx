import { Suspense } from "react";
import { getAccountWithTransactions } from "@/actions/account";
import { BarLoader } from "react-spinners";
import { TransactionTable } from "../_components/transaction-table";
import { notFound } from "next/navigation";
import { AccountChart } from "../_components/account-chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default async function AccountPage({ params: paramsPromise }) {
  const params = await paramsPromise;
  const accountData = await getAccountWithTransactions(params.id);

  if (!accountData) {
    notFound();
  }

  const { transactions, ...account } = accountData;

  return (
    <div className="space-y-8 px-5">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end justify-between">
        <div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight gradient-title capitalize">
            {account.name}
          </h1>
          <p className="text-muted-foreground">
            {account.type.charAt(0) + account.type.slice(1).toLowerCase()}{" "}
            Account
          </p>
        </div>

        <div className="flex items-center sm:items-end gap-3 self-end sm:self-auto pb-2">
          <Link href={`/transaction/create?tab=statement&accountId=${account.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-9 text-xs border-violet-200 bg-violet-50/50 hover:bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:border-violet-800 dark:text-violet-300"
            >
              <FileText className="h-3.5 w-3.5" />
              Import Statement
            </Button>
          </Link>
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-bold">
              ₹{parseFloat(account.balance).toFixed(2)}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {account._count.transactions} Transactions
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <AccountChart transactions={transactions} />
      </Suspense>

      {/* Transactions Table */}
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <TransactionTable transactions={transactions} />
      </Suspense>
    </div>
  );
}
