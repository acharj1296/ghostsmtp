import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Globe, Plus } from 'lucide-react';

export const Domains = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Domains</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Configure SPF, DKIM, and DMARC parameters to send mail from custom hosts.</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Add Domain
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configured Domains</CardTitle>
          <CardDescription>Verify DNS settings to activate sending permissions.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <Globe className="w-8 h-8" />
          </div>
          <p>No domain configurations found.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Domains;
