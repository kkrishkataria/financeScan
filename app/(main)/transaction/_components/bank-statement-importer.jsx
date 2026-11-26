"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Search,
  RefreshCcw,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { parseBankStatement, importStatementTransactions } from "@/actions/transaction";
import { categoryColors } from "@/data/categories";

export function BankStatementImporter({ accounts, defaultAccountId, categories }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [selectedAccountId, setSelectedAccountId] = useState(
    defaultAccountId || accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ""
  );

  const [file, setFile] = useState(null);
  const [step, setStep] = useState("upload"); // 'upload' | 'parsing' | 'review' | 'success'
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [successInfo, setSuccessInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId),
    [accounts, selectedAccountId]
  );

  // Filtered transactions for review table
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !searchTerm ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        typeFilter === "ALL" || t.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  // Financial summary of selected transactions
  const summary = useMemo(() => {
    const selected = transactions.filter((t) => t.selected);
    let totalIncome = 0;
    let totalExpense = 0;

    selected.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "INCOME") {
        totalIncome += amt;
      } else {
        totalExpense += amt;
      }
    });

    const netDelta = totalIncome - totalExpense;
    const currentBalance = selectedAccount?.balance ? Number(selectedAccount.balance) : 0;
    const projectedBalance = currentBalance + netDelta;

    return {
      selectedCount: selected.length,
      totalCount: transactions.length,
      totalIncome,
      totalExpense,
      netDelta,
      currentBalance,
      projectedBalance,
    };
  }, [transactions, selectedAccount]);

  // Handle file drop / select
  const handleFile = (incomingFile) => {
    if (!incomingFile) return;

    const validExtensions = [".pdf", ".csv", ".txt", ".png", ".jpg", ".jpeg", ".webp"];
    const fileName = incomingFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      toast.error("Please upload a PDF, CSV, TXT, or Image of your bank statement");
      return;
    }

    if (incomingFile.size > 20 * 1024 * 1024) {
      toast.error("File size exceeds 20MB limit");
      return;
    }

    setFile(incomingFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Trigger AI parsing with Gemini
  const handleStartParsing = async () => {
    if (!file) {
      toast.error("Please select a statement file first");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please select the target account for these transactions");
      return;
    }

    setIsParsing(true);
    setStep("parsing");

    try {
      const result = await parseBankStatement(file);
      if (result?.transactions && result.transactions.length > 0) {
        setTransactions(result.transactions);
        setStep("review");
        toast.success(`Extracted ${result.transactions.length} payments from statement!`);
      } else {
        throw new Error("No transactions found in this statement.");
      }
    } catch (err) {
      toast.error(err.message || "Failed to parse bank statement");
      setStep("upload");
    } finally {
      setIsParsing(false);
    }
  };

  // Toggle selection
  const handleToggleSelectAll = (checked) => {
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: !!checked })));
  };

  const handleToggleRow = (id) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  // Inline edit functions
  const handleUpdateTransaction = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updated = { ...t, [field]: value };
        // If type toggles, suggest appropriate fallback category if current doesn't match
        if (field === "type") {
          const isIncome = value === "INCOME";
          const currentCat = categories.find((c) => c.id === t.category);
          if (currentCat && currentCat.type !== value) {
            updated.category = isIncome ? "other-income" : "other-expense";
          }
        }
        return updated;
      })
    );
  };

  const handleDeleteRow = (id) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast.info("Transaction removed from import list");
  };

  const handleAddManualRow = () => {
    const newRow = {
      id: `manual_${Date.now()}`,
      date: new Date().toISOString(),
      description: "Manual Entry",
      amount: 100,
      type: "EXPENSE",
      category: "other-expense",
      selected: true,
    };
    setTransactions((prev) => [newRow, ...prev]);
    toast.success("Added new row to edit");
  };

  // Save selected transactions & adjust balance in database
  const handleConfirmImport = async () => {
    const selected = transactions.filter((t) => t.selected);
    if (selected.length === 0) {
      toast.error("Please select at least one transaction to import");
      return;
    }

    if (!selectedAccountId) {
      toast.error("Please choose a target account");
      return;
    }

    setIsImporting(true);

    try {
      const result = await importStatementTransactions({
        accountId: selectedAccountId,
        transactions: selected,
      });

      if (result.success) {
        setSuccessInfo({
          count: result.count,
          netDelta: result.netBalanceDelta,
          newBalance: result.newBalance,
          accountName: selectedAccount?.name || "Account",
        });
        setStep("success");
        toast.success(`Imported ${result.count} payments & adjusted balance!`);
      }
    } catch (err) {
      toast.error(err.message || "Failed to import statement transactions");
    } finally {
      setIsImporting(false);
    }
  };

  // Reset to start over
  const handleReset = () => {
    setFile(null);
    setTransactions([]);
    setStep("upload");
    setSuccessInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* Target Account Selector (Always visible unless in success state) */}
      {step !== "success" && (
        <Card className="surface-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Target Finance Account
              </span>
              {selectedAccount && (
                <span className="text-xs font-normal text-muted-foreground">
                  Current Balance:{" "}
                  <strong className="text-slate-900 dark:text-slate-100">
                    ₹{Number(selectedAccount.balance).toFixed(2)}
                  </strong>
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Select the account where these statement payments should be logged and adjusted.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((ac) => (
                  <SelectItem key={ac.id} value={ac.id}>
                    <div className="flex items-center justify-between w-full gap-4">
                      <span className="font-medium">{ac.name}</span>
                      <span className="text-muted-foreground text-xs">
                        (₹{Number(ac.balance).toFixed(2)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Step 1: Upload View */}
      {step === "upload" && (
        <Card className="surface-card border-dashed">
          <CardContent className="pt-6">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                isDragging
                  ? "border-violet-600 bg-violet-50/50 dark:bg-violet-950/20"
                  : "border-slate-200 hover:border-violet-400 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.csv,.txt,image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />

              <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 flex items-center justify-center mb-4 shadow-sm">
                <Upload className="h-7 w-7" />
              </div>

              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                {file ? file.name : "Upload Bank Statement"}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                {file
                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB • Ready for AI extraction`
                  : "Drag and drop your official bank statement, e-statement PDF, CSV export, or image"}
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2">
                <Badge variant="outline" className="text-xs bg-white dark:bg-slate-950">
                  📄 PDF
                </Badge>
                <Badge variant="outline" className="text-xs bg-white dark:bg-slate-950">
                  📊 CSV / TXT
                </Badge>
                <Badge variant="outline" className="text-xs bg-white dark:bg-slate-950">
                  🖼️ PNG / JPG
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Max 20MB
                </Badge>
              </div>

              {file && (
                <div className="mt-6 flex gap-3" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={handleStartParsing}
                    disabled={isParsing}
                    className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md text-white"
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Payments with Gemini AI
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isParsing}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Parsing / AI Loading State */}
      {step === "parsing" && (
        <Card className="surface-card">
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center animate-pulse">
                <Sparkles className="h-8 w-8 text-violet-600 dark:text-violet-400" />
              </div>
              <Loader2 className="h-20 w-20 text-violet-600 animate-spin absolute -top-2 -left-2 opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              Analyzing Bank Statement with AI...
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Scanning line items, matching credit vs debit entries, and auto-assigning categories like food, groceries, bills, and income.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review & Adjust Extracted Transactions */}
      {step === "review" && (
        <div className="space-y-6">
          {/* Summary Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-slate-50 dark:bg-slate-900/50 border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Selected Payments</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {summary.selectedCount}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / {summary.totalCount}
                  </span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Total Income
                </p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                  +₹{summary.totalIncome.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800">
              <CardContent className="p-4">
                <p className="text-xs text-rose-700 dark:text-rose-400 flex items-center gap-1 font-medium">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Total Expenses
                </p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                  -₹{summary.totalExpense.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
              <CardContent className="p-4">
                <p className="text-xs text-purple-700 dark:text-purple-400 font-medium">
                  Net Balance Impact
                </p>
                <p
                  className={`text-2xl font-bold mt-1 ${
                    summary.netDelta >= 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {summary.netDelta >= 0 ? "+" : ""}₹{summary.netDelta.toFixed(2)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  Balance: ₹{summary.currentBalance.toFixed(0)} → ₹
                  {summary.projectedBalance.toFixed(0)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search description or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-9 text-xs">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="INCOME">Income Only</SelectItem>
                  <SelectItem value="EXPENSE">Expense Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddManualRow}
                className="gap-1.5 h-9 text-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 h-9 text-xs"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Start Over
              </Button>
            </div>
          </div>

          {/* Extracted Transactions Review Table */}
          <Card className="surface-card overflow-hidden">
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10 shadow-sm">
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          transactions.length > 0 &&
                          transactions.every((t) => t.selected)
                        }
                        onCheckedChange={handleToggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-[130px]">Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[110px]">Type</TableHead>
                    <TableHead className="w-[160px]">Category</TableHead>
                    <TableHead className="w-[130px] text-right">Amount (₹)</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No transactions match your search filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((t) => (
                      <TableRow
                        key={t.id}
                        className={t.selected ? "" : "opacity-40 bg-muted/20"}
                      >
                        <TableCell>
                          <Checkbox
                            checked={t.selected}
                            onCheckedChange={() => handleToggleRow(t.id)}
                            aria-label="Select row"
                          />
                        </TableCell>

                        {/* Date */}
                        <TableCell>
                          <Input
                            type="date"
                            value={
                              t.date ? format(new Date(t.date), "yyyy-MM-dd") : ""
                            }
                            onChange={(e) =>
                              handleUpdateTransaction(
                                t.id,
                                "date",
                                new Date(e.target.value).toISOString()
                              )
                            }
                            className="h-8 text-xs w-[125px]"
                          />
                        </TableCell>

                        {/* Description */}
                        <TableCell>
                          <Input
                            value={t.description}
                            onChange={(e) =>
                              handleUpdateTransaction(t.id, "description", e.target.value)
                            }
                            className="h-8 text-xs min-w-[180px]"
                          />
                        </TableCell>

                        {/* Type Toggle */}
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleUpdateTransaction(
                                t.id,
                                "type",
                                t.type === "INCOME" ? "EXPENSE" : "INCOME"
                              )
                            }
                            className={`h-7 px-2 text-xs font-semibold rounded-md border ${
                              t.type === "INCOME"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400"
                            }`}
                          >
                            {t.type === "INCOME" ? "+ INCOME" : "- EXPENSE"}
                          </Button>
                        </TableCell>

                        {/* Category */}
                        <TableCell>
                          <Select
                            value={t.category}
                            onValueChange={(val) =>
                              handleUpdateTransaction(t.id, "category", val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{
                                    backgroundColor:
                                      categoryColors[t.category] || "#94a3b8",
                                  }}
                                />
                                <span className="truncate capitalize">{t.category}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              {categories
                                .filter((c) => c.type === t.type)
                                .map((c) => (
                                  <SelectItem key={c.id} value={c.id} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: c.color }}
                                      />
                                      <span>{c.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Amount */}
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={t.amount}
                            onChange={(e) =>
                              handleUpdateTransaction(
                                t.id,
                                "amount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className={`h-8 text-xs text-right font-semibold w-[100px] ml-auto ${
                              t.type === "INCOME"
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          />
                        </TableCell>

                        {/* Delete Row */}
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                            onClick={() => handleDeleteRow(t.id)}
                            title="Delete this transaction"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Bottom Confirmation Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 border">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Ready to import into{" "}
                <span className="text-violet-600 dark:text-violet-400 font-bold">
                  {selectedAccount?.name}
                </span>
                ?
              </p>
              <p className="text-xs text-muted-foreground">
                This will log {summary.selectedCount} transactions and update your account
                balance by{" "}
                <strong
                  className={
                    summary.netDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }
                >
                  {summary.netDelta >= 0 ? "+" : ""}₹{summary.netDelta.toFixed(2)}
                </strong>
                .
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleReset} disabled={isImporting}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting || summary.selectedCount === 0}
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing & Adjusting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Import ({summary.selectedCount})
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success View */}
      {step === "success" && successInfo && (
        <Card className="surface-card text-center py-10 px-6">
          <CardContent className="space-y-6 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-9 w-9" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                Statement Imported Successfully!
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>{successInfo.count} payments</strong> have been recorded in{" "}
                <strong>{successInfo.accountName}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Balance Adjustment:</span>
                <span
                  className={`font-bold ${
                    successInfo.netDelta >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {successInfo.netDelta >= 0 ? "+" : ""}₹
                  {successInfo.netDelta.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated Account Balance:</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  ₹{successInfo.newBalance.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push(`/account/${selectedAccountId}`)}
              >
                View Account & Transactions
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => router.push("/dashboard")}
              >
                Go to Dashboard
              </Button>
              <Button
                className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700 text-white"
                onClick={handleReset}
              >
                Import Another Statement
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
