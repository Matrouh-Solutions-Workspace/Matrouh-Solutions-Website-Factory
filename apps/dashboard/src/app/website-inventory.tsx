"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { NumberedPagination, PAGE_SIZE } from "@/app/numbered-pagination";

export interface InventoryEntry {
  id: string;
  name: string;
  hostname: string;
  status: string;
  category: string;
  system: "website" | "commerce";
}

interface InventoryFilterValues {
  query: string;
  status: string;
  type: string;
}

interface InventoryFilter extends InventoryFilterValues {
  visibleIds: ReadonlySet<string>;
}

const InventoryContext = createContext<InventoryFilter>({
  query: "",
  status: "all",
  type: "all",
  visibleIds: new Set(),
});

function entryKey(entry: InventoryEntry): string {
  return `${entry.system}:${entry.id}`;
}

function matches(entry: InventoryEntry, filter: InventoryFilterValues): boolean {
  const query = filter.query.trim().toLocaleLowerCase();
  return (
    (!query || `${entry.name} ${entry.hostname}`.toLocaleLowerCase().includes(query)) &&
    (filter.status === "all" ||
      entry.status === filter.status ||
      (filter.status === "live" && ["published", "active"].includes(entry.status))) &&
    (filter.type === "all" ||
      entry.system === filter.type ||
      (entry.system === "website" && filter.type === `category:${entry.category}`))
  );
}

export function WebsiteInventory({
  entries,
  categories,
  initialType = "all",
  initialQuery = "",
  initialStatus = "all",
  locale = "en",
  children,
}: {
  entries: readonly InventoryEntry[];
  categories: readonly string[];
  initialType?: string;
  initialQuery?: string;
  initialStatus?: string;
  locale?: "ar" | "en";
  children: ReactNode;
}) {
  const [filter, setFilter] = useState({
    query: initialQuery,
    status: initialStatus,
    type: initialType,
  });
  const [page, setPage] = useState(1);
  const matchingEntries = useMemo(
    () => entries.filter((entry) => matches(entry, filter)),
    [entries, filter],
  );
  const visible = matchingEntries.length;
  const pageCount = Math.ceil(visible / PAGE_SIZE);
  const safePage = Math.min(page, Math.max(pageCount, 1));
  const visibleIds = new Set(
    matchingEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE).map(entryKey),
  );
  const context = { ...filter, visibleIds };
  const updateFilter = (next: typeof filter) => {
    setFilter(next);
    setPage(1);
  };
  const changePage = (next: number) => {
    setPage(next);
    document
      .getElementById("website-inventory")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const active = filter.query !== "" || filter.status !== "all" || filter.type !== "all";
  return (
    <InventoryContext.Provider value={context}>
      <div className="websiteInventoryFilters">
        <div
          className="websiteInventoryTypeButtons"
          role="group"
          aria-label="Filter websites by system"
        >
          {(
            [
              ["all", "All"],
              ["website", "Websites & menus"],
              ["commerce", "E-commerce"],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-pressed={filter.type === value}
              className={filter.type === value ? "isActive" : ""}
              key={value}
              onClick={() => updateFilter({ ...filter, type: value })}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="websiteToolbar">
          <label>
            <span className="srOnly">Search existing websites</span>
            <input
              onChange={(event) => updateFilter({ ...filter, query: event.target.value })}
              placeholder="Search existing sites by name or domain"
              type="search"
              value={filter.query}
            />
          </label>
          <label>
            <span className="srOnly">Filter by status</span>
            <select
              onChange={(event) => updateFilter({ ...filter, status: event.target.value })}
              value={filter.status}
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
              <option value="unpublished">Unpublished</option>
              <option value="disabled">Disabled</option>
            </select>
          </label>
          <label>
            <span className="srOnly">Filter by template category</span>
            <select
              onChange={(event) => updateFilter({ ...filter, type: event.target.value })}
              value={filter.type}
            >
              <option value="all">All categories</option>
              <option value="website">All website types</option>
              {categories.map((category) => (
                <option key={category} value={`category:${category}`}>
                  {category}
                </option>
              ))}
              <option value="commerce">E-commerce</option>
            </select>
          </label>
          {active && (
            <button
              className="secondaryButton"
              onClick={() => updateFilter({ query: "", status: "all", type: "all" })}
              type="button"
            >
              Clear
            </button>
          )}
        </div>
        <p className="websiteInventoryCount" aria-live="polite">
          {visible} of {entries.length} existing websites shown
        </p>
      </div>
      {visible === 0 ? (
        <div className="emptyState">
          <strong>{entries.length === 0 ? "No websites yet" : "No matching websites"}</strong>
          <p>
            {entries.length === 0
              ? "Create your first website below."
              : "Try another search or clear the filters."}
          </p>
        </div>
      ) : (
        <>
          {children}
          <p className="paginationSummary" aria-live="polite">
            {locale === "ar" ? "عرض" : "Showing"} {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, visible)}{" "}
            {locale === "ar" ? `من ${visible} مواقع مطابقة` : `of ${visible} matching websites`}
          </p>
          <NumberedPagination
            label={locale === "ar" ? "صفحات المواقع" : "Website pages"}
            locale={locale}
            onPageChange={changePage}
            page={safePage}
            pageCount={pageCount}
          />
        </>
      )}
    </InventoryContext.Provider>
  );
}

export function WebsiteInventoryGroup({
  entries,
  label,
  title,
  children,
}: {
  entries: readonly InventoryEntry[];
  label: string;
  title: string;
  children: ReactNode;
}) {
  const filter = useContext(InventoryContext);
  const count = entries.filter((entry) => filter.visibleIds.has(entryKey(entry))).length;
  if (count === 0) return null;
  return (
    <div className="unifiedSystemGroup">
      <div className="unifiedSystemGroupHead">
        <div>
          <p className="eyebrow">{label}</p>
          <h3>{title}</h3>
        </div>
        <span>{count} visible</span>
      </div>
      {children}
    </div>
  );
}

export function WebsiteInventoryItem({
  entry,
  children,
}: {
  entry: InventoryEntry;
  children: ReactNode;
}) {
  const filter = useContext(InventoryContext);
  return filter.visibleIds.has(entryKey(entry)) ? children : null;
}
