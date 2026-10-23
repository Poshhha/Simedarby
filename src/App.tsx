import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Compass,
  Gift,
  HeartHandshake,
  House,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { useApp } from "./app/context";
import { Home, Activities, ActivityDetail } from "./pages/Discover";
import {
  Facilities,
  FacilityDetail,
  Townships,
  Circles,
} from "./pages/Explore";
import { Login, Profile, About } from "./pages/Account";
import { CreateActivity, Organizer, Admin } from "./pages/Workflow";
const nav = [
  { to: "/", label: "Discover", icon: Compass },
  { to: "/activities", label: "Find activities", icon: CalendarDays },
  { to: "/facilities", label: "Explore facilities", icon: MapPin },
  { to: "/townships", label: "Our townships", icon: House },
  { to: "/circles", label: "Community circles", icon: Users },
];
function Logo() {
  return (
    <Link className="logo" to="/" aria-label="RUANGKITA home">
      <span className="logo-symbol">
        <House size={25} strokeWidth={1.8} />
        <span />
      </span>
      <div className="brand">
        RUANG<span>KITA</span>
        <small>YOUR TOWNSHIP. YOUR COMMUNITY.</small>
      </div>
    </Link>
  );
}
function Layout() {
  const { data, township, setTownship, mutate, toast } = useApp();
  const [mobile, setMobile] = useState(false),
    [notifications, setNotifications] = useState(false),
    [query, setQuery] = useState("");
  const navigate = useNavigate(),
    location = useLocation();
  const profileTab =
    location.pathname === "/profile"
      ? new URLSearchParams(location.search).get("tab") || "overview"
      : null;
  const points = data.points
    .filter((p) => p.user_id === data.user?.id)
    .reduce((s, p) => s + p.points_change, 0);
  const title = location.pathname.startsWith("/facilities")
    ? "Explore facilities"
    : location.pathname.startsWith("/activities")
      ? "Find activities"
      : location.pathname.startsWith("/townships")
        ? "Our townships"
        : location.pathname.startsWith("/circles")
          ? "Community circles"
          : location.pathname.startsWith("/admin")
            ? "Township administration"
            : location.pathname.startsWith("/organizer")
              ? "Organizer workspace"
              : location.pathname.startsWith("/profile")
                ? "Your community space"
                : location.pathname.startsWith("/create")
                  ? "Create an activity"
                  : "Discover";
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {mobile && (
        <button
          className="sidebar-overlay"
          onClick={() => setMobile(false)}
          aria-label="Close navigation"
        />
      )}
      <aside className={"sidebar " + (mobile ? "is-open" : "")}>
        <div className="sidebar-brand">
          <Logo />
          <button
            className="icon-btn mobile-close"
            onClick={() => setMobile(false)}
            aria-label="Close navigation"
          >
            <X />
          </button>
        </div>
        <div className="sidebar-content">
          <p className="nav-heading">YOUR NEIGHBOURHOOD</p>
          <nav>
            {nav.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => setMobile(false)}
                className={({ isActive }) =>
                  "nav-item " + (isActive ? "active" : "")
                }
              >
                <Icon size={19} />
                {label}
                {to === "/circles" && <span className="nav-new">NEW</span>}
              </NavLink>
            ))}
          </nav>
          <p className="nav-heading second">MY COMMUNITY</p>
          <nav>
            <Link
              to="/profile"
              className={
                "nav-item " + (profileTab === "overview" ? "active" : "")
              }
              aria-current={profileTab === "overview" ? "page" : undefined}
              onClick={() => setMobile(false)}
            >
              <LayoutDashboard size={19} />
              My dashboard
            </Link>
            <Link
              to="/profile?tab=registrations"
              className={
                "nav-item " + (profileTab === "registrations" ? "active" : "")
              }
              aria-current={profileTab === "registrations" ? "page" : undefined}
              onClick={() => setMobile(false)}
            >
              <ArrowDownToLine size={19} />
              My registrations
            </Link>
            <Link
              to="/profile?tab=rewards"
              className={
                "nav-item " + (profileTab === "rewards" ? "active" : "")
              }
              aria-current={profileTab === "rewards" ? "page" : undefined}
              onClick={() => setMobile(false)}
            >
              <Gift size={19} />
              RuangPoints
            </Link>
            <NavLink
              to="/organizer"
              className="nav-item"
              onClick={() => setMobile(false)}
            >
              <Settings2 size={19} />
              Organizer workspace
            </NavLink>
            {data.user?.role.includes("admin") && (
              <NavLink
                to="/admin"
                className="nav-item"
                onClick={() => setMobile(false)}
              >
                <ShieldCheck size={19} />
                Administration
              </NavLink>
            )}
          </nav>
          <div className="sidebar-points">
            <div className="points-mark">
              <Sprout size={24} />
              <span>
                Small actions.
                <br />
                <strong>Shared rewards.</strong>
              </span>
            </div>
            <p>
              Show up for your community.
              <br />
              Grow your RuangPoints.
            </p>
            <Link to="/profile?tab=rewards">
              {data.user ? points + " RuangPoints" : "Discover RuangPoints"}
              <ArrowRight size={15} />
            </Link>
            <div className="points-decoration" />
          </div>
          <Link className="about-link" to="/about">
            <HeartHandshake size={16} /> Built for belonging
          </Link>
        </div>
        <div className="sidebar-user">
          {data.user ? (
            <>
              <Link className="profile-mini" to="/profile">
                <span className="avatar">
                  {data.user.display_name
                    .split(" ")
                    .map((s) => s[0])
                    .join("")
                    .slice(0, 2)}
                </span>
                <span>
                  <strong>{data.user.display_name}</strong>
                  <small>{data.user.role.replaceAll("_", " ")} · demo</small>
                </span>
              </Link>
              <button
                className="icon-btn"
                aria-label="Sign out"
                onClick={() =>
                  mutate("/session", "DELETE", undefined, "Signed out").catch(
                    (e) => toast(e.message),
                  )
                }
              >
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <Link className="btn primary signin-sidebar" to="/login">
              Try a demo account
              <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="icon-btn menu-toggle"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu />
            </button>
            <Compass size={18} className="header-compass" />
            <span className="topbar-title">{title}</span>
          </div>
          <form
            className="global-search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/activities?q=" + encodeURIComponent(query));
            }}
          >
            <Search size={17} />
            <input
              aria-label="Search activities"
              placeholder="Find your next community moment"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>↵</kbd>
          </form>
          <div className="header-actions">
            <div className="notification-wrap">
              <button
                className="icon-btn notification-btn"
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Bell size={20} />
                {data.notifications.length > 0 && <i />}
              </button>
              {notifications && (
                <div className="notification-menu">
                  <strong>Your community updates</strong>
                  {data.notifications.length ? (
                    data.notifications.slice(0, 5).map((n) => (
                      <div key={n.id}>
                        <b>{n.title}</b>
                        <p>{n.message}</p>
                      </div>
                    ))
                  ) : (
                    <p>
                      You’re all caught up. Join an activity to get started.
                    </p>
                  )}
                </div>
              )}
            </div>
            <Link
              className="header-avatar avatar"
              to={data.user ? "/profile" : "/login"}
              aria-label={data.user ? "My profile" : "Sign in"}
            >
              {data.user ? data.user.display_name.slice(0, 1) : "RK"}
            </Link>
          </div>
        </header>
        <main id="main" className="main-content">
          <div className="context-bar">
            <span>
              <span className="hello-dot" />A little closer to your community
            </span>
            <div className="township-select">
              <MapPin size={15} />
              <select
                aria-label="Selected township"
                value={township}
                onChange={(e) => setTownship(e.target.value)}
              >
                <option value="all">All townships</option>
                {data.townships.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
          </div>
          <Outlet />
        </main>
        <footer className="footer">
          <span>
            © 2026 RUANGKITA <span className="footer-separator">·</span> Made
            for a more connected tomorrow.
          </span>
          <div>
            <span className="demo-indicator" />
            Hackathon prototype{" "}
            <Link to="/about">
              Demo & privacy information
              <ChevronRight size={13} />
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="activities" element={<Activities />} />
        <Route path="activities/:id" element={<ActivityDetail />} />
        <Route path="facilities" element={<Facilities />} />
        <Route path="facilities/:id" element={<FacilityDetail />} />
        <Route path="townships" element={<Townships />} />
        <Route path="circles" element={<Circles />} />
        <Route path="login" element={<Login />} />
        <Route path="profile" element={<Profile />} />
        <Route path="create" element={<CreateActivity />} />
        <Route path="organizer" element={<Organizer />} />
        <Route path="admin" element={<Admin />} />
        <Route path="about" element={<About />} />
        <Route
          path="*"
          element={
            <div className="empty-state">
              <h1>Let’s find your way back.</h1>
              <p>This page isn’t in our neighbourhood.</p>
              <Link className="btn primary" to="/">
                Back to Discover
              </Link>
            </div>
          }
        />
      </Route>
    </Routes>
  );
}
