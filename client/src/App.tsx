import { BrowserRouter, NavLink, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { SkuPerformance } from "./pages/SkuPerformance";
import { Settings } from "./pages/Settings";
import "./App.css";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return "app-shell__link" + (isActive ? " app-shell__link--active" : "");
}

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="app-shell__nav">
          <p className="app-shell__brand">Sales Dashboard</p>
          <NavLink to="/" end className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink to="/skus" className={navLinkClass}>
            SKU Performance
          </NavLink>
          <NavLink to="/settings" className={navLinkClass}>
            Connections
          </NavLink>
        </nav>
        <main className="app-shell__main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/skus" element={<SkuPerformance />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
