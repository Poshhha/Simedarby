import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Gift,
  Leaf,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
} from "lucide-react";
import { dateLabel, human, money, useApp } from "../app/context";
export function Login() {
  const { data, mutate } = useApp();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(""),
    [error, setError] = useState("");
  return (
    <div className="login-layout">
      <section className="login-story">
        <span className="eyebrow">YOUR NEIGHBOURHOOD IS WAITING</span>
        <h1>
          A familiar place.
          <br />A few new faces.
        </h1>
        <p>
          Step into RUANGKITA and see how a little participation can bring a
          community together.
        </p>
        <div className="login-story-art">
          <img
            src="/images/community-park.png"
            alt="Illustration of a tropical community park"
          />
          <span>
            Discover spaces. Create moments.
            <br />
            <strong>Connect communities.</strong>
          </span>
        </div>
      </section>
      <section className="panel login-panel">
        <div className="round-icon">
          <HouseIcon />
        </div>
        <h2>Come on in.</h2>
        <p className="muted">
          Choose a prepared identity to explore the prototype.
        </p>
        <div className="notice warning">
          <ShieldCheck size={21} />
          <div>
            <strong>Open demonstration access</strong>
            <p>
              These fictional accounts are available to every tester, including
              the administrator. This is not verified resident authentication.
              Don’t enter real personal information.
            </p>
          </div>
        </div>
        <div className="demo-accounts">
          {data.demo_profiles.map((p, i) => (
            <button
              className="demo-account"
              disabled={!!busy}
              key={p.id}
              onClick={async () => {
                setBusy(p.id);
                setError("");
                try {
                  await mutate(
                    "/session",
                    "POST",
                    { profile_id: p.id },
                    "Welcome, " + p.display_name,
                  );
                  navigate(
                    p.role.includes("admin")
                      ? "/admin"
                      : p.role === "organizer"
                        ? "/organizer"
                        : "/profile",
                  );
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy("");
                }
              }}
            >
              <span className={"avatar account-avatar account-" + i}>
                {p.display_name.slice(0, 1)}
              </span>
              <span>
                <strong>{p.display_name}</strong>
                <small>
                  {human(p.role)} ·{" "}
                  {p.id === "resident-1"
                    ? "Resident & proposal creator"
                    : p.id === "resident-2"
                      ? "Second resident journey"
                      : p.id === "organizer-1"
                        ? "Event & attendance management"
                        : "Proposal review & township insights"}
                </small>
              </span>
              <ArrowRight size={18} />
            </button>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="dataset-note">
          Sessions use an HttpOnly cookie. Roles and ownership are enforced by
          the demo server. Production managed authentication is not configured.
        </p>
        <Link className="text-link" to="/about">
          About the demonstration
          <ArrowUpRight size={15} />
        </Link>
      </section>
    </div>
  );
}
function HouseIcon() {
  return <Users size={25} />;
}
export function Profile() {
  const { data, mutate, toast } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const [editing, setEditing] = useState(false),
    [name, setName] = useState(data.user?.display_name || ""),
    [town, setTown] = useState(data.user?.home_township_id || ""),
    [interests, setInterests] = useState(
      data.user?.interests?.join(", ") || "",
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setName(data.user?.display_name || "");
    setTown(data.user?.home_township_id || "");
    setInterests(data.user?.interests?.join(", ") || "");
  }, [data.user]);
  if (!data.user)
    return (
      <div className="empty-state">
        <span className="round-icon">
          <Users />
        </span>
        <h1>A little more community starts here.</h1>
        <p>
          Sign into a demonstration account to see registrations, participation
          and rewards.
        </p>
        <Link className="btn primary" to="/login">
          Try a demo account
          <ArrowRight size={17} />
        </Link>
      </div>
    );
  const user = data.user,
    registrations = data.registrations.filter(
      (r) => r.user_id === user.id && r.registration_status !== "cancelled",
    ),
    points = data.points.filter((p) => p.user_id === user.id),
    balance = points.reduce((s, p) => s + p.points_change, 0),
    attended = registrations.filter((r) => r.checked_in_at),
    proposals = data.activities.filter((a) => a.organizer_id === user.id),
    memberships = data.memberships.filter((m) => m.user_id === user.id);
  return (
    <>
      <div className="profile-welcome">
        <div>
          <span className="eyebrow">YOUR COMMUNITY SPACE</span>
          <h1>Good to see you, {user.display_name.split(" ")[0]}.</h1>
          <p>
            <MapPin size={15} />
            {
              data.townships.find((t) => t.id === user.home_township_id)?.name
            }{" "}
            <span className="badge">Demo account</span>
          </p>
        </div>
        <div className="button-row">
          <Link className="btn secondary" to="/login">
            Switch demo account
          </Link>
          <button
            className="icon-btn"
            aria-label="Edit profile"
            onClick={() => setEditing(!editing)}
          >
            <Edit3 size={19} />
          </button>
        </div>
      </div>
      <div className="stats-grid profile-stats">
        <div className="stat">
          <span className="stat-icon green">
            <Sprout />
          </span>
          <div>
            <p>Your RuangPoints</p>
            <strong>{balance}</strong>
            <small>For showing up, together</small>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon orange">
            <CalendarDays />
          </span>
          <div>
            <p>Your registrations</p>
            <strong>{registrations.length}</strong>
            <small>Including waitlist positions</small>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon lavender">
            <CheckCircle2 />
          </span>
          <div>
            <p>Verified participation</p>
            <strong>{attended.length}</strong>
            <small>Organizer-confirmed attendance</small>
          </div>
        </div>
        <div className="stat">
          <span className="stat-icon green">
            <Users />
          </span>
          <div>
            <p>Community circles</p>
            <strong>{memberships.length}</strong>
            <small>Shared interests, closer ties</small>
          </div>
        </div>
      </div>
      {editing && (
        <form
          className="panel padded profile-edit"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              await mutate(
                "/profile",
                "PATCH",
                {
                  display_name: name,
                  home_township_id: town,
                  interests: interests
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
                "Your demo profile is updated",
              );
              setEditing(false);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2>A little about you</h2>
          <p className="muted">
            Use fictional details for this shared demonstration.
          </p>
          <div className="form-grid">
            <label className="field">
              Display name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </label>
            <label className="field">
              Home township
              <select value={town} onChange={(e) => setTown(e.target.value)}>
                {data.townships.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field wide">
              Interests, separated by commas
              <input
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                maxLength={300}
              />
            </label>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="button-row">
            <button className="btn primary" disabled={busy}>
              Save profile
            </button>
            <button
              className="btn text"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      <div className="tabs profile-tabs">
        {["overview", "registrations", "rewards"].map((t) => (
          <button
            className={"tab " + (tab === t ? "active" : "")}
            key={t}
            onClick={() => setParams(t === "overview" ? {} : { tab: t })}
          >
            {t === "overview"
              ? "My community"
              : t === "registrations"
                ? "My registrations"
                : "RuangPoints & history"}
          </button>
        ))}
      </div>
      {tab === "rewards" ? (
        <>
          <div className="rewards-hero">
            <span className="reward-illustration">
              <Sprout size={70} strokeWidth={1} />
            </span>
            <div>
              <span className="eyebrow">SMALL ACTIONS. SHARED IMPACT.</span>
              <h2>{balance} RuangPoints</h2>
              <p>
                Every point starts with showing up. These are prototype
                participation points,
                <br />
                with no monetary value or real reward redemption.
              </p>
            </div>
          </div>
          <div className="rewards-layout">
            <section className="panel padded">
              <h2>Your participation ledger</h2>
              <p className="muted">
                Awards are recorded once. Corrections create reversal entries.
              </p>
              {points.length ? (
                <div className="ledger">
                  {points.map((p) => (
                    <div className="ledger-row" key={p.id}>
                      <span className="ledger-icon">
                        <Leaf size={19} />
                      </span>
                      <div>
                        <strong>{human(p.reason)}</strong>
                        <p>
                          {data.activities.find((a) => a.id === p.activity_id)
                            ?.title || "Sample activity"}{" "}
                          · {dateLabel(p.created_at)}
                        </p>
                      </div>
                      <b
                        className={
                          p.points_change >= 0 ? "positive" : "negative"
                        }
                      >
                        {p.points_change > 0 ? "+" : ""}
                        {p.points_change}
                      </b>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state compact">
                  <Sprout size={30} />
                  <h3>Ready when you are.</h3>
                  <p>
                    Join an activity and have your attendance verified to start
                    growing points.
                  </p>
                  <Link to="/activities" className="text-link">
                    Find your first activity
                    <ArrowRight size={16} />
                  </Link>
                </div>
              )}
            </section>
            <section className="panel padded">
              <h2>How your points grow</h2>
              <dl className="points-policy">
                <dt>Verified attendance</dt>
                <dd>+20</dd>
                <dt>First verified activity</dt>
                <dd>+10</dd>
                <dt>Sustainability participation</dt>
                <dd>+10</dd>
                <dt>Organize & complete an event</dt>
                <dd>+30</dd>
              </dl>
              <h3>Your milestones</h3>
              <div
                className={"badge-card " + (attended.length ? "earned" : "")}
              >
                <Award size={30} />
                <span>
                  <strong>
                    {attended.length
                      ? "First connection"
                      : "A connection waiting to happen"}
                  </strong>
                  <small>
                    {attended.length
                      ? "Your first verified activity"
                      : "Attend your first sample activity"}
                  </small>
                </span>
                {attended.length > 0 && <CheckCircle2 size={20} />}
              </div>
            </section>
          </div>
        </>
      ) : (
        <>
          <section className="section">
            <div className="section-heading">
              <h2>
                {tab === "registrations"
                  ? "Your registered activities"
                  : "Your next community moments"}
              </h2>
              <Link className="text-link" to="/activities">
                Find an activity
                <ArrowRight size={16} />
              </Link>
            </div>
            {registrations.length ? (
              <div className="registration-list">
                {registrations.map((r) => {
                  const a = data.activities.find((a) => a.id === r.activity_id);
                  return a ? (
                    <article className="panel registration-row" key={r.id}>
                      <div className="date-tile">
                        <strong>
                          {new Date(a.start_time).toLocaleDateString("en-MY", {
                            day: "numeric",
                            timeZone: "Asia/Kuala_Lumpur",
                          })}
                        </strong>
                        <span>
                          {new Date(a.start_time).toLocaleDateString("en-MY", {
                            month: "short",
                            timeZone: "Asia/Kuala_Lumpur",
                          })}
                        </span>
                      </div>
                      <div>
                        <Link
                          className="registration-title"
                          to={"/activities/" + a.id}
                        >
                          {a.title}
                        </Link>
                        <p>
                          {
                            data.facilities.find((f) => f.id === a.facility_id)
                              ?.name
                          }
                        </p>
                        <small>
                          Reference: {r.reference} · {money(r.obligation_sen)}{" "}
                          simulated contribution
                        </small>
                      </div>
                      <span
                        className={"badge " + (r.checked_in_at ? "green" : "")}
                      >
                        {r.checked_in_at
                          ? "Attendance verified"
                          : human(r.registration_status)}
                      </span>
                      <Link
                        className="arrow-link"
                        aria-label={"View " + a.title}
                        to={"/activities/" + a.id}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </article>
                  ) : null;
                })}
              </div>
            ) : (
              <div className="empty-state panel">
                <CalendarDays size={32} />
                <h3>Your calendar has room for community.</h3>
                <p>Join a sample activity and it will appear here.</p>
                <Link className="btn secondary" to="/activities">
                  Explore activities
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
          {tab === "overview" && (
            <div className="profile-columns">
              <section className="panel padded">
                <div className="section-heading">
                  <h2>Your ideas in motion</h2>
                  <Link className="text-link" to="/create">
                    Create
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                {proposals.length ? (
                  proposals.map((a) => (
                    <Link className="proposal-mini" to="/organizer" key={a.id}>
                      <span>
                        <strong>{a.title}</strong>
                        <small>
                          {a.registration_count} registrations · Sample event
                        </small>
                      </span>
                      <span className="badge">{human(a.status)}</span>
                    </Link>
                  ))
                ) : (
                  <p className="muted">
                    A friendly game or weekend walk? Your first idea could bring
                    neighbours together.
                  </p>
                )}
              </section>
              <section className="panel padded">
                <div className="section-heading">
                  <h2>Your circles</h2>
                  <Link className="text-link" to="/circles">
                    Discover
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
                {memberships.length ? (
                  memberships.map((m) => (
                    <Link
                      className="proposal-mini"
                      to="/circles"
                      key={m.community_id}
                    >
                      <span className="circle-icon small">
                        <Users size={18} />
                      </span>
                      <strong>
                        {
                          data.communities.find((c) => c.id === m.community_id)
                            ?.name
                        }
                      </strong>
                      <ArrowUpRight size={16} />
                    </Link>
                  ))
                ) : (
                  <p className="muted">
                    Find neighbours who share your interests. Join a demo
                    community circle.
                  </p>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </>
  );
}
export function About() {
  return (
    <article className="about-page">
      <span className="eyebrow">A LITTLE CONTEXT</span>
      <h1>
        Built for belonging.
        <br />
        Made for demonstration.
      </h1>
      <p className="lead">
        RUANGKITA is an independent hackathon prototype for the Sime Darby
        Property University Hackathon 2026, exploring how township spaces can
        bring people together.
      </p>
      <section className="panel padded">
        <h2>What is real, and what is a demonstration?</h2>
        <div className="about-columns">
          <div>
            <ShieldCheck size={26} />
            <h3>Documented places</h3>
            <p>
              Township and facility names and listed amenities reference
              official publications. Each directory entry links to its source
              and shows its verification date. Documentation does not establish
              current access, opening, prices or availability.
            </p>
          </div>
          <div>
            <Sparkles size={26} />
            <h3>Simulated participation</h3>
            <p>
              All residents, events, registrations, attendance, sponsorship
              decisions, costs and points are sample records. The server
              persists these actions in SQLite. No real bookings, payments,
              financial commitments or reward partnerships are made.
            </p>
          </div>
        </div>
      </section>
      <section className="panel padded">
        <h2>Demonstration access & privacy</h2>
        <p className="prose">
          Prepared identities, including the administrator, are openly
          selectable for testing. HTTP-only cookie sessions and server-side role
          and ownership checks govern application actions. These accounts do not
          verify real identity, residency or eligibility and must not hold real
          personal information. Managed production authentication is not
          connected.
        </p>
        <p className="prose">
          This demonstration is shared: another tester can select the same
          fictional account and see its sample records. Only your chosen demo
          identity’s registrations and rewards are normally returned; organizers
          see participants in their own events and administrators see demo
          operations. Local browser storage retains your township selection.
          SQLite retains demonstration records on the server.
        </p>
      </section>
      <section className="panel padded">
        <h2>Independent prototype</h2>
        <p className="prose">
          RUANGKITA does not claim official partnership, endorsement,
          sponsorship, venue access or integration with Sime Darby Property.
          Real event organizers must arrange venue permission, eligible access
          and any financial arrangements separately.
        </p>
        <p className="prose">
          RuangPoints are proposed demonstration rules. They have no monetary
          value and cannot be exchanged for vouchers or services.
        </p>
        <Link className="btn primary" to="/activities">
          Explore the prototype
          <ArrowRight size={17} />
        </Link>
      </section>
    </article>
  );
}
