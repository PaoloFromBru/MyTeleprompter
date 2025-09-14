import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-10 border-t">
      <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-neutral-600 dark:text-neutral-400 flex flex-wrap items-center justify-between gap-2">
        <div>&copy; {new Date().getFullYear()} Adaptive Teleprompter</div>
        <nav className="flex items-center gap-3">
          <Link className="hover:underline" href="/about">About</Link>
          <Link className="hover:underline" href="/help">Help</Link>
          <Link className="hover:underline" href="/settings">Settings</Link>
          <Link className="hover:underline" href="/library">Library</Link>
        </nav>
      </div>
    </footer>
  );
}

