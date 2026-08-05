import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { DnsRecordsDisplay } from './DnsRecordsDisplay';
import { RefreshCw, AlertCircle, CheckCircle, TrendingUp } from 'lucide-react';

interface DnsTabsProps {
  domainId: string;
  domainName: string;
  onCopy: (text: string, label: string) => void;
}

export const DnsTabs = ({ domainId, domainName, onCopy }: DnsTabsProps) => {
  const [activeTab, setActiveTab] = useState('records');

  // Fetch comprehensive DNS data
  const { data: dnsData, isLoading: dnsLoading } = useQuery({
    queryKey: ['dns-comprehensive', domainId],
    queryFn: async () => {
      const res = await apiClient.get(`/domains/${domainId}/dns-comprehensive`);
      return res.data;
    },
    enabled: !!domainId,
  });

  // Fetch health score
  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['dns-health', domainId],
    queryFn: async () => {
      const res = await apiClient.get(`/domains/${domainId}/dns-health`);
      return res.data;
    },
    enabled: !!domainId && activeTab === 'health',
  });

  // Fetch propagation status
  const { data: propagationData, isLoading: propagationLoading, refetch: refetchPropagation } = useQuery({
    queryKey: ['dns-propagation', domainId],
    queryFn: async () => {
      const res = await apiClient.get(`/domains/${domainId}/dns-propagation`);
      return res.data;
    },
    enabled: !!domainId && activeTab === 'propagation',
  });

  // Fetch deliverability report
  const { data: deliverabilityData, isLoading: deliverabilityLoading, refetch: refetchDeliverability } = useQuery({
    queryKey: ['deliverability', domainId],
    queryFn: async () => {
      const res = await apiClient.get(`/domains/${domainId}/deliverability`);
      return res.data;
    },
    enabled: !!domainId && activeTab === 'deliverability',
  });

  const buildRecordsList = () => {
    if (!dnsData?.dnsRecords) return [];

    const records: any[] = [];
    const recordData = dnsData.dnsRecords;

    // Add all record types
    Object.entries(recordData).forEach(([key, record]: [string, any]) => {
      if (record && record.value) {
        records.push({
          type: record.type,
          host: record.host,
          priority: record.priority,
          value: record.value,
          purpose: record.purpose,
          verified: dnsData.verification?.[`${key}Verified`] || false,
        });
      }
    });

    return records;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>DNS Configuration Details</CardTitle>
        <CardDescription>Complete DNS records and deliverability analysis for {domainName}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="propagation">Propagation</TabsTrigger>
            <TabsTrigger value="deliverability">Deliverability</TabsTrigger>
          </TabsList>

          {/* DNS Records Tab */}
          <TabsContent value="records" className="space-y-4">
            {dnsLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Loading DNS records...
              </div>
            ) : (
              <DnsRecordsDisplay
                records={buildRecordsList()}
                healthScore={dnsData?.health?.score}
                propagationPercentage={dnsData?.propagation?.overallPropagationPercentage}
                deliverabilityStatus={dnsData?.deliverability?.status}
                onCopy={onCopy}
              />
            )}
          </TabsContent>

          {/* Health Score Tab */}
          <TabsContent value="health" className="space-y-4">
            {healthLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Calculating health score...
              </div>
            ) : healthData ? (
              <div className="space-y-6">
                {/* Health Score Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="col-span-1 md:col-span-2 border border-slate-700 bg-slate-900/50 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">DNS Health Score</h3>
                        <p className="text-slate-400 text-sm">Overall email infrastructure quality</p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => refetchHealth()}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-300">Score</span>
                          <span className="text-3xl font-bold text-emerald-400">{healthData.score}/100</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-3">
                          <div
                            className="h-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                            style={{ width: `${healthData.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border border-slate-700 bg-slate-900/50 rounded-lg p-6 flex flex-col justify-center">
                    <div className="text-center">
                      <div className="text-5xl font-bold mb-2" style={{
                        color: healthData.grade === 'A' ? '#10b981' : healthData.grade === 'B' ? '#3b82f6' : healthData.grade === 'C' ? '#f59e0b' : '#ef4444'
                      }}>
                        {healthData.grade}
                      </div>
                      <p className="text-slate-400">Grade</p>
                    </div>
                  </div>
                </div>

                {/* Factor Breakdown */}
                <div className="border border-slate-700 bg-slate-900/50 rounded-lg p-6">
                  <h3 className="font-semibold mb-4">Score Breakdown</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(healthData.breakdown).map(([factor, points]: [string, any]) => (
                      <div key={factor} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
                        <span className="capitalize text-slate-300">{factor}</span>
                        <span className="font-semibold text-emerald-400">{points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {healthData.recommendations.length > 0 && (
                  <div className="border border-amber-700/50 bg-amber-900/10 rounded-lg p-6">
                    <h3 className="font-semibold text-amber-200 mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {healthData.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-amber-100/90">
                          <span className="text-amber-400 mt-0.5">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </TabsContent>

          {/* Propagation Tab */}
          <TabsContent value="propagation" className="space-y-4">
            {propagationLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Checking DNS propagation...
              </div>
            ) : propagationData ? (
              <div className="space-y-4">
                <div className="border border-slate-700 bg-slate-900/50 rounded-lg p-6 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Overall Propagation</h3>
                      <p className="text-slate-400 text-sm">Percentage of global DNS servers showing your records</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refetchPropagation()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="text-4xl font-bold text-emerald-400">
                      {propagationData.overallPropagationPercentage}%
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-3">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                        style={{ width: `${propagationData.overallPropagationPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Per-Record Propagation */}
                <div className="space-y-3">
                  {propagationData.records.map((rec: any, idx: number) => (
                    <div key={idx} className="border border-slate-700 bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline">{rec.type}</Badge>
                          <div>
                            <p className="font-semibold text-sm">{rec.label}</p>
                            <p className="text-xs text-slate-400">{rec.host}</p>
                          </div>
                        </div>
                        <span className="text-xl font-bold text-emerald-400">{rec.propagationPercentage}%</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2 mb-3">
                        <div
                          className="h-2 rounded-full bg-emerald-500"
                          style={{ width: `${rec.propagationPercentage}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                        {rec.resolvers.map((resolver: any) => (
                          <div key={resolver.ip} className="flex items-center gap-2">
                            {resolver.verified ? (
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <AlertCircle className="w-3 h-3 text-amber-500" />
                            )}
                            <span className="text-slate-300">{resolver.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </TabsContent>

          {/* Deliverability Tab */}
          <TabsContent value="deliverability" className="space-y-4">
            {deliverabilityLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Analyzing deliverability...
              </div>
            ) : deliverabilityData ? (
              <div className="space-y-6">
                {/* Status Card */}
                <div className={`border rounded-lg p-6 ${
                  deliverabilityData.status === 'excellent' ? 'border-emerald-500/50 bg-emerald-900/10' :
                  deliverabilityData.status === 'good' ? 'border-blue-500/50 bg-blue-900/10' :
                  deliverabilityData.status === 'needs_improvement' ? 'border-amber-500/50 bg-amber-900/10' :
                  'border-rose-500/50 bg-rose-900/10'
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Deliverability Status</h3>
                      <p className="text-slate-400 text-sm">{deliverabilityData.summary}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => refetchDeliverability()}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Score</p>
                      <p className="text-2xl font-bold">{deliverabilityData.score}/100</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">Status</p>
                      <Badge variant={
                        deliverabilityData.status === 'excellent' ? 'success' :
                        deliverabilityData.status === 'good' ? 'default' :
                        'warning'
                      }>
                        {deliverabilityData.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Factor Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(deliverabilityData.details).map(([factor, detail]: [string, any]) => (
                    <div key={factor} className="border border-slate-700 bg-slate-900/50 rounded-lg p-4">
                      <h4 className="font-semibold text-sm capitalize mb-2">{factor.replace('_', ' ')}</h4>
                      <div className="space-y-2">
                        {detail.configured !== undefined && (
                          <p className="text-xs text-slate-300">
                            {detail.configured ? '✓ Configured' : '✗ Not configured'}
                          </p>
                        )}
                        {detail.valid !== undefined && (
                          <p className="text-xs text-slate-300">
                            {detail.valid ? '✓ Valid' : '✗ Invalid'}
                          </p>
                        )}
                        {detail.present !== undefined && (
                          <p className="text-xs text-slate-300">
                            {detail.present ? '✓ Present' : '✗ Missing'}
                          </p>
                        )}
                        {detail.capable !== undefined && (
                          <p className="text-xs text-slate-300">
                            {detail.capable ? '✓ Capable' : '✗ Not capable'}
                          </p>
                        )}
                        {detail.issues && detail.issues.length > 0 && (
                          <ul className="text-xs text-amber-200 space-y-1 mt-2">
                            {detail.issues.map((issue: string, i: number) => (
                              <li key={i} className="text-amber-100/80">• {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Recommendations */}
                {deliverabilityData.recommendations.length > 0 && (
                  <div className="border border-blue-700/50 bg-blue-900/10 rounded-lg p-6">
                    <h3 className="font-semibold text-blue-200 mb-4">Recommendations</h3>
                    <ul className="space-y-2">
                      {deliverabilityData.recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm text-blue-100/90">
                          <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DnsTabs;
