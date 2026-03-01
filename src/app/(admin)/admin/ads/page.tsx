"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Save,
  Loader2,
  CheckCircle,
  LayoutTemplate,
  MousePointerClick,
  Smartphone,
  Monitor,
  Info,
  AlertCircle,
  ShieldCheck,
  Upload,
  Code,
  ExternalLink,
  Copy,
  FileCheck
} from "lucide-react";

interface AdSettings {
  // Pop Ads
  popAdsEnabled: boolean;
  popAdsCode: string;

  // Propeller Ads
  propellerAdsEnabled: boolean;
  propellerAdsCode: string;

  // Adsterra
  adsterraEnabled: boolean;
  adsterraBannerCode: string;
  adsterraPopCode: string;
  adsterraNativeCode: string;

  // Banner Ads
  headerBannerEnabled: boolean;
  headerBannerCode: string;
  sidebarBannerEnabled: boolean;
  sidebarBannerCode: string;
  footerBannerEnabled: boolean;
  footerBannerCode: string;
  inContentBannerEnabled: boolean;
  inContentBannerCode: string;

  // Verification
  monetagMetaTag: string;
  customVerificationMeta: string;
}

interface VerificationFile {
  name: string;
  uploadedAt: string;
}

const DEFAULT_SETTINGS: AdSettings = {
  popAdsEnabled: false,
  popAdsCode: "",
  propellerAdsEnabled: false,
  propellerAdsCode: "",
  adsterraEnabled: false,
  adsterraBannerCode: "",
  adsterraPopCode: "",
  adsterraNativeCode: "",
  headerBannerEnabled: false,
  headerBannerCode: "",
  sidebarBannerEnabled: false,
  sidebarBannerCode: "",
  footerBannerEnabled: false,
  footerBannerCode: "",
  inContentBannerEnabled: false,
  inContentBannerCode: "",
  monetagMetaTag: "",
  customVerificationMeta: "",
};

export default function AdsPage() {
  const [settings, setSettings] = useState<AdSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("pop");
  const [verificationFiles, setVerificationFiles] = useState<VerificationFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchVerificationFiles();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/ads", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.data });
      }
    } catch (error) {
      console.error("Failed to fetch ad settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchVerificationFiles = async () => {
    try {
      const res = await fetch("/api/admin/ads/verification-files", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setVerificationFiles(data.files || []);
      }
    } catch (error) {
      console.error("Failed to fetch verification files:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file - should be .txt or .html and small
    if (!file.name.match(/\.(txt|html)$/i)) {
      setError("Only .txt or .html files are allowed");
      return;
    }

    if (file.size > 10 * 1024) { // 10KB max
      setError("File too large. Max 10KB allowed.");
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/ads/verification-files", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadSuccess(`File "${file.name}" uploaded successfully!`);
        fetchVerificationFiles();
        setTimeout(() => setUploadSuccess(null), 5000);
      } else {
        setError(data.error || "Failed to upload file");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload file");
    } finally {
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`Delete verification file "${filename}"?`)) return;

    try {
      const res = await fetch(`/api/admin/ads/verification-files?file=${encodeURIComponent(filename)}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();
      if (data.success) {
        fetchVerificationFiles();
      } else {
        setError(data.error || "Failed to delete file");
      }
    } catch (err) {
      console.error("Delete error:", err);
      setError("Failed to delete file");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setUploadSuccess("Copied to clipboard!");
    setTimeout(() => setUploadSuccess(null), 2000);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/admin/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("Failed to save ad settings:", err);
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "verification", label: "Verification", icon: ShieldCheck },
    { id: "pop", label: "Pop Ads", icon: MousePointerClick },
    { id: "propeller", label: "Propeller Ads", icon: Megaphone },
    { id: "adsterra", label: "Adsterra", icon: LayoutTemplate },
    { id: "banner", label: "Banner Ads", icon: Monitor },
  ];

  if (loading) {
    return (
      <div>
        <Header title="Advertisement" />
        <div className="flex h-48 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Advertisement" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Ad Management</h2>
              <p className="text-sm text-muted-foreground">
                Configure advertisement codes for your website
              </p>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
          
          {/* Success Message */}
          {saved && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950/30 dark:text-green-400">
              <CheckCircle className="h-4 w-4" />
              <span>Settings saved successfully!</span>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-400">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Verification Tab */}
        {activeTab === "verification" && (
          <div className="space-y-6">
            {/* Upload Success Message */}
            {uploadSuccess && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-green-700 dark:bg-green-950/30 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {/* Method 1: File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Method 1: Upload Verification File
                  <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                    RECOMMENDED
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-6 text-center">
                  <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">
                    Upload verification file from ad network
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Supports .txt and .html files (max 10KB)
                  </p>
                  <label className="mt-4 inline-block">
                    <input
                      type="file"
                      accept=".txt,.html"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={uploading}
                    />
                    <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Choose File
                        </>
                      )}
                    </span>
                  </label>
                </div>

                {/* Uploaded Files List */}
                {verificationFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Uploaded Verification Files:</p>
                    {verificationFiles.map((file) => (
                      <div
                        key={file.name}
                        className="flex items-center justify-between rounded-lg bg-muted p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className="h-4 w-4 text-green-500" />
                          <span className="font-mono text-sm">{file.name}</span>
                          <a
                            href={`/${file.name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 hover:underline"
                          >
                            <ExternalLink className="inline h-3 w-3" /> View
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {file.uploadedAt}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteFile(file.name)}
                            className="h-7 text-red-500 hover:bg-red-50 hover:text-red-600"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                  <p className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                    <Info className="h-4 w-4" />
                    How it works
                  </p>
                  <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-blue-600 dark:text-blue-300">
                    <li>Download verification file from your ad network (Monetag, PropellerAds, etc.)</li>
                    <li>Upload the file here</li>
                    <li>File will be accessible at: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">yourdomain.com/filename.txt</code></li>
                    <li>Go back to ad network and verify your site</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Method 2: Meta Tag */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Method 2: Meta Tag Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Monetag Meta Tag
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={settings.monetagMetaTag}
                      onChange={(e) =>
                        setSettings({ ...settings, monetagMetaTag: e.target.value })
                      }
                      placeholder='<meta name="monetag" content="your-code-here">'
                      className="font-mono text-sm"
                    />
                    {settings.monetagMetaTag && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(settings.monetagMetaTag)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Paste the complete meta tag from Monetag dashboard
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Custom Verification Meta Tags
                  </label>
                  <Textarea
                    value={settings.customVerificationMeta}
                    onChange={(e) =>
                      setSettings({ ...settings, customVerificationMeta: e.target.value })
                    }
                    placeholder={`<meta name="propeller" content="xxx">
<meta name="adsterra-site-verification" content="xxx">`}
                    rows={4}
                    className="font-mono text-sm"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Add any other verification meta tags (one per line)
                  </p>
                </div>

                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-950/30">
                  <p className="flex items-center gap-2 text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    <AlertCircle className="h-4 w-4" />
                    Important
                  </p>
                  <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-300">
                    After adding meta tags, click "Save All Settings" button above.
                    Meta tags will be automatically added to your site's &lt;head&gt; section.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Supported Networks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Info className="h-4 w-4" />
                  Supported Ad Networks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {[
                    { name: "Monetag", url: "https://monetag.com", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
                    { name: "PropellerAds", url: "https://propellerads.com", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
                    { name: "Adsterra", url: "https://adsterra.com", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
                    { name: "HilltopAds", url: "https://hilltopads.com", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
                  ].map((network) => (
                    <a
                      key={network.name}
                      href={network.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 rounded-lg p-3 text-sm font-medium transition-transform hover:scale-105 ${network.color}`}
                    >
                      {network.name}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pop Ads Tab */}
        {activeTab === "pop" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5" />
                Pop Ads / Popunder Ads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.popAdsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, popAdsEnabled: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                </label>
                <span className="font-medium">Enable Pop Ads</span>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Pop Ads Script Code
                </label>
                <Textarea
                  value={settings.popAdsCode}
                  onChange={(e) =>
                    setSettings({ ...settings, popAdsCode: e.target.value })
                  }
                  placeholder="Paste your pop ads script code here..."
                  rows={6}
                  className="font-mono text-sm"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Paste the complete script tag from your pop ad network
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-950/30">
                <p className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-400">
                  <Info className="h-4 w-4" />
                  How Pop Ads Work
                </p>
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-300">
                  Pop ads open a new window/tab when users click anywhere on your site.
                  The script will be added to all pages automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Propeller Ads Tab */}
        {activeTab === "propeller" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Propeller Ads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.propellerAdsEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, propellerAdsEnabled: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                </label>
                <span className="font-medium">Enable Propeller Ads</span>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Propeller Ads Script Code
                </label>
                <Textarea
                  value={settings.propellerAdsCode}
                  onChange={(e) =>
                    setSettings({ ...settings, propellerAdsCode: e.target.value })
                  }
                  placeholder={`<script src="//example.com/yourcode.js"></script>`}
                  rows={6}
                  className="font-mono text-sm"
                />
              </div>

              <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-950/30">
                <p className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-400">
                  <Info className="h-4 w-4" />
                  PropellerAds Formats
                </p>
                <ul className="mt-2 space-y-1 text-sm text-purple-600 dark:text-purple-300">
                  <li>• Push Notifications</li>
                  <li>• OnClick (Popunder)</li>
                  <li>• Interstitial</li>
                  <li>• In-Page Push</li>
                </ul>
                <a
                  href="https://propellerads.com"
                  target="_blank"
                  className="mt-2 inline-block text-sm text-purple-700 underline dark:text-purple-400"
                >
                  Get PropellerAds Code →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Adsterra Tab */}
        {activeTab === "adsterra" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5" />
                Adsterra Ads
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={settings.adsterraEnabled}
                    onChange={(e) =>
                      setSettings({ ...settings, adsterraEnabled: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                </label>
                <span className="font-medium">Enable Adsterra Ads</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Banner Ad Code
                  </label>
                  <Textarea
                    value={settings.adsterraBannerCode}
                    onChange={(e) =>
                      setSettings({ ...settings, adsterraBannerCode: e.target.value })
                    }
                    placeholder="Paste Adsterra banner code..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Pop Ad Code
                  </label>
                  <Textarea
                    value={settings.adsterraPopCode}
                    onChange={(e) =>
                      setSettings({ ...settings, adsterraPopCode: e.target.value })
                    }
                    placeholder="Paste Adsterra popunder code..."
                    rows={4}
                    className="font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Native Ad Code
                </label>
                <Textarea
                  value={settings.adsterraNativeCode}
                  onChange={(e) =>
                    setSettings({ ...settings, adsterraNativeCode: e.target.value })
                  }
                  placeholder="Paste Adsterra native ad code..."
                  rows={4}
                  className="font-mono text-sm"
                />
              </div>

              <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-950/30">
                <p className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
                  <Info className="h-4 w-4" />
                  Adsterra Ad Formats
                </p>
                <ul className="mt-2 space-y-1 text-sm text-orange-600 dark:text-orange-300">
                  <li>• Popunder - High CPM</li>
                  <li>• Banner - Display ads</li>
                  <li>• Native - Blends with content</li>
                  <li>• Social Bar - Notification style</li>
                </ul>
                <a
                  href="https://adsterra.com"
                  target="_blank"
                  className="mt-2 inline-block text-sm text-orange-700 underline dark:text-orange-400"
                >
                  Get Adsterra Code →
                </a>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner Ads Tab */}
        {activeTab === "banner" && (
          <div className="space-y-6">
            {/* Header Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4" />
                  Header Banner (728x90)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.headerBannerEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, headerBannerEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm">Enable Header Banner</span>
                </div>
                <Textarea
                  value={settings.headerBannerCode}
                  onChange={(e) =>
                    setSettings({ ...settings, headerBannerCode: e.target.value })
                  }
                  placeholder="Paste banner ad code..."
                  rows={3}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Sidebar Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Smartphone className="h-4 w-4" />
                  Sidebar Banner (300x250)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.sidebarBannerEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, sidebarBannerEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm">Enable Sidebar Banner</span>
                </div>
                <Textarea
                  value={settings.sidebarBannerCode}
                  onChange={(e) =>
                    setSettings({ ...settings, sidebarBannerCode: e.target.value })
                  }
                  placeholder="Paste banner ad code..."
                  rows={3}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* In-Content Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <LayoutTemplate className="h-4 w-4" />
                  In-Content Banner (Between content)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.inContentBannerEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, inContentBannerEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm">Enable In-Content Banner</span>
                </div>
                <Textarea
                  value={settings.inContentBannerCode}
                  onChange={(e) =>
                    setSettings({ ...settings, inContentBannerCode: e.target.value })
                  }
                  placeholder="Paste banner ad code..."
                  rows={3}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>

            {/* Footer Banner */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Monitor className="h-4 w-4" />
                  Footer Banner (728x90 or 320x50 mobile)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={settings.footerBannerEnabled}
                      onChange={(e) =>
                        setSettings({ ...settings, footerBannerEnabled: e.target.checked })
                      }
                      className="peer sr-only"
                    />
                    <div className="peer h-6 w-11 rounded-full bg-muted after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-green-500 peer-checked:after:translate-x-full" />
                  </label>
                  <span className="text-sm">Enable Footer Banner</span>
                </div>
                <Textarea
                  value={settings.footerBannerCode}
                  onChange={(e) =>
                    setSettings({ ...settings, footerBannerCode: e.target.value })
                  }
                  placeholder="Paste banner ad code..."
                  rows={3}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
