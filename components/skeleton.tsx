export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}

export function LoadingStatus({ children }: { children: React.ReactNode }) {
  return (
    <div className="loading-status" role="status" aria-busy="true">
      <Skeleton className="h-1.5 w-8 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function ProfileSkeleton({
  label = "Loading payment profile…",
}: {
  label?: string;
}) {
  return (
    <div
      className="card narrow profile-card"
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="mx-auto mb-5 size-[74px] rounded-full" />
      <Skeleton className="mx-auto mb-3 h-9 w-40" />
      <Skeleton className="mx-auto mb-7 h-6 w-32 rounded-full" />
      <Skeleton className="mx-auto mb-3 h-4 w-48 max-w-full" />
      <Skeleton className="mx-auto mb-8 h-4 w-60 max-w-full" />
      <Skeleton className="mb-4 h-12 w-full rounded-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 flex-1 rounded-full" />
      </div>
    </div>
  );
}

export function FormSkeleton({
  label = "Loading cash-out options…",
}: {
  label?: string;
}) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton className="mb-6 h-10 w-36" />
      {[0, 1].map((row) => (
        <div className="mb-6" key={row}>
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="mb-3 h-4 w-full" />
      <Skeleton className="mb-8 h-4 w-3/4" />
      <Skeleton className="h-12 w-full rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Reading your Stellar account…"
      aria-busy="true"
    >
      <span className="sr-only">Reading your Stellar account…</span>
      <div className="grid-two mb-6">
        <div className="card balance-card">
          <Skeleton className="mb-6 h-4 w-44" />
          <Skeleton className="mb-6 h-14 w-56 max-w-full" />
          <Skeleton className="mb-8 h-4 w-3/4" />
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-11 flex-1 rounded-full" />
            ))}
          </div>
        </div>
        <div className="card">
          <Skeleton className="mb-6 h-6 w-40" />
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="mb-8 h-4 w-3/4" />
          <Skeleton className="h-11 w-36 rounded-full" />
        </div>
      </div>
      <div className="card">
        <Skeleton className="mb-6 h-6 w-40" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 py-4">
            <Skeleton className="size-10 shrink-0 rounded-2xl" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
