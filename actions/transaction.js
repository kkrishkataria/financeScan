"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { checkUser } from "@/lib/checkUser";
import { generateGeminiContent } from "@/lib/gemini";
import {
  normalizeReceiptCategory,
  normalizeStatementCategory,
} from "@/lib/receipt-utils";

const serializeAmount = (obj) => ({
  ...obj,
  amount: obj.amount.toNumber(),
});

// Create Transaction
export async function createTransaction(data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    let user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      user = await checkUser();
    }

    if (!user) {
      throw new Error("User not found");
    }

    const account = await db.account.findUnique({
      where: {
        id: data.accountId,
        userId: user.id,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    // Calculate new balance
    const balanceChange = data.type === "EXPENSE" ? -data.amount : data.amount;
    const newBalance = account.balance.toNumber() + balanceChange;

    // Create transaction and update account balance
    const transaction = await db.$transaction(async (tx) => {
      const newTransaction = await tx.transaction.create({
        data: {
          ...data,
          userId: user.id,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: newBalance },
      });

      return newTransaction;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${transaction.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

export async function getTransaction(id) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found");

  const transaction = await db.transaction.findUnique({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!transaction) throw new Error("Transaction not found");

  return serializeAmount(transaction);
}

export async function updateTransaction(id, data) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) throw new Error("User not found");

    // Get original transaction to calculate balance change
    const originalTransaction = await db.transaction.findUnique({
      where: {
        id,
        userId: user.id,
      },
      include: {
        account: true,
      },
    });

    if (!originalTransaction) throw new Error("Transaction not found");

    // Calculate balance changes
    const oldBalanceChange =
      originalTransaction.type === "EXPENSE"
        ? -originalTransaction.amount.toNumber()
        : originalTransaction.amount.toNumber();

    const newBalanceChange =
      data.type === "EXPENSE" ? -data.amount : data.amount;

    const netBalanceChange = newBalanceChange - oldBalanceChange;

    // Update transaction and account balance in a transaction
    const transaction = await db.$transaction(async (tx) => {
      const updated = await tx.transaction.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          ...data,
          nextRecurringDate:
            data.isRecurring && data.recurringInterval
              ? calculateNextRecurringDate(data.date, data.recurringInterval)
              : null,
        },
      });

      // Update account balance
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: netBalanceChange,
          },
        },
      });

      return updated;
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${data.accountId}`);

    return { success: true, data: serializeAmount(transaction) };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Get User Transactions
export async function getUserTransactions(query = {}) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const transactions = await db.transaction.findMany({
      where: {
        userId: user.id,
        ...query,
      },
      include: {
        account: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    return { success: true, data: transactions };
  } catch (error) {
    throw new Error(error.message);
  }
}

// Scan Receipt
export async function scanReceipt(file) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Receipt scanning is not configured");
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64String = Buffer.from(arrayBuffer).toString("base64");

    const prompt = `Extract receipt data. Return ONLY valid JSON, no markdown:
{"amount":number,"date":"ISO date","description":"brief summary","merchantName":"store name","category":"one of housing,transportation,groceries,utilities,entertainment,food,shopping,healthcare,education,personal,travel,insurance,gifts,bills,other-expense"}
If not a receipt, return {}.`;

    const response = await generateGeminiContent(
      [
        {
          inlineData: {
            data: base64String,
            mimeType: file.type || "image/jpeg",
          },
        },
        prompt,
      ],
      // Receipt uploads are interactive. Fail fast rather than keeping the UI
      // loading while retrying an unavailable model several times.
      { maxRetries: 0 }
    );

    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    try {
      const data = JSON.parse(cleanedText);

      if (!data?.amount) {
        throw new Error("Could not read receipt. Please upload a clearer image.");
      }

      const amount = parseFloat(data.amount);
      if (Number.isNaN(amount)) {
        throw new Error("Could not read receipt amount. Please enter it manually.");
      }

      const parsedDate = data.date ? new Date(data.date) : new Date();
      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error("Could not read receipt date. Please select the date manually.");
      }

      return {
        amount,
        date: parsedDate,
        description: data.description || data.merchantName || "",
        category: normalizeReceiptCategory(data.category),
        merchantName: data.merchantName || "",
      };
    } catch (parseError) {
      if (parseError.message.startsWith("Could not read receipt")) {
        throw parseError;
      }
      console.error("Error parsing JSON response:", parseError);
      throw new Error("Invalid response format from Gemini");
    }
  } catch (error) {
    console.error("Error scanning receipt:", error);
    throw new Error(error.message || "Failed to scan receipt");
  }
}

// Helper function to calculate next recurring date
function calculateNextRecurringDate(startDate, interval) {
  const date = new Date(startDate);

  switch (interval) {
    case "DAILY":
      date.setDate(date.getDate() + 1);
      break;
    case "WEEKLY":
      date.setDate(date.getDate() + 7);
      break;
    case "MONTHLY":
      date.setMonth(date.getMonth() + 1);
      break;
    case "YEARLY":
      date.setFullYear(date.getFullYear() + 1);
      break;
  }

  return date;
}

// Parse Bank Statement with Gemini
export async function parseBankStatement(file) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Bank statement scanning is not configured");
    }

    if (!file) {
      throw new Error("No file provided");
    }

    if (file.size > 20 * 1024 * 1024) {
      throw new Error("Statement file size must be under 20MB");
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileName = (file.name || "").toLowerCase();
    const mimeType = file.type || "";

    const isTextOrCsv =
      mimeType.includes("text/csv") ||
      mimeType.includes("text/plain") ||
      fileName.endsWith(".csv") ||
      fileName.endsWith(".txt");

    const prompt = `You are an expert financial document parser.
Extract all individual financial transactions from this bank statement (PDF, image, CSV, or text).
For each transaction:
- date: ISO 8601 string (e.g. "2026-03-24T00:00:00.000Z")
- description: clear, clean merchant name or payment narration summary (e.g. "Swiggy", "Amazon", "Salary Credit", "Electricity Bill", "UPI Payment")
- amount: positive number (e.g. 450.00, always positive)
- type: "INCOME" (if credit, deposit, salary, interest, transfer in, refund) or "EXPENSE" (if debit, withdrawal, payment, fee, purchase, transfer out)
- category: one of the following exact category IDs:
  Income: "salary", "freelance", "investments", "business", "rental", "other-income"
  Expense: "housing", "transportation", "groceries", "utilities", "entertainment", "food", "shopping", "healthcare", "education", "personal", "travel", "insurance", "gifts", "bills", "other-expense"

Return ONLY a valid JSON array of objects. Do NOT include markdown code fences, backticks, or any explanation.
Example format:
[
  {
    "date": "2026-03-24T00:00:00.000Z",
    "description": "Starbucks Coffee",
    "amount": 250.00,
    "type": "EXPENSE",
    "category": "food"
  }
]
If no transactions are found, return [].`;

    let contentPayload;
    if (isTextOrCsv) {
      const textContent = Buffer.from(arrayBuffer).toString("utf-8");
      contentPayload = [
        `Here is the raw bank statement text/CSV:\n\n${textContent}\n\n${prompt}`,
      ];
    } else {
      const base64String = Buffer.from(arrayBuffer).toString("base64");
      const effectiveMime =
        mimeType || (fileName.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

      contentPayload = [
        {
          inlineData: {
            data: base64String,
            mimeType: effectiveMime,
          },
        },
        prompt,
      ];
    }

    const response = await generateGeminiContent(contentPayload, {
      maxRetries: 1,
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 8192,
      },
    });

    const text = response.text();
    const cleanedText = text.replace(/```(?:json)?\n?/g, "").trim();

    let data;
    try {
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("Error parsing Gemini statement response:", cleanedText);
      throw new Error(
        "Could not parse transactions from statement. Please ensure the file is clear and readable."
      );
    }

    if (!Array.isArray(data)) {
      if (data && typeof data === "object") {
        data = data.transactions || data.items || [];
      } else {
        data = [];
      }
    }

    const transactions = data
      .map((item, index) => {
        const amt = Math.abs(parseFloat(item.amount));
        if (isNaN(amt) || amt <= 0) return null;

        const parsedDate = item.date ? new Date(item.date) : new Date();
        const validDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

        const type =
          String(item.type || "").toUpperCase() === "INCOME"
            ? "INCOME"
            : "EXPENSE";

        const category = normalizeStatementCategory(item.category, type);

        return {
          id: `stmt_${Date.now()}_${index}`,
          date: validDate.toISOString(),
          description: (item.description || item.merchantName || "Transaction").trim(),
          amount: amt,
          type,
          category,
          selected: true,
        };
      })
      .filter(Boolean);

    if (transactions.length === 0) {
      throw new Error(
        "No transactions could be extracted from this statement. Please check the document format or try a clearer file."
      );
    }

    return {
      success: true,
      count: transactions.length,
      transactions,
    };
  } catch (error) {
    console.error("Error parsing bank statement:", error);
    throw new Error(error.message || "Failed to parse bank statement");
  }
}

// Import parsed statement transactions and adjust account balance in finance
export async function importStatementTransactions({ accountId, transactions }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) throw new Error("User not found");

    if (!accountId) {
      throw new Error("Target account is required");
    }

    const account = await db.account.findUnique({
      where: { id: accountId, userId: user.id },
    });
    if (!account) throw new Error("Account not found");

    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error("No transactions selected for import");
    }

    let netBalanceDelta = 0;
    const dbTransactions = [];

    for (const t of transactions) {
      const amt = parseFloat(t.amount);
      if (isNaN(amt) || amt <= 0) continue;

      const type = t.type === "INCOME" ? "INCOME" : "EXPENSE";
      if (type === "INCOME") {
        netBalanceDelta += amt;
      } else {
        netBalanceDelta -= amt;
      }

      dbTransactions.push({
        userId: user.id,
        accountId: account.id,
        type,
        amount: amt,
        description: (t.description || "Bank Statement Payment").trim(),
        date: new Date(t.date || Date.now()),
        category: t.category || (type === "INCOME" ? "other-income" : "other-expense"),
        status: "COMPLETED",
        isRecurring: false,
      });
    }

    if (dbTransactions.length === 0) {
      throw new Error("No valid transactions found to import");
    }

    const currentBalance = account.balance.toNumber();
    const newBalance = currentBalance + netBalanceDelta;

    const result = await db.$transaction(async (tx) => {
      const created = await tx.transaction.createMany({
        data: dbTransactions,
      });

      const updatedAccount = await tx.account.update({
        where: { id: account.id },
        data: {
          balance: newBalance,
        },
      });

      return {
        count: created.count,
        newBalance: updatedAccount.balance.toNumber(),
      };
    });

    revalidatePath("/dashboard");
    revalidatePath(`/account/${account.id}`);
    revalidatePath("/transaction/create");

    return {
      success: true,
      count: result.count,
      netBalanceDelta,
      newBalance: result.newBalance,
    };
  } catch (error) {
    console.error("Error importing statement transactions:", error);
    throw new Error(error.message || "Failed to import transactions");
  }
}
