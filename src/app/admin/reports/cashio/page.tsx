
import CashIOAnalytics from './components/CashIOAnalytics';

export default function CashIOReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Cash IO Report</h1>
          <p className="text-muted-foreground">
            Analyze cash in & cash out transaction volume and fees.
          </p>
        </div>
      </div>
      <CashIOAnalytics />
    </div>
  );
}
