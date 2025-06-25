
import SalesAnalytics from './components/SalesAnalytics';

export default function SalesReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sales Report</h1>
          <p className="text-muted-foreground">
            Analyze your sales performance over different periods.
          </p>
        </div>
      </div>
      <SalesAnalytics />
    </div>
  );
}
