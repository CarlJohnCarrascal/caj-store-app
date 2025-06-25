
import CustomerAnalytics from './components/CustomerAnalytics';

export default function CustomerReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customer Report</h1>
          <p className="text-muted-foreground">
            Analyze customer growth, orders, and value.
          </p>
        </div>
      </div>
      <CustomerAnalytics />
    </div>
  );
}
