import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useWorkspace } from '../context/WorkspaceContext';
import { TrendingUp, Send } from 'lucide-react';

export const Dashboard = () => {
  const { activeWorkspace } = useWorkspace();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Overview</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Active Workspace: <span className="font-semibold text-brand-600 dark:text-brand-400">{activeWorkspace?.name}</span>
          </p>
        </div>
        <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
          <Send className="w-4 h-4" />
          Quick Send
        </Button>
      </div>

      {/* Grid items */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Sent Volume</CardTitle>
              <CardDescription>Current billing cycle</CardDescription>
            </div>
            <TrendingUp className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <span className="text-xs text-slate-400 mt-1 block">Limit: 10,000 / month</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Active Domains</CardTitle>
              <CardDescription>Verified sending hosts</CardDescription>
            </div>
            <Globe className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <span className="text-xs text-slate-400 mt-1 block">Pending DNS resolve checks</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Bounce Rate</CardTitle>
              <CardDescription>Delivery health metrics</CardDescription>
            </div>
            <ShieldAlert className="w-5 h-5 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.00%</div>
            <span className="text-xs text-slate-400 mt-1 block">Suppressing targets automatically</span>
          </CardContent>
        </Card>
      </div>

      {/* Main detail placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Recent outbound SMTP relay actions logs</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex items-center justify-center text-slate-400 text-sm">
          No logs found for this billing cycle. Hook up sending endpoints to get started.
        </CardContent>
      </Card>
    </div>
  );
};

// Import helper
import { Globe, ShieldAlert } from 'lucide-react';
export default Dashboard;
