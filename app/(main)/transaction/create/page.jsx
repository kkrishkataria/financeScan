import { getUserAccounts } from "@/actions/dashboard";
import { defaultCategories } from "@/data/categories";
import { AddTransactionForm } from "../_components/transaction-form";
import { getTransaction } from "@/actions/transaction";
import { CreateAccountDrawer } from "@/components/create-account-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";

export default async function AddTransactionPage({ searchParams: searchParamsPromise }) {
  const searchParams = await searchParamsPromise;
  const accounts = await getUserAccounts();
  const editId = searchParams?.edit;

  let initialData = null;
  if (editId) {
    const transaction = await getTransaction(editId);
    initialData = transaction;
  }

  return (
    <div className="max-w-4xl mx-auto px-5 pb-12">
      <div className="mb-8 rounded-3xl border border-violet-100 bg-[linear-gradient(110deg,#f5f3ff,#fdf4ff,#fff7ed)] px-6 py-7 md:px-8">
        <p className="eyebrow mb-3 bg-white/80">{editId ? "Make a correction" : "Keep your money story complete"}</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950">
          {editId ? "Edit transaction" : "Add a transaction"}
        </h1>
        <p className="mt-2 text-slate-600">{editId ? "Update the details and keep your balances accurate." : "Scan a receipt or add the details manually in a few seconds."}</p>
      </div>

      {accounts.length === 0 ? (
        <Card className="surface-card border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              Create an account before adding transactions.
            </p>
            <CreateAccountDrawer>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Account
              </Button>
            </CreateAccountDrawer>
          </CardContent>
        </Card>
      ) : (
        <AddTransactionForm
          accounts={accounts}
          categories={defaultCategories}
          editMode={!!editId}
          initialData={initialData}
        />
      )}
    </div>
  );
}
