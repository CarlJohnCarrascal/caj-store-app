
import PrintingAnalytics from './components/PrintingAnalytics';

export default function PrintingReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Printing Report</h1>
          <p className="text-muted-foreground">
            Analyze sales and quantities for printing services.
          </p>
        </div>
      </div>
      <PrintingAnalytics />
    </div>
  );
}
