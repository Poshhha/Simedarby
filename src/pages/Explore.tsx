import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Leaf,
  MapPin,
  Search,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import { useApp, dateLabel } from "../app/context";
import { ActivityArt } from "../components/Art";
import { ActivityCard } from "../components/ActivityCard";
export function Facilities() {
  const { data, township } = useApp();
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [access, setAccess] = useState("all"),
    [suitability, setSuitability] = useState("all"),
    [pricing, setPricing] = useState("all");
  const facilities = data.facilities.filter(
    (f) =>
      (township === "all" || f.township_id === township) &&
      (category === "all" || f.category === category) &&
      (access === "all" ||
        (access === "restricted"
          ? f.access_type.toLowerCase().includes("resident") ||
            f.access_type.toLowerCase().includes("restricted")
          : f.access_type.toLowerCase().includes("unverified"))) &&
      (suitability === "all" || f.activity_types.includes(suitability)) &&
      (pricing === "all" || f.pricing_status.toLowerCase().includes(pricing)) &&
      (f.name + " " + f.description + " " + f.amenities.join(" "))
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR TOWNSHIP, REDISCOVERED</span>
          <h1>A space for your next idea.</h1>
          <p className="muted">
            Real places. Official sources. A little possibility around every
            corner.
          </p>
        </div>
        <span className="verified-label">
          <ShieldCheck size={17} />
          Source-backed directory
        </span>
      </div>
      <div className="notice source-notice">
        <ShieldCheck size={21} />
        <div>
          <strong>Know the space before you make plans.</strong>
          <p>
            Official documentation establishes facility identity and listed
            amenities. Access, current opening, pricing and booking availability
            require separate confirmation. RUANGKITA cannot reserve these
            venues.
          </p>
        </div>
      </div>
      <div className="filter-panel panel">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label="Search facilities"
            placeholder="Search facilities or amenities…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Facility category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="all">All categories</option>
          {[...new Set(data.facilities.map((f) => f.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select
          aria-label="Facility access"
          value={access}
          onChange={(e) => setAccess(e.target.value)}
        >
          <option value="all">Any access status</option>
          <option value="restricted">Residents / restricted</option>
          <option value="unknown">Access unverified</option>
        </select>
        <select
          aria-label="Suitable activity"
          value={suitability}
          onChange={(e) => setSuitability(e.target.value)}
        >
          <option value="all">Any activity</option>
          {[...new Set(data.facilities.flatMap((f) => f.activity_types))]
            .sort()
            .map((c) => (
              <option key={c}>{c}</option>
            ))}
        </select>
        <select
          aria-label="Facility pricing"
          value={pricing}
          onChange={(e) => setPricing(e.target.value)}
        >
          <option value="all">Any pricing status</option>
          <option value="free">Documented free</option>
          <option value="paid">Documented paid</option>
          <option value="not published">Pricing not published</option>
        </select>
      </div>
      <div className="results-toolbar">
        <span>
          <strong>{facilities.length}</strong> places to explore
        </span>
        <span className="muted">
          Opening & bookings subject to operator confirmation
        </span>
      </div>
      <div className="card-grid facility-grid">
        {facilities.map((f, i) => (
          <article className="facility-card panel" key={f.id}>
            <Link className="facility-visual" to={"/facilities/" + f.id}>
              <ActivityArt
                category={
                  f.id === "lyra-park"
                    ? "Badminton"
                    : f.category.includes("hub")
                      ? "Workshops"
                      : i % 3 === 0
                        ? "Yoga"
                        : "Running"
                }
              />
              <span className="image-tag">{f.category}</span>
            </Link>
            <div className="card-body">
              <span className="card-town">
                <MapPin size={13} />
                {data.townships.find((t) => t.id === f.township_id)?.name}
              </span>
              <Link className="card-title" to={"/facilities/" + f.id}>
                {f.name}
              </Link>
              <p className="facility-description">{f.description}</p>
              <div className="facility-tags">
                <span className="badge">{f.access_type}</span>
                <span className="badge subtle">{f.pricing_status}</span>
              </div>
              <div className="facility-source">
                <span>
                  <ShieldCheck size={14} />
                  {f.verification_status}
                  <small>
                    {f.verified_at
                      ? "Source checked " + dateLabel(f.verified_at)
                      : "Live source recheck required"}
                  </small>
                </span>
                <Link
                  className="arrow-link"
                  to={"/facilities/" + f.id}
                  aria-label={"View " + f.name}
                >
                  <ArrowUpRight size={19} />
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!facilities.length && (
        <div className="empty-state">
          <Search size={32} />
          <h2>No matching spaces.</h2>
          <p>Try broadening your search or changing township.</p>
          <button
            className="btn secondary"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setAccess("all");
              setSuitability("all");
              setPricing("all");
            }}
          >
            Reset facility filters
          </button>
        </div>
      )}
    </>
  );
}
export function FacilityDetail() {
  const { id } = useParams();
  const { data } = useApp();
  const f = data.facilities.find((f) => f.id === id);
  if (!f)
    return (
      <div className="empty-state">
        <h1>Facility not found</h1>
        <Link to="/facilities">Explore facilities</Link>
      </div>
    );
  const town = data.townships.find((t) => t.id === f.township_id),
    activities = data.activities.filter(
      (a) => a.facility_id === f.id && a.status === "open",
    );
  return (
    <>
      <Link className="back-link" to="/facilities">
        <ChevronLeft size={16} />
        Back to spaces
      </Link>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{town?.name}</span>
          <h1>{f.name}</h1>
          <p className="muted">{f.category}</p>
        </div>
        <span className="verified-label">
          <ShieldCheck size={18} />
          {f.verification_status}
        </span>
      </div>
      <div className="facility-detail-grid">
        <div>
          <div className="facility-detail-image">
            <ActivityArt
              category={f.id === "lyra-park" ? "Badminton" : "Running"}
            />
          </div>
          <section className="panel padded">
            <h2>About this space</h2>
            <p className="prose">{f.description}</p>
            <h3>Documented amenities</h3>
            <div className="amenities">
              {f.amenities.length ? (
                f.amenities.map((a) => (
                  <span key={a}>
                    <CheckCircle2 size={16} />
                    {a}
                  </span>
                ))
              ) : (
                <p className="muted">
                  No additional amenities verified in this source.
                </p>
              )}
            </div>
            <h3>Activity ideas</h3>
            <div className="info-pills">
              {f.activity_types.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
            <p className="dataset-note">
              Activity ideas are suggestions; suitability and access must be
              confirmed with the venue.
            </p>
          </section>
        </div>
        <aside className="panel padded facility-info">
          <h2>Before you visit</h2>
          <dl>
            <dt>Access</dt>
            <dd>{f.access_type}</dd>
            <dt>Facility status</dt>
            <dd>{f.facility_status}</dd>
            <dt>Pricing</dt>
            <dd>{f.pricing_status}</dd>
            <dt>Booking</dt>
            <dd>{f.booking_type}</dd>
            <dt>Location</dt>
            <dd>
              {f.address ||
                "Exact address not verified. Use the township and facility name for your own directions check."}
            </dd>
            <dt>Operator</dt>
            <dd>{f.operator || "Not independently verified"}</dd>
            <dt>Source verification</dt>
            <dd>
              {f.verified_at ? dateLabel(f.verified_at) : "Recheck required"}
            </dd>
          </dl>
          <a
            className="btn secondary full"
            href={f.source_url}
            target="_blank"
            rel="noreferrer"
          >
            Read official source
            <ExternalLink size={16} />
          </a>
          <a
            className="btn text full"
            href={
              "https://www.google.com/maps/search/?api=1&query=" +
              encodeURIComponent(f.name + " " + town?.name + " Selangor")
            }
            target="_blank"
            rel="noreferrer"
          >
            External map search
            <ArrowUpRight size={16} />
          </a>
          <div className="notice warning">
            <ShieldCheck size={18} />
            <p>
              A directory entry is not a booking. No live availability or prices
              are supplied.
            </p>
          </div>
          <Link className="btn primary full" to="/create">
            Propose an activity
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>Community moments at this space</h2>
          <span className="badge">Sample events</span>
        </div>
        {activities.length ? (
          <div className="card-grid">
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Sprout size={28} />
            <h3>Be the start of something.</h3>
            <p>No open sample activities at this facility yet.</p>
          </div>
        )}
      </section>
    </>
  );
}
export function Townships() {
  const { data, setTownship } = useApp();
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            SIX TOWNSHIPS. COUNTLESS POSSIBILITIES.
          </span>
          <h1>Different places. A shared sense of home.</h1>
          <p className="muted">
            Explore documented spaces and community ideas across Selangor.
          </p>
        </div>
      </div>
      <div className="township-grid">
        {data.townships.map((t, i) => {
          const facilities = data.facilities.filter(
              (f) => f.township_id === t.id,
            ),
            activities = data.activities.filter(
              (a) => a.township_id === t.id && a.status === "open",
            );
          return (
            <article className="township-card panel" key={t.id}>
              <div className={"township-visual township-visual-" + i}>
                <img src="/images/community-park.png" alt="" loading="lazy" />
                <span className="township-number">0{i + 1}</span>
                <span className="township-location">
                  <MapPin size={15} />
                  {t.state}, Malaysia
                </span>
                <small>Illustrative township park</small>
              </div>
              <div className="card-body">
                <h2>{t.name}</h2>
                <p>{t.description}</p>
                <div className="township-stats">
                  <span>
                    <Leaf size={15} />
                    {facilities.length} documented{" "}
                    {facilities.length === 1 ? "space" : "spaces"}
                  </span>
                  <span>
                    <CalendarIcon />
                    {activities.length} sample activities
                  </span>
                </div>
                <div className="button-row">
                  <Link
                    className="btn secondary"
                    to="/facilities"
                    onClick={() => setTownship(t.id)}
                  >
                    Explore township
                    <ArrowUpRight size={17} />
                  </Link>
                  <a
                    href={t.official_source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="icon-btn"
                    aria-label={"Official source for " + t.name}
                  >
                    <ExternalLink size={18} />
                  </a>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
function CalendarIcon() {
  return <span aria-hidden="true">◷</span>;
}
export function Circles() {
  const { data, township, mutate, toast } = useApp();
  const [search, setSearch] = useState(""),
    [busy, setBusy] = useState("");
  const circles = data.communities.filter(
    (c) =>
      (township === "all" || c.township_id === township) &&
      (c.name + " " + c.description)
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FAMILIAR INTERESTS. NEW FRIENDSHIPS.</span>
          <h1>Your people are right around here.</h1>
          <p className="muted">
            Find a community circle and turn a shared interest into a shared
            habit.
          </p>
        </div>
        <span className="badge">Demo communities</span>
      </div>
      <label className="search-input panel circles-search">
        <Search size={18} />
        <input
          aria-label="Search circles"
          placeholder="Find your circle…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <div className="circles-grid">
        {circles.map((c, i) => {
          const joined = data.memberships.some(
              (m) => m.community_id === c.id && m.user_id === data.user?.id,
            ),
            related = data.activities.filter(
              (a) =>
                a.township_id === c.township_id &&
                a.category === c.interest_category &&
                a.status === "open",
            );
          return (
            <article className="circle-card panel" key={c.id}>
              <div className={"circle-icon circle-" + (i % 4)}>
                {i % 3 === 0 ? (
                  <Users size={28} />
                ) : i % 3 === 1 ? (
                  <Sprout size={28} />
                ) : (
                  <HeartIcon />
                )}
              </div>
              <span className="card-town">
                <MapPin size={13} />
                {data.townships.find((t) => t.id === c.township_id)?.name}
              </span>
              <h2>{c.name}</h2>
              <p>{c.description}</p>
              <span className="badge subtle">{c.interest_category}</span>
              <div className="circle-meta">
                <Users size={16} />
                {c.member_count ?? (joined ? 1 : 0)} demo members
                <span>{related.length} upcoming activities</span>
              </div>
              {related.length > 0 && (
                <Link
                  className="circle-next"
                  to={"/activities/" + related[0].id}
                >
                  Next up: {related[0].title}
                  <ArrowUpRight size={15} />
                </Link>
              )}
              {data.user ? (
                <button
                  className={"btn full " + (joined ? "secondary" : "primary")}
                  disabled={busy === c.id}
                  onClick={async () => {
                    setBusy(c.id);
                    try {
                      await mutate(
                        "/communities/" + c.id + "/membership",
                        "POST",
                        undefined,
                        joined
                          ? "You left the circle"
                          : "Welcome to the circle!",
                      );
                    } catch (e) {
                      toast((e as Error).message);
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {joined ? (
                    <>
                      <Check size={16} />
                      Joined · Leave circle
                    </>
                  ) : (
                    <>
                      Find your place
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              ) : (
                <Link className="btn primary full" to="/login">
                  Sign in to join
                  <ArrowRight size={16} />
                </Link>
              )}
            </article>
          );
        })}
      </div>
      {!circles.length && (
        <div className="empty-state">
          <Users size={32} />
          <h2>No circles match yet.</h2>
          <p>Try a different township or search.</p>
        </div>
      )}
    </>
  );
}
function HeartIcon() {
  return (
    <span className="heart-icon" aria-hidden="true">
      ♡
    </span>
  );
}
