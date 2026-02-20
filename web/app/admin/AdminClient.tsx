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
  Hash,
  BookOpen,
  ExternalLink,
  Eye,
  EyeOff,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
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

interface OutreachRecord {
  id: string;
  twitter_username: string;
  twitter_user_id: string | null;
  outreach_type: string;
  outreach_status: "pending" | "sent" | "failed" | "replied" | "signed_up";
  message_text: string | null;
  source: string | null;
  priority_score: number;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
  notes: string | null;
  developer_id: string | null;
  signup_id: string | null;
}

interface OutreachStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  replied: number;
  signed_up: number;
}

interface HashtagSignup {
  id: string;
  twitter_username: string;
  twitter_name: string | null;
  twitter_bio: string | null;
  twitter_followers: number;
  twitter_avatar_url: string | null;
  hashtag_used: string;
  tweet_id: string;
  tweet_text: string | null;
  status: "discovered" | "added" | "ignored";
  developer_id: string | null;
  discovered_at: string;
  added_at: string | null;
  notes: string | null;
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

type Tab = "resources" | "signups" | "outreach";

export function AdminClient() {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("resources");
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Hashtag signups state
  const [signups, setSignups] = useState<HashtagSignup[]>([]);
  const [signupsLoading, setSignupsLoading] = useState(false);
  const [signupsTotal, setSignupsTotal] = useState(0);
  const [signupsPage, setSignupsPage] = useState(1);
  const [signupsFilter, setSignupsFilter] = useState<string>("all");

  // Outreach state
  const [outreach, setOutreach] = useState<OutreachRecord[]>([]);
  const [outreachLoading, setOutreachLoading] = useState(false);
  const [outreachTotal, setOutreachTotal] = useState(0);
  const [outreachPage, setOutreachPage] = useState(1);
  const [outreachFilter, setOutreachFilter] = useState<string>("all");
  const [outreachStats, setOutreachStats] = useState<OutreachStats>({
    total: 0,
    pending: 0,
    sent: 0,
    failed: 0,
    replied: 0,
    signed_up: 0,
  });

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

  const fetchSignups = async (page = 1, statusFilter = signupsFilter) => {
    setSignupsLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/hashtag-signups?${params}`);
    const data = await res.json();
    setSignups(data.signups || []);
    setSignupsTotal(data.total || 0);
    setSignupsPage(page);
    setSignupsLoading(false);
  };

  const updateSignupStatus = async (
    id: string,
    newStatus: "added" | "ignored"
  ) => {
    await fetch("/api/admin/hashtag-signups", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await fetchSignups(signupsPage);
  };

  const fetchOutreach = async (page = 1, statusFilter = outreachFilter) => {
    setOutreachLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "50" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    const res = await fetch(`/api/admin/outreach?${params}`);
    const data = await res.json();
    setOutreach(data.outreach || []);
    setOutreachTotal(data.total || 0);
    setOutreachPage(page);
    if (data.stats) setOutreachStats(data.stats);
    setOutreachLoading(false);
  };

  const updateOutreachStatus = async (
    id: string,
    newStatus: OutreachRecord["outreach_status"]
  ) => {
    await fetch("/api/admin/outreach", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, outreach_status: newStatus }),
    });
    await fetchOutreach(outreachPage);
  };

  useEffect(() => {
    if (activeTab === "signups" && isAdmin && signups.length === 0) {
      fetchSignups();
    }
    if (activeTab === "outreach" && isAdmin && outreach.length === 0) {
      fetchOutreach();
    }
  }, [activeTab, isAdmin]);

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
        {/* Tabs */}
        <div className="flex gap-1 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab("resources")}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "resources"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Resources
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-secondary">
              {resources.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("signups")}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "signups"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="w-4 h-4" />
            Hashtag Signups
            {signupsTotal > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                {signupsTotal}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("outreach")}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "outreach"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Send className="w-4 h-4" />
            Outreach
            {outreachStats.total > 0 && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/20 text-primary">
                {outreachStats.total}
              </span>
            )}
          </button>
        </div>

        {/* Resources Tab */}
        {activeTab === "resources" && (
          <>
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

            <div className="space-y-4">
              {resources.length === 0 && !loading ? (
                <div className="glass-card rounded-xl p-12 text-center">
                  <p className="text-muted-foreground">
                    No resources yet. Add your first resource above.
                  </p>
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
          </>
        )}

        {/* Outreach Tab */}
        {activeTab === "outreach" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Outreach Pipeline</h1>
                <p className="text-muted-foreground mt-1">
                  Track automated outreach to discovered builders
                </p>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              {[
                { label: "Pending", value: outreachStats.pending, icon: Clock, color: "text-yellow-400" },
                { label: "Sent", value: outreachStats.sent, icon: Send, color: "text-blue-400" },
                { label: "Failed", value: outreachStats.failed, icon: XCircle, color: "text-red-400" },
                { label: "Replied", value: outreachStats.replied, icon: MessageSquare, color: "text-green-400" },
                { label: "Signed Up", value: outreachStats.signed_up, icon: CheckCircle, color: "text-primary" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="glass-card rounded-xl p-4 text-center">
                  <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-6">
              {["all", "pending", "sent", "failed", "replied", "signed_up"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setOutreachFilter(f);
                    fetchOutreach(1, f);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    outreachFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "signed_up" ? "Signed Up" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {outreachLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : outreach.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Send className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No outreach records yet. The pipeline will start
                  contacting discovered builders automatically.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {outreach.map((record) => (
                    <div
                      key={record.id}
                      className="glass-card rounded-xl p-4 flex items-start gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`https://x.com/${record.twitter_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold hover:text-primary transition-colors"
                          >
                            @{record.twitter_username}
                          </a>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              record.outreach_status === "sent"
                                ? "bg-blue-500/20 text-blue-400"
                                : record.outreach_status === "replied"
                                  ? "bg-green-500/20 text-green-400"
                                  : record.outreach_status === "signed_up"
                                    ? "bg-primary/20 text-primary"
                                    : record.outreach_status === "failed"
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {record.outreach_status === "signed_up" ? "Signed Up" : record.outreach_status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {record.outreach_type}
                          </span>
                          {record.source && (
                            <span className="text-xs text-muted-foreground">
                              via {record.source}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            priority: {record.priority_score}
                          </span>
                        </div>

                        {record.message_text && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {record.message_text}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            Created: {new Date(record.created_at).toLocaleDateString()}
                          </span>
                          {record.sent_at && (
                            <span>
                              Sent: {new Date(record.sent_at).toLocaleDateString()}
                            </span>
                          )}
                          {record.developer_id && (
                            <a
                              href={`/builder/${record.twitter_username}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              Profile
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {record.outreach_status === "sent" && (
                          <button
                            onClick={() => updateOutreachStatus(record.id, "replied")}
                            className="p-2 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                            title="Mark as replied"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>
                        )}
                        {(record.outreach_status === "sent" || record.outreach_status === "replied") && (
                          <button
                            onClick={() => updateOutreachStatus(record.id, "signed_up")}
                            className="p-2 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                            title="Mark as signed up"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        {record.outreach_status === "failed" && (
                          <button
                            onClick={() => updateOutreachStatus(record.id, "pending")}
                            className="p-2 rounded-lg hover:bg-yellow-500/10 text-muted-foreground hover:text-yellow-400 transition-colors"
                            title="Retry (set to pending)"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {outreachTotal > 50 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      onClick={() => fetchOutreach(outreachPage - 1)}
                      disabled={outreachPage <= 1}
                      className="px-4 py-2 rounded-lg bg-secondary text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {outreachPage} of{" "}
                      {Math.ceil(outreachTotal / 50)}
                    </span>
                    <button
                      onClick={() => fetchOutreach(outreachPage + 1)}
                      disabled={
                        outreachPage >= Math.ceil(outreachTotal / 50)
                      }
                      className="px-4 py-2 rounded-lg bg-secondary text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Hashtag Signups Tab */}
        {activeTab === "signups" && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Hashtag Signups</h1>
                <p className="text-muted-foreground mt-1">
                  Users discovered via BIP hashtags on Twitter/X
                </p>
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 mb-6">
              {["all", "discovered", "added", "ignored"].map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    setSignupsFilter(f);
                    fetchSignups(1, f);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    signupsFilter === f
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            {signupsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : signups.length === 0 ? (
              <div className="glass-card rounded-xl p-12 text-center">
                <Hash className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hashtag signups yet. The monitor will discover users
                  tweeting with BIP hashtags.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {signups.map((signup) => (
                    <div
                      key={signup.id}
                      className="glass-card rounded-xl p-4 flex items-start gap-4"
                    >
                      {/* Avatar */}
                      <img
                        src={
                          signup.twitter_avatar_url ||
                          `https://unavatar.io/twitter/${signup.twitter_username}`
                        }
                        alt=""
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {signup.twitter_name || signup.twitter_username}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            @{signup.twitter_username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {signup.twitter_followers.toLocaleString()} followers
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              signup.status === "added"
                                ? "bg-green-500/20 text-green-400"
                                : signup.status === "ignored"
                                  ? "bg-red-500/20 text-red-400"
                                  : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            {signup.status}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                            {signup.hashtag_used}
                          </span>
                        </div>

                        {signup.tweet_text && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {signup.tweet_text}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            {new Date(
                              signup.discovered_at
                            ).toLocaleDateString()}
                          </span>
                          <a
                            href={`https://x.com/${signup.twitter_username}/status/${signup.tweet_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            View tweet
                          </a>
                          {signup.developer_id && (
                            <a
                              href={`/builder/${signup.twitter_username}`}
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              <Eye className="w-3 h-3" />
                              Profile
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {signup.status !== "ignored" && (
                          <button
                            onClick={() =>
                              updateSignupStatus(signup.id, "ignored")
                            }
                            className="p-2 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-colors"
                            title="Ignore"
                          >
                            <EyeOff className="w-4 h-4" />
                          </button>
                        )}
                        {signup.status === "ignored" && (
                          <button
                            onClick={() =>
                              updateSignupStatus(signup.id, "added")
                            }
                            className="p-2 rounded-lg hover:bg-green-500/10 text-muted-foreground hover:text-green-400 transition-colors"
                            title="Restore"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {signupsTotal > 50 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      onClick={() => fetchSignups(signupsPage - 1)}
                      disabled={signupsPage <= 1}
                      className="px-4 py-2 rounded-lg bg-secondary text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {signupsPage} of{" "}
                      {Math.ceil(signupsTotal / 50)}
                    </span>
                    <button
                      onClick={() => fetchSignups(signupsPage + 1)}
                      disabled={
                        signupsPage >= Math.ceil(signupsTotal / 50)
                      }
                      className="px-4 py-2 rounded-lg bg-secondary text-sm disabled:opacity-50 hover:bg-secondary/80 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
