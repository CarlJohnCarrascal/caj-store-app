import AIUsageList from './components/AIUsageList';

export default function AIUsagePage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">AI Usage Logs</h1>
      </div>
      <AIUsageList />
    </div>
  );
}
