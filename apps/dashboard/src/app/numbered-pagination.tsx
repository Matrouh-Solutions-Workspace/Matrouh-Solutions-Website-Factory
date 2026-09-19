"use client";

import { useState, type ReactNode } from "react";

export const PAGE_SIZE = 5;

export function pageNumbers(currentPage: number, pageCount: number): number[] {
  const count = Math.min(5, pageCount);
  const start = Math.max(1, Math.min(currentPage - 2, pageCount - count + 1));
  return Array.from({ length: count }, (_, index) => start + index);
}

export function NumberedPagination({
  page,
  pageCount,
  onPageChange,
  label,
  locale = "en",
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  label: string;
  locale?: "ar" | "en";
}) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label={label} className="numberedPagination">
      <button
        aria-label={locale === "ar" ? "الصفحة السابقة" : "Previous page"}
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        ‹
      </button>
      {pageNumbers(page, pageCount).map((number) => (
        <button
          aria-current={number === page ? "page" : undefined}
          aria-label={locale === "ar" ? `صفحة ${number}` : `Page ${number}`}
          className={number === page ? "isActive" : ""}
          key={number}
          onClick={() => onPageChange(number)}
          type="button"
        >
          {number}
        </button>
      ))}
      <button
        aria-label={locale === "ar" ? "الصفحة التالية" : "Next page"}
        disabled={page === pageCount}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        ›
      </button>
    </nav>
  );
}

export function PaginatedPublishJobs({
  items,
  locale,
}: {
  items: readonly ReactNode[];
  locale: "ar" | "en";
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const changePage = (next: number) => {
    setPage(next);
    document.getElementById("publish-jobs")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <>
      {items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)}
      {items.length > 0 && (
        <>
          <p className="paginationSummary" aria-live="polite">
            {locale === "ar" ? "عرض" : "Showing"} {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, items.length)}{" "}
            {locale === "ar" ? `من ${items.length} مهام نشر` : `of ${items.length} publish jobs`}
          </p>
          <NumberedPagination
            label={locale === "ar" ? "صفحات مهام النشر" : "Publish job pages"}
            locale={locale}
            onPageChange={changePage}
            page={page}
            pageCount={pageCount}
          />
        </>
      )}
    </>
  );
}

export function PaginatedOverviewList({
  items,
  locale,
  label,
  itemLabel,
  scrollTargetId,
}: {
  items: readonly ReactNode[];
  locale: "ar" | "en";
  label: string;
  itemLabel: string;
  scrollTargetId: string;
}) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(items.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const changePage = (next: number) => {
    setPage(next);
    document.getElementById(scrollTargetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="overviewPaginatedRows">{items.slice(start, start + PAGE_SIZE)}</div>
      {items.length > PAGE_SIZE && (
        <footer className="overviewPaginationFooter">
          <p className="paginationSummary" aria-live="polite">
            {locale === "ar" ? "عرض" : "Showing"} {start + 1}–
            {Math.min(start + PAGE_SIZE, items.length)} {locale === "ar" ? "من" : "of"}{" "}
            {items.length} {itemLabel}
          </p>
          <NumberedPagination
            label={label}
            locale={locale}
            onPageChange={changePage}
            page={page}
            pageCount={pageCount}
          />
        </footer>
      )}
    </>
  );
}
