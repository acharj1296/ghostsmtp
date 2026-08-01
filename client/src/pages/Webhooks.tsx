import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Webhook as WebhookIcon, Plus } from 'lucide-react';

export const Webhooks = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Webhooks</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure callback targets to receive real-time updates for delivery events.</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Add Webhook
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Webhook Listeners</CardTitle>
          <CardDescription>Each webhook event payload carries a signature hash to verify origin integrity.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <WebhookIcon className="w-8 h-8" />
          </div>
          <p>No endpoints configured.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Webhooks;
