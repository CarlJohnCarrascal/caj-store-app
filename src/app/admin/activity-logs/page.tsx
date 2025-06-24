import ActivityList from './components/ActivityList';

export default function ActivityLogsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Activity Logs</h1>
      </div>
      <ActivityList />
    </div>
  );
}
