import { HeroBlock } from "@/components/dashboard/hero-block";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { ScheduleList } from "@/components/dashboard/schedule-list";
import { AlertsList } from "@/components/dashboard/alerts-list";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { CategoryChart } from "@/components/dashboard/category-chart";

export default function DashboardPage() {
  return (
    <div className="space-y-6 pb-8">
      <HeroBlock />

      <div className="ll-rule" />

      <KpiCards />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ScheduleList />
        </div>
        <div className="lg:col-span-2">
          <AlertsList />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <RevenueChart />
        </div>
        <div className="lg:col-span-2">
          <CategoryChart />
        </div>
      </div>
    </div>
  );
}
