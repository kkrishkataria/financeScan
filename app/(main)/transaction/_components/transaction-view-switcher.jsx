"use client";

import { useState } from "react";
import { PenBox, FileText, Sparkles } from "lucide-react";
import { AddTransactionForm } from "./transaction-form";
import { BankStatementImporter } from "./bank-statement-importer";

export function TransactionViewSwitcher({
  accounts,
  categories,
  editMode = false,
  initialData = null,
  initialTab = "single",
  defaultAccountId = "",
}) {
  const [activeTab, setActiveTab] = useState(
    editMode ? "single" : initialTab === "statement" ? "statement" : "single"
  );

  if (editMode) {
    return (
      <AddTransactionForm
        accounts={accounts}
        categories={categories}
        editMode={true}
        initialData={initialData}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Controls */}
      <div className="flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border max-w-md mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab("single")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "single"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <PenBox className="h-4 w-4 text-violet-600" />
          <span>Single / Receipt</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("statement")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all relative ${
            activeTab === "statement"
              ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="h-4 w-4 text-indigo-600" />
          <span>Bank Statement</span>
          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
            <Sparkles className="h-2.5 w-2.5" /> AI
          </span>
        </button>
      </div>

      {/* Tab 1: Single Transaction & Receipt Scanner */}
      {activeTab === "single" && (
        <AddTransactionForm
          accounts={accounts}
          categories={categories}
          editMode={false}
          initialData={null}
        />
      )}

      {/* Tab 2: Bank Statement Importer */}
      {activeTab === "statement" && (
        <BankStatementImporter
          accounts={accounts}
          defaultAccountId={defaultAccountId}
          categories={categories}
        />
      )}
    </div>
  );
}
