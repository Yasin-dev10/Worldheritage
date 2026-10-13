export default function Loading() {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="loading-mark" aria-hidden="true" />
      <p>Loading historical records…</p>
    </main>
  );
}
