
import ProductAnalytics from './components/ProductAnalytics';

export default function ProductReportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Product Report</h1>
          <p className="text-muted-foreground">
            Analyze sales performance for individual products.
          </p>
        </div>
      </div>
      <ProductAnalytics />
    </div>
  );
}
