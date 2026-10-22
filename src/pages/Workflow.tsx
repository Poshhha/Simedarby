import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Users,
  CalendarDays,
  ShieldCheck,
  MapPin,
  Sparkles,
  TrendingUp,
  Leaf,
  Plus,
  Send,
  AlertCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { useApp, money, dateLabel, timeLabel, human } from "../app/context";
import type { Activity } from "../app/types";

const categories = [
  "Badminton",
  "Futsal",
  "Basketball",
  "Yoga",
  "Running",
  "Cycling",
  "Family activities",
  "Workshops",
  "Community cleanup",
  "Recycling",
  "Gardening",
  "Cultural and social",
];
const fundingModels = [
  ["free", "Free activity", "Everyone joins at no cost."],
  ["organizer_funded", "Organizer-funded", "You cover the proposed costs."],
  [
    "cost_sharing",
    "Participant cost-sharing",
    "Share an estimated cost transparently.",
  ],
  [
    "sponsorship",
    "Sponsorship requested",
    "Request support in this demonstration.",
  ],
  [
    "mixed",
    "Mixed funding",
    "Combine organizer, sponsor and participant support.",
  ],
];
const steps = ["The idea", "The place", "The plan", "The funding", "Review"];
const toSen = (value: string) => {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with no more than two decimal places.");
  const [whole, fraction = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount > 100000000)
    throw new Error("Enter a valid amount under RM1,000,000.");
  return amount;
};
const localDateTime = (value: string) => {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 16);
};
function AuthPrompt({ admin = false }: { admin?: boolean }) {
  return (
    <div className="panel empty-state">
      <ShieldCheck size={36} />
      <h2>{admin ? "Administrator access" : "A little introduction first"}</h2>
      <p className="muted">
        {admin
          ? "Use the prepared administrator identity to review community proposals in this demo."
          : "Choose a prepared demo identity to propose an activity and meet your neighbours."}
      </p>
      <Link className="btn primary" to="/login">
        Choose demo identity <ArrowRight size={16} />
      </Link>
    </div>
  );
}
function Status({ value }: { value: string }) {
  return <span className={"badge status-" + value}>{human(value)}</span>;
}

export function CreateActivity() {
  const { data, township, mutate } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = data.activities.find(
    (a) => a.id === params.get("edit") && a.organizer_id === data.user?.id,
  );
  const [step, setStep] = useState(0),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    title: editing?.title || "",
    description: editing?.description || "",
    category: editing?.category || "Badminton",
    target_audience:
      editing?.target_audience || "Neighbours of all experience levels",
    age_suitability: editing?.age_suitability || "Adults 18+",
    township_id:
      editing?.township_id ||
      (township === "all"
        ? data.user?.home_township_id || "bandar-bukit-raja"
        : township),
    facility_id: editing?.facility_id || "",
    facility_resource_id: editing?.facility_resource_id || "",
    start: localDateTime(editing?.start_time || ""),
    end: localDateTime(editing?.end_time || ""),
    minimum_participants: String(editing?.minimum_participants || 4),
    maximum_participants: String(editing?.maximum_participants || 12),
    funding_model: editing?.funding_model || "free",
    cost: ((editing?.total_estimated_cost_sen || 0) / 100).toFixed(2),
    organizer: ((editing?.organizer_contribution_sen || 0) / 100).toFixed(2),
    sponsor: ((editing?.sponsorship_amount_sen || 0) / 100).toFixed(2),
    acknowledged: false,
  });
  const update = (name: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
  };
  const facility = data.facilities.find((f) => f.id === form.facility_id);
  const town = data.townships.find((t) => t.id === form.township_id);
  const resources = (data.facility_resources || []).filter(
    (r) => r.facility_id === form.facility_id,
  );
  const own = editing?.organizer_id === data.user?.id;
  const funding = () => {
    const total = form.funding_model === "free" ? 0 : toSen(form.cost);
    const org =
      form.funding_model === "organizer_funded"
        ? total
        : form.funding_model === "mixed"
          ? toSen(form.organizer)
          : 0;
    const sponsor =
      form.funding_model === "sponsorship"
        ? total
        : form.funding_model === "mixed"
          ? toSen(form.sponsor)
          : 0;
    if (org + sponsor > total)
      throw new Error(
        "Organizer and requested sponsor contributions cannot exceed the estimated total.",
      );
    return { total, org, sponsor };
  };
  let estimate = 0;
  try {
    const f = funding();
    estimate = ["cost_sharing", "mixed"].includes(form.funding_model)
      ? Math.ceil(
          (f.total - f.org) / Math.max(1, Number(form.minimum_participants)),
        )
      : 0;
  } catch {}
  const next = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (
        step === 0 &&
        (form.title.trim().length < 5 || form.description.trim().length < 20)
      )
        throw new Error(
          "Give your idea a clear title (5+ characters) and description (20+ characters).",
        );
      if (step === 1 && !facility)
        throw new Error(
          "Choose a documented facility for your demonstration proposal.",
        );
      if (step === 2) {
        const start = new Date(form.start + "+08:00"),
          end = new Date(form.end + "+08:00");
        if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start)
          throw new Error("Choose an end time after the start time.");
        if (+start < Date.now())
          throw new Error("Choose a future date for your new activity.");
        if (+end - +start > 24 * 3600000)
          throw new Error("An activity can last no longer than 24 hours.");
        if (
          !Number.isInteger(+form.minimum_participants) ||
          !Number.isInteger(+form.maximum_participants) ||
          +form.minimum_participants < 1 ||
          +form.maximum_participants < +form.minimum_participants
        )
          throw new Error(
            "Minimum must be at least 1 and maximum must be at least the minimum.",
          );
      }
      if (step === 3) funding();
      if (step < 4) {
        setStep(step + 1);
        return;
      }
      if (!form.acknowledged)
        throw new Error(
          "Acknowledge the demonstration and venue access conditions before submitting.",
        );
      const f = funding();
      setBusy(true);
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        target_audience: form.target_audience,
        age_suitability: form.age_suitability,
        township_id: form.township_id,
        facility_id: form.facility_id,
        facility_resource_id: form.facility_resource_id || null,
        start_time: new Date(form.start + "+08:00").toISOString(),
        end_time: new Date(form.end + "+08:00").toISOString(),
        minimum_participants: Number(form.minimum_participants),
        maximum_participants: Number(form.maximum_participants),
        funding_model: form.funding_model,
        total_estimated_cost_sen: f.total,
        organizer_contribution_sen: f.org,
        sponsorship_amount_sen: f.sponsor,
      };
      await mutate(
        editing ? "/activities/" + editing.id : "/activities",
        editing ? "PATCH" : "POST",
        body,
        editing
          ? "Proposal updated and sent for review."
          : "Your idea is on its way to the community!",
      );
      navigate("/organizer");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  if (!data.user)
    return (
      <>
        <div className="page-heading workflow-heading">
          <p className="eyebrow">MAKE SOMETHING HAPPEN</p>
          <h1>Good things start with an idea.</h1>
        </div>
        <AuthPrompt />
      </>
    );
  if (
    editing &&
    (!own || !["submitted", "changes_requested"].includes(editing.status))
  )
    return (
      <div className="panel empty-state">
        <h2>This proposal is already in progress</h2>
        <p>
          Changes are available before approval or when requested by an
          administrator.
        </p>
        <Link to="/organizer" className="btn primary">
          Back to my activities
        </Link>
      </div>
    );
  return (
    <>
      <div className="page-heading workflow-heading">
        <p className="eyebrow">MAKE SOMETHING HAPPEN</p>
        <h1>
          {editing
            ? "Refine your community idea."
            : "Your next great moment starts here."}
        </h1>
        <p className="muted">
          A friendly match, a morning walk, a shared passion. Bring your
          neighbours together.
        </p>
      </div>
      <div className="stepper" aria-label="Proposal progress">
        {steps.map((label, i) => (
          <div
            key={label}
            className={
              "step " + (i === step ? "active" : i < step ? "done" : "")
            }
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i < step ? <Check size={16} /> : i + 1}</span>
            <small>{label}</small>
          </div>
        ))}
      </div>
      <form className="panel wizard" onSubmit={next}>
        <div className="wizard-heading">
          <span className="eyebrow">STEP {step + 1} OF 5</span>
          <h2>
            {
              [
                "Tell us about your idea",
                "Find a place to connect",
                "Make a little time for community",
                "Keep the costs clear",
                "A final look before you send",
              ][step]
            }
          </h2>
        </div>
        {step === 0 && (
          <div className="form-grid">
            <label className="field wide">
              Activity title
              <input
                autoFocus
                required
                minLength={5}
                maxLength={120}
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Saturday Badminton Buddies"
              />
            </label>
            <label className="field">
              Activity category
              <select
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Age suitability
              <input
                required
                maxLength={100}
                value={form.age_suitability}
                onChange={(e) => update("age_suitability", e.target.value)}
              />
            </label>
            <label className="field wide">
              What do you have in mind?
              <textarea
                required
                minLength={20}
                maxLength={3000}
                rows={5}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Describe the activity, what to bring, and how neighbours can take part."
              />
            </label>
            <label className="field wide">
              Who is it for?
              <input
                required
                maxLength={120}
                value={form.target_audience}
                onChange={(e) => update("target_audience", e.target.value)}
              />
            </label>
          </div>
        )}
        {step === 1 && (
          <div className="form-grid">
            <label className="field">
              Township
              <select
                value={form.township_id}
                onChange={(e) => {
                  update("township_id", e.target.value);
                  update("facility_id", "");
                  update("facility_resource_id", "");
                }}
              >
                {data.townships.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Proposed facility
              <select
                required
                value={form.facility_id}
                onChange={(e) => {
                  update("facility_id", e.target.value);
                  update("facility_resource_id", "");
                }}
              >
                <option value="">Choose a facility</option>
                {data.facilities
                  .filter((f) => f.township_id === form.township_id)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
              </select>
            </label>
            {facility && (
              <div className="notice wide">
                <MapPin size={20} />
                <div>
                  <strong>{facility.name}</strong>
                  <p>{facility.description}</p>
                  <p>
                    <b>Access:</b> {human(facility.access_type)} ·{" "}
                    <b>Pricing:</b> {human(facility.pricing_status)}
                  </p>
                  <a
                    href={facility.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read supplied official source <ExternalLink size={13} />
                  </a>
                </div>
              </div>
            )}
            {resources.length > 0 && (
              <label className="field wide">
                Demonstration venue slot
                <select
                  value={form.facility_resource_id}
                  onChange={(e) =>
                    update("facility_resource_id", e.target.value)
                  }
                >
                  <option value="">Non-exclusive demonstration space</option>
                  {resources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.resource_name}
                      {r.exclusive_booking_enabled
                        ? " · simulated exclusive resource"
                        : ""}
                    </option>
                  ))}
                </select>
                <small>
                  Demo resources test scheduling conflicts. They are not actual
                  bookable venue inventory.
                </small>
              </label>
            )}
            <div className="notice warning wide">
              <AlertCircle size={20} />
              <div>
                <strong>A proposal is not a booking.</strong>
                <p>
                  Current facility access and completion require separate
                  checks. Private residential amenities are not public venues.
                  Approval here never grants real access.
                </p>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="form-grid">
            <label className="field">
              Start date and time
              <input
                required
                type="datetime-local"
                value={form.start}
                onChange={(e) => update("start", e.target.value)}
              />
              <small>Malaysia time (MYT, UTC+8)</small>
            </label>
            <label className="field">
              End date and time
              <input
                required
                type="datetime-local"
                value={form.end}
                onChange={(e) => update("end", e.target.value)}
              />
              <small>Malaysia time (MYT, UTC+8)</small>
            </label>
            <label className="field">
              Minimum participants
              <input
                required
                type="number"
                min="1"
                max="1000"
                step="1"
                value={form.minimum_participants}
                onChange={(e) => update("minimum_participants", e.target.value)}
              />
            </label>
            <label className="field">
              Maximum participants
              <input
                required
                type="number"
                min={form.minimum_participants}
                max="1000"
                step="1"
                value={form.maximum_participants}
                onChange={(e) => update("maximum_participants", e.target.value)}
              />
            </label>
            <div className="notice wide">
              <CalendarDays size={20} />
              <div>
                <strong>Room for everyone, without the clashes.</strong>
                <p>
                  Overlapping confirmed demo slots are blocked for exclusive
                  resources. External venue availability must be checked with
                  the operator.
                </p>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <>
            <fieldset className="funding-options">
              <legend className="sr-only">Funding model</legend>
              {fundingModels.map(([id, title, desc]) => (
                <label
                  key={id}
                  className={
                    "funding-option " +
                    (form.funding_model === id ? "selected" : "")
                  }
                >
                  <input
                    type="radio"
                    name="funding_model"
                    checked={form.funding_model === id}
                    onChange={() => update("funding_model", id)}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{desc}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            {form.funding_model !== "free" && (
              <div className="form-grid">
                <label className="field">
                  Estimated total cost (RM)
                  <input
                    required
                    inputMode="decimal"
                    pattern="[0-9]+([.][0-9]{1,2})?"
                    value={form.cost}
                    onChange={(e) => update("cost", e.target.value)}
                  />
                  <small>
                    Illustrative event estimate, not a published venue price.
                  </small>
                </label>
                {form.funding_model === "mixed" && (
                  <label className="field">
                    Organizer contribution (RM)
                    <input
                      required
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,2})?"
                      value={form.organizer}
                      onChange={(e) => update("organizer", e.target.value)}
                    />
                  </label>
                )}
                {form.funding_model === "mixed" && (
                  <label className="field">
                    Requested demo sponsorship (RM)
                    <input
                      required
                      inputMode="decimal"
                      pattern="[0-9]+([.][0-9]{1,2})?"
                      value={form.sponsor}
                      onChange={(e) => update("sponsor", e.target.value)}
                    />
                    <small>
                      Unapproved request; no real financial commitment.
                    </small>
                  </label>
                )}
              </div>
            )}
            <div className="notice wide">
              <Sparkles size={22} />
              <div>
                <strong>{money(estimate)} estimated per participant</strong>
                <p>
                  Based on {form.minimum_participants} paying participants.
                  Requested sponsorship is excluded until approved. The estimate
                  can change as participation changes; registration records
                  retain their original illustrative obligation. No money is
                  collected.
                </p>
              </div>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <div className="proposal-review">
              <span className="badge">SAMPLE ACTIVITY PROPOSAL</span>
              <h2>{form.title}</h2>
              <p>{form.description}</p>
              <dl className="review-grid">
                <div>
                  <dt>Activity category</dt>
                  <dd>{form.category}</dd>
                </div>
                <div>
                  <dt>Audience · age suitability</dt>
                  <dd>
                    {form.target_audience} · {form.age_suitability}
                  </dd>
                </div>
                <div>
                  <dt>Community</dt>
                  <dd>{town?.name}</dd>
                </div>
                <div>
                  <dt>Proposed space</dt>
                  <dd>{facility?.name}</dd>
                </div>
                <div>
                  <dt>When · MYT</dt>
                  <dd>
                    {form.start && dateLabel(form.start + "+08:00")} ·{" "}
                    {form.start && timeLabel(form.start + "+08:00")} –{" "}
                    {form.end && timeLabel(form.end + "+08:00")}
                  </dd>
                </div>
                <div>
                  <dt>Participants</dt>
                  <dd>
                    {form.minimum_participants} minimum ·{" "}
                    {form.maximum_participants} maximum
                  </dd>
                </div>
                <div>
                  <dt>Funding</dt>
                  <dd>{human(form.funding_model)}</dd>
                </div>
                <div>
                  <dt>Estimated total cost</dt>
                  <dd>{money(funding().total)}</dd>
                </div>
                <div>
                  <dt>Organizer support</dt>
                  <dd>{money(funding().org)}</dd>
                </div>
                <div>
                  <dt>Requested sponsorship</dt>
                  <dd>{money(funding().sponsor)} · unapproved</dd>
                </div>
                <div>
                  <dt>Estimated contribution</dt>
                  <dd>{money(estimate)} per participant</dd>
                </div>
              </dl>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                required
                checked={form.acknowledged}
                onChange={(e) => update("acknowledged", e.target.checked)}
              />
              <span>
                I understand this is a sample proposal, all costs and
                sponsorship are simulated, and approval does not confirm real
                venue access or a booking.
              </span>
            </label>
            <div className="notice">
              <ShieldCheck size={20} />
              <div>
                <strong>A thoughtful review comes next.</strong>
                <p>
                  Your township administrator will review this idea. Simulated
                  venue confirmation is a separate step before registration
                  opens.
                </p>
              </div>
            </div>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        <div className="button-row wizard-footer">
          {step > 0 ? (
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setStep(step - 1);
                setError("");
              }}
            >
              <ArrowLeft size={16} />
              Back
            </button>
          ) : (
            <Link to="/activities" className="btn secondary">
              Cancel
            </Link>
          )}
          <button className="btn primary" disabled={busy} type="submit">
            {busy
              ? "Sending your idea…"
              : step === 4
                ? editing
                  ? "Update proposal"
                  : "Submit proposal"
                : "Continue"}
            {step === 4 ? <Send size={16} /> : <ArrowRight size={16} />}
          </button>
        </div>
      </form>
    </>
  );
}

export function Organizer() {
  const { data, mutate } = useApp();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [expanded, setExpanded] = useState("");
  if (!data.user) return <AuthPrompt />;
  const activities = data.activities.filter(
    (a) => a.organizer_id === data.user?.id,
  );
  const ids = new Set(activities.map((a) => a.id));
  const regs = data.registrations.filter(
    (r) => ids.has(r.activity_id) && r.registration_status === "registered",
  );
  const act = async (path: string, body?: unknown) => {
    setError("");
    setBusy(path);
    try {
      await mutate(path, "POST", body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  return (
    <>
      <div className="page-heading heading-with-action">
        <div>
          <p className="eyebrow">MAKE ROOM FOR CONNECTION</p>
          <h1>Your ideas. Your community.</h1>
          <p className="muted">
            A little organizing goes a long way. Manage the moments you’re
            bringing to life.
          </p>
        </div>
        <Link to="/create" className="btn primary">
          <Plus size={17} />
          Create an activity
        </Link>
      </div>
      <div className="stats-grid">
        <Stat
          label="Your activities"
          value={activities.length}
          icon={<CalendarDays size={21} />}
        />
        <Stat
          label="Registered neighbours"
          value={regs.length}
          icon={<Users size={21} />}
        />
        <Stat
          label="Verified attendance"
          value={
            regs.filter(
              (r) =>
                r.checked_in_at &&
                !["cancelled", "rejected"].includes(
                  data.activities.find((a) => a.id === r.activity_id)?.status ||
                    "",
                ),
            ).length
          }
          icon={<ClipboardCheck size={21} />}
        />
        <Stat
          label="Completed moments"
          value={activities.filter((a) => a.status === "completed").length}
          icon={<CheckCircle2 size={21} />}
        />
      </div>
      <div className="notice">
        <Sparkles size={20} />
        <div>
          <strong>Demonstration organizer tools</strong>
          <p>
            Attendance can be simulated before the scheduled date for the
            presentation. Only verify a prepared demo participant; points are
            recorded once in the ledger.
          </p>
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {activities.length === 0 ? (
        <div className="panel empty-state">
          <CalendarDays size={40} />
          <h2>Every community moment starts somewhere.</h2>
          <p className="muted">
            Invite your neighbours to something you enjoy.
          </p>
          <Link to="/create" className="btn primary">
            Propose your first activity <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div className="activity-list">
          {activities.map((a) => {
            const participants = data.registrations.filter(
              (r) =>
                r.activity_id === a.id && r.registration_status !== "cancelled",
            );
            const facility = data.facilities.find(
              (f) => f.id === a.facility_id,
            );
            return (
              <section className="panel manage-card" key={a.id}>
                <div className="manage-card-heading">
                  <div>
                    <div className="button-row">
                      <span className="badge">SAMPLE EVENT</span>
                      <Status value={a.status} />
                    </div>
                    <h2>
                      <Link to={"/activities/" + a.id}>{a.title}</Link>
                    </h2>
                    <p className="muted">
                      {facility?.name} · {dateLabel(a.start_time)} ·{" "}
                      {timeLabel(a.start_time)} MYT
                    </p>
                  </div>
                  <div className="registration-number">
                    <strong>
                      {a.registration_count}
                      <small>/{a.maximum_participants}</small>
                    </strong>
                    <span>registered</span>
                  </div>
                </div>
                <div className="manage-meta">
                  <span>
                    <Users size={15} />
                    {a.minimum_participants} minimum · {a.waitlist_count}{" "}
                    waitlisted
                  </span>
                  <span>
                    {human(a.funding_model)} ·{" "}
                    {money(a.total_estimated_cost_sen)} estimated
                  </span>
                </div>
                {a.status === "pending_facility_confirmation" && (
                  <p className="notice warning">
                    Your idea is approved. A demo administrator must separately
                    confirm the simulated venue before registration opens.
                  </p>
                )}
                {a.status === "changes_requested" && (
                  <p className="notice warning">
                    Your administrator has requested changes. Edit the proposal
                    and submit it for another review.
                  </p>
                )}
                {(a as Activity & { review_note?: string }).review_note && (
                  <p className="notice">
                    <strong>Review note: </strong>
                    {(a as Activity & { review_note?: string }).review_note}
                  </p>
                )}
                <div className="button-row">
                  {["submitted", "changes_requested"].includes(a.status) && (
                    <Link to={"/create?edit=" + a.id} className="btn secondary">
                      Edit proposal
                    </Link>
                  )}
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setExpanded(expanded === a.id ? "" : a.id)}
                  >
                    {expanded === a.id
                      ? "Hide participants"
                      : "Manage participants"}
                    <Users size={15} />
                  </button>
                  {a.status === "open" && (
                    <button
                      className="btn primary"
                      disabled={!!busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Complete this simulated activity? The organizer completion award is recorded once and the activity will close.",
                          )
                        )
                          act("/activities/" + a.id + "/complete");
                      }}
                    >
                      <CheckCircle2 size={15} />
                      Complete activity
                    </button>
                  )}
                  {!["completed", "cancelled", "rejected"].includes(
                    a.status,
                  ) && (
                    <button
                      className="btn danger"
                      disabled={!!busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancel this sample activity and notify registered demo participants?",
                          )
                        )
                          act("/activities/" + a.id + "/cancel");
                      }}
                    >
                      Cancel activity
                    </button>
                  )}
                </div>
                {expanded === a.id && (
                  <div className="table-wrap">
                    {participants.length === 0 ? (
                      <p className="empty-state muted">
                        No registrations yet. Your neighbours will appear here
                        when they join.
                      </p>
                    ) : (
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Demo participant</th>
                            <th>Registration</th>
                            <th>Contribution</th>
                            <th>Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((r) => (
                            <tr key={r.id}>
                              <td>
                                {data.demo_profiles.find(
                                  (p) => p.id === r.user_id,
                                )?.display_name || "Demo resident"}
                                <small className="table-subtitle">
                                  {r.reference}
                                </small>
                              </td>
                              <td>{human(r.registration_status)}</td>
                              <td>
                                {money(r.obligation_sen)}
                                <small className="table-subtitle">
                                  Simulated · not collected
                                </small>
                              </td>
                              <td>
                                {r.checked_in_at ? (
                                  <span className="badge">
                                    <Check size={13} />
                                    Verified
                                  </span>
                                ) : a.status === "open" &&
                                  r.registration_status === "registered" ? (
                                  <button
                                    className="btn secondary small"
                                    disabled={!!busy}
                                    onClick={() =>
                                      act(
                                        "/activities/" + a.id + "/attendance",
                                        { user_id: r.user_id },
                                      )
                                    }
                                  >
                                    {busy.endsWith("/attendance")
                                      ? "Verifying…"
                                      : "Verify demo attendance"}
                                  </button>
                                ) : (
                                  <span className="muted">Not verified</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>Stored demonstration records</small>
      </div>
    </div>
  );
}

export function Admin() {
  const { data, mutate } = useApp();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(""),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [view, setView] = useState("review");
  if (
    !data.user ||
    !["township_admin", "platform_admin"].includes(data.user.role)
  )
    return <AuthPrompt admin />;
  const proposals = data.activities.filter((a) =>
    [
      "submitted",
      "changes_requested",
      "pending_facility_confirmation",
    ].includes(a.status),
  );
  const regs = data.registrations.filter(
    (r) => r.registration_status === "registered",
  );
  const ranked = [
    ...data.activities.filter((a) =>
      ["submitted", "changes_requested"].includes(a.status),
    ),
  ].sort(
    (a, b) =>
      b.interest_count / Math.max(1, b.minimum_participants) -
      a.interest_count / Math.max(1, a.minimum_participants),
  );
  const run = async (path: string, body?: unknown) => {
    setBusy(path);
    setError("");
    try {
      await mutate(path, "POST", body);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const review = (a: Activity, decision: string) =>
    run("/activities/" + a.id + "/review", {
      decision,
      note: notes[a.id] || "",
    });
  const visible =
    view === "review"
      ? proposals
      : view === "sponsorship"
        ? data.activities.filter((a) =>
            ["sponsorship", "mixed"].includes(a.funding_model),
          )
        : data.activities;
  return (
    <>
      <div className="page-heading workflow-heading">
        <p className="eyebrow">A PULSE ON YOUR COMMUNITY</p>
        <h1>Small moments. Meaningful impact.</h1>
        <p className="muted">
          Turn resident ideas into a more connected neighbourhood.
        </p>
      </div>
      <div className="stats-grid">
        <Stat
          label="Activity proposals"
          value={data.activities.length}
          icon={<CalendarDays size={21} />}
        />
        <Stat
          label="Open for registration"
          value={data.activities.filter((a) => a.status === "open").length}
          icon={<Users size={21} />}
        />
        <Stat
          label="Verified attendance"
          value={
            regs.filter(
              (r) =>
                r.checked_in_at &&
                !["cancelled", "rejected"].includes(
                  data.activities.find((a) => a.id === r.activity_id)?.status ||
                    "",
                ),
            ).length
          }
          icon={<ClipboardCheck size={21} />}
        />
        <Stat
          label="Completed activities"
          value={data.activities.filter((a) => a.status === "completed").length}
          icon={<TrendingUp size={21} />}
        />
      </div>
      <div className="notice">
        <ShieldCheck size={20} />
        <div>
          <strong>Prototype administration · stored demonstration data</strong>
          <p>
            Metrics combine labelled seed records and actions in this prototype.
            Approval, venue confirmation and sponsorship here grant no
            real-world authorization or funding.
          </p>
        </div>
      </div>
      <section className="panel demand-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">LISTEN. UNDERSTAND. ACT.</p>
            <h2>What your neighbours want</h2>
          </div>
          <span className="badge">
            <Sparkles size={13} />
            Rule-based demand insights
          </span>
        </div>
        {ranked.length === 0 ? (
          <p className="muted">
            No proposals awaiting review. New ideas will appear here.
          </p>
        ) : (
          <div className="demand-list">
            {ranked.slice(0, 5).map((a, i) => (
              <div className="demand-row" key={a.id}>
                <span className="demand-rank">0{i + 1}</span>
                <div className="demand-info">
                  <strong>{a.title}</strong>
                  <small>
                    {data.townships.find((t) => t.id === a.township_id)?.name} ·{" "}
                    {a.interest_count} interested / {a.minimum_participants}{" "}
                    needed
                  </small>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{
                        width:
                          Math.min(
                            100,
                            (a.interest_count /
                              Math.max(1, a.minimum_participants)) *
                              100,
                          ) + "%",
                      }}
                    />
                  </div>
                </div>
                <span className="badge">
                  {Math.round(
                    (a.interest_count / Math.max(1, a.minimum_participants)) *
                      100,
                  )}
                  % of minimum
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="muted small-text">
          Ranked by unique resident interest ÷ minimum participants. This
          explains demand; it does not establish facility suitability or
          availability.
        </p>
      </section>
      <section className="panel padded category-insights">
        <div className="section-heading">
          <div>
            <span className="eyebrow">PARTICIPATION, IN PERSPECTIVE</span>
            <h2>Where your community shows up</h2>
          </div>
          <span className="badge subtle">Stored demo registrations</span>
        </div>
        <div
          className="category-chart"
          role="img"
          aria-label="Registered participants by activity category"
        >
          {[...new Set(data.activities.map((a) => a.category))].map(
            (category) => {
              const count = regs.filter((r) =>
                data.activities.some(
                  (a) =>
                    a.id === r.activity_id &&
                    a.category === category &&
                    !["cancelled", "rejected"].includes(a.status),
                ),
              ).length;
              const max = Math.max(
                1,
                ...[...new Set(data.activities.map((a) => a.category))].map(
                  (c) =>
                    regs.filter((r) =>
                      data.activities.some(
                        (a) =>
                          a.id === r.activity_id &&
                          a.category === c &&
                          !["cancelled", "rejected"].includes(a.status),
                      ),
                    ).length,
                ),
              );
              return (
                <div className="chart-row" key={category}>
                  <span>{category}</span>
                  <div className="chart-track">
                    <span style={{ width: (count / max) * 100 + "%" }} />
                  </div>
                  <strong>{count}</strong>
                </div>
              );
            },
          )}
        </div>
        <p className="dataset-note">
          Counts update from active registrations. A registration is not
          verified attendance.
        </p>
      </section>
      <div className="section-heading">
        <h2>Community activity desk</h2>
        <div className="tabs" role="group" aria-label="Activity desk filters">
          {[
            ["review", "Needs review"],
            ["all", "All activities"],
            ["sponsorship", "Sponsorship"],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={"tab " + (view === key ? "active" : "")}
              onClick={() => setView(key)}
            >
              {label}
              {key === "review" && <span>{proposals.length}</span>}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {visible.length === 0 ? (
        <div className="panel empty-state">
          <CheckCircle2 size={35} />
          <h3>All caught up.</h3>
          <p className="muted">There are no activities in this view.</p>
        </div>
      ) : (
        <div className="activity-list">
          {visible.map((a) => (
            <section key={a.id} className="panel manage-card">
              <div className="manage-card-heading">
                <div>
                  <div className="button-row">
                    <span className="badge">SAMPLE PROPOSAL</span>
                    <Status value={a.status} />
                  </div>
                  <h3>
                    <Link to={"/activities/" + a.id}>{a.title}</Link>
                  </h3>
                  <p className="muted">
                    {data.townships.find((t) => t.id === a.township_id)?.name} ·{" "}
                    {data.facilities.find((f) => f.id === a.facility_id)?.name}
                  </p>
                </div>
                <span className="badge">{a.registration_count} registered</span>
              </div>
              <p>{a.description}</p>
              <div className="manage-meta">
                <span>
                  <Clock size={15} />
                  {dateLabel(a.start_time)} · {timeLabel(a.start_time)} –{" "}
                  {timeLabel(a.end_time)} MYT
                </span>
                <span>
                  <Users size={15} />
                  {a.minimum_participants}–{a.maximum_participants} participants
                </span>
                <span>
                  {human(a.funding_model)} · {money(a.total_estimated_cost_sen)}{" "}
                  estimated
                </span>
              </div>
              {["sponsorship", "mixed"].includes(a.funding_model) && (
                <div className="notice">
                  <Sparkles size={18} />
                  <div>
                    <strong>
                      Demo sponsorship: {money(a.sponsorship_amount_sen)} ·{" "}
                      {human(a.sponsorship_status || "requested")}
                    </strong>
                    <p>
                      Requested support is illustrative and creates no
                      commitment from Sime Darby Property.
                    </p>
                    {a.sponsorship_status === "requested" &&
                      a.registration_count === 0 && (
                        <div className="button-row">
                          <button
                            className="btn secondary"
                            disabled={!!busy}
                            onClick={() =>
                              run("/activities/" + a.id + "/sponsorship", {
                                status: "approved",
                              })
                            }
                          >
                            Approve demo sponsorship
                          </button>
                          <button
                            className="btn danger"
                            disabled={!!busy}
                            onClick={() =>
                              run("/activities/" + a.id + "/sponsorship", {
                                status: "rejected",
                              })
                            }
                          >
                            Reject sponsorship request
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              )}
              {["submitted", "changes_requested"].includes(a.status) && (
                <>
                  <label className="field">
                    Review note
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={notes[a.id] || ""}
                      placeholder="Add context for the organizer, especially when requesting changes."
                      onChange={(e) =>
                        setNotes((n) => ({ ...n, [a.id]: e.target.value }))
                      }
                    />
                  </label>
                  <div className="button-row">
                    <button
                      className="btn primary"
                      disabled={!!busy}
                      onClick={() => review(a, "approve")}
                    >
                      <Check size={16} />
                      Approve proposal
                    </button>
                    <button
                      className="btn secondary"
                      disabled={!!busy}
                      onClick={() => review(a, "changes_requested")}
                    >
                      Request changes
                    </button>
                    <button
                      className="btn danger"
                      disabled={!!busy}
                      onClick={() => review(a, "reject")}
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}
              {a.status === "pending_facility_confirmation" && (
                <div className="notice warning">
                  <AlertCircle size={20} />
                  <div>
                    <strong>
                      Proposal approved. Venue is a separate step.
                    </strong>
                    <p>
                      Confirm only the simulated slot below. Actual operator
                      permission and resident eligibility remain outside this
                      demonstration.
                    </p>
                    <button
                      className="btn primary"
                      disabled={!!busy}
                      onClick={() =>
                        run("/activities/" + a.id + "/venue-confirmation", {
                          confirmed: true,
                        })
                      }
                    >
                      <CheckCircle2 size={16} />
                      Confirm simulated venue & open registration
                    </button>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      <section className="panel">
        <div className="section-heading">
          <h2>Confirmed demo schedule</h2>
          <CalendarDays size={22} />
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Space</th>
                <th>Date · Malaysia time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.activities
                .filter(
                  (a) =>
                    a.venue_confirmed &&
                    ["open", "completed"].includes(a.status),
                )
                .map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link to={"/activities/" + a.id}>{a.title}</Link>
                    </td>
                    <td>
                      {
                        data.facilities.find((f) => f.id === a.facility_id)
                          ?.name
                      }
                      <small className="table-subtitle">
                        {data.facility_resources?.find(
                          (r) => r.id === a.facility_resource_id,
                        )?.exclusive_booking_enabled
                          ? "Exclusive simulated resource"
                          : "Non-exclusive demo space"}
                      </small>
                    </td>
                    <td>
                      {dateLabel(a.start_time)}
                      <small className="table-subtitle">
                        {timeLabel(a.start_time)}–{timeLabel(a.end_time)}
                      </small>
                    </td>
                    <td>
                      <Status value={a.status} />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        <p className="muted small-text">
          This schedule records simulated confirmations only. It is not an
          operator’s live booking calendar.
        </p>
      </section>
      <section className="panel">
        <div className="section-heading">
          <h2>Decision trail</h2>
          <ClipboardCheck size={21} />
        </div>
        {data.audit.length === 0 ? (
          <p className="muted">Review actions will appear here.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Actor</th>
                  <th>Record</th>
                </tr>
              </thead>
              <tbody>
                {data.audit.slice(0, 12).map((log) => (
                  <tr key={log.id}>
                    <td>{human(log.action)}</td>
                    <td>
                      {data.demo_profiles.find((p) => p.id === log.actor_id)
                        ?.display_name || "Demo administrator"}
                    </td>
                    <td>
                      {data.activities.find((a) => a.id === log.entity_id)
                        ?.title || log.entity_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
