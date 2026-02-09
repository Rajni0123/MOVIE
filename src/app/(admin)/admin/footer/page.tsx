"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/admin/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, Trash2, GripVertical, Link as LinkIcon, Save, X } from "lucide-react";

interface FooterLink {
  id: number;
  section: string;
  label: string;
  url: string;
  sortOrder: number;
  isActive?: boolean;
}

interface FooterLinks {
  quick_links: FooterLink[];
  legal: FooterLink[];
  genres: FooterLink[];
}

const SECTION_LABELS: Record<string, string> = {
  quick_links: "Quick Links",
  legal: "Legal",
  genres: "Popular Genres",
};

const SECTION_OPTIONS = [
  { value: "quick_links", label: "Quick Links" },
  { value: "legal", label: "Legal" },
  { value: "genres", label: "Popular Genres" },
];

export default function FooterManagementPage() {
  const [links, setLinks] = useState<FooterLinks>({
    quick_links: [],
    legal: [],
    genres: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    section: "quick_links",
    label: "",
    url: "",
    sortOrder: 0,
  });

  useEffect(() => {
    fetchLinks();
  }, []);

  const fetchLinks = async () => {
    try {
      const res = await fetch("/api/footer-links", { credentials: "include" });
      const data = await res.json();
      if (data.success) {
        setLinks(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch footer links:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label || !formData.url) return;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/footer-links/${editingId}`
        : "/api/footer-links";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        fetchLinks();
        resetForm();
      } else {
        alert(data.error || "Failed to save link");
      }
    } catch (error) {
      console.error("Error saving link:", error);
      alert("Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: FooterLink) => {
    setFormData({
      section: link.section,
      label: link.label,
      url: link.url,
      sortOrder: link.sortOrder,
    });
    setEditingId(link.id);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

    try {
      const res = await fetch(`/api/footer-links/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        fetchLinks();
      }
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      section: "quick_links",
      label: "",
      url: "",
      sortOrder: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const renderSection = (sectionKey: string, sectionLinks: FooterLink[]) => (
    <Card key={sectionKey} className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{SECTION_LABELS[sectionKey]}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {sectionLinks.length} links
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sectionLinks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No links in this section
          </p>
        ) : (
          <div className="space-y-2">
            {sectionLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{link.label}</p>
                    <p className="text-sm text-muted-foreground">{link.url}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(link)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(link.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div>
      <Header title="Footer Links" />

      <div className="p-6">
        {/* Add Button */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Manage Footer Links</h2>
            <p className="text-sm text-muted-foreground">
              Add, edit, or remove links from footer sections
            </p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Link
          </Button>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {editingId ? "Edit Link" : "Add New Link"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Section
                    </label>
                    <Select
                      value={formData.section}
                      onChange={(e) =>
                        setFormData({ ...formData, section: e.target.value })
                      }
                    >
                      {SECTION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Sort Order
                    </label>
                    <Input
                      type="number"
                      value={formData.sortOrder}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sortOrder: parseInt(e.target.value) || 0,
                        })
                      }
                      min={0}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Label *
                  </label>
                  <Input
                    value={formData.label}
                    onChange={(e) =>
                      setFormData({ ...formData, label: e.target.value })
                    }
                    placeholder="e.g., Privacy Policy"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    URL *
                  </label>
                  <Input
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    placeholder="e.g., /privacy or https://..."
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : editingId ? "Update" : "Add Link"}
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    <X className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Links by Section */}
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {renderSection("quick_links", links.quick_links)}
            {renderSection("legal", links.legal)}
            {renderSection("genres", links.genres)}
          </div>
        )}

        {/* Help Text */}
        <Card className="mt-6 border-dashed">
          <CardContent className="py-4">
            <h3 className="mb-2 font-medium">💡 Tips</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Use relative URLs (e.g., /privacy) for internal pages</li>
              <li>• Use absolute URLs (e.g., https://...) for external links</li>
              <li>• Lower sort order numbers appear first</li>
              <li>• Changes appear immediately on the website footer</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
