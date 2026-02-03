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

export function HomepageResources({ resources }: { resources: Resource[] }) {
  if (resources.length === 0) return null;

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {resources.map((resource) => {
        const IconComponent = ICON_MAP[resource.icon_name] || BookOpen;
        const iconBg = ICON_BG_COLORS[resource.type] || "bg-primary/10 group-hover:bg-primary/20";
        const iconColor = ICON_TEXT_COLORS[resource.type] || "text-primary";
        const isExternal = resource.url && resource.url !== "#";

        const card = (
          <div className="glass-card rounded-xl p-6 group hover:border-primary/30 transition-all duration-300 cursor-pointer">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors mb-4 ${iconBg}`}>
              <IconComponent className={`w-6 h-6 ${iconColor}`} />
            </div>
            <h3 className="font-semibold group-hover:text-primary transition-colors">
              {resource.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {resource.description || ""}
            </p>
            <div className="flex items-center gap-1 mt-4 text-sm text-primary">
              <span>{resource.type === "community" ? "Join" : "View"}</span>
              {isExternal ? (
                <ExternalLink className="w-3 h-3" />
              ) : (
                <ArrowRight className="w-3 h-3" />
              )}
            </div>
          </div>
        );

        if (isExternal) {
          return (
            <a key={resource.id} href={resource.url!} target="_blank" rel="noopener noreferrer">
              {card}
            </a>
          );
        }

        return <div key={resource.id}>{card}</div>;
      })}
    </div>
  );
}
