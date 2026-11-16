"use client";

import { useState, useMemo, useRef } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  BarChart3,
  GitFork,
  Download,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categoryColors } from "@/data/categories";
import { exportElementAsPNG } from "@/lib/export";
import { toast } from "sonner";

const DATE_RANGES = {
  "7D": { label: "Last 7 Days", days: 7 },
  "1M": { label: "Last Month", days: 30 },
  "3M": { label: "Last 3 Months", days: 90 },
  "6M": { label: "Last 6 Months", days: 180 },
  ALL: { label: "All Time", days: null },
};

export function AccountChart({ transactions }) {
  const [dateRange, setDateRange] = useState("1M");
  const [activeView, setActiveView] = useState("chart"); // 'chart' | 'flowchart'
  const [isDownloading, setIsDownloading] = useState(false);
  const chartCardRef = useRef(null);

  // Filter transactions within selected date range
  const filteredTransactions = useMemo(() => {
    const range = DATE_RANGES[dateRange];
    const now = new Date();
    const startDate = range.days
      ? startOfDay(subDays(now, range.days))
      : startOfDay(new Date(0));

    return transactions.filter(
      (t) => new Date(t.date) >= startDate && new Date(t.date) <= endOfDay(now)
    );
  }, [transactions, dateRange]);

  // Group transactions by date for Bar Chart
  const filteredData = useMemo(() => {
    const grouped = filteredTransactions.reduce((acc, transaction) => {
      const date = format(new Date(transaction.date), "MMM dd");
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (transaction.type === "INCOME") {
        acc[date].income += Number(transaction.amount);
      } else {
        acc[date].expense += Number(transaction.amount);
      }
      return acc;
    }, {});

    return Object.values(grouped).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
  }, [filteredTransactions]);

  // Calculate totals and category breakdowns for Flowchart
  const flowData = useMemo(() => {
    let income = 0;
    let expense = 0;
    const incomeByCategory = {};
    const expenseByCategory = {};

    filteredTransactions.forEach((t) => {
      const amt = Number(t.amount || 0);
      if (t.type === "INCOME") {
        income += amt;
        incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + amt;
      } else {
        expense += amt;
        expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + amt;
      }
    });

    const sortedExpenses = Object.entries(expenseByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: expense > 0 ? ((amount / expense) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const sortedIncome = Object.entries(incomeByCategory)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: income > 0 ? ((amount / income) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      income,
      expense,
      net: income - expense,
      sortedExpenses,
      sortedIncome,
    };
  }, [filteredTransactions]);

  const handleDownload = async () => {
    if (!chartCardRef.current) return;
    setIsDownloading(true);
    try {
      const filename = `financial-${activeView}-${dateRange.toLowerCase()}-${format(
        new Date(),
        "yyyy-MM-dd"
      )}.png`;
      await exportElementAsPNG(chartCardRef.current, filename);
      toast.success(
        `${activeView === "flowchart" ? "Flowchart" : "Chart"} downloaded successfully!`
      );
    } catch (err) {
      toast.error(err.message || "Failed to download image");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card ref={chartCardRef} className="bg-card">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
        <div>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {activeView === "chart" ? (
              <>
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Transaction Overview
              </>
            ) : (
              <>
                <GitFork className="h-5 w-5 text-blue-600" />
                Cash Flow Flowchart
              </>
            )}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {activeView === "chart"
              ? "Daily breakdown of income versus expenses"
              : "Visual stream showing how money flows from income to expense categories"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center rounded-lg border bg-muted p-0.5">
            <Button
              variant={activeView === "chart" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs gap-1"
              onClick={() => setActiveView("chart")}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Chart
            </Button>
            <Button
              variant={activeView === "flowchart" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs gap-1"
              onClick={() => setActiveView("flowchart")}
            >
              <GitFork className="h-3.5 w-3.5" />
              Flowchart
            </Button>
          </div>

          {/* Date Range Selector */}
          <Select defaultValue={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[125px] h-8 text-xs">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGES).map(([key, { label }]) => (
                <SelectItem key={key} value={key} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Download Chart Image */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={isDownloading}
            className="h-8 px-3 text-xs gap-1.5"
            title="Download visual as high-resolution PNG"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {isDownloading ? "Exporting..." : "Download"}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Metric summary counters */}
        <div className="grid grid-cols-3 gap-2 p-3 mb-6 rounded-lg bg-muted/40 text-center text-sm">
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              Total Income
            </p>
            <p className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
              ₹{flowData.income.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              Total Expenses
            </p>
            <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400">
              ₹{flowData.expense.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            <p
              className={`text-base sm:text-lg font-bold ${
                flowData.net >= 0
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {flowData.net >= 0 ? "+" : ""}₹{flowData.net.toFixed(2)}
            </p>
          </div>
        </div>

        {/* View 1: Bar Chart */}
        {activeView === "chart" && (
          <div className="h-[300px]">
            {filteredData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No transaction data in this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `₹${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [`₹${Number(value).toFixed(2)}`, undefined]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="income"
                    name="Income"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="expense"
                    name="Expense"
                    fill="#ef4444"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* View 2: Cash Flow Flowchart */}
        {activeView === "flowchart" && (
          <div className="space-y-4">
            {filteredTransactions.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No transaction data available to plot flowchart.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Node 1: Inflow */}
                <div className="p-4 rounded-xl border-2 border-green-500/40 bg-green-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-green-700 dark:text-green-400">
                      1. Inflows (Income)
                    </span>
                    <Badge variant="outline" className="text-green-600 border-green-500/30 text-xs">
                      +100%
                    </Badge>
                  </div>
                  <div className="text-2xl font-extrabold text-green-600 dark:text-green-400">
                    ₹{flowData.income.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    {flowData.sortedIncome.length} income stream(s)
                  </p>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {flowData.sortedIncome.map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background/60"
                      >
                        <span className="capitalize text-muted-foreground truncate max-w-[100px]">
                          {item.category}
                        </span>
                        <span className="font-semibold text-green-600">
                          ₹{item.amount.toFixed(0)} ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Node 2: Net Cash Position */}
                <div className="p-4 rounded-xl border-2 border-purple-500/40 bg-purple-500/5 text-center relative">
                  <div className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border items-center justify-center z-10">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-card border items-center justify-center z-10">
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>

                  <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                    2. Cash Position
                  </span>

                  <div className="my-2">
                    <div
                      className={`text-2xl font-extrabold ${
                        flowData.net >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {flowData.net >= 0 ? "+" : ""}₹{flowData.net.toFixed(2)}
                    </div>
                    <div className="mt-1 flex justify-center">
                      {flowData.net >= 0 ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Net Surplus
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs gap-1">
                          <AlertCircle className="h-3 w-3" /> Net Deficit
                        </Badge>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    {flowData.income > 0
                      ? `${((flowData.expense / flowData.income) * 100).toFixed(0)}% of income spent`
                      : "No income recorded"}
                  </p>
                </div>

                {/* Node 3: Outflow & Categories */}
                <div className="p-4 rounded-xl border-2 border-red-500/40 bg-red-500/5 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-700 dark:text-red-400">
                      3. Outflows (Expenses)
                    </span>
                    <Badge variant="outline" className="text-red-600 border-red-500/30 text-xs">
                      {flowData.income > 0
                        ? `${((flowData.expense / flowData.income) * 100).toFixed(0)}%`
                        : "100%"}
                    </Badge>
                  </div>
                  <div className="text-2xl font-extrabold text-red-600 dark:text-red-400">
                    ₹{flowData.expense.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Allocated to {flowData.sortedExpenses.length} categories
                  </p>

                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {flowData.sortedExpenses.slice(0, 5).map((item) => (
                      <div
                        key={item.category}
                        className="flex items-center justify-between text-xs py-1 px-2 rounded bg-background/60"
                      >
                        <div className="flex items-center gap-1.5 truncate max-w-[110px]">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                              backgroundColor: categoryColors[item.category] || "#ef4444",
                            }}
                          />
                          <span className="capitalize truncate text-muted-foreground">
                            {item.category}
                          </span>
                        </div>
                        <span className="font-semibold text-red-600">
                          ₹{item.amount.toFixed(0)} ({item.percentage}%)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
