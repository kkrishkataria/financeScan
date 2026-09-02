import { getUserAccounts } from "@/actions/dashboard";
import { getDashboardData } from "@/actions/dashboard";
import { getCurrentBudget } from "@/actions/budget";
import { AccountCard } from "./_components/account-card";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { BudgetProgress } from "./_components/budget-progress";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { DashboardOverview } from "./_components/transaction-overview";

export default async function DashboardPage() {
  const [accounts, transactions] = await Promise.all([
    getUserAccounts(),
    getDashboardData(),
  ]);

  const defaultAccount = accounts?.find((account) => account.isDefault);

  // Get budget for default account
  let budgetData = null;
  if (defaultAccount) {
    budgetData = await getCurrentBudget(defaultAccount.id);
  }

  return (
    <div className="space-y-8">
      {/* Budget Progress */}
      <BudgetProgress
        initialBudget={budgetData?.budget}
        currentExpenses={budgetData?.currentExpenses || 0}
      />

      {/* Dashboard Overview */}
      <DashboardOverview
        accounts={accounts}
        transactions={transactions || []}
      />

      {/* Accounts Grid */}
      <div>
        <div className="mb-4 flex items-end justify-between">
          <div><h2 className="text-xl font-bold text-slate-900">Your accounts</h2><p className="text-sm text-slate-500">Tap an account to view its full activity.</p></div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{accounts?.length || 0} active</span>
        </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CreateAccountDrawer>
          <Card className="group min-h-44 cursor-pointer border-dashed border-2 border-blue-200 bg-blue-50/50 transition-all hover:-translate-y-1 hover:border-blue-400 hover:bg-blue-50 hover:shadow-lg hover:shadow-blue-950/5">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <div className="mb-3 rounded-2xl bg-white p-3 text-blue-600 shadow-sm transition-transform group-hover:scale-110"><Plus className="h-6 w-6" /></div>
              <p className="text-sm font-semibold text-slate-700">Add a new account</p>
              <p className="mt-1 text-xs">Bank, cash, or savings</p>
            </CardContent>
          </Card>
        </CreateAccountDrawer>
        {accounts?.length > 0 &&
          accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
      </div>
    </div>
  );
}
