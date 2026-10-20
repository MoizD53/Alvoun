"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

export interface PaginationProps extends React.HTMLAttributes<HTMLElement> {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className,
  ...props
}: PaginationProps) {
  // Generate pagination range with ellipses
  const paginationRange = React.useMemo(() => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPageNumbers >= totalPages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 2;

    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "DOTS", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [firstPageIndex, "DOTS", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [firstPageIndex, "DOTS", ...middleRange, "DOTS", lastPageIndex];
    }

    return [];
  }, [totalPages, siblingCount, currentPage]);

  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-center gap-1.5", className)}
      {...props}
    >
      {/* Previous button */}
      <button
        type="button"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Go to previous page"
        className={cn(
          "inline-flex h-9 px-3 items-center justify-center gap-1 text-xs font-semibold rounded-lg transition-all",
          "bg-surface-raised border border-border-default shadow-xs text-primary hover:border-border-strong",
          "disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none"
        )}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Prev</span>
      </button>

      {/* Number pills */}
      {paginationRange.map((pageNumber, idx) => {
        if (pageNumber === "DOTS") {
          return (
            <span
              key={`dots-${idx}`}
              className="inline-flex h-9 w-9 items-center justify-center text-muted"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }

        const isCurrent = pageNumber === currentPage;
        return (
          <button
            key={`page-${pageNumber}`}
            type="button"
            aria-current={isCurrent ? "page" : undefined}
            onClick={() => onPageChange(pageNumber as number)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center text-xs font-bold rounded-lg transition-all cursor-pointer select-none",
              isCurrent
                ? "bg-teal-500 text-text-inverse border border-teal-600 shadow-xs"
                : "bg-surface-raised text-primary border border-border-default shadow-xs hover:border-border-strong"
            )}
          >
            {pageNumber}
          </button>
        );
      })}

      {/* Next button */}
      <button
        type="button"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Go to next page"
        className={cn(
          "inline-flex h-9 px-3 items-center justify-center gap-1 text-xs font-semibold rounded-lg transition-all",
          "bg-surface-raised border border-border-default shadow-xs text-primary hover:border-border-strong",
          "disabled:opacity-40 disabled:pointer-events-none cursor-pointer select-none"
        )}
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
