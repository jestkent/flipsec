import Feed from "./components/Feed";

export default function App() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="mx-auto max-w-xl px-4 pt-12 pb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          FlipSec
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Flip the news. Learn the threat.
        </p>
      </header>

      <main className="mx-auto max-w-xl px-4 pb-24">
        <Feed />
      </main>
    </div>
  );
}
