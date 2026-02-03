"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CodeXml,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  ShieldAlert,
  Loader2,
  Settings,
} from "lucide-react";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  icon_name: string;
  sort_order: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
}

const RESOURCE_TYPES = [
  "guide",
  "template",
  "podcast",
  "community",
  "tool",
  "video",
];

const ICON_OPTIONS = [
  "BookOpen",
  "GraduationCap",
  "FileText",
  "Podcast",
  "MessageSquare",
  "Video",
  "Wrench",
  "Code",
  "Rocket",
  "Users",
  "Globe",
  "ExternalLink",
];

const emptyForm = {
  title: "",
  description: "",
  type: "guide",
  url: "",
  icon_name: "BookOpen",
  sort_order: 0,
  featured: false,
};

export function AdminClient() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Check admin status
  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    fetch("/api/admin/check")
      .then((res) => res.json())
      .then((data) => {
        setIsAdmin(data.isAdmin);
        if (data.isAdmin) {
          fetchResources();
        } else {
          setLoading(false);
        }
      })
      .catch(() => {
        setIsAdmin(false);
        setLoading(false);
      });
  }, [session, status]);

  const fetchResources = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/resources");
    const data = await res.json();
    setResources(data.resources || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm(emptyForm);
      setShowForm(false);
      await fetchResources();
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    const res = await fetch(`/api/admin/resources/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setEditingId(null);
      setForm(emptyForm);
      await fetchResources();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this resource?")) return;
    await fetch(`/api/admin/resources/${id}`, { method: "DELETE" });
    await fetchResources();
  };

  const startEdit = (resource: Resource) => {
    setEditingId(resource.id);
    setShowForm(false);
    setForm({
      title: resource.title,
      description: resource.description || "",
      type: resource.type,
      url: resource.url || "",
      icon_name: resource.icon_name,
      sort_order: resource.sort_order,
      featured: resource.featured,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  // Not signed in or not admin
  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || isAdmin === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-xl p-8 text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            {!session
              ? "You must be signed in to access the admin panel."
              : "Your account does not have admin privileges."}
          </p>
          <a href="/" className="inline-block mt-6 text-primary hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  const ResourceForm = ({
    onSave,
    onCancel,
  }: {
    onSave: () => void;
    onCancel: () => void;
  }) => (
    <div className="glass-card rounded-xl p-6 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Resource title"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          rows={3}
          placeholder="Brief description"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">URL</label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Icon</label>
          <select
            value={form.icon_name}
            onChange={(e) => setForm({ ...form, icon_name: e.target.value })}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ICON_OPTIONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sort Order</label>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) =>
              setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
            }
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            className="w-4 h-4 rounded accent-primary"
          />
          <span className="text-sm">Featured on homepage</span>
        </label>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving || !form.title.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Admin Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <a className="flex items-center gap-2 group" href="/">
              <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <CodeXml className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">
                BuildInPublic<span className="text-primary">Hub</span>
              </span>
            </a>
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Admin Panel</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="pt-24 pb-12 container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Manage Resources</h1>
            <p className="text-muted-foreground mt-1">
              Add, edit, and manage community resources
            </p>
          </div>
          {!showForm && !editingId && (
            <button
              onClick={() => {
                setShowForm(true);
                setForm(emptyForm);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          )}
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">New Resource</h2>
            <ResourceForm
              onSave={handleCreate}
              onCancel={() => {
                setShowForm(false);
                setForm(emptyForm);
              }}
            />
          </div>
        )}

        {/* Resources List */}
        <div className="space-y-4">
          {resources.length === 0 && !loading ? (
            <div className="glass-card rounded-xl p-12 text-center">
              <p className="text-muted-foreground">No resources yet. Add your first resource above.</p>
            </div>
          ) : (
            resources.map((resource) => (
              <div key={resource.id}>
                {editingId === resource.id ? (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">
                      Edit Resource
                    </h2>
                    <ResourceForm
                      onSave={() => handleUpdate(resource.id)}
                      onCancel={cancelEdit}
                    />
                  </div>
                ) : (
                  <div className="glass-card rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold truncate">
                          {resource.title}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                          {resource.type}
                        </span>
                        {resource.featured && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mt-1">
                        {resource.description || "No description"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEdit(resource)}
                        className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource.id)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
