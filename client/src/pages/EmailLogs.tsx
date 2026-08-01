import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { FileText } from 'lucide-react';

export const EmailLogs = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Delivery Logs</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Search and inspect all outbound SMTP messages delivery details.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Delivery History</CardTitle>
          <CardDescription>Paginated historical records including error codes and diagnostic statuses.</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <FileText className="w-8 h-8" />
          </div>
          <p>No historical delivery records found.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailLogs;
