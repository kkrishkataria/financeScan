import { defaultCategories } from "@/data/categories";

const EXPENSE_CATEGORIES = defaultCategories.filter((c) => c.type === "EXPENSE");

const CATEGORY_ALIASES = {
  grocery: "groceries",
  groceries: "groceries",
  restaurant: "food",
  dining: "food",
  cafe: "food",
  fuel: "transportation",
  petrol: "transportation",
  taxi: "transportation",
  uber: "transportation",
  medicine: "healthcare",
  pharmacy: "healthcare",
  medical: "healthcare",
  rent: "housing",
  electricity: "utilities",
  water: "utilities",
  internet: "utilities",
  phone: "utilities",
  movie: "entertainment",
  subscription: "entertainment",
  clothes: "shopping",
  clothing: "shopping",
  hotel: "travel",
  flight: "travel",
  fee: "bills",
  fees: "bills",
};

export function normalizeReceiptCategory(raw) {
  if (!raw) return "other-expense";

  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z-]/g, "");

  if (EXPENSE_CATEGORIES.some((c) => c.id === cleaned)) {
    return cleaned;
  }

  if (CATEGORY_ALIASES[cleaned]) {
    return CATEGORY_ALIASES[cleaned];
  }

  const aliasMatch = Object.entries(CATEGORY_ALIASES).find(([key]) =>
    cleaned.includes(key)
  );
  if (aliasMatch) return aliasMatch[1];

  const nameMatch = EXPENSE_CATEGORIES.find(
    (c) =>
      c.name.toLowerCase() === raw.toLowerCase() ||
      cleaned.includes(c.id) ||
      c.id.includes(cleaned)
  );

  return nameMatch?.id || "other-expense";
}

export function getCategoryById(id) {
  return defaultCategories.find((c) => c.id === id);
}

const INCOME_CATEGORIES = defaultCategories.filter((c) => c.type === "INCOME");

const INCOME_ALIASES = {
  salary: "salary",
  payroll: "salary",
  stipend: "salary",
  freelance: "freelance",
  contract: "freelance",
  upwork: "freelance",
  fiverr: "freelance",
  invest: "investments",
  investment: "investments",
  investments: "investments",
  dividend: "investments",
  interest: "investments",
  stock: "investments",
  business: "business",
  revenue: "business",
  sales: "business",
  rent: "rental",
  rental: "rental",
};

export function normalizeStatementCategory(raw, type = "EXPENSE") {
  if (type === "INCOME") {
    if (!raw) return "other-income";
    const cleaned = raw.toLowerCase().trim().replace(/[_\s]+/g, "-").replace(/[^a-z-]/g, "");

    if (INCOME_CATEGORIES.some((c) => c.id === cleaned)) {
      return cleaned;
    }

    if (INCOME_ALIASES[cleaned]) {
      return INCOME_ALIASES[cleaned];
    }

    const match = Object.entries(INCOME_ALIASES).find(([key]) => cleaned.includes(key));
    if (match) return match[1];

    return "other-income";
  }

  return normalizeReceiptCategory(raw);
}
