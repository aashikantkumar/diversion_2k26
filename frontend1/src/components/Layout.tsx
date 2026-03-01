import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import { Toaster } from "sonner";

/**
 * Root layout — premium mesh-gradient background + top navbar.
 */
export default function Layout() {
  return (
    <div className="min-h-screen mesh-bg dark:bg-[oklch(0.115_0.018_265)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <Toaster
        position="bottom-right"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "0.75rem",
            fontFamily: "Plus Jakarta Sans, Inter, sans-serif",
            fontWeight: "500",
          },
        }}
      />
    </div>
  );
}

