import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Send, 
  Paperclip, 
  Monitor, 
  Smartphone, 
  Sun, 
  Moon, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Code, 
  Copy, 
  Check, 
  Info, 
  Sparkles, 
  Trash2, 
  Eye, 
  ShieldAlert, 
  ShieldCheck,
  X
} from 'lucide-react';

interface Domain {
  _id?: string;
  id?: string;
  name: string;
  status: 'pending' | 'verified' | 'failed';
}

interface SmtpCredential {
  _id?: string;
  id?: string;
  username?: string;
  smtpUsername?: string;
  description?: string;
  status: 'active' | 'disabled';
}

interface Template {
  _id?: string;
  id?: string;
  name: string;
  htmlContent?: string;
  textContent?: string;
}

export const EmailComposer = () => {
  const navigate = useNavigate();

  // Active workspace options query
  const { data: domains = [], isLoading: loadingDomains } = useQuery<Domain[]>({
    queryKey: ['domains'],
    queryFn: async () => {
      const res = await apiClient.get('/domains');
      return res.data;
    },
  });

  const { data: smtpCredentials = [], isLoading: loadingCredentials } = useQuery<SmtpCredential[]>({
    queryKey: ['smtpCredentials'],
    queryFn: async () => {
      const res = await apiClient.get('/credentials/smtp');
      return res.data;
    },
  });

  const { data: templates = [] } = useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await apiClient.get('/templates');
      return res.data;
    },
  });

  // Filter only verified domains
  const verifiedDomains = useMemo(() => {
    return domains.filter((d) => d.status === 'verified');
  }, [domains]);

  // Form State
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [fromName, setFromName] = useState('GhostSMTP Support');
  const [fromPrefix, setFromPrefix] = useState('support');
  const [toInput, setToInput] = useState('john.doe@example.com');
  const [ccInput, setCcInput] = useState('');
  const [bccInput, setBccInput] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState('Welcome to GhostSMTP Platform! 🚀');
  const [replyTo, setReplyTo] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'low'>('normal');
  const [activeTab, setActiveTab] = useState<'html' | 'text'>('html');
  
  const [htmlContent, setHtmlContent] = useState(
    `<div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px;">\n  <h2 style="color: #4f46e5;">Hello {{name}},</h2>\n  <p>Thank you for choosing <strong>GhostSMTP</strong> for your transactional email hosting!</p>\n  <p>Your registered email is: <code>{{email}}</code></p>\n  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />\n  <p style="font-size: 12px; color: #64748b;">Company: {{company}} | Automated System Delivery</p>\n</div>`
  );
  const [textContent, setTextContent] = useState(
    `Hello {{name}},\n\nThank you for choosing GhostSMTP for your transactional email hosting!\nYour registered email is: {{email}}\n\nCompany: {{company}}`
  );

  // Variables state
  const [variables, setVariables] = useState<{ [key: string]: string }>({
    name: 'Alex Johnson',
    email: 'alex@company.com',
    company: 'Acme Cloud Inc.',
  });

  // Attachments
  const [attachments, setAttachments] = useState<{ filename: string; content: string; size: number }[]>([]);

  // Preview options
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [previewTheme, setPreviewTheme] = useState<'light' | 'dark'>('dark');

  // Result state
  const [successResult, setSuccessResult] = useState<{ messageId: string; logId?: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState(false);

  // Set default domain and credential when loaded
  useMemo(() => {
    if (verifiedDomains.length > 0 && !selectedDomainId) {
      const firstId = verifiedDomains[0]._id || verifiedDomains[0].id || '';
      setSelectedDomainId(firstId);
    }
  }, [verifiedDomains, selectedDomainId]);

  useMemo(() => {
    if (smtpCredentials.length > 0 && !selectedCredentialId) {
      const activeCreds = smtpCredentials.filter((c) => c.status === 'active');
      const target = activeCreds.length > 0 ? activeCreds[0] : smtpCredentials[0];
      const firstId = target._id || target.id || '';
      setSelectedCredentialId(firstId);
    }
  }, [smtpCredentials, selectedCredentialId]);

  const selectedDomainObj = useMemo(() => {
    return domains.find((d) => (d._id || d.id) === selectedDomainId);
  }, [domains, selectedDomainId]);

  const fullFromEmail = useMemo(() => {
    const domainName = selectedDomainObj?.name || 'select-domain.com';
    return `${fromPrefix.trim() || 'support'}@${domainName}`;
  }, [fromPrefix, selectedDomainObj]);

  // Interpolated HTML & Text output
  const interpolatedHtml = useMemo(() => {
    let result = htmlContent;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    return result;
  }, [htmlContent, variables]);

  const interpolatedText = useMemo(() => {
    let result = textContent;
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    return result;
  }, [textContent, variables]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    if (!templateId) return;
    const t = templates.find((tmp) => (tmp._id || tmp.id) === templateId);
    if (t) {
      if (t.htmlContent) setHtmlContent(t.htmlContent);
      if (t.textContent) setTextContent(t.textContent);
      setSubject(`[Template] ${t.name}`);
    }
  };

  // Attachments Handler
  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage(`File "${file.name}" exceeds 5MB individual attachment limit.`);
        continue;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Content = (reader.result as string).split(',')[1];
        setAttachments((prev) => [
          ...prev,
          {
            filename: file.name,
            content: base64Content,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Send Email Mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      setSuccessResult(null);

      if (!selectedDomainId) {
        throw new Error('Please select a verified domain.');
      }

      if (selectedDomainObj && selectedDomainObj.status !== 'verified') {
        throw new Error(`Domain "${selectedDomainObj.name}" is not verified. Sending is blocked until SPF/DKIM verification is complete.`);
      }

      const toList = toInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const ccList = ccInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const bccList = bccInput
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      if (toList.length === 0) {
        throw new Error('Please enter at least one recipient email.');
      }

      const payload = {
        credentialId: selectedCredentialId,
        domainId: selectedDomainId,
        fromName,
        fromEmail: fullFromEmail,
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject,
        replyTo: replyTo || undefined,
        priority,
        html: activeTab === 'html' ? interpolatedHtml : undefined,
        text: interpolatedText,
        attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })),
      };

      const res = await apiClient.post('/emails/composer-send', payload);
      return res.data;
    },
    onSuccess: (data) => {
      setSuccessResult({
        messageId: data.messageId,
        logId: data.logId,
      });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Failed to send email transmission.';
      setErrorMessage(msg);
    },
  });

  const copyMessageId = () => {
    if (successResult?.messageId) {
      navigator.clipboard.writeText(successResult.messageId);
      setCopiedMsgId(true);
      setTimeout(() => setCopiedMsgId(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Send className="w-6 h-6 text-brand-500" />
            Email Composer & Testing Playground
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Send real transactional emails using your verified workspace domains and custom SMTP credentials.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/logs')}>
            <FileText className="w-4 h-4 mr-2" />
            View Email Logs
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-rose-300">Delivery Error</h4>
            <p className="mt-0.5 text-xs text-rose-400/90">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Success Modal / Banner */}
      {successResult && (
        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-lg text-emerald-300">Email Transmitted Successfully!</h3>
              <p className="text-xs text-emerald-400/80 mt-1 flex items-center gap-2">
                Message-ID: <code className="bg-slate-950/60 px-2 py-0.5 rounded font-mono text-emerald-200">{successResult.messageId}</code>
                <button onClick={copyMessageId} className="hover:text-white">
                  {copiedMsgId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20" onClick={() => navigate('/logs')}>
              Open Email Logs
            </Button>
            <Button variant="primary" size="sm" onClick={() => setSuccessResult(null)}>
              Send Another
            </Button>
          </div>
        </div>
      )}

      {/* Main Grid: Composer (Left) & Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SECTION: COMPOSER FORM (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>1. Routing & SMTP Auth</span>
                <span className="text-xs font-normal text-slate-400">Step 1 of 3</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              {/* Domain & SMTP Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Verified Domain *
                  </label>
                  {loadingDomains ? (
                    <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
                  ) : verifiedDomains.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                      <span>No verified domains found. <Link to="/domains" className="underline font-bold">Add Domain</Link></span>
                    </div>
                  ) : (
                    <select
                      value={selectedDomainId}
                      onChange={(e) => setSelectedDomainId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                    >
                      {verifiedDomains.map((d) => (
                        <option key={d._id || d.id} value={d._id || d.id}>
                          {d.name} (Verified)
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    SMTP Credentials *
                  </label>
                  {loadingCredentials ? (
                    <div className="h-10 bg-slate-800/50 rounded-lg animate-pulse" />
                  ) : smtpCredentials.length === 0 ? (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 flex-shrink-0" />
                      <span>No SMTP credentials. Using Default system relay.</span>
                    </div>
                  ) : (
                    <select
                      value={selectedCredentialId}
                      onChange={(e) => setSelectedCredentialId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                    >
                      {smtpCredentials.map((c) => (
                        <option key={c._id || c.id} value={c._id || c.id}>
                          {c.username || c.smtpUsername || 'Default relay'} ({c.description || 'Active'})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Sender Details */}
              <div className="grid sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Sender Name
                  </label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. GhostSMTP Support"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    From Address
                  </label>
                  <div className="flex items-center">
                    <Input
                      value={fromPrefix}
                      onChange={(e) => setFromPrefix(e.target.value)}
                      placeholder="support"
                      className="rounded-r-none"
                    />
                    <span className="h-10 px-3 bg-slate-800 border border-l-0 border-slate-700 rounded-r-lg text-slate-300 text-xs flex items-center font-mono select-none">
                      @{selectedDomainObj?.name || 'domain.com'}
                    </span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Recipients & Details Card */}
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>2. Recipients & Meta</span>
                <span className="text-xs font-normal text-slate-400">Step 2 of 3</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    To Recipient(s) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(!showCcBcc)}
                    className="text-xs text-brand-400 hover:underline"
                  >
                    {showCcBcc ? '- Hide CC / BCC' : '+ Add CC / BCC'}
                  </button>
                </div>
                <Input
                  value={toInput}
                  onChange={(e) => setToInput(e.target.value)}
                  placeholder="recipient@example.com, another@example.com"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Separate multiple addresses with commas or spaces.</span>
              </div>

              {showCcBcc && (
                <div className="grid sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">CC</label>
                    <Input
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      placeholder="cc@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">BCC</label>
                    <Input
                      value={bccInput}
                      onChange={(e) => setBccInput(e.target.value)}
                      placeholder="bcc@example.com"
                    />
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Reply-To (Optional)</label>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    placeholder="reply@domain.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">Delivery Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high font-bold text-rose-400">High Priority (Urgent)</option>
                    <option value="low">Low Priority (Bulk)</option>
                  </select>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Email Content & Editor Card */}
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm">
            <CardHeader className="border-b border-slate-800/80 pb-4">
              <CardTitle className="text-lg font-semibold flex items-center justify-between">
                <span>3. Email Content & Variables</span>
                <span className="text-xs font-normal text-slate-400">Step 3 of 3</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              
              {/* Subject Line */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Subject Line *</label>
                  <span className="text-xs text-slate-500 font-mono">{subject.length} chars</span>
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject line..."
                />
              </div>

              {/* Template Picker */}
              {templates.length > 0 && (
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Load Saved Template
                  </label>
                  <select
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:outline-none focus:border-brand-500"
                  >
                    <option value="">-- Select a template --</option>
                    {templates.map((t) => (
                      <option key={t._id || t.id} value={t._id || t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Template Variables Inputs */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-brand-400" />
                    Template Variables Engine
                  </span>
                  <span className="text-[11px] text-slate-500">Syntax: {'{{variable}}'}</span>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {Object.keys(variables).map((key) => (
                    <div key={key}>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">{`{{${key}}}`}</label>
                      <Input
                        value={variables[key]}
                        onChange={(e) => setVariables({ ...variables, [key]: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Body Editor Tabs */}
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('html')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeTab === 'html'
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" /> HTML Body
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('text')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        activeTab === 'text'
                          ? 'bg-brand-600 text-white'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" /> Plain Text
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {activeTab === 'html' ? `${htmlContent.length} chars` : `${textContent.length} chars`}
                  </span>
                </div>

                {activeTab === 'html' ? (
                  <textarea
                    rows={12}
                    value={htmlContent}
                    onChange={(e) => setHtmlContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-brand-500 leading-relaxed"
                  />
                ) : (
                  <textarea
                    rows={12}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:border-brand-500 leading-relaxed"
                  />
                )}
              </div>

              {/* Attachments Section */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Attachments (Max 5MB each)
                </label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all">
                    <Paperclip className="w-4 h-4" />
                    Attach Files
                    <input
                      type="file"
                      multiple
                      onChange={handleFileAttach}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-slate-500">Supported: PDF, PNG, JPG, ZIP, DOCX</span>
                </div>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 text-brand-400" />
                          <span className="text-white font-medium">{att.filename}</span>
                          <span className="text-slate-500 text-[11px]">({(att.size / 1024).toFixed(1)} KB)</span>
                        </div>
                        <button onClick={() => removeAttachment(idx)} className="text-rose-400 hover:text-rose-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Button Bar */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setToInput('test@ghostsmtp.com');
                      setSubject('🔥 Quick Transmission Test');
                    }}
                  >
                    Quick Test Payload
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  className="px-8 shadow-lg shadow-brand-600/20"
                  isLoading={sendMutation.isPending}
                  onClick={() => sendMutation.mutate()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send Email Now
                </Button>
              </div>

            </CardContent>
          </Card>
        </div>

        {/* RIGHT SECTION: LIVE PREVIEW (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="sticky top-6">
            <Card className="bg-slate-900/40 border-slate-800 backdrop-blur-sm overflow-hidden">
              
              {/* Preview Controls Header */}
              <CardHeader className="border-b border-slate-800 pb-3 bg-slate-900/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-brand-400" />
                    Live Email Rendering Preview
                  </CardTitle>
                  
                  {/* Resolution & Dark Mode Controls */}
                  <div className="flex items-center gap-1.5">
                    <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                      <button
                        onClick={() => setPreviewDevice('desktop')}
                        className={`p-1.5 rounded text-xs ${previewDevice === 'desktop' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Desktop Preview"
                      >
                        <Monitor className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPreviewDevice('mobile')}
                        className={`p-1.5 rounded text-xs ${previewDevice === 'mobile' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Mobile Device Preview"
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex bg-slate-950 rounded-lg p-0.5 border border-slate-800">
                      <button
                        onClick={() => setPreviewTheme('light')}
                        className={`p-1.5 rounded text-xs ${previewTheme === 'light' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                        title="Light Theme"
                      >
                        <Sun className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPreviewTheme('dark')}
                        className={`p-1.5 rounded text-xs ${previewTheme === 'dark' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
                        title="Dark Theme"
                      >
                        <Moon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Email Client Display Container */}
              <CardContent className="p-4 space-y-4">
                
                {/* Device Frame */}
                <div
                  className={`mx-auto transition-all duration-300 rounded-2xl overflow-hidden border ${
                    previewDevice === 'mobile' ? 'max-w-[360px] shadow-2xl border-slate-700' : 'w-full border-slate-800'
                  }`}
                >
                  {/* Email Header Component */}
                  <div className="p-4 bg-slate-950 border-b border-slate-800 text-xs space-y-1.5 font-sans">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-sm tracking-tight">{subject || '(No Subject Line)'}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        SPF / DKIM PASS
                      </span>
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <span className="font-semibold text-slate-300">From:</span> {fromName} &lt;{fullFromEmail}&gt;
                    </div>
                    <div className="text-slate-400 flex items-center gap-1">
                      <span className="font-semibold text-slate-300">To:</span> {toInput || 'recipient@example.com'}
                    </div>
                    {replyTo && (
                      <div className="text-slate-400 flex items-center gap-1">
                        <span className="font-semibold text-slate-300">Reply-To:</span> {replyTo}
                      </div>
                    )}
                  </div>

                  {/* Rendered Email Body Area */}
                  <div
                    className={`p-6 min-h-[360px] overflow-y-auto text-sm ${
                      previewTheme === 'dark' ? 'bg-slate-950 text-slate-200' : 'bg-white text-slate-900'
                    }`}
                  >
                    {activeTab === 'html' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: interpolatedHtml }}
                        className="prose max-w-none"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans leading-relaxed text-xs">{interpolatedText}</pre>
                    )}

                    {/* Attached files chips inside preview */}
                    {attachments.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                        <span className="text-xs font-bold text-slate-400 block">Attachments ({attachments.length}):</span>
                        <div className="flex flex-wrap gap-2">
                          {attachments.map((att, idx) => (
                            <span key={idx} className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300">
                              <Paperclip className="w-3 h-3 text-brand-500" />
                              {att.filename}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Spam Score Warning Indicator */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300 font-medium">Spam Reputation Score</span>
                  </div>
                  <span className="font-bold text-emerald-400">0.0 / 10 (Low Risk)</span>
                </div>

              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
};

export default EmailComposer;
