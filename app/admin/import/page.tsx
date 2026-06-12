'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Link2,
  FileText,
  FolderTree,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Settings,
  Activity,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const importTypes = [
  { id: 'asin', name: 'ASIN Import', icon: Link2, description: 'Import from Amazon ASIN', color: 'bg-orange-500' },
  { id: 'csv', name: 'CSV Import', icon: FileText, description: 'Bulk import from CSV file', color: 'bg-blue-500' },
  { id: 'url', name: 'URL Import', icon: Link2, description: 'Import from product URL', color: 'bg-green-500' },
  { id: 'category', name: 'Category Import', icon: FolderTree, description: 'Import from browse nodes', color: 'bg-purple-500' },
];

const importQueue = [
  {
    id: 'job-001',
    name: 'Electronics Product Batch',
    type: 'ASIN',
    status: 'running',
    progress: 67,
    totalItems: 150,
    processedItems: 100,
    createdAt: '2024-06-10 09:15:00',
    estimatedTime: '12 min remaining',
  },
  {
    id: 'job-002',
    name: 'Headphones Catalog',
    type: 'CSV',
    status: 'pending',
    progress: 0,
    totalItems: 45,
    processedItems: 0,
    createdAt: '2024-06-10 09:20:00',
    estimatedTime: 'Queued',
  },
  {
    id: 'job-003',
    name: 'Smartphones Update',
    type: 'URL',
    status: 'completed',
    progress: 100,
    totalItems: 28,
    processedItems: 28,
    createdAt: '2024-06-09 14:30:00',
    estimatedTime: 'Completed',
  },
];

const importHistory = [
  { name: 'Laptops Batch Import', items: 120, success: 118, failed: 2, date: 'Jun 9, 2024', type: 'CSV' },
  { name: 'Amazon ASIN Sync', items: 85, success: 85, failed: 0, date: 'Jun 8, 2024', type: 'ASIN' },
  { name: 'Audio Products', items: 45, success: 43, failed: 2, date: 'Jun 7, 2024', type: 'URL' },
];

export default function ImportCenterPage() {
  const [activeTab, setActiveTab] = useState<'wizards' | 'queue' | 'history'>('wizards');
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30';
      case 'pending': return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30';
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-950/30';
      case 'failed': return 'text-red-600 bg-red-50 dark:bg-red-950/30';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Import Center</h1>
          <p className="text-muted-foreground">Import products from multiple sources</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button
            onClick={() => setShowImportWizard(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            New Import
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Jobs</p>
          <p className="text-2xl font-bold text-foreground">2</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Queued Items</p>
          <p className="text-2xl font-bold text-foreground">45</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Today Imported</p>
          <p className="text-2xl font-bold text-foreground">28</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">Success Rate</p>
          <p className="text-2xl font-bold text-green-600">98.4%</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="flex gap-4">
          {[
            { id: 'wizards', label: 'Import Wizards', icon: Upload },
            { id: 'queue', label: 'Import Queue', icon: Activity },
            { id: 'history', label: 'History', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-brand-pink text-brand-pink'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'wizards' && (
          <motion.div
            key="wizards"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            {importTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setSelectedType(type.id);
                  setShowImportWizard(true);
                  setWizardStep(1);
                }}
                className="group rounded-xl border border-border bg-card p-6 text-left hover:border-brand-pink hover:shadow-md transition-all"
              >
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', type.color)}>
                  <type.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-foreground group-hover:text-brand-pink transition-colors">
                  {type.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
              </button>
            ))}
          </motion.div>
        )}

        {activeTab === 'queue' && (
          <motion.div
            key="queue"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {importQueue.map((job) => (
              <div key={job.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={cn('rounded-lg p-2', getStatusColor(job.status))}>
                      {job.status === 'running' && <RefreshCw className="h-4 w-4 animate-spin" />}
                      {job.status === 'pending' && <Clock className="h-4 w-4" />}
                      {job.status === 'completed' && <Check className="h-4 w-4" />}
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{job.name}</h3>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <span>{job.type}</span>
                        <span>•</span>
                        <span>{job.totalItems} items</span>
                        <span>•</span>
                        <span>{job.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium capitalize', getStatusColor(job.status))}>
                      {job.status}
                    </span>
                  </div>
                </div>
                {job.status === 'running' && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{job.processedItems} / {job.totalItems} items</span>
                      <span className="font-medium text-foreground">{job.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className="h-full bg-brand-gradient rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{job.estimatedTime}</p>
                  </div>
                )}
                {job.status === 'running' && (
                  <div className="flex items-center gap-2 mt-4">
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition-colors">
                      <Pause className="h-3.5 w-3.5" />
                      Pause
                    </button>
                    <button className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Import Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Items</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Success</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Failed</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {importHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{item.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.type}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.items}</td>
                      <td className="px-4 py-3 text-sm text-green-600">{item.success}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{item.failed}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import Wizard Modal */}
      <AnimatePresence>
        {showImportWizard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowImportWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl bg-card border p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Import Wizard</h2>
                <button onClick={() => setShowImportWizard(false)} className="rounded-lg p-2 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Steps */}
              <div className="flex items-center gap-2 mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                      wizardStep >= step ? 'bg-brand-gradient text-white' : 'bg-muted text-muted-foreground'
                    )}>
                      {step}
                    </div>
                    {step < 3 && <div className={cn('w-8 h-0.5', wizardStep > step ? 'bg-brand-pink' : 'bg-muted')} />}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Select Import Type</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {importTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn(
                          'p-4 rounded-xl border text-left transition-all',
                          selectedType === type.id
                            ? 'border-brand-pink bg-brand-pink/5'
                            : 'border-border hover:border-brand-pink/50'
                        )}
                      >
                        <p className="font-medium">{type.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-4">
                  <h3 className="font-medium">Configure Import</h3>
                  <div>
                    <label className="block text-sm font-medium mb-2">Import Name</label>
                    <input
                      type="text"
                      placeholder="Enter a name for this import..."
                      className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:border-brand-pink focus:outline-none focus:ring-1 focus:ring-brand-pink"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Category</label>
                    <select className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm">
                      <option>Select category...</option>
                      <option>Smartphones</option>
                      <option>Laptops</option>
                      <option>Audio</option>
                    </select>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="space-y-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/30 flex items-center justify-center mx-auto">
                    <Check className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-medium">Ready to Import</h3>
                  <p className="text-sm text-muted-foreground">Your import job has been configured and is ready to start.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-8 pt-4 border-t">
                <button
                  onClick={() => setWizardStep(Math.max(1, wizardStep - 1))}
                  disabled={wizardStep === 1}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={() => {
                    if (wizardStep < 3) {
                      setWizardStep(wizardStep + 1);
                    } else {
                      setShowImportWizard(false);
                      setWizardStep(1);
                      setSelectedType(null);
                    }
                  }}
                  className="px-6 py-2 rounded-lg bg-brand-gradient text-white text-sm font-medium hover:opacity-90"
                >
                  {wizardStep === 3 ? 'Start Import' : 'Continue'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
