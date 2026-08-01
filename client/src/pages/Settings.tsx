import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';

export const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Workspace Settings</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Configure multi-tenant configurations, plans, and workspace naming.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenant Preferences</CardTitle>
          <CardDescription>Setup thresholds and configurations for workspace.</CardDescription>
        </CardHeader>
        <CardContent className="h-[200px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <SettingsIcon className="w-8 h-8" />
          </div>
          <p>Settings interface is locked under workspace admin permissions.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;
