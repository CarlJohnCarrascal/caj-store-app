
import EloadingAnalytics from './components/EloadingAnalytics';

export default function EloadingReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">E-loading Report</h1>
          <p className="text-muted-foreground">
            Analyze cost and fees from e-loading services.
          </p>
        </div>
      </div>
      <EloadingAnalytics />
    </div>
  );
}
