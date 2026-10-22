import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApp } from "../server/app.mjs";

async function fixture(t, options = {}) {
  const app = createApp({ dbPath: ":memory:", ...options });
  const server = await new Promise((resolve) => {
    const listener = app.app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    app.close();
  });
  function client() {
    let cookie = "";
    return async (path, method = "GET", body, headers = {}) => {
      const res = await fetch(base + path, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(cookie ? { Cookie: cookie } : {}),
          ...headers,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (res.headers.get("set-cookie"))
        cookie = res.headers.get("set-cookie").split(";")[0];
      return {
        status: res.status,
        headers: res.headers,
        body: await res.json(),
      };
    };
  }
  return { ...app, client, base };
}
const proposal = (overrides = {}) => ({
  township_id: "bandar-bukit-raja",
  facility_id: "lyra-park",
  facility_resource_id: "lyra-demo-court",
  title: "Neighbourhood badminton evening",
  description:
    "A friendly illustrative badminton activity for the local community.",
  category: "Badminton",
  start_time: "2030-06-08T10:00:00.000Z",
  end_time: "2030-06-08T12:00:00.000Z",
  minimum_participants: 1,
  maximum_participants: 2,
  funding_model: "cost_sharing",
  total_estimated_cost_sen: 12000,
  ...overrides,
});
const signIn = async (client, profile_id) => {
  const r = await client("/session", "POST", { profile_id });
  assert.equal(r.status, 200);
  return r;
};
async function openEvent(organizer, administrator, details = {}) {
  const created = await organizer("/activities", "POST", proposal(details));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const activity = created.body.activity;
  assert.equal(
    (
      await administrator(`/activities/${activity.id}/review`, "POST", {
        decision: "approve",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await organizer(`/activities/${activity.id}/venue-confirmation`, "POST", {
        confirmed: true,
      })
    ).status,
    200,
  );
  return activity;
}

test("complete primary journey persists registrations and awards attendance exactly once", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  const resident = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  await signIn(resident, "resident-2");
  const event = await openEvent(organizer, administrator);
  const registered = await resident(
    `/activities/${event.id}/registrations`,
    "POST",
    { eligibility_confirmed: true },
  );
  assert.equal(registered.status, 201);
  assert.equal(registered.body.registration.obligation_sen, 12000);
  let snapshot = (await resident("/bootstrap")).body;
  assert.equal(
    snapshot.activities.find((e) => e.id === event.id).registration_count,
    1,
  );
  assert.equal(snapshot.points.length, 0, "joining awards no points");
  assert.equal(
    (
      await organizer(`/activities/${event.id}/attendance`, "POST", {
        user_id: "resident-2",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await organizer(`/activities/${event.id}/attendance`, "POST", {
        user_id: "resident-2",
      })
    ).status,
    200,
  );
  snapshot = (await resident("/bootstrap")).body;
  assert.equal(
    snapshot.points.reduce((n, p) => n + p.points_change, 0),
    30,
  );
  assert.equal(snapshot.points.length, 2);
  assert.equal(
    snapshot.registrations.find((r) => r.activity_id === event.id)
      .checked_in_by,
    "organizer-1",
  );
  assert.equal(
    (await organizer(`/activities/${event.id}/complete`, "POST", {})).status,
    200,
  );
  assert.equal(
    (await organizer(`/activities/${event.id}/complete`, "POST", {})).status,
    200,
  );
  assert.equal(
    (await organizer("/bootstrap")).body.points.reduce(
      (n, p) => n + p.points_change,
      0,
    ),
    30,
  );
  const adminState = (await administrator("/bootstrap")).body;
  assert.equal(adminState.metrics.completed, 1);
  assert.equal(adminState.metrics.verified_attendance, 1);
  assert.ok(adminState.audit.some((a) => a.action === "attendance_verified"));
});

test("server enforces authentication, organizer ownership, administrator privileges and privacy", async (t) => {
  const f = await fixture(t);
  const anonymous = f.client();
  const resident = f.client();
  const other = f.client();
  const organizer = f.client();
  const administrator = f.client();
  assert.equal(
    (await anonymous("/activities", "POST", proposal())).status,
    401,
  );
  await signIn(resident, "resident-1");
  await signIn(other, "resident-2");
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  const event = await openEvent(organizer, administrator);
  assert.equal(
    (
      await resident(`/activities/${event.id}/review`, "POST", {
        decision: "approve",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await resident(`/activities/${event.id}/attendance`, "POST", {
        user_id: "resident-2",
      })
    ).status,
    403,
  );
  assert.equal(
    (await resident(`/activities/${event.id}/cancel`, "POST", {})).status,
    403,
  );
  assert.equal(
    (
      await resident("/profile", "PATCH", {
        display_name: "Maya",
        home_township_id: "bandar-bukit-raja",
        interests: [],
        role: "platform_admin",
      })
    ).body.user.role,
    "resident",
  );
  assert.equal(
    (
      await other(`/activities/${event.id}/registrations`, "POST", {
        eligibility_confirmed: true,
      })
    ).status,
    201,
  );
  assert.equal((await resident("/bootstrap")).body.registrations.length, 0);
  assert.equal((await anonymous("/bootstrap")).body.registrations.length, 0);
  assert.equal((await organizer("/bootstrap")).body.registrations.length, 1);
  assert.equal((await resident("/bootstrap")).body.audit.length, 0);
  assert.equal(
    (
      await anonymous(
        "/session",
        "POST",
        { profile_id: "admin-1" },
        { Origin: "https://evil.example" },
      )
    ).status,
    403,
  );
  const login = await signIn(anonymous, "resident-1");
  assert.match(login.headers.get("set-cookie"), /HttpOnly/);
  assert.match(login.headers.get("set-cookie"), /SameSite=Strict/);
});

test("capacity, duplicates, waitlist promotion, eligibility and stable financial estimates", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  const first = f.client();
  const second = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  await signIn(first, "resident-1");
  await signIn(second, "resident-2");
  const event = await openEvent(organizer, administrator, {
    maximum_participants: 1,
  });
  assert.equal(
    (await first(`/activities/${event.id}/registrations`, "POST", {})).status,
    403,
  );
  assert.equal(
    (
      await first(`/activities/${event.id}/registrations`, "POST", {
        eligibility_confirmed: true,
      })
    ).body.registration.registration_status,
    "registered",
  );
  assert.equal(
    (
      await first(`/activities/${event.id}/registrations`, "POST", {
        eligibility_confirmed: true,
      })
    ).status,
    409,
  );
  const waiting = await second(
    `/activities/${event.id}/registrations`,
    "POST",
    { eligibility_confirmed: true },
  );
  assert.equal(waiting.body.registration.registration_status, "waitlisted");
  assert.equal(
    waiting.body.registration.obligation_sen,
    12000,
    "waitlist quotes must not assume more paying places than maximum capacity",
  );
  assert.equal(
    (await second("/bootstrap")).body.activities.find((e) => e.id === event.id)
      .registration_count,
    1,
  );
  assert.equal(
    (
      await organizer(`/activities/${event.id}/attendance`, "POST", {
        user_id: "resident-2",
      })
    ).status,
    400,
  );
  await first(`/activities/${event.id}/registrations`, "DELETE");
  const registration = (await second("/bootstrap")).body.registrations.find(
    (r) => r.activity_id === event.id,
  );
  assert.equal(registration.registration_status, "registered");
  assert.equal(
    registration.obligation_sen,
    waiting.body.registration.obligation_sen,
  );
});

test("exclusive simulated schedules block overlap but permit adjacent slots and public overlap", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  await openEvent(organizer, administrator);
  let created = await organizer(
    "/activities",
    "POST",
    proposal({ title: "Overlapping badminton session" }),
  );
  await administrator(
    `/activities/${created.body.activity.id}/review`,
    "POST",
    { decision: "approve" },
  );
  assert.equal(
    (
      await organizer(
        `/activities/${created.body.activity.id}/venue-confirmation`,
        "POST",
        { confirmed: true },
      )
    ).status,
    409,
  );
  const omitted = await organizer(
    "/activities",
    "POST",
    proposal({ facility_resource_id: null }),
  );
  assert.equal(
    omitted.body.activity.facility_resource_id,
    "lyra-demo-court",
    "omitting the sole exclusive resource cannot bypass scheduling",
  );
  await administrator(
    `/activities/${omitted.body.activity.id}/review`,
    "POST",
    { decision: "approve" },
  );
  assert.equal(
    (
      await organizer(
        `/activities/${omitted.body.activity.id}/venue-confirmation`,
        "POST",
        { confirmed: true },
      )
    ).status,
    409,
  );
  await openEvent(organizer, administrator, {
    start_time: "2030-06-08T12:00:00.000Z",
    end_time: "2030-06-08T13:00:00.000Z",
  });
  const nonexclusive = {
    township_id: "elmina",
    facility_id: "elmina-central-park",
    facility_resource_id: "elmina-demo-route",
    funding_model: "free",
    total_estimated_cost_sen: 0,
  };
  await openEvent(organizer, administrator, nonexclusive);
  await openEvent(organizer, administrator, nonexclusive);
});

test("validates costs, matching township, timestamps and participant numbers", async (t) => {
  const f = await fixture(t);
  const resident = f.client();
  await signIn(resident, "resident-1");
  for (const invalid of [
    { total_estimated_cost_sen: -1 },
    { total_estimated_cost_sen: 1.5 },
    { total_estimated_cost_sen: null },
    { maximum_participants: 0 },
    { minimum_participants: 3, maximum_participants: 2 },
    { end_time: "2030-06-07T10:00:00.000Z" },
    { start_time: "2020-01-01T00:00:00.000Z" },
    { start_time: [] },
    { township_id: "sjcc" },
    { facility_id: 5 },
    { facility_resource_id: "parc-demo-space" },
    { organizer_contribution_sen: 12001 },
    { title: "Hi" },
  ]) {
    const result = await resident("/activities", "POST", proposal(invalid));
    assert.equal(result.status, 400, JSON.stringify(invalid));
  }
});

test("cancelling a first attendance reassigns the one-time milestone to an existing valid attendance", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  const resident = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  await signIn(resident, "resident-2");
  const first = await openEvent(organizer, administrator);
  const second = await openEvent(organizer, administrator, {
    start_time: "2030-06-09T10:00:00.000Z",
    end_time: "2030-06-09T12:00:00.000Z",
  });
  for (const event of [first, second]) {
    await resident(`/activities/${event.id}/registrations`, "POST", {
      eligibility_confirmed: true,
    });
    await organizer(`/activities/${event.id}/attendance`, "POST", {
      user_id: "resident-2",
    });
  }
  assert.equal(
    (await resident("/bootstrap")).body.points.reduce(
      (n, p) => n + p.points_change,
      0,
    ),
    50,
  );
  await organizer(`/activities/${first.id}/cancel`, "POST", {});
  const points = (await resident("/bootstrap")).body.points;
  assert.equal(
    points.reduce((n, p) => n + p.points_change, 0),
    30,
  );
  assert.equal(
    (await administrator("/bootstrap")).body.metrics.verified_attendance,
    1,
  );
});

test("proposal changes resubmit; sponsorship review precedes simulated opening", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  const created = await organizer(
    "/activities",
    "POST",
    proposal({ funding_model: "sponsorship" }),
  );
  const eventId = created.body.activity.id;
  assert.equal(
    (
      await organizer(`/activities/${eventId}/venue-confirmation`, "POST", {
        confirmed: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await administrator(`/activities/${eventId}/review`, "POST", {
        decision: "changes_requested",
        note: "Please clarify the schedule.",
      })
    ).status,
    200,
  );
  const edited = await organizer(`/activities/${eventId}`, "PATCH", {
    title: "Updated neighbourhood badminton",
  });
  assert.equal(edited.body.activity.status, "submitted");
  await administrator(`/activities/${eventId}/review`, "POST", {
    decision: "approve",
  });
  assert.equal(
    (
      await organizer(`/activities/${eventId}/venue-confirmation`, "POST", {
        confirmed: true,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await administrator(`/activities/${eventId}/sponsorship`, "POST", {
        status: "approved",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await organizer(`/activities/${eventId}/venue-confirmation`, "POST", {
        confirmed: true,
      })
    ).status,
    200,
  );
});

test("sustainability rewards and cancellation use reversal ledger entries", async (t) => {
  const f = await fixture(t);
  const organizer = f.client();
  const administrator = f.client();
  const resident = f.client();
  await signIn(organizer, "organizer-1");
  await signIn(administrator, "admin-1");
  await signIn(resident, "resident-2");
  const event = await openEvent(organizer, administrator, {
    category: "Recycling",
  });
  await resident(`/activities/${event.id}/registrations`, "POST", {
    eligibility_confirmed: true,
  });
  await organizer(`/activities/${event.id}/attendance`, "POST", {
    user_id: "resident-2",
  });
  assert.equal(
    (await resident("/bootstrap")).body.points.reduce(
      (n, p) => n + p.points_change,
      0,
    ),
    40,
  );
  await organizer(`/activities/${event.id}/cancel`, "POST", {});
  const points = (await resident("/bootstrap")).body.points;
  assert.equal(points.length, 6);
  assert.equal(
    points.reduce((n, p) => n + p.points_change, 0),
    0,
  );
  assert.equal(
    (
      await organizer(`/activities/${event.id}/attendance`, "POST", {
        user_id: "resident-2",
      })
    ).status,
    409,
  );
  const next = await openEvent(organizer, administrator, {
    start_time: "2030-06-09T10:00:00.000Z",
    end_time: "2030-06-09T12:00:00.000Z",
  });
  await resident(`/activities/${next.id}/registrations`, "POST", {
    eligibility_confirmed: true,
  });
  await organizer(`/activities/${next.id}/attendance`, "POST", {
    user_id: "resident-2",
  });
  assert.equal(
    (await resident("/bootstrap")).body.points.reduce(
      (n, p) => n + p.points_change,
      0,
    ),
    30,
  );
});

test("unique community membership and interest toggles are persisted", async (t) => {
  const f = await fixture(t);
  const resident = f.client();
  await signIn(resident, "resident-2");
  assert.equal(
    (await resident("/communities/circle-badminton/membership", "POST", {}))
      .body.joined,
    true,
  );
  assert.equal((await resident("/bootstrap")).body.memberships.length, 1);
  assert.equal(
    (await resident("/communities/circle-badminton/membership", "POST", {}))
      .body.joined,
    false,
  );
  const eventId = (await resident("/bootstrap")).body.activities[0].id;
  assert.equal(
    (await resident(`/activities/${eventId}/interest`, "POST", {})).body
      .interest_count,
    1,
  );
  assert.equal(
    (await resident(`/activities/${eventId}/interest`, "POST", {})).body
      .interest_count,
    0,
  );
  assert.equal((await resident("/bootstrap")).body.interests.length, 0);
});

test("database data and sessions survive backend restart", async (t) => {
  const dir = mkdtempSync(join(tmpdir(), "ruangkita-test-"));
  const dbPath = join(dir, "test.sqlite");
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const first = createApp({ dbPath });
  const firstServer = await new Promise((resolve) => {
    const listener = first.app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const login = await fetch(
    `http://127.0.0.1:${firstServer.address().port}/api/session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "resident-1" }),
    },
  );
  const cookie = login.headers.get("set-cookie").split(";")[0];
  first.db
    .prepare(
      "UPDATE profiles SET display_name='Persisted Maya' WHERE id='resident-1'",
    )
    .run();
  const stamp = first.db
    .prepare("SELECT created_at FROM profiles WHERE id=?")
    .get("resident-1").created_at;
  await new Promise((resolve) => firstServer.close(resolve));
  first.close();
  const second = createApp({ dbPath });
  const secondServer = await new Promise((resolve) => {
    const listener = second.app.listen(0, "127.0.0.1", () => resolve(listener));
  });
  const snapshot = await (
    await fetch(
      `http://127.0.0.1:${secondServer.address().port}/api/bootstrap`,
      { headers: { Cookie: cookie } },
    )
  ).json();
  assert.equal(snapshot.user.id, "resident-1");
  assert.equal(
    second.db
      .prepare("SELECT display_name FROM profiles WHERE id=?")
      .get("resident-1").display_name,
    "Persisted Maya",
  );
  assert.equal(
    second.db
      .prepare("SELECT created_at FROM profiles WHERE id=?")
      .get("resident-1").created_at,
    stamp,
  );
  assert.equal(second.db.prepare("SELECT count(*) n FROM profiles").get().n, 4);
  await new Promise((resolve) => secondServer.close(resolve));
  second.close();
});
