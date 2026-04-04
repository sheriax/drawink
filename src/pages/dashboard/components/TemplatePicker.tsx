import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

interface TemplatePickerProps {
  workspaceId: Id<"workspaces">;
  onSelect: (templateId: Id<"templates">) => void;
  onClose: () => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  workspaceId,
  onSelect,
  onClose,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const categories = useQuery(api.templates.listCategories);
  const builtInTemplates = useQuery(api.templates.listBuiltIn);
  const workspaceTemplates = useQuery(api.templates.listByWorkspace, {
    workspaceId,
  });
  const categoryTemplates = useQuery(
    api.templates.listByCategory,
    selectedCategory ? { category: selectedCategory } : "skip",
  );

  const templates = selectedCategory
    ? categoryTemplates
    : [...(builtInTemplates || []), ...(workspaceTemplates || [])];

  return (
    <div className="drawink-dashboard__modal-overlay" onClick={onClose}>
      <div
        className="drawink-dashboard__template-picker"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawink-dashboard__template-picker-header">
          <h2>Choose a Template</h2>
          <button className="drawink-dashboard__template-picker-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="drawink-dashboard__template-picker-body">
          <div className="drawink-dashboard__template-categories">
            <button
              className={`drawink-dashboard__template-category${!selectedCategory ? " drawink-dashboard__template-category--active" : ""}`}
              onClick={() => setSelectedCategory(null)}
            >
              All Templates
            </button>
            {categories?.map((cat) => (
              <button
                key={cat}
                className={`drawink-dashboard__template-category${selectedCategory === cat ? " drawink-dashboard__template-category--active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="drawink-dashboard__template-grid">
            {templates === undefined ? (
              <div className="drawink-dashboard__loading">
                <div className="drawink-dashboard__spinner" />
              </div>
            ) : templates.length === 0 ? (
              <div className="drawink-dashboard__template-empty">
                <p>No templates available yet</p>
              </div>
            ) : (
              templates.map((t) => (
                <button
                  key={t._id}
                  className="drawink-dashboard__template-card"
                  onClick={() => onSelect(t._id)}
                >
                  <div className="drawink-dashboard__template-card-thumb">
                    {t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt={t.name} />
                    ) : (
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18M9 21V9" />
                      </svg>
                    )}
                  </div>
                  <div className="drawink-dashboard__template-card-info">
                    <span className="drawink-dashboard__template-card-name">
                      {t.name}
                    </span>
                    {t.description && (
                      <span className="drawink-dashboard__template-card-desc">
                        {t.description}
                      </span>
                    )}
                    <span className="drawink-dashboard__template-card-usage">
                      {t.usageCount} {t.usageCount === 1 ? "use" : "uses"}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
