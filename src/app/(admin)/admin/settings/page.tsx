"use client";

import { useEffect, useState, useRef } from "react";
import { Header } from "@/components/admin/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Globe,
  Shield,
  Database,
  Loader2,
  Save,
  Key,
  Link as LinkIcon,
  CheckCircle,
  Upload,
  Film,
  Image as ImageIcon,
  Type,
  Send,
  DollarSign,
  ExternalLink,
} from "lucide-react";

interface SiteSettings {
  siteName: string;
  siteUrl: string;
  siteDescription: string;
  logoType: string; // "text" or "image"
  logoText: string; // custom logo text (can be different from site name)
  logoUrl: string;
  logoIcon: string; // icon name like "Film", "Clapperboard", etc.
  faviconUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  googleAnalyticsId: string;
  footerText: string;
  // Link Monetization Settings
  linkMonetizationEnabled: boolean;
  linkMonetizationUrl: string;
  linkMonetizationExcludeDomains: string;
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  // Admin profile state
  const [adminProfile, setAdminProfile] = useState({
    email: "",
    name: "",
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  const [settings, setSettings] = useState<SiteSettings>({
    siteName: "MovPix",
    siteUrl: "https://moviehub.com",
    siteDescription: "Download latest movies in HD quality",
    logoType: "text",
    logoText: "MovPix",
    logoUrl: "",
    logoIcon: "Film",
    faviconUrl: "/favicon.ico",
    telegramUrl: "https://t.me/moviehub",
    twitterUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    googleAnalyticsId: "",
    footerText: "© 2024 MovPix. All rights reserved.",
    // Link Monetization
    linkMonetizationEnabled: false,
    linkMonetizationUrl: "",
    linkMonetizationExcludeDomains: "drive.google.com",
  });

  useEffect(() => {
    fetchSettings();
    fetchAdminInfo();
  }, []);

  const fetchAdminInfo = async () => {
    try {
      const res = await fetch("/api/admin/password", { credentials: "include" });
      const data = await res.json();
      if (data.success && data.data?.email) {
        setAdminEmail(data.data.email);
        setAdminProfile({
          email: data.data.email,
          name: data.data.name || "",
        });
      } else {
        // Fallback - try to get from localStorage or show default
        setAdminEmail("admin@moviehub.com");
        setAdminProfile({ email: "admin@moviehub.com", name: "" });
      }
    } catch (err) {
      console.error("Failed to fetch admin info:", err);
      setAdminEmail("admin@moviehub.com");
      setAdminProfile({ email: "admin@moviehub.com", name: "" });
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileSuccess("");

    if (!adminProfile.email) {
      setProfileError("Email is required");
      return;
    }

    setProfileSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(adminProfile),
      });

      const data = await res.json();
      if (data.success) {
        setProfileSuccess("Profile updated successfully!");
        setAdminEmail(adminProfile.email);
      } else {
        setProfileError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setProfileError("Failed to update profile");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setPasswordSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(passwordData),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordSuccess("Password changed successfully!");
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        setPasswordError(data.error || "Failed to change password");
      }
    } catch (err) {
      setPasswordError("Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        // Convert string "true"/"false" to boolean for linkMonetizationEnabled
        const processedData = { ...data.data };
        if (typeof processedData.linkMonetizationEnabled === "string") {
          processedData.linkMonetizationEnabled = processedData.linkMonetizationEnabled === "true";
        }
        setSettings((prev) => ({ ...prev, ...processedData }));
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/admin/settings", {
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
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("File size must be less than 2MB");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setSettings({ ...settings, logoUrl: data.url, logoType: "image" });
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (err) {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Globe },
    { id: "logo", label: "Logo & Branding", icon: ImageIcon },
    { id: "social", label: "Social Links", icon: LinkIcon },
    { id: "monetization", label: "Link Monetization", icon: DollarSign },
    { id: "api", label: "API Keys", icon: Key },
    { id: "security", label: "Security", icon: Shield },
    { id: "database", label: "Database", icon: Database },
  ];

  const logoIcons = [
    { name: "Film", icon: "🎬" },
    { name: "Clapperboard", icon: "🎞️" },
    { name: "Play", icon: "▶️" },
    { name: "TV", icon: "📺" },
    { name: "Star", icon: "⭐" },
    { name: "Video", icon: "🎥" },
  ];

  if (loading) {
    return (
      <div>
        <Header title="Settings" />
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Settings" />

      <div className="p-6">
        {/* Success Message */}
        {saved && (
          <div className="mb-6 flex items-center gap-2 rounded-lg bg-green-500/10 p-4 text-green-500">
            <CheckCircle className="h-5 w-5" />
            Settings saved successfully!
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Tabs */}
          <div className="lg:w-48">
            <Card>
              <CardContent className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* General */}
            {activeTab === "general" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Site Name</label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                      placeholder="MovPix"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      This name appears in browser tabs, headers, and meta tags
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Site URL</label>
                    <Input
                      value={settings.siteUrl}
                      onChange={(e) => setSettings({ ...settings, siteUrl: e.target.value })}
                      placeholder="https://yourdomain.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Site Description</label>
                    <Textarea
                      value={settings.siteDescription}
                      onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                      rows={3}
                      placeholder="Your site description for search engines"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {settings.siteDescription.length}/160 characters recommended
                    </p>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Favicon URL</label>
                    <Input
                      value={settings.faviconUrl}
                      onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
                      placeholder="/favicon.ico"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Footer Text</label>
                    <Input
                      value={settings.footerText}
                      onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                      placeholder="© 2024 MovPix. All rights reserved."
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Logo & Branding */}
            {activeTab === "logo" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Logo & Branding
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Logo Type Selection */}
                  <div>
                    <label className="mb-2 block text-sm font-medium">Logo Type</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoType: "text" })}
                        className={`flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                          settings.logoType === "text"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                      >
                        <Type className="h-8 w-8" />
                        <span className="text-sm font-medium">Text + Icon</span>
                        <span className="text-xs text-muted-foreground">Use site name with icon</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, logoType: "image" })}
                        className={`flex flex-1 flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                          settings.logoType === "image"
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/50"
                        }`}
                      >
                        <ImageIcon className="h-8 w-8" />
                        <span className="text-sm font-medium">Image Logo</span>
                        <span className="text-xs text-muted-foreground">Upload custom logo</span>
                      </button>
                    </div>
                  </div>

                  {/* Text Logo Options */}
                  {settings.logoType === "text" && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Logo Text</label>
                        <Input
                          value={settings.logoText}
                          onChange={(e) => setSettings({ ...settings, logoText: e.target.value })}
                          placeholder="Enter your logo name"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Custom text to display as logo (e.g., MovPix, FilmZone, etc.)
                        </p>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">Select Icon</label>
                        <div className="grid grid-cols-6 gap-2">
                          {logoIcons.map((item) => (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setSettings({ ...settings, logoIcon: item.name })}
                              className={`flex h-12 items-center justify-center rounded-lg border-2 text-2xl transition-colors ${
                                settings.logoIcon === item.name
                                  ? "border-primary bg-primary/5"
                                  : "border-muted hover:border-muted-foreground/50"
                              }`}
                            >
                              {item.icon}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="rounded-lg border p-4">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                        <div className="flex items-center gap-2">
                          <Film className="h-6 w-6 text-primary" />
                          <span className="text-xl font-bold">{settings.logoText || settings.siteName}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Logo Options */}
                  {settings.logoType === "image" && (
                    <div className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">Upload Logo</label>
                        <div className="flex gap-4">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            {uploading ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            {uploading ? "Uploading..." : "Upload Image"}
                          </Button>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Recommended: PNG or SVG, max 2MB, 200x50px
                        </p>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium">Or Enter Logo URL</label>
                        <Input
                          value={settings.logoUrl}
                          onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>

                      {/* Preview */}
                      {settings.logoUrl && (
                        <div className="rounded-lg border p-4">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
                          <img
                            src={settings.logoUrl}
                            alt="Logo preview"
                            className="h-10 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Social Links */}
            {activeTab === "social" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    Social Links
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Send className="h-5 w-5" />
                      <span className="font-medium">Telegram Channel</span>
                    </div>
                    <Input
                      value={settings.telegramUrl}
                      onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                      placeholder="https://t.me/yourchannel"
                      className="mt-2"
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      This will be shown on movie pages and in the footer
                    </p>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">Twitter URL</label>
                    <Input
                      value={settings.twitterUrl}
                      onChange={(e) => setSettings({ ...settings, twitterUrl: e.target.value })}
                      placeholder="https://twitter.com/yourhandle"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Facebook URL</label>
                    <Input
                      value={settings.facebookUrl}
                      onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Instagram URL</label>
                    <Input
                      value={settings.instagramUrl}
                      onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Link Monetization */}
            {activeTab === "monetization" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Link Monetization
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable/Disable Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="font-medium">Enable Link Monetization</p>
                      <p className="text-sm text-muted-foreground">
                        Redirect download links through monetization URL
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSettings({ 
                        ...settings, 
                        linkMonetizationEnabled: !settings.linkMonetizationEnabled 
                      })}
                      className={`relative h-6 w-11 rounded-full transition-colors ${
                        settings.linkMonetizationEnabled 
                          ? "bg-primary" 
                          : "bg-muted"
                      }`}
                    >
                      <span 
                        className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                          settings.linkMonetizationEnabled ? "translate-x-5" : ""
                        }`} 
                      />
                    </button>
                  </div>

                  {/* Status Badge */}
                  <div className={`rounded-lg p-4 ${
                    settings.linkMonetizationEnabled 
                      ? "bg-green-500/10 border border-green-500/30" 
                      : "bg-muted/50"
                  }`}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${
                        settings.linkMonetizationEnabled ? "bg-green-500" : "bg-muted-foreground"
                      }`} />
                      <span className={`text-sm font-medium ${
                        settings.linkMonetizationEnabled ? "text-green-500" : "text-muted-foreground"
                      }`}>
                        {settings.linkMonetizationEnabled ? "Active" : "Disabled"}
                      </span>
                    </div>
                  </div>

                  {/* Monetization URL */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Monetization URL *
                    </label>
                    <Input
                      value={settings.linkMonetizationUrl}
                      onChange={(e) => setSettings({ ...settings, linkMonetizationUrl: e.target.value })}
                      placeholder="https://your-monetization-site.com/"
                      disabled={!settings.linkMonetizationEnabled}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      Enter the base URL of your monetization service (e.g., URL shortener with ads)
                    </p>
                  </div>

                  {/* Exclude Domains */}
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Exclude Domains
                    </label>
                    <Textarea
                      value={settings.linkMonetizationExcludeDomains}
                      onChange={(e) => setSettings({ ...settings, linkMonetizationExcludeDomains: e.target.value })}
                      placeholder="drive.google.com&#10;mega.nz&#10;mediafire.com"
                      rows={4}
                      disabled={!settings.linkMonetizationEnabled}
                    />
                    <p className="mt-1 text-xs text-muted-foreground">
                      One domain per line. Links to these domains will NOT be monetized.
                    </p>
                  </div>

                  {/* How it works */}
                  <div className="rounded-lg border p-4">
                    <p className="mb-2 font-medium flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      How it works
                    </p>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>When enabled, download links will be transformed:</p>
                      <div className="rounded bg-muted p-2 font-mono text-xs">
                        <p className="text-muted-foreground">Original:</p>
                        <p>https://example.com/file.zip</p>
                        <p className="mt-2 text-muted-foreground">Transformed:</p>
                        <p className="text-primary">{settings.linkMonetizationUrl || "https://your-site.com/"}token.php?post=<span className="text-green-500">[encoded-url]</span></p>
                      </div>
                      <p className="mt-2">
                        The original URL is base64 encoded and passed as a parameter.
                      </p>
                    </div>
                  </div>

                  {/* Warning */}
                  {settings.linkMonetizationEnabled && !settings.linkMonetizationUrl && (
                    <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4">
                      <p className="text-sm text-yellow-600">
                        <strong>Warning:</strong> Please enter a monetization URL before enabling this feature.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* API Keys */}
            {activeTab === "api" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    API Keys
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Google Analytics ID</label>
                    <Input
                      value={settings.googleAnalyticsId}
                      onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">TMDB API Key</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set in your <code className="rounded bg-muted px-1">.env</code> file as{" "}
                      <code className="rounded bg-muted px-1">TMDB_API_KEY</code>
                    </p>
                    <a
                      href="https://www.themoviedb.org/settings/api"
                      target="_blank"
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      Get TMDB API Key →
                    </a>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Security Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Admin Profile Update */}
                  <div className="rounded-lg border p-4">
                    <p className="mb-4 font-medium">Admin Profile</p>
                    
                    {profileError && (
                      <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                        {profileError}
                      </div>
                    )}
                    
                    {profileSuccess && (
                      <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
                        {profileSuccess}
                      </div>
                    )}

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Email Address
                        </label>
                        <Input
                          type="email"
                          value={adminProfile.email}
                          onChange={(e) =>
                            setAdminProfile({
                              ...adminProfile,
                              email: e.target.value,
                            })
                          }
                          placeholder="admin@example.com"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Display Name (Optional)
                        </label>
                        <Input
                          type="text"
                          value={adminProfile.name}
                          onChange={(e) =>
                            setAdminProfile({
                              ...adminProfile,
                              name: e.target.value,
                            })
                          }
                          placeholder="Admin"
                        />
                      </div>

                      <Button type="submit" disabled={profileSaving}>
                        {profileSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Profile
                          </>
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* Password Change Form */}
                  <div className="rounded-lg border p-4">
                    <p className="mb-4 font-medium">Change Password</p>
                    
                    {passwordError && (
                      <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                        {passwordError}
                      </div>
                    )}
                    
                    {passwordSuccess && (
                      <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
                        {passwordSuccess}
                      </div>
                    )}

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Current Password
                        </label>
                        <Input
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                          placeholder="Enter current password"
                          required
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          New Password
                        </label>
                        <Input
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                          placeholder="Enter new password (min 6 characters)"
                          required
                          minLength={6}
                        />
                      </div>

                      <div>
                        <label className="mb-1.5 block text-sm font-medium">
                          Confirm New Password
                        </label>
                        <Input
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                          placeholder="Confirm new password"
                          required
                        />
                      </div>

                      <Button type="submit" disabled={passwordSaving}>
                        {passwordSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Changing...
                          </>
                        ) : (
                          <>
                            <Key className="mr-2 h-4 w-4" />
                            Change Password
                          </>
                        )}
                      </Button>
                    </form>
                  </div>

                  {/* JWT Info */}
                  <div className="rounded-lg bg-muted/50 p-4">
                    <p className="text-sm font-medium">JWT Secret</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Set in your <code className="rounded bg-muted px-1">.env</code> file as{" "}
                      <code className="rounded bg-muted px-1">ADMIN_JWT_SECRET</code>
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Database */}
            {activeTab === "database" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Database Type</p>
                        <p className="text-sm text-muted-foreground">SQLite (Local)</p>
                      </div>
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-600">
                        Connected
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="font-medium">Database Location</p>
                    <code className="mt-1 block text-sm text-muted-foreground">
                      prisma/dev.db
                    </code>
                  </div>

                  <div className="rounded-lg bg-yellow-500/10 p-4">
                    <p className="text-sm text-yellow-600">
                      <strong>Tip:</strong> For production, consider migrating to PostgreSQL or MySQL.
                      Update the provider in <code>prisma/schema.prisma</code>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
