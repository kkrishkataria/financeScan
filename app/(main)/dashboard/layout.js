import DashboardPage from "./page";
import { BarLoader } from "react-spinners";
import { Suspense } from "react";
import { Sparkles } from "lucide-react";

export default function Layout() {
  return (
    <div className="mx-auto max-w-7xl px-5 pb-12">
      <div className="mb-8 rounded-3xl border border-blue-100 bg-[linear-gradient(110deg,#eff6ff_0%,#faf5ff_48%,#fff7ed_100%)] px-6 py-7 md:px-9 md:py-9">
        <div className="eyebrow mb-3 bg-white/70"><Sparkles className="h-3.5 w-3.5" /> Your financial workspace</div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-950">Your money, at a glance.</h1>
        <p className="mt-2 max-w-xl text-slate-600">See the signals behind your spending and make the next financial decision with confidence.</p>
      </div>
      <Suspense
        fallback={<BarLoader className="mt-4" width={"100%"} color="#9333ea" />}
      >
        <DashboardPage />
      </Suspense>
    </div>
  );
}
