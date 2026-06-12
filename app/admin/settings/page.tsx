'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Palette,
  Globe,
  Link2,
  Mail,
  BarChart3,
  Save,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const tabs = [
  { id: 'general', label: 'General', icon: SettingsIcon },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'affiliate', label: 'Affiliate', icon: Link2 },
  { id: 'seo', label: 'SEO', icon: Globe },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function SettingsAdminPage() {
  const [activeTab, setActiveTab] = React.useState('general');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your application settings</p>
      </div>

      <div className="grid lg:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar */}
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id
                  ? 'bg-muted font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="rounded-xl border bg-card">
          <div className="p-6 space-y-8">
            {activeTab === 'general' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">General Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site Name</label>
                    <Input defaultValue="CSLifestyle" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site URL</label>
                    <Input defaultValue="https://cslifestyle.in" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Site Description</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      defaultValue="India's most trusted product discovery platform. Expert reviews, buying guides, and comparisons."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contact Email</label>
                    <Input defaultValue="contact@cslifestyle.in" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'branding' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">Branding Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-32 h-32 rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-2xl font-bold">CS</p>
                      </div>
                      <div>
                        <Button variant="outline">
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Logo
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Recommended: 200px x 200px, PNG or SVG
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        defaultValue="#E91E8F"
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                      <Input defaultValue="#E91E8F" className="max-w-[200px]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logo Favicon</label>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <p className="text-lg font-bold">C</p>
                      </div>
                      <Button variant="outline" size="sm">
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'affiliate' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">Affiliate Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amazon Affiliate ID</label>
                    <Input placeholder="cslife-21" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Flipkart Affiliate ID</label>
                    <Input placeholder="aff_id=XXXXXXX" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Affiliate Disclosure</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      defaultValue="We may earn a commission when you click links on our site and make a purchase. This helps us maintain our site and continue providing valuable content."
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Auto-append affiliate parameters</p>
                      <p className="text-sm text-muted-foreground">Automatically add affiliate IDs to product URLs</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'seo' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">SEO Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Meta Title</label>
                    <Input defaultValue="CSLifestyle - Find The Best Products Before You Buy" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Default Meta Description</label>
                    <textarea
                      className="w-full min-h-[100px] rounded-lg border bg-background p-3 text-sm"
                      defaultValue="India's most trusted product discovery platform. Expert buying guides, detailed comparisons, and honest reviews for smartphones, laptops, and more."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Search Console Verification</label>
                    <Input placeholder="Enter verification code" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Robots.txt</label>
                    <textarea
                      className="w-full min-h-[150px] rounded-lg border bg-background p-3 text-sm font-mono"
                      defaultValue={`User-agent: *
Allow: /

Sitemap: https://cslifestyle.in/sitemap.xml`}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'email' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">Email Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">SMTP Host</label>
                    <Input placeholder="smtp.example.com" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Port</label>
                      <Input defaultValue="587" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Encryption</label>
                      <select className="w-full h-10 rounded-lg border bg-background px-3">
                        <option>TLS</option>
                        <option>SSL</option>
                        <option>None</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Username</label>
                      <Input placeholder="username" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">SMTP Password</label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">From Email Address</label>
                    <Input defaultValue="noreply@cslifestyle.in" />
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <h2 className="text-lg font-semibold mb-4">Analytics Settings</h2>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Analytics Tracking ID</label>
                    <Input placeholder="G-XXXXXXXXXX" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Google Tag Manager ID</label>
                    <Input placeholder="GTM-XXXXXX" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Custom JavaScript</label>
                    <textarea
                      className="w-full min-h-[150px] rounded-lg border bg-background p-3 text-sm font-mono"
                      placeholder="// Add custom analytics scripts here"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div>
                      <p className="font-medium">Enable Analytics Tracking</p>
                      <p className="text-sm text-muted-foreground">Track page views and user interactions</p>
                    </div>
                    <input type="checkbox" defaultChecked className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3 p-4 border-t">
            <Button variant="outline">Cancel</Button>
            <Button className="bg-brand-gradient">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
