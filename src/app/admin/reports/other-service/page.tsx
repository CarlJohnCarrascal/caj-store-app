
import OtherServiceAnalytics from './components/OtherServiceAnalytics';

export default function OtherServiceReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Other Services Report</h1>
          <p className="text-muted-foreground">
            Analyze cost and fees from miscellaneous services.
          </p>
        </div>
      </div>
      <OtherServiceAnalytics />
    </div>
  );
}
