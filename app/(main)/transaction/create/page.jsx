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
    <div className="max-w-3xl mx-auto px-5">
      <div className="flex justify-center md:justify-normal mb-8">
        <h1 className="text-5xl gradient-title ">
          {editId ? "Edit Transaction" : "Add Transaction"}
        </h1>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed">
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
