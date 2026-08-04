import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog } from '../components/ui/dialog';
import { Notification } from '../components/ui/notification';
import { FileCode, Plus, Trash2, Eye, RefreshCw, ShieldAlert, Code2, Type } from 'lucide-react';

export const Templates = () => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Create template form
  const [templateName, setTemplateName] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [textContent, setTextContent] = useState('');

  // Notification states
  const [notify, setNotify] = useState({ show: false, title: '', message: '', type: 'info' as any });

  const showNotification = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setNotify({ show: true, title, message, type });
  };

  // Queries
  const { data: templates = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get('/templates');
      return res.data;
    },
  });

  const selectedTemplate = templates.find((t: any) => t._id === selectedTemplateId);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: { name: string; htmlContent: string; textContent: string }) => {
      const res = await apiClient.post('/templates', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setIsCreateOpen(false);
      setTemplateName('');
      setHtmlContent('');
      setTextContent('');
      setSelectedTemplateId(data._id);
      showNotification('Success', 'Template created successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to create template.', 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      if (selectedTemplateId) setSelectedTemplateId(null);
      showNotification('Success', 'Template deleted successfully.', 'success');
    },
    onError: (err: any) => {
      showNotification('Error', err.response?.data?.error || 'Failed to delete template.', 'error');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) return;
    createMutation.mutate({
      name: templateName.trim(),
      htmlContent,
      textContent,
    });
  };

  return (
    <div className="space-y-6">
      <Notification
        show={notify.show}
        title={notify.title}
        message={notify.message}
        type={notify.type}
        onClose={() => setNotify({ ...notify, show: false })}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Templates</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create and compile custom transactional Handlebars layout templates.</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Create Template
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Table Panel */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>My Templates</CardTitle>
              <CardDescription>Raw HTML structures with optional plain-text alternatives.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center text-slate-500 gap-3">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Loading templates...
                </div>
              ) : isError ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-500 gap-3">
                  <ShieldAlert className="w-8 h-8 text-rose-500" />
                  <p>Failed to load templates.</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
                </div>
              ) : templates.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-400 text-sm gap-4">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
                    <FileCode className="w-8 h-8" />
                  </div>
                  <p>No layouts saved yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Created At</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((t: any) => (
                      <TableRow key={t._id} className={selectedTemplateId === t._id ? 'bg-slate-50 dark:bg-slate-800/40' : ''}>
                        <TableCell className="font-semibold text-slate-900 dark:text-white">{t.name}</TableCell>
                        <TableCell>
                          <Badge variant={t.htmlContent ? 'info' : 'neutral'}>
                            {t.htmlContent ? 'HTML' : 'Text'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-xs">
                          {new Date(t.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTemplateId(t._id)}
                            className="flex items-center gap-1 text-slate-600 dark:text-slate-300"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMutation.mutate(t._id)}
                            className="flex items-center gap-1 text-rose-500 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Details Panel */}
        <div className="lg:col-span-1">
          {selectedTemplate ? (
            <Card className="border-slate-300/40 dark:border-slate-800">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                <CardTitle className="text-lg font-bold">{selectedTemplate.name}</CardTitle>
                <CardDescription>Template source contents</CardDescription>
              </CardHeader>
              <CardContent className="p-5 space-y-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5" />
                    HTML Content
                  </span>
                  {selectedTemplate.htmlContent ? (
                    <pre className="text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words max-h-[280px] overflow-auto">
                      {selectedTemplate.htmlContent}
                    </pre>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No HTML content.</p>
                  )}
                </div>

                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5" />
                    Plain Text Content
                  </span>
                  {selectedTemplate.textContent ? (
                    <pre className="text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg mt-1 text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words max-h-[280px] overflow-auto">
                      {selectedTemplate.textContent}
                    </pre>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">No plain-text alternative.</p>
                  )}
                </div>

                <div className="pt-2">
                  <Button
                    variant="danger"
                    onClick={() => deleteMutation.mutate(selectedTemplate._id)}
                    isLoading={deleteMutation.isPending}
                    className="flex justify-center items-center gap-1 text-xs w-full"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 text-sm text-center">
              <FileCode className="w-8 h-8 mb-2" />
              <p>Select a template to inspect its HTML and plain-text source.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Email Template">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input
            label="Template Name"
            placeholder="e.g. Welcome Email"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              HTML Content
            </label>
            <textarea
              value={htmlContent}
              onChange={(e) => setHtmlContent(e.target.value)}
              placeholder="<html><body>{{name}}, welcome to GhostSMTP!</body></html>"
              rows={8}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Plain Text Content <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              placeholder="Hello {{name}}, welcome to GhostSMTP!"
              rows={4}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all resize-y"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" type="button" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" isLoading={createMutation.isPending}>Create Template</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default Templates;
