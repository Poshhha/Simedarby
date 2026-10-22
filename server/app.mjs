import express from "express";
import { DatabaseSync } from "node:sqlite";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const now = () => new Date().toISOString();
const id = () => randomUUID();
const hash = (value) => createHash("sha256").update(value).digest("hex");
const admin = (user) =>
  user && ["township_admin", "platform_admin"].includes(user.role);
const sustainable = (category) =>
  /cleanup|recycling|gardening|sustainability/i.test(category);
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const safeProfile = (row) =>
  row ? { ...row, interests: JSON.parse(row.interests || "[]") } : null;

export function createApp({
  dbPath = process.env.DATABASE_PATH || resolve(root, ".data/ruangkita.sqlite"),
  catalogPath = resolve(root, "data/catalog.json"),
  catalog,
  seed = true,
} = {}) {
  if (dbPath !== ":memory:")
    mkdirSync(dirname(resolve(dbPath)), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
  db.exec(readFileSync(resolve(root, "server/schema.sql"), "utf8"));
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    if (Array.isArray(req.body)) return next(error(400, "Send a JSON object."));
    req.body ??= {};
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path.startsWith("/api/"))
      res.setHeader("Cache-Control", "no-store");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const allowed = new Set([
        `http://${req.get("host")}`,
        `https://${req.get("host")}`,
        ...(process.env.APP_ORIGIN || "").split(",").filter(Boolean),
      ]);
      if (process.env.NODE_ENV !== "production") {
        for (const host of ["localhost", "127.0.0.1"])
          for (const port of [3000, 3001, 4173, 5173])
            allowed.add(`http://${host}:${port}`);
      }
      if (
        (origin && !allowed.has(origin)) ||
        req.get("sec-fetch-site") === "cross-site"
      )
        return next(error(403, "Requests must come from this RUANGKITA site."));
    }
    next();
  });

  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const transaction = (fn) => {
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      db.exec("COMMIT");
      return result;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  };
  const audit = (
    user,
    action,
    entity_id,
    detail = "",
    entity_type = "activity",
  ) =>
    run(
      "INSERT INTO admin_audit_log VALUES(?,?,?,?,?,?,?)",
      id(),
      user.id,
      action,
      entity_type,
      entity_id,
      now(),
      detail,
    );
  const notify = (recipient_id, title, message) =>
    run(
      "INSERT INTO notifications(id,recipient_id,title,message,created_at) VALUES(?,?,?,?,?)",
      id(),
      recipient_id,
      title,
      message,
      now(),
    );
  const profile = (userId) =>
    safeProfile(get("SELECT * FROM profiles WHERE id=?", userId));
  const facility = (facilityId) => {
    const row = get("SELECT * FROM facilities WHERE id=?", facilityId);
    if (!row) throw error(400, "Select a documented facility.");
    return {
      ...JSON.parse(row.data),
      id: row.id,
      township_id: row.township_id,
      name: row.name,
    };
  };
  const activity = (activityId) => {
    const row = get("SELECT * FROM activities WHERE id=?", activityId);
    if (!row) throw error(404, "Activity not found.");
    return row;
  };
  const canManage = (user, event) =>
    user &&
    (event.organizer_id === user.id ||
      (admin(user) &&
        (user.role === "platform_admin" ||
          user.home_township_id === event.township_id)));
  const requireManager = (req, event) => {
    if (!canManage(req.user, event))
      throw error(
        403,
        "Only this organizer or its township administrator can manage this activity.",
      );
  };
  const requireAdmin = (req, event) => {
    if (
      !admin(req.user) ||
      (req.user.role === "township_admin" &&
        event &&
        req.user.home_township_id !== event.township_id)
    )
      throw error(403, "Township administrator access is required.");
  };
  const publicActivity = (event) => ({
    ...event,
    registration_count: get(
      "SELECT count(*) n FROM registrations WHERE activity_id=? AND registration_status='registered'",
      event.id,
    ).n,
    waitlist_count: get(
      "SELECT count(*) n FROM registrations WHERE activity_id=? AND registration_status='waitlisted'",
      event.id,
    ).n,
    interest_count: get(
      "SELECT count(*) n FROM activity_interest WHERE activity_id=?",
      event.id,
    ).n,
    attendance_count: get(
      "SELECT count(*) n FROM activity_checkins WHERE activity_id=?",
      event.id,
    ).n,
    organizer_name: get(
      "SELECT display_name FROM profiles WHERE id=?",
      event.organizer_id,
    )?.display_name,
    funding_policy:
      "All amounts are illustrative estimates; no money is collected. Headcount updates the current estimate. Your recorded estimate is frozen when you register. The organizer covers any simulated shortfall; excess estimates are not charges.",
    funding_summary: fundingSummary(event),
  });
  const fundingEstimate = (
    event,
    participantCount = event.minimum_participants,
  ) => {
    const remaining = ["cost_sharing", "mixed"].includes(event.funding_model)
      ? Math.max(
          0,
          event.total_estimated_cost_sen -
            event.organizer_contribution_sen -
            (event.sponsorship_status === "approved"
              ? event.sponsorship_amount_sen
              : 0),
        )
      : 0;
    return Math.ceil(remaining / Math.max(1, participantCount));
  };
  const fundingSummary = (event) => {
    const registered = all(
      "SELECT obligation_sen FROM registrations WHERE activity_id=? AND registration_status='registered'",
      event.id,
    );
    const remaining = ["cost_sharing", "mixed"].includes(event.funding_model)
      ? Math.max(
          0,
          event.total_estimated_cost_sen -
            event.organizer_contribution_sen -
            (event.sponsorship_status === "approved"
              ? event.sponsorship_amount_sen
              : 0),
        )
      : 0;
    const recorded = registered.reduce(
      (sum, row) => sum + row.obligation_sen,
      0,
    );
    return {
      participant_count: registered.length,
      estimate_basis_participants: Math.max(
        event.minimum_participants,
        registered.length,
      ),
      participant_pool_sen: remaining,
      recorded_estimates_sen: recorded,
      organizer_shortfall_sen: Math.max(0, remaining - recorded),
      uncollected_excess_estimate_sen: Math.max(0, recorded - remaining),
    };
  };
  const award = (userId, eventId, points, reason, key) =>
    run(
      "INSERT OR IGNORE INTO points_transactions VALUES(?,?,?,?,?,?,?)",
      id(),
      userId,
      eventId,
      points,
      reason,
      now(),
      key,
    );
  const resourceConflict = (event) => {
    if (!event.facility_resource_id) return null;
    const resource = get(
      "SELECT * FROM facility_resources WHERE id=?",
      event.facility_resource_id,
    );
    if (!resource?.exclusive_booking_enabled) return null;
    return get(
      "SELECT id,title FROM activities WHERE id<>? AND facility_resource_id=? AND venue_confirmed=1 AND status IN ('open','completed') AND start_time<? AND end_time>?",
      event.id,
      event.facility_resource_id,
      event.end_time,
      event.start_time,
    );
  };

  const catalogData = catalog || JSON.parse(readFileSync(catalogPath, "utf8"));
  transaction(() => {
    for (const t of catalogData.townships)
      run(
        "INSERT INTO townships(id,name,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,data=excluded.data",
        t.id,
        t.name,
        JSON.stringify(t),
      );
    for (const f of catalogData.facilities)
      run(
        "INSERT INTO facilities(id,township_id,name,data) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,data=excluded.data",
        f.id,
        f.township_id,
        f.name,
        JSON.stringify(f),
      );
  });
  if (seed && !get("SELECT id FROM profiles LIMIT 1")) seedDatabase();

  function seedDatabase() {
    transaction(() => {
      for (const [userId, name, role, township, interests] of [
        [
          "resident-1",
          "Maya",
          "resident",
          "bandar-bukit-raja",
          ["Badminton", "Gardening"],
        ],
        [
          "resident-2",
          "Daniel",
          "resident",
          "bandar-bukit-raja",
          ["Running", "Badminton"],
        ],
        [
          "organizer-1",
          "Aina",
          "organizer",
          "bandar-bukit-raja",
          ["Badminton", "Yoga"],
        ],
        ["admin-1", "Township team", "platform_admin", "bandar-bukit-raja", []],
      ])
        run(
          "INSERT INTO profiles VALUES(?,?,?,?,?,?)",
          userId,
          name,
          township,
          role,
          JSON.stringify(interests),
          now(),
        );
      const resources = [
        [
          "lyra-demo-court",
          "lyra-park",
          "Illustrative court A — simulated schedule",
          1,
        ],
        [
          "elmina-demo-route",
          "elmina-central-park",
          "Illustrative community meeting point — non-exclusive",
          0,
        ],
        [
          "putra-demo-lawn",
          "putra-heights-park",
          "Illustrative activity area — non-exclusive",
          0,
        ],
        [
          "parc-demo-space",
          "parc",
          "Illustrative workshop space — simulated schedule",
          1,
        ],
      ];
      for (const [resourceId, facilityId, label, exclusive] of resources)
        if (get("SELECT id FROM facilities WHERE id=?", facilityId))
          run(
            "INSERT INTO facility_resources VALUES(?,?,?,?,1)",
            resourceId,
            facilityId,
            label,
            exclusive,
          );
      const start = new Date();
      start.setUTCDate(
        start.getUTCDate() + ((6 - start.getUTCDay() + 7) % 7 || 7),
      );
      start.setUTCHours(1, 0, 0, 0);
      const specs = [
        [
          "activity-badminton",
          "Weekend badminton, better together",
          "bandar-bukit-raja",
          "lyra-park",
          "lyra-demo-court",
          "Badminton",
          "cost_sharing",
          12000,
          6,
          12,
          0,
        ],
        [
          "activity-run",
          "A little run. A lot of connection.",
          "elmina",
          "elmina-central-park",
          "elmina-demo-route",
          "Running",
          "free",
          0,
          4,
          24,
          1,
        ],
        [
          "activity-workshop",
          "Make space for a greener weekend",
          "sjcc",
          "parc",
          "parc-demo-space",
          "Recycling",
          "organizer_funded",
          8000,
          4,
          16,
          2,
        ],
        [
          "activity-yoga",
          "Slow mornings, good company",
          "putra-heights",
          "putra-heights-park",
          "putra-demo-lawn",
          "Yoga",
          "free",
          0,
          4,
          18,
          3,
        ],
      ];
      for (const [
        eventId,
        title,
        townshipId,
        facilityId,
        resourceId,
        category,
        funding,
        cost,
        min,
        max,
        offset,
      ] of specs) {
        if (!get("SELECT id FROM facilities WHERE id=?", facilityId)) continue;
        const from = new Date(start);
        from.setUTCDate(from.getUTCDate() + offset);
        const to = new Date(from.getTime() + 90 * 60000);
        run(
          `INSERT INTO activities(id,organizer_id,township_id,facility_id,facility_resource_id,title,description,category,start_time,end_time,minimum_participants,maximum_participants,status,funding_model,total_estimated_cost_sen,organizer_contribution_sen,venue_confirmed,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          eventId,
          "organizer-1",
          townshipId,
          facilityId,
          resourceId,
          title,
          `A sample ${category.toLowerCase()} activity to connect with neighbours. All venue arrangements, costs and attendance are simulated. Check the facility's documented access conditions before any real visit.`,
          category,
          from.toISOString(),
          to.toISOString(),
          min,
          max,
          "open",
          funding,
          cost,
          funding === "organizer_funded" ? cost : 0,
          1,
          now(),
        );
        if (cost)
          run(
            "INSERT INTO funding_records VALUES(?,?,?,?,?,?)",
            id(),
            eventId,
            funding === "organizer_funded"
              ? "organizer"
              : "participant_cost_sharing",
            cost,
            "estimated",
            now(),
          );
      }
      for (const [communityId, name, townshipId, category, description] of [
        [
          "circle-badminton",
          "Badminton Buddies",
          "bandar-bukit-raja",
          "Badminton",
          "Find your next doubles partner. All levels, one friendly community.",
        ],
        [
          "circle-runners",
          "Weekend Runners",
          "elmina",
          "Running",
          "Easy miles, fresh air, and neighbours who cheer you on.",
        ],
        [
          "circle-gardeners",
          "Urban Gardeners",
          "sjcc",
          "Gardening",
          "Grow a little greener, swap ideas, and learn together.",
        ],
        [
          "circle-wellbeing",
          "Healthy Living Circle",
          "putra-heights",
          "Yoga",
          "Make room for movement, mindfulness, and good company.",
        ],
      ])
        run(
          "INSERT INTO communities VALUES(?,?,?,?,?,?)",
          communityId,
          townshipId,
          name,
          description,
          category,
          "organizer-1",
        );
      run(
        "INSERT INTO community_memberships VALUES(?,?,?,?)",
        id(),
        "circle-badminton",
        "resident-1",
        now(),
      );
      notify(
        "resident-1",
        "Your neighbourhood, a little closer",
        "Explore a real facility, join a sample activity, or propose something new. This is a demonstration account.",
      );
    });
  }

  app.use("/api", (req, _res, next) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("rk_session="))
      ?.slice(11);
    const session =
      token &&
      get(
        "SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?",
        hash(token),
        Date.now(),
      );
    req.user = session ? profile(session.user_id) : null;
    next();
  });
  const authenticated = (req, _res, next) =>
    req.user
      ? next()
      : next(error(401, "Choose a demonstration account to continue."));

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, mode: "shared-database-demo", database: "sqlite" }),
  );
  app.post("/api/session", (req, res, next) => {
    try {
      if (
        typeof req.body.profile_id !== "string" ||
        req.body.profile_id.length > 100
      )
        throw error(400, "Choose a prepared demonstration account.");
      const user = profile(req.body.profile_id);
      if (!user)
        throw error(400, "Choose one of the prepared demonstration accounts.");
      const token = randomBytes(32).toString("hex");
      run("DELETE FROM sessions WHERE expires_at<?", Date.now());
      run(
        "INSERT INTO sessions VALUES(?,?,?)",
        hash(token),
        user.id,
        Date.now() + 12 * 3600000,
      );
      res.cookie("rk_session", token, {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.SECURE_COOKIES === "true",
        maxAge: 12 * 3600000,
        path: "/",
      });
      res.json({
        user,
        mode: "demo",
        notice:
          "Prepared demonstration identities, not verified resident authentication.",
      });
    } catch (err) {
      next(err);
    }
  });
  app.delete("/api/session", (req, res) => {
    const token = req.headers.cookie
      ?.split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("rk_session="))
      ?.slice(11);
    if (token) run("DELETE FROM sessions WHERE token_hash=?", hash(token));
    res.clearCookie("rk_session", {
      path: "/",
      sameSite: "strict",
      secure: process.env.SECURE_COOKIES === "true",
    });
    res.json({ ok: true });
  });
  app.get("/api/bootstrap", (req, res) => {
    const user = req.user;
    const events = all("SELECT * FROM activities ORDER BY start_time");
    const visible = events.filter(
      (e) =>
        [
          "submitted",
          "under_review",
          "pending_facility_confirmation",
          "open",
          "completed",
        ].includes(e.status) || canManage(user, e),
    );
    const privateEventIds = new Set(
      events.filter((e) => canManage(user, e)).map((e) => e.id),
    );
    const registrations = user
      ? all(
          "SELECT r.*, p.display_name FROM registrations r JOIN profiles p ON p.id=r.user_id ORDER BY r.created_at",
        ).filter(
          (r) => r.user_id === user.id || privateEventIds.has(r.activity_id),
        )
      : [];
    res.json({
      mode: "shared-database-demo",
      user,
      demo_profiles: all(
        "SELECT id,display_name,role,home_township_id FROM profiles",
      ),
      townships: all("SELECT data FROM townships").map((t) =>
        JSON.parse(t.data),
      ),
      facilities: all("SELECT data FROM facilities").map((f) =>
        JSON.parse(f.data),
      ),
      facility_resources: all("SELECT * FROM facility_resources"),
      activities: visible.map((e) => ({
        ...publicActivity(e),
        estimated_contribution_sen: fundingEstimate(
          e,
          Math.max(
            e.minimum_participants,
            get(
              "SELECT count(*) n FROM registrations WHERE activity_id=? AND registration_status='registered'",
              e.id,
            ).n,
          ),
        ),
      })),
      registrations,
      communities: all(
        "SELECT c.*, (SELECT count(*) FROM community_memberships m WHERE m.community_id=c.id) member_count FROM communities c",
      ),
      memberships: user
        ? all("SELECT * FROM community_memberships WHERE user_id=?", user.id)
        : [],
      interests: user
        ? all("SELECT * FROM activity_interest WHERE user_id=?", user.id)
        : [],
      points: user
        ? all(
            "SELECT * FROM points_transactions WHERE user_id=? ORDER BY created_at DESC",
            user.id,
          )
        : [],
      notifications: user
        ? all(
            "SELECT * FROM notifications WHERE recipient_id=? ORDER BY created_at DESC",
            user.id,
          )
        : [],
      funding_records: user
        ? all("SELECT * FROM funding_records").filter((f) =>
            privateEventIds.has(f.activity_id),
          )
        : [],
      audit: admin(user)
        ? all("SELECT * FROM admin_audit_log ORDER BY timestamp DESC").filter(
            (a) =>
              user.role === "platform_admin" ||
              events.some(
                (e) =>
                  e.id === a.entity_id &&
                  e.township_id === user.home_township_id,
              ),
          )
        : [],
      metrics: admin(user)
        ? getMetrics(
            events.filter(
              (e) =>
                user.role === "platform_admin" ||
                e.township_id === user.home_township_id,
            ),
          )
        : null,
    });
  });

  function getMetrics(events) {
    const eventIds = new Set(events.map((e) => e.id));
    const regs = all(
      "SELECT * FROM registrations WHERE registration_status='registered'",
    ).filter((r) => eventIds.has(r.activity_id));
    const checkins = all("SELECT * FROM activity_checkins").filter((c) =>
      events.some(
        (e) =>
          e.id === c.activity_id &&
          !["cancelled", "rejected"].includes(e.status),
      ),
    );
    const demand = events
      .map((e) => ({
        activity_id: e.id,
        title: e.title,
        township_id: e.township_id,
        category: e.category,
        interest_count: get(
          "SELECT count(*) n FROM activity_interest WHERE activity_id=?",
          e.id,
        ).n,
        minimum_participants: e.minimum_participants,
        estimated_contribution_sen: fundingEstimate(e),
        status: e.status,
      }))
      .sort(
        (a, b) =>
          b.interest_count / b.minimum_participants -
          a.interest_count / a.minimum_participants,
      );
    return {
      total_proposals: events.length,
      approved: events.filter((e) =>
        ["open", "pending_facility_confirmation", "completed"].includes(
          e.status,
        ),
      ).length,
      completed: events.filter((e) => e.status === "completed").length,
      registrations: regs.length,
      verified_attendance: checkins.length,
      sustainability_activities: events.filter(
        (e) => e.status === "completed" && sustainable(e.category),
      ).length,
      pending: events.filter((e) =>
        ["submitted", "under_review", "changes_requested"].includes(e.status),
      ).length,
      demand,
      categories: [...new Set(events.map((e) => e.category))].map(
        (category) => ({
          category,
          proposals: events.filter((e) => e.category === category).length,
          registrations: regs.filter((r) =>
            events.some(
              (e) => e.id === r.activity_id && e.category === category,
            ),
          ).length,
        }),
      ),
      townships: [...new Set(events.map((e) => e.township_id))].map(
        (township_id) => ({
          township_id,
          registrations: regs.filter((r) =>
            events.some(
              (e) => e.id === r.activity_id && e.township_id === township_id,
            ),
          ).length,
        }),
      ),
    };
  }

  app.patch("/api/profile", authenticated, (req, res, next) => {
    try {
      const { display_name, home_township_id, interests = [] } = req.body;
      if (
        typeof display_name !== "string" ||
        display_name.trim().length < 2 ||
        display_name.length > 80
      )
        throw error(400, "Display name must contain 2–80 characters.");
      if (
        typeof home_township_id !== "string" ||
        home_township_id.length > 100 ||
        !get("SELECT id FROM townships WHERE id=?", home_township_id)
      )
        throw error(400, "Choose a supported home township.");
      if (
        !Array.isArray(interests) ||
        interests.length > 12 ||
        interests.some((x) => typeof x !== "string" || x.length > 50)
      )
        throw error(400, "Choose at most 12 short interests.");
      run(
        "UPDATE profiles SET display_name=?,home_township_id=?,interests=? WHERE id=?",
        display_name.trim(),
        home_township_id,
        JSON.stringify(interests),
        req.user.id,
      );
      res.json({ user: profile(req.user.id) });
    } catch (err) {
      next(err);
    }
  });

  const fields = [
    "township_id",
    "facility_id",
    "facility_resource_id",
    "title",
    "description",
    "category",
    "target_audience",
    "age_suitability",
    "start_time",
    "end_time",
    "minimum_participants",
    "maximum_participants",
    "funding_model",
    "total_estimated_cost_sen",
    "organizer_contribution_sen",
    "sponsorship_amount_sen",
  ];
  function validateActivity(input) {
    const v = {
      facility_resource_id: null,
      target_audience: "Everyone",
      age_suitability: "All ages",
      total_estimated_cost_sen: 0,
      organizer_contribution_sen: 0,
      sponsorship_amount_sen: 0,
      ...input,
    };
    for (const [field, min, max] of [
      ["title", 5, 120],
      ["description", 20, 4000],
      ["category", 2, 50],
      ["target_audience", 1, 120],
      ["age_suitability", 1, 120],
    ]) {
      if (
        typeof v[field] !== "string" ||
        v[field].trim().length < min ||
        v[field].length > max
      )
        throw error(
          400,
          `${field.replaceAll("_", " ")} must contain ${min}–${max} characters.`,
        );
      v[field] = v[field].trim();
    }
    for (const field of ["township_id", "facility_id"])
      if (typeof v[field] !== "string" || v[field].length > 100)
        throw error(400, "Choose a supported township and facility.");
    if (
      v.facility_resource_id !== null &&
      (typeof v.facility_resource_id !== "string" ||
        v.facility_resource_id.length > 100)
    )
      throw error(400, "Choose a valid simulated venue resource.");
    const f = facility(v.facility_id);
    if (v.township_id !== f.township_id)
      throw error(400, "The selected facility belongs to another township.");
    if (!v.facility_resource_id) {
      const resources = all(
        "SELECT * FROM facility_resources WHERE facility_id=?",
        v.facility_id,
      );
      if (resources.length === 1) v.facility_resource_id = resources[0].id;
      else if (resources.some((r) => r.exclusive_booking_enabled))
        throw error(
          400,
          "Select the simulated court or space for an exclusive venue schedule.",
        );
    }
    if (
      v.facility_resource_id &&
      !get(
        "SELECT id FROM facility_resources WHERE id=? AND facility_id=?",
        v.facility_resource_id,
        v.facility_id,
      )
    )
      throw error(
        400,
        "Choose a simulated resource belonging to this facility.",
      );
    if (
      typeof v.start_time !== "string" ||
      typeof v.end_time !== "string" ||
      v.start_time.length > 40 ||
      v.end_time.length > 40
    )
      throw error(400, "Choose a valid start and end date.");
    const start = Date.parse(v.start_time);
    const end = Date.parse(v.end_time);
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end - start > 24 * 3600000
    )
      throw error(
        400,
        "Use a valid schedule ending after its start and lasting at most 24 hours.",
      );
    if (start < Date.now() - 60000)
      throw error(400, "Choose a future proposal date.");
    v.start_time = new Date(start).toISOString();
    v.end_time = new Date(end).toISOString();
    if (
      !Number.isInteger(v.minimum_participants) ||
      !Number.isInteger(v.maximum_participants) ||
      v.minimum_participants < 1 ||
      v.maximum_participants < v.minimum_participants ||
      v.maximum_participants > 1000
    )
      throw error(
        400,
        "Participant limits must be whole numbers from 1 to 1,000, with maximum at least minimum.",
      );
    if (
      ![
        "free",
        "organizer_funded",
        "cost_sharing",
        "sponsorship",
        "mixed",
      ].includes(v.funding_model)
    )
      throw error(400, "Choose a valid funding model.");
    for (const field of [
      "total_estimated_cost_sen",
      "organizer_contribution_sen",
      "sponsorship_amount_sen",
    ])
      if (
        !Number.isSafeInteger(v[field]) ||
        v[field] < 0 ||
        v[field] > 100000000
      )
        throw error(
          400,
          "Costs must be non-negative integer sen and at most RM1,000,000.",
        );
    if (
      v.organizer_contribution_sen + v.sponsorship_amount_sen >
      v.total_estimated_cost_sen
    )
      throw error(
        400,
        "Organizer contribution and sponsorship cannot exceed total estimated cost.",
      );
    if (v.funding_model === "free")
      v.total_estimated_cost_sen =
        v.organizer_contribution_sen =
        v.sponsorship_amount_sen =
          0;
    if (v.funding_model === "organizer_funded") {
      v.organizer_contribution_sen = v.total_estimated_cost_sen;
      v.sponsorship_amount_sen = 0;
    }
    if (v.funding_model === "cost_sharing") {
      v.organizer_contribution_sen = 0;
      v.sponsorship_amount_sen = 0;
    }
    if (v.funding_model === "sponsorship") {
      v.sponsorship_amount_sen = v.total_estimated_cost_sen;
      v.organizer_contribution_sen = 0;
    }
    return Object.fromEntries(fields.map((f) => [f, v[f]]));
  }

  app.post("/api/activities", authenticated, (req, res, next) => {
    try {
      const v = validateActivity(req.body);
      const eventId = id();
      transaction(() => {
        run(
          `INSERT INTO activities(id,organizer_id,${fields.join(",")},status,sponsorship_status,created_at) VALUES(${new Array(fields.length + 5).fill("?").join(",")})`,
          eventId,
          req.user.id,
          ...fields.map((f) => v[f]),
          "submitted",
          v.sponsorship_amount_sen > 0 ? "requested" : "not_requested",
          now(),
        );
        if (v.total_estimated_cost_sen)
          run(
            "INSERT INTO funding_records VALUES(?,?,?,?,?,?)",
            id(),
            eventId,
            v.funding_model,
            v.total_estimated_cost_sen,
            "estimated",
            now(),
          );
        notify(
          req.user.id,
          "Proposal submitted",
          `${v.title} is ready for demonstration administrator review.`,
        );
        audit(req.user, "proposal_submitted", eventId);
      });
      res.status(201).json({ activity: publicActivity(activity(eventId)) });
    } catch (err) {
      next(err);
    }
  });
  app.patch("/api/activities/:id", authenticated, (req, res, next) => {
    try {
      const event = activity(req.params.id);
      requireManager(req, event);
      if (!["draft", "submitted", "changes_requested"].includes(event.status))
        throw error(
          409,
          "Only proposals awaiting review or changes can be edited.",
        );
      const v = validateActivity({ ...event, ...req.body });
      transaction(() => {
        run(
          `UPDATE activities SET ${fields.map((f) => `${f}=?`).join(",")},status='submitted',sponsorship_status=? WHERE id=?`,
          ...fields.map((f) => v[f]),
          v.sponsorship_amount_sen > 0 ? "requested" : "not_requested",
          event.id,
        );
        run("DELETE FROM funding_records WHERE activity_id=?", event.id);
        if (v.total_estimated_cost_sen)
          run(
            "INSERT INTO funding_records VALUES(?,?,?,?,?,?)",
            id(),
            event.id,
            v.funding_model,
            v.total_estimated_cost_sen,
            "estimated",
            now(),
          );
        audit(req.user, "proposal_resubmitted", event.id);
      });
      res.json({ activity: publicActivity(activity(event.id)) });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/activities/:id/review", authenticated, (req, res, next) => {
    try {
      const event = activity(req.params.id);
      requireAdmin(req, event);
      const decision = req.body.decision;
      const note = req.body.note || "";
      if (
        !["approve", "reject", "changes_requested"].includes(decision) ||
        typeof note !== "string" ||
        note.length > 2000
      )
        throw error(
          400,
          "Choose approve, reject, or changes_requested and a short review note.",
        );
      if (
        !["submitted", "under_review", "changes_requested"].includes(
          event.status,
        )
      )
        throw error(409, "This proposal has already been reviewed.");
      const status = {
        approve: "pending_facility_confirmation",
        reject: "rejected",
        changes_requested: "changes_requested",
      }[decision];
      transaction(() => {
        run(
          "UPDATE activities SET status=?,review_note=? WHERE id=?",
          status,
          note,
          event.id,
        );
        notify(
          event.organizer_id,
          "Proposal reviewed",
          `${event.title}: ${status.replaceAll("_", " ")}. ${note}`,
        );
        audit(req.user, `proposal_${decision}`, event.id, note);
      });
      res.json({ activity: publicActivity(activity(event.id)) });
    } catch (err) {
      next(err);
    }
  });
  app.post(
    "/api/activities/:id/sponsorship",
    authenticated,
    (req, res, next) => {
      try {
        const event = activity(req.params.id);
        requireAdmin(req, event);
        if (!["approved", "rejected"].includes(req.body.status))
          throw error(400, "Choose approved or rejected.");
        if (event.sponsorship_status !== "requested")
          throw error(409, "There is no pending sponsorship request.");
        if (
          get(
            "SELECT id FROM registrations WHERE activity_id=? AND registration_status='registered'",
            event.id,
          )
        )
          throw error(
            409,
            "Resolve sponsorship before registrations open; existing participant obligations are preserved.",
          );
        transaction(() => {
          run(
            "UPDATE activities SET sponsorship_status=? WHERE id=?",
            req.body.status,
            event.id,
          );
          run(
            "INSERT INTO funding_records VALUES(?,?,?,?,?,?)",
            id(),
            event.id,
            "sponsorship",
            event.sponsorship_amount_sen,
            req.body.status,
            now(),
          );
          audit(req.user, `demo_sponsorship_${req.body.status}`, event.id);
        });
        res.json({ activity: publicActivity(activity(event.id)) });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post(
    "/api/activities/:id/venue-confirmation",
    authenticated,
    (req, res, next) => {
      try {
        const event = activity(req.params.id);
        requireManager(req, event);
        if (event.status !== "pending_facility_confirmation")
          throw error(
            409,
            "Administrator approval is required before simulated facility confirmation.",
          );
        if (req.body.confirmed !== true)
          throw error(
            400,
            "Explicitly confirm this is a simulated venue arrangement.",
          );
        if (
          event.funding_model === "sponsorship" &&
          event.sponsorship_status !== "approved"
        )
          throw error(
            409,
            "Resolve demonstration sponsorship before opening this sponsored activity.",
          );
        transaction(() => {
          const conflict = resourceConflict(event);
          if (conflict)
            throw error(
              409,
              `This exclusive simulated slot overlaps ${conflict.title}. No real venue availability is implied.`,
            );
          run(
            "UPDATE activities SET venue_confirmed=1,status='open' WHERE id=?",
            event.id,
          );
          notify(
            event.organizer_id,
            "Sample activity open",
            `${event.title} is open for demo registrations. This does not reserve a real facility.`,
          );
          audit(req.user, "simulated_venue_confirmed", event.id);
        });
        res.json({ activity: publicActivity(activity(event.id)) });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post(
    "/api/activities/:id/registrations",
    authenticated,
    (req, res, next) => {
      try {
        const event = activity(req.params.id);
        if (event.status !== "open" || !event.venue_confirmed)
          throw error(
            409,
            "Registration is available only for open activities with simulated venue confirmation.",
          );
        if (event.organizer_id === req.user.id)
          throw error(
            409,
            "You organize this activity. Use the organizer dashboard to manage it.",
          );
        const f = facility(event.facility_id);
        const restricted = /resident|restricted|private/i.test(
          f.access_type || "",
        );
        if (
          restricted &&
          (req.body.eligibility_confirmed !== true ||
            req.user.home_township_id !== event.township_id)
        )
          throw error(
            403,
            "This restricted facility requires a matching home township and explicit demo eligibility confirmation. This attestation is not real access permission.",
          );
        let registration;
        transaction(() => {
          const existing = get(
            "SELECT * FROM registrations WHERE activity_id=? AND user_id=?",
            event.id,
            req.user.id,
          );
          if (existing && existing.registration_status !== "cancelled")
            throw error(
              409,
              "You already have a registration or waitlist place for this activity.",
            );
          const count = get(
            "SELECT count(*) n FROM registrations WHERE activity_id=? AND registration_status='registered'",
            event.id,
          ).n;
          const status =
            count < event.maximum_participants ? "registered" : "waitlisted";
          // Freeze the estimate acknowledged at registration. Changes in headcount never rewrite this obligation.
          const contribution = fundingEstimate(
            event,
            Math.max(
              event.minimum_participants,
              Math.min(event.maximum_participants, count + 1),
            ),
          );
          const registrationId = existing?.id || id();
          const reference =
            existing?.reference ||
            `RK-${randomBytes(4).toString("hex").toUpperCase()}`;
          if (existing)
            run(
              "UPDATE registrations SET registration_status=?,obligation_sen=?,eligibility_confirmed=?,created_at=?,checked_in_at=NULL,checked_in_by=NULL WHERE id=?",
              status,
              contribution,
              req.body.eligibility_confirmed === true ? 1 : 0,
              now(),
              registrationId,
            );
          else
            run(
              "INSERT INTO registrations(id,activity_id,user_id,registration_status,reference,obligation_sen,eligibility_confirmed,created_at) VALUES(?,?,?,?,?,?,?,?)",
              registrationId,
              event.id,
              req.user.id,
              status,
              reference,
              contribution,
              req.body.eligibility_confirmed === true ? 1 : 0,
              now(),
            );
          registration = get(
            "SELECT * FROM registrations WHERE id=?",
            registrationId,
          );
          notify(
            req.user.id,
            status === "registered"
              ? "You’re on the list"
              : "You’re on the waitlist",
            `${event.title}. Reference ${reference}. Contribution is an illustrative estimate, not a payment.`,
          );
        });
        res.status(201).json({ registration });
      } catch (err) {
        next(err);
      }
    },
  );
  app.delete(
    "/api/activities/:id/registrations",
    authenticated,
    (req, res, next) => {
      try {
        const event = activity(req.params.id);
        if (event.status !== "open")
          throw error(
            409,
            "Only open sample activity registrations can be cancelled.",
          );
        transaction(() => {
          const registration = get(
            "SELECT * FROM registrations WHERE activity_id=? AND user_id=?",
            event.id,
            req.user.id,
          );
          if (!registration || registration.registration_status === "cancelled")
            throw error(404, "No active registration found.");
          if (registration.checked_in_at)
            throw error(
              409,
              "A verified attendance record cannot be cancelled. Contact the organizer.",
            );
          run(
            "UPDATE registrations SET registration_status='cancelled' WHERE id=?",
            registration.id,
          );
          if (registration.registration_status === "registered") {
            const next = get(
              "SELECT * FROM registrations WHERE activity_id=? AND registration_status='waitlisted' ORDER BY created_at,id LIMIT 1",
              event.id,
            );
            if (next) {
              run(
                "UPDATE registrations SET registration_status='registered' WHERE id=?",
                next.id,
              );
              notify(
                next.user_id,
                "A place opened up",
                `Your waitlist place for ${event.title} is now a registration. Your recorded estimated contribution is unchanged.`,
              );
            }
          }
        });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post("/api/activities/:id/interest", authenticated, (req, res, next) => {
    try {
      const event = activity(req.params.id);
      if (["cancelled", "rejected", "completed"].includes(event.status))
        throw error(409, "Interest collection is closed for this activity.");
      const existing = get(
        "SELECT id FROM activity_interest WHERE activity_id=? AND user_id=?",
        event.id,
        req.user.id,
      );
      if (existing)
        run("DELETE FROM activity_interest WHERE id=?", existing.id);
      else
        run(
          "INSERT INTO activity_interest VALUES(?,?,?,?)",
          id(),
          event.id,
          req.user.id,
          now(),
        );
      res.json({
        interested: !existing,
        interest_count: get(
          "SELECT count(*) n FROM activity_interest WHERE activity_id=?",
          event.id,
        ).n,
      });
    } catch (err) {
      next(err);
    }
  });
  app.post(
    "/api/activities/:id/attendance",
    authenticated,
    (req, res, next) => {
      try {
        const event = activity(req.params.id);
        requireManager(req, event);
        if (event.status !== "open")
          throw error(
            409,
            "Only an open sample activity can verify attendance.",
          );
        const userId = req.body.user_id;
        if (typeof userId !== "string")
          throw error(400, "Choose a registered participant.");
        transaction(() => {
          const registration = get(
            "SELECT * FROM registrations WHERE activity_id=? AND user_id=? AND registration_status='registered'",
            event.id,
            userId,
          );
          if (!registration)
            throw error(400, "Only registered participants can be checked in.");
          if (registration.checked_in_at) return;
          const first = !get(
            "SELECT c.id FROM activity_checkins c JOIN activities a ON a.id=c.activity_id WHERE c.user_id=? AND a.status<>'cancelled'",
            userId,
          );
          run(
            "INSERT INTO activity_checkins VALUES(?,?,?,?,?,?)",
            id(),
            event.id,
            userId,
            req.user.id,
            now(),
            "organizer_demo_verification",
          );
          run(
            "UPDATE registrations SET checked_in_at=?,checked_in_by=? WHERE id=?",
            now(),
            req.user.id,
            registration.id,
          );
          award(
            userId,
            event.id,
            20,
            "Verified demo attendance",
            `attendance:${event.id}:${userId}`,
          );
          if (sustainable(event.category))
            award(
              userId,
              event.id,
              10,
              "Sustainability activity bonus",
              `sustainability:${event.id}:${userId}`,
            );
          if (first)
            award(
              userId,
              event.id,
              10,
              "First verified activity bonus",
              `first-attendance:${userId}:${event.id}`,
            );
          notify(
            userId,
            "A moment that matters",
            `Your attendance at ${event.title} was verified. RuangPoints have been added once.`,
          );
          audit(req.user, "attendance_verified", event.id, userId);
        });
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post("/api/activities/:id/complete", authenticated, (req, res, next) => {
    try {
      const event = activity(req.params.id);
      requireManager(req, event);
      if (event.status === "completed") return res.json({ ok: true });
      if (event.status !== "open")
        throw error(409, "Only an open sample activity can be completed.");
      if (
        !get("SELECT id FROM activity_checkins WHERE activity_id=?", event.id)
      )
        throw error(
          409,
          "Verify at least one participant before completing the sample activity.",
        );
      transaction(() => {
        run("UPDATE activities SET status='completed' WHERE id=?", event.id);
        award(
          event.organizer_id,
          event.id,
          30,
          "Organized and completed a demo activity",
          `organizer-complete:${event.id}`,
        );
        audit(req.user, "activity_completed", event.id);
        notify(
          event.organizer_id,
          "Community, made real",
          `Your sample activity ${event.title} is complete. You earned 30 RuangPoints.`,
        );
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/activities/:id/cancel", authenticated, (req, res, next) => {
    try {
      const event = activity(req.params.id);
      requireManager(req, event);
      if (event.status === "completed")
        throw error(
          409,
          "Completed activities retain their attendance and rewards history.",
        );
      if (event.status === "cancelled") return res.json({ ok: true });
      transaction(() => {
        run(
          "UPDATE activities SET status='cancelled',venue_confirmed=0 WHERE id=?",
          event.id,
        );
        const points = all(
          "SELECT * FROM points_transactions WHERE activity_id=? AND points_change>0",
          event.id,
        );
        for (const p of points)
          award(
            p.user_id,
            event.id,
            -p.points_change,
            `Reversal: cancelled activity — ${p.reason}`,
            `reversal:${p.reference_key}`,
          );
        // A cancelled first event must not remove the milestone from someone who
        // has another valid attendance. Reassign it with a new ledger entry.
        for (const userId of new Set(points.map((p) => p.user_id))) {
          const firstBonus = get(
            "SELECT coalesce(sum(points_change),0) n FROM points_transactions WHERE user_id=? AND (reference_key LIKE 'first-attendance:%' OR reference_key LIKE 'reversal:first-attendance:%')",
            userId,
          ).n;
          const nextAttendance = get(
            "SELECT c.activity_id FROM activity_checkins c JOIN activities a ON a.id=c.activity_id WHERE c.user_id=? AND a.status IN ('open','completed') ORDER BY c.verified_at,c.id LIMIT 1",
            userId,
          );
          if (firstBonus === 0 && nextAttendance)
            award(
              userId,
              nextAttendance.activity_id,
              10,
              "First verified activity bonus",
              `first-attendance:${userId}:${nextAttendance.activity_id}`,
            );
        }
        for (const r of all(
          "SELECT * FROM registrations WHERE activity_id=? AND registration_status<>'cancelled'",
          event.id,
        ))
          notify(
            r.user_id,
            "Sample activity cancelled",
            `${event.title} was cancelled. Any demo points were reversed with ledger entries.`,
          );
        run(
          "UPDATE registrations SET registration_status='cancelled' WHERE activity_id=?",
          event.id,
        );
        run(
          "UPDATE funding_records SET status='cancelled' WHERE activity_id=?",
          event.id,
        );
        audit(req.user, "activity_cancelled", event.id);
      });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.post(
    "/api/communities/:id/membership",
    authenticated,
    (req, res, next) => {
      try {
        if (!get("SELECT id FROM communities WHERE id=?", req.params.id))
          throw error(404, "Community circle not found.");
        const existing = get(
          "SELECT id FROM community_memberships WHERE community_id=? AND user_id=?",
          req.params.id,
          req.user.id,
        );
        if (existing)
          run("DELETE FROM community_memberships WHERE id=?", existing.id);
        else
          run(
            "INSERT INTO community_memberships VALUES(?,?,?,?)",
            id(),
            req.params.id,
            req.user.id,
            now(),
          );
        res.json({ joined: !existing });
      } catch (err) {
        next(err);
      }
    },
  );
  app.post("/api/notifications/read", authenticated, (req, res) => {
    run(
      "UPDATE notifications SET read_status=1 WHERE recipient_id=?",
      req.user.id,
    );
    res.json({ ok: true });
  });

  app.use("/api", (_req, _res, next) =>
    next(error(404, "API route not found.")),
  );
  const dist = resolve(root, "dist");
  if (existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(resolve(dist, "index.html")),
    );
  }
  app.use((err, _req, res, _next) => {
    if (!err.status && process.env.NODE_ENV !== "test") console.error(err);
    const status =
      err.status || (err.type === "entity.parse.failed" ? 400 : 500);
    res
      .status(status)
      .json({
        error:
          status >= 500
            ? "The request could not be completed. Please try again."
            : err.message,
      });
  });
  return { app, db, close: () => db.close() };
}
