import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileCode, Plus } from 'lucide-react';

export const Templates = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Templates</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create and compile custom transactional Handlebars layout templates.</p>
        </div>
        <Button variant="primary" className="flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Templates</CardTitle>
          <CardDescription>Drag & Drop editor options or custom raw HTML structures.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <FileCode className="w-8 h-8" />
          </div>
          <p>No layouts saved yet.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Templates;
