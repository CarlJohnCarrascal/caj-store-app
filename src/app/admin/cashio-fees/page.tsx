import FeeThresholdList from './components/FeeThresholdList';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function CashIOFeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Manage CashIO Fees</h1>
      </div>
      <Card>
        <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
                The system calculates fees by finding the first matching threshold for a given transaction amount. Thresholds are checked in ascending order based on the 'Amount From' value.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                <li><b>Fixed:</b> A flat fee is applied if the amount is within the range.</li>
                <li><b>Per ₱1000:</b> The fee is multiplied by the number of thousands in the amount (e.g., an amount of ₱2,500 with a ₱20 fee results in a ₱40 total fee).</li>
            </ul>
        </CardContent>
      </Card>
      <FeeThresholdList />
    </div>
  );
}
