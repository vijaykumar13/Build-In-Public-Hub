"use client";

import { useState } from "react";
import {
  BookOpen,
  GraduationCap,
  FileText,
  Podcast,
  MessageSquare,
  Video,
  Wrench,
  Code,
  Rocket,
  Users,
  Globe,
  ExternalLink,
  ArrowRight,
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
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  GraduationCap,
  FileText,
  Podcast,
  MessageSquare,
  Video,
  Wrench,
  Code,
  Rocket,
  Users,
  Globe,
  ExternalLink,
};

const TYPE_LABELS: Record<string, string> = {
  all: "All",
  guide: "Guides",
  template: "Templates",
  podcast: "Podcasts",
  community: "Community",
  tool: "Tools",
  video: "Videos",
};

const TYPE_COLORS: Record<string, string> = {
  guide: "bg-primary/10 text-primary",
  template: "bg-accent/10 text-accent",
  podcast: "bg-blue-400/10 text-blue-400",
  community: "bg-yellow-400/10 text-yellow-400",
  tool: "bg-purple-400/10 text-purple-400",
  video: "bg-red-400/10 text-red-400",
};

const ICON_BG_COLORS: Record<string, string> = {
  guide: "bg-primary/10 group-hover:bg-primary/20",
  template: "bg-accent/10 group-hover:bg-accent/20",
  podcast: "bg-blue-400/10 group-hover:bg-blue-400/20",
  community: "bg-yellow-400/10 group-hover:bg-yellow-400/20",
  tool: "bg-purple-400/10 group-hover:bg-purple-400/20",
  video: "bg-red-400/10 group-hover:bg-red-400/20",
};

const ICON_TEXT_COLORS: Record<string, string> = {
  guide: "text-primary",
  template: "text-accent",
  podcast: "text-blue-400",
  community: "text-yellow-400",
  tool: "text-purple-400",
  video: "text-red-400",
};

export function ResourcesClient({ resources }: { resources: Resource[] }) {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredResources =
    activeFilter === "all"
      ? resources
      : resources.filter((r) => r.type === activeFilter);

  // Get unique types that exist in the data
  const availableTypes = ["all", ...new Set(resources.map((r) => r.type))];

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-8">
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setActiveFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeFilter === type
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            {TYPE_LABELS[type] || type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      {filteredResources.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No resources found.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map((resource) => {
            const IconComponent = ICON_MAP[resource.icon_name] || BookOpen;
            const iconBg =
              ICON_BG_COLORS[resource.type] ||
              "bg-primary/10 group-hover:bg-primary/20";
            const iconColor =
              ICON_TEXT_COLORS[resource.type] || "text-primary";

            const hasUrl = resource.url && resource.url !== "#";

            const card = (
              <div
                key={resource.id}
                className={`glass-card rounded-xl p-6 group hover:border-primary/30 transition-all duration-300 ${hasUrl ? "cursor-pointer" : ""}`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors mb-4 ${iconBg}`}
                >
                  <IconComponent className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors">
                  {resource.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                  {resource.description || ""}
                </p>
                <div className="flex items-center justify-between mt-4">
                  {hasUrl ? (
                    <div className="flex items-center gap-1 text-sm text-primary">
                      <span>
                        {resource.type === "community" ? "Join" : "View"}
                      </span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                      Coming Soon
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      TYPE_COLORS[resource.type] || "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {TYPE_LABELS[resource.type] ||
                      resource.type.charAt(0).toUpperCase() +
                        resource.type.slice(1)}
                  </span>
                </div>
              </div>
            );

            if (hasUrl) {
              return (
                <a
                  key={resource.id}
                  href={resource.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {card}
                </a>
              );
            }

            return card;
          })}
        </div>
      )}
    </div>
  );
}
