import Link from "next/link";

export const runtime = "edge";

export default function NotFound() {
  return (
    <div className="grid gap-4 rounded-3xl border border-ink-100 bg-white/80 p-8">
      <h1 className="font-display text-2xl text-ink-900">Page not found</h1>
      <p className="text-sm text-ink-600">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="text-sm font-semibold text-ink-900">
        Back to home
      </Link>
    </div>
  );
}
