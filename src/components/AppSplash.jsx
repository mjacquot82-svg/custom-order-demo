import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const SPLASH_LOGO_SRC = "/app-demo-icon.svg";

export default function AppSplash({ children }) {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [showSplash, setShowSplash] = useState(isAdminRoute);

  useEffect(() => {
    if (!isAdminRoute) {
      setShowSplash(false);
      return undefined;
    }

    setShowSplash(true);
    const timer = window.setTimeout(() => setShowSplash(false), 900);
    return () => window.clearTimeout(timer);
  }, [isAdminRoute]);

  return (
    <>
      {showSplash && (
        <div className="app-splash" role="status" aria-label="Loading Apparel Operations Demo">
          <div className="app-splash-card">
            <img
              src={SPLASH_LOGO_SRC}
              alt="Apparel Operations Demo"
              className="app-splash-logo"
              width="88"
              height="88"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
            />
            <div>
              <p className="app-splash-kicker">Apparel Demo</p>
              <h1 className="app-splash-title">Central Operations</h1>
              <p className="app-splash-copy">Preparing your workspace…</p>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
