import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  CircleCheck,
  Clock3,
  Grid2X2,
  Heart,
  Leaf,
  ListFilter,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Sprout,
  Users,
  X,
} from "lucide-react";
import { dateLabel, human, money, timeLabel, useApp } from "../app/context";
import { ActivityCard } from "../components/ActivityCard";
import { ActivityArt } from "../components/Art";
import { Modal } from "../components/Modal";
export function Home() {
  const { data, township } = useApp();
  const [category, setCategory] = useState("All activities");
  const cats = [
    "All activities",
    "Sports & fitness",
    "Outdoor & nature",
    "Community",
    "Workshops",
  ];
  const activities = data.activities
    .filter(
      (a) =>
        a.status === "open" &&
        (township === "all" || a.township_id === township),
    )
    .filter(
      (a) =>
        category === "All activities" ||
        (category === "Sports & fitness"
          ? ["Badminton", "Yoga", "Futsal", "Basketball"].includes(a.category)
          : category === "Outdoor & nature"
            ? ["Running", "Cycling", "Gardening"].includes(a.category)
            : category === "Workshops"
              ? a.category === "Workshops"
              : /cleanup|recycling|family|social/i.test(a.category)),
    )
    .slice(0, 3);
  const facilities = data.facilities
    .filter((f) => township === "all" || f.township_id === township)
    .slice(0, 2);
  return (
    <>
      <section className="hero">
        <img
          className="hero-image"
          src="/images/community-park.png"
          alt="Illustration of neighbours enjoying a tropical community park"
        />
        <div className="hero-shade" />
        <div className="hero-content">
          <span className="hero-eyebrow">
            <span />
            GOOD THINGS HAPPEN TOGETHER
          </span>
          <h1>
            Your township.
            <br />A little more <em>connected.</em>
          </h1>
          <p>
            Discover a new space. Find your kind of people.
            <br />
            Make everyday moments mean a little more.
          </p>
          <div className="hero-actions">
            <Link className="btn primary" to="/activities">
              Find an activity
              <ArrowUpRight size={18} />
            </Link>
            <Link className="hero-secondary" to="/facilities">
              Explore nearby spaces
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        <div className="hero-caption">
          <span className="hero-caption-icon">
            <Leaf size={18} />
          </span>
          <div>
            A place for everyone.<small>Start with a little hello.</small>
          </div>
        </div>
        <span className="hero-image-label">Illustrative township park</span>
      </section>
      <div className="welcome-strip">
        <span className="welcome-icon">
          <Heart size={20} />
        </span>
        <p>
          <strong>A community starts with you.</strong> Join a session, share an
          idea, or simply show up.
        </p>
        <Link to="/create">
          Make something happen
          <ArrowRight size={16} />
        </Link>
      </div>
      <section id="activities" className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">FIND YOUR NEXT GOOD THING</span>
            <h2>A little time. A lot of connection.</h2>
            <p className="muted">
              Local activities, familiar faces, and a reason to get out there.
            </p>
          </div>
          <Link className="text-link" to="/activities">
            View all activities
            <ArrowRight size={17} />
          </Link>
        </div>
        <div className="category-tabs" aria-label="Activity categories">
          {cats.map((c, i) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={category === c ? "active" : ""}
            >
              {i === 0 ? (
                <Grid2X2 size={15} />
              ) : i === 1 ? (
                <span>◉</span>
              ) : i === 2 ? (
                <Leaf size={15} />
              ) : i === 3 ? (
                <Users size={15} />
              ) : (
                <Sparkles size={15} />
              )}{" "}
              {c}
            </button>
          ))}
        </div>
        <div className="card-grid">
          {activities.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
          {!activities.length && (
            <div className="empty-state wide">
              <Sprout size={34} />
              <h3>Something good could start here.</h3>
              <p>No open sample activities match this selection.</p>
              <Link className="btn secondary" to="/create">
                Propose an activity
              </Link>
            </div>
          )}
        </div>
        <p className="dataset-note">
          All events, participants, costs and activity statistics are
          demonstration records.
        </p>
      </section>
      <section className="section lower-discover">
        <div className="spaces-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">RIGHT AROUND THE CORNER</span>
              <h2>Spaces worth discovering.</h2>
            </div>
            <Link className="text-link" to="/facilities">
              Explore
              <ArrowUpRight size={17} />
            </Link>
          </div>
          {facilities.map((f, i) => (
            <Link className="space-row" key={f.id} to={"/facilities/" + f.id}>
              <div className={"space-thumb thumb-" + i}>
                <Leaf size={30} />
              </div>
              <div>
                <h3>{f.name}</h3>
                <p>
                  <MapPin size={12} />
                  {data.townships.find((t) => t.id === f.township_id)?.name}
                </p>
                <span>
                  {f.category} <b>·</b> {f.access_type}
                </span>
              </div>
              <ArrowUpRight size={20} />
            </Link>
          ))}
        </div>
        <div className="organize-banner">
          <span className="round-icon">
            <Users size={24} />
          </span>
          <span className="eyebrow">YOUR IDEA. OUR NEXT MOMENT.</span>
          <h2>
            Got something
            <br />
            in mind?
          </h2>
          <p>
            A friendly match. A weekend walk.
            <br />
            Bring your neighbours together.
          </p>
          <Link className="btn navy" to="/create">
            Organize an activity
            <Plus size={16} />
          </Link>
          <span className="banner-doodle" aria-hidden="true">
            <Sprout size={130} strokeWidth={0.7} />
          </span>
        </div>
      </section>
      <section className="how-it-works">
        <div>
          <span className="eyebrow">BELONGING, MADE SIMPLE</span>
          <h2>Good company is closer than you think.</h2>
        </div>
        <div>
          <span>01</span>
          <h3>Find your space</h3>
          <p>Explore real township facilities and their access information.</p>
        </div>
        <div>
          <span>02</span>
          <h3>Make a moment</h3>
          <p>Join a sample activity or bring your own idea to life.</p>
        </div>
        <div>
          <span>03</span>
          <h3>Grow together</h3>
          <p>Attend, connect, and earn points for showing up.</p>
        </div>
      </section>
    </>
  );
}
export function Activities() {
  const { data, township } = useApp();
  const [params] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") || ""),
    [category, setCategory] = useState("all"),
    [cost, setCost] = useState("all"),
    [date, setDate] = useState(""),
    [spaces, setSpaces] = useState(false),
    [calendar, setCalendar] = useState(false),
    [status, setStatus] = useState("open");
  useEffect(() => {
    setQuery(params.get("q") || "");
  }, [params]);
  const filtered = useMemo(
    () =>
      data.activities.filter(
        (a) =>
          (township === "all" || a.township_id === township) &&
          (status === "all" || a.status === status) &&
          (category === "all" || a.category === category) &&
          (cost === "all" ||
            (cost === "free"
              ? !["cost_sharing", "mixed"].includes(a.funding_model)
              : !!["cost_sharing", "mixed"].includes(a.funding_model))) &&
          (!date ||
            new Intl.DateTimeFormat("en-CA", {
              timeZone: "Asia/Kuala_Lumpur",
            }).format(new Date(a.start_time)) === date) &&
          (!spaces || a.registration_count < a.maximum_participants) &&
          [a.title, a.description, a.category]
            .join(" ")
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data, township, category, cost, date, spaces, query, status],
  );
  const groups = filtered.reduce<Record<string, typeof filtered>>((acc, a) => {
    (acc[dateLabel(a.start_time)] ??= []).push(a);
    return acc;
  }, {});
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR A GOOD TIME</span>
          <h1>Find your people. Do your thing.</h1>
          <p className="muted">
            Discover activities made by neighbours, for neighbours.
          </p>
        </div>
        <Link className="btn primary" to="/create">
          <Plus size={17} />
          Create activity
        </Link>
      </div>
      <div className="filter-panel panel">
        <label className="search-input">
          <Search size={18} />
          <input
            aria-label="Search activity directory"
            placeholder="Search activities or interests…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select
            aria-label="Activity category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All categories</option>
            {[...new Set(data.activities.map((a) => a.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <select
          aria-label="Cost"
          value={cost}
          onChange={(e) => setCost(e.target.value)}
        >
          <option value="all">Any cost</option>
          <option value="free">Free to join</option>
          <option value="paid">Cost-sharing estimates</option>
        </select>
        <input
          type="date"
          aria-label="Activity date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <select
          aria-label="Activity status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="open">Open activities</option>
          <option value="submitted">Community proposals</option>
          <option value="completed">Completed activities</option>
          <option value="all">All visible activities</option>
        </select>
      </div>
      <div className="results-toolbar">
        <span>
          <strong>{filtered.length}</strong>{" "}
          {status === "submitted" ? "proposals" : "activities"} to discover{" "}
          <span className="muted">· sample events</span>
        </span>
        <div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={spaces}
              onChange={(e) => setSpaces(e.target.checked)}
            />
            Spaces available
          </label>
          <div className="view-switch">
            <button
              aria-label="Card view"
              aria-pressed={!calendar}
              className={!calendar ? "active" : ""}
              onClick={() => setCalendar(false)}
            >
              <Grid2X2 size={17} />
            </button>
            <button
              aria-label="Calendar agenda view"
              aria-pressed={calendar}
              className={calendar ? "active" : ""}
              onClick={() => setCalendar(true)}
            >
              <CalendarDays size={17} />
            </button>
          </div>
        </div>
      </div>
      {filtered.length ? (
        calendar ? (
          <div className="calendar-agenda">
            {Object.entries(groups).map(([day, items]) => (
              <section key={day}>
                <h2>
                  <CalendarDays size={20} />
                  {day}
                </h2>
                {items?.map((a) => (
                  <Link
                    key={a.id}
                    className="agenda-row"
                    to={"/activities/" + a.id}
                  >
                    <span className="agenda-time">
                      {timeLabel(a.start_time)}
                      <small>{timeLabel(a.end_time)}</small>
                    </span>
                    <div>
                      <strong>{a.title}</strong>
                      <p>
                        {
                          data.facilities.find((f) => f.id === a.facility_id)
                            ?.name
                        }
                      </p>
                    </div>
                    <span className="badge">Sample event</span>
                    <ArrowUpRight size={20} />
                  </Link>
                ))}
              </section>
            ))}
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        )
      ) : (
        <div className="empty-state">
          <Search size={36} />
          <h2>No activities found this time.</h2>
          <p>Try another filter or create a new community moment.</p>
          <button
            className="btn secondary"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setCost("all");
              setDate("");
              setSpaces(false);
              setStatus("all");
            }}
          >
            Reset activity filters
          </button>
        </div>
      )}
    </>
  );
}
export function ActivityDetail() {
  const { id } = useParams();
  const { data, mutate, toast } = useApp();
  const [modal, setModal] = useState(false),
    [eligible, setEligible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const closeModal = useCallback(() => setModal(false), []);
  const a = data.activities.find((e) => e.id === id);
  if (!a)
    return (
      <div className="empty-state">
        <h1>Activity not found</h1>
        <Link to="/activities" className="btn secondary">
          Find activities
        </Link>
      </div>
    );
  const f = data.facilities.find((f) => f.id === a.facility_id),
    t = data.townships.find((t) => t.id === a.township_id),
    registration = data.registrations.find(
      (r) =>
        r.activity_id === a.id &&
        r.user_id === data.user?.id &&
        r.registration_status !== "cancelled",
    ),
    joined = !!registration,
    remaining = Math.max(0, a.maximum_participants - a.registration_count),
    free = !["cost_sharing", "mixed"].includes(a.funding_model);
  const remainder = Math.max(
    0,
    a.total_estimated_cost_sen -
      a.organizer_contribution_sen -
      (a.sponsorship_status === "approved" ? a.sponsorship_amount_sen : 0),
  );
  const paying = Math.max(1, a.minimum_participants, a.registration_count);
  const register = async () => {
    setBusy(true);
    setError("");
    try {
      await mutate(
        "/activities/" + a.id + "/registrations",
        "POST",
        { eligibility_confirmed: eligible },
        remaining
          ? "You’re registered. See you there!"
          : "You’re on the waitlist.",
      );
      setModal(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link className="back-link" to="/activities">
        <ChevronLeft size={16} />
        Back to activities
      </Link>
      <div className="detail-cover">
        <ActivityArt category={a.category} />
        <div className="detail-cover-tags">
          <span className="badge">{a.category}</span>
          <span className="badge">Sample event · simulated venue</span>
        </div>
      </div>
      <div className="detail-layout">
        <article>
          <div className="detail-title">
            <span className={"badge " + (a.status === "open" ? "green" : "")}>
              {human(a.status)}
            </span>
            <h1>{a.title}</h1>
            <p className="muted">
              Hosted by{" "}
              {data.demo_profiles.find((p) => p.id === a.organizer_id)
                ?.display_name || "a community organizer"}{" "}
              · Demo account
            </p>
          </div>
          <div className="detail-facts">
            <div>
              <CalendarDays />
              <span>
                <strong>{dateLabel(a.start_time)}</strong>
                <small>
                  {timeLabel(a.start_time)}–{timeLabel(a.end_time)} MYT
                </small>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <strong>{f?.name}</strong>
                <small>{t?.name}</small>
              </span>
            </div>
          </div>
          <section className="detail-section">
            <h2>A little about this moment</h2>
            <p className="prose">{a.description}</p>
            <div className="info-pills">
              <span>
                <Users size={15} />
                {a.target_audience || "Community members"}
              </span>
              <span>
                <Heart size={15} />
                {a.age_suitability || "Check with organizer"}
              </span>
            </div>
          </section>
          <section className="detail-section">
            <h2>The space & access</h2>
            <Link className="text-link" to={"/facilities/" + a.facility_id}>
              {f?.name}
              <ArrowUpRight size={17} />
            </Link>
            <p>{f?.description}</p>
            <div className="notice warning">
              <ShieldCheck size={20} />
              <div>
                <strong>{f?.access_type}</strong>
                <p>
                  Demo venue confirmation does not grant real access or reserve
                  this facility. Eligible access and operator permission must be
                  checked separately.
                </p>
              </div>
            </div>
          </section>
          <section className="detail-section">
            <h2>Making it happen, together</h2>
            <div className="panel funding-summary">
              <div>
                <span>Funding model</span>
                <strong>{human(a.funding_model)}</strong>
              </div>
              <div>
                <span>Illustrative total cost</span>
                <strong>{money(a.total_estimated_cost_sen)}</strong>
              </div>
              {a.organizer_contribution_sen > 0 && (
                <div>
                  <span>Organizer contribution · illustrative</span>
                  <strong>{money(a.organizer_contribution_sen)}</strong>
                </div>
              )}
              {a.sponsorship_amount_sen > 0 && (
                <div>
                  <span>Demo sponsorship · {human(a.sponsorship_status)}</span>
                  <strong>{money(a.sponsorship_amount_sen)}</strong>
                </div>
              )}
              <div>
                <span>
                  Estimated contribution per person
                  <br />
                  <small>
                    Using {paying} paying{" "}
                    {paying === 1 ? "participant" : "participants"}; rounded up
                    to the nearest sen.
                  </small>
                </span>
                <strong>
                  {free ? "Free" : money(Math.ceil(remainder / paying))}
                </strong>
              </div>
              <p className="muted">
                All funding is simulated. Joining records your estimate at that
                time; it does not process a payment. Changes in attendance may
                change future estimates. Your recorded obligation is never
                changed silently; the organizer covers any remaining shortfall.
              </p>
            </div>
          </section>
          <section className="detail-section">
            <h2>Help bring this idea to life</h2>
            <p>
              {a.interest_count} residents have expressed interest. Interest
              helps organizers understand demand and does not reserve a place.
            </p>
            {["completed", "cancelled", "rejected"].includes(a.status) ? (
              <span className="badge subtle">Interest closed</span>
            ) : data.user ? (
              <button
                className="btn secondary"
                onClick={() =>
                  mutate(
                    "/activities/" + a.id + "/interest",
                    "POST",
                    undefined,
                    "Your interest has been updated",
                  ).catch((e) => toast(e.message))
                }
              >
                <Heart size={17} />{" "}
                {data.interests.some(
                  (i) => i.activity_id === a.id && i.user_id === data.user?.id,
                )
                  ? "Remove my interest"
                  : "I’m interested"}
              </button>
            ) : (
              <Link className="text-link" to="/login">
                Sign in to express interest
                <ArrowRight size={16} />
              </Link>
            )}
          </section>
        </article>
        <aside className="registration-panel panel">
          <span className="eyebrow">A SPOT FOR YOU</span>
          <h2>
            {free ? "Free to join" : money(Math.ceil(remainder / paying))}
            <small>
              {free
                ? "Just bring yourself."
                : "Estimated per person · demo only"}
            </small>
          </h2>
          <div className="capacity">
            <div>
              <Users size={16} />
              {a.registration_count} / {a.maximum_participants} registered
            </div>
            <div className="capacity-track">
              <span
                style={{
                  width:
                    Math.min(
                      100,
                      (a.registration_count / a.maximum_participants) * 100,
                    ) + "%",
                }}
              />
            </div>
          </div>
          <p className="spots-text">
            {remaining
              ? remaining + " spots waiting for good company."
              : "Full for now. Join the waitlist."}
          </p>
          {joined ? (
            <>
              <div className="registration-confirmed">
                <CircleCheck size={22} />
                <strong>
                  {registration.registration_status === "waitlisted"
                    ? "You’re on the waitlist"
                    : "You’re on the list!"}
                </strong>
                <span>Reference: {registration.reference}</span>
                <small>
                  Recorded demo contribution:{" "}
                  {money(registration.obligation_sen)}
                </small>
                {registration.checked_in_at && (
                  <span>Attendance verified ✓</span>
                )}
              </div>
              {a.status === "open" && !registration.checked_in_at && (
                <button
                  className="btn secondary full"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel your sample registration? No real payment is involved.",
                      )
                    )
                      mutate(
                        "/activities/" + a.id + "/registrations",
                        "DELETE",
                        undefined,
                        "Registration cancelled",
                      ).catch((e) => toast(e.message));
                  }}
                >
                  Cancel registration
                </button>
              )}
            </>
          ) : a.status === "open" ? (
            data.user?.id === a.organizer_id ? (
              <Link className="btn primary full" to="/organizer">
                Manage activity
                <ArrowRight size={17} />
              </Link>
            ) : data.user ? (
              <button
                className="btn primary full"
                onClick={() => {
                  setModal(true);
                  setError("");
                }}
              >
                {remaining ? "Count me in" : "Join waitlist"}
                <ArrowRight size={17} />
              </button>
            ) : (
              <Link className="btn primary full" to="/login">
                Sign in to join
                <ArrowRight size={17} />
              </Link>
            )
          ) : (
            <p className="notice">
              Registration is{" "}
              {a.status === "completed"
                ? "closed"
                : "not open for this activity"}
              .
            </p>
          )}
          <div className="registration-reward">
            <Sprout size={23} />
            <div>
              <strong>Show up. Grow your impact.</strong>
              <small>
                Earn RuangPoints after organizer-verified attendance. Joining
                alone earns no points.
              </small>
            </div>
          </div>
          <p className="dataset-note">
            This is a sample event. No real venue booking, payment, sponsorship
            or reward redemption.
          </p>
        </aside>
      </div>
      {modal && (
        <Modal titleId="register-title" onClose={closeModal}>
          <div className="round-icon">
            <Users />
          </div>
          <h2 id="register-title">Save a little time for community.</h2>
          <p>
            You’re {remaining ? "registering" : "joining the waitlist"} for{" "}
            <strong>{a.title}</strong>.
          </p>
          <div className="notice warning">
            <ShieldCheck size={20} />
            <div>
              <strong>{f?.access_type}</strong>
              <p>
                This is a simulated registration. You must separately confirm
                real venue eligibility and permission.
              </p>
            </div>
          </div>
          <label className="checkbox-label eligibility">
            <input
              type="checkbox"
              checked={eligible}
              onChange={(e) => setEligible(e.target.checked)}
            />
            I understand the access conditions and confirm eligibility for this
            demonstration.
          </label>
          {!free && (
            <p>
              Your recorded illustrative contribution will be approximately{" "}
              {money(
                Math.ceil(
                  remainder /
                    Math.max(
                      1,
                      a.minimum_participants,
                      Math.min(
                        a.maximum_participants,
                        a.registration_count + 1,
                      ),
                    ),
                ),
              )}
              . No money is collected.
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="btn primary full"
            disabled={!eligible || busy}
            onClick={register}
          >
            {busy
              ? "Saving…"
              : remaining
                ? "Confirm sample registration"
                : "Confirm waitlist"}
          </button>
          <button className="btn text full" onClick={() => setModal(false)}>
            Maybe another time
          </button>
        </Modal>
      )}
    </>
  );
}
