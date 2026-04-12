'use client';

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`animate-pulse rounded bg-slate-200 ${className}`} />;
}

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
};

function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface-elevated)] px-6 py-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 flex gap-4 border-b border-[var(--border)] last:border-0">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

type StatCardSkeletonProps = {
  count?: number;
};

function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 sm:p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-7 w-20 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

type PageSkeletonProps = {
  hasStats?: boolean;
  tableRows?: number;
  tableColumns?: number;
};

function PageSkeleton({ hasStats = false, tableRows = 5, tableColumns = 4 }: PageSkeletonProps) {
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {hasStats && (
        <div className="mb-6 sm:mb-8">
          <StatCardSkeleton />
        </div>
      )}

      <TableSkeleton rows={tableRows} columns={tableColumns} />
    </div>
  );
}

export { Skeleton, TableSkeleton, StatCardSkeleton, PageSkeleton };
