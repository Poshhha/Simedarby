import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Users } from "lucide-react";
import { useApp, dateLabel, timeLabel, money, human } from "../app/context";
import type { Activity } from "../app/types";
import { ActivityArt } from "./Art";
export function ActivityCard({ activity: a }: { activity: Activity }) {
  const { data } = useApp();
  const facility = data.facilities.find((f) => f.id === a.facility_id),
    town = data.townships.find((t) => t.id === a.township_id);
  const free = !["cost_sharing", "mixed"].includes(a.funding_model);
  const estimate = Math.ceil(
    Math.max(
      0,
      a.total_estimated_cost_sen -
        a.organizer_contribution_sen -
        (a.sponsorship_status === "approved" ? a.sponsorship_amount_sen : 0),
    ) / Math.max(1, a.minimum_participants, a.registration_count),
  );
  return (
    <article className="activity-card">
      <Link
        to={"/activities/" + a.id}
        className="card-image"
        aria-label={"View " + a.title}
      >
        <ActivityArt category={a.category} />
        <span className="image-tag">{a.category}</span>
        <span className="sample-tag">Sample event</span>
      </Link>
      <div className="card-body">
        <div className="card-town">
          <MapPin size={13} />
          {town?.name || "Township community"}
          <span className={"status-dot " + a.status} />
        </div>
        <Link to={"/activities/" + a.id} className="card-title">
          {a.title}
        </Link>
        <p className="card-location">{facility?.name || "Proposed facility"}</p>
        <div className="card-meta">
          <span>
            <CalendarDays size={15} />
            {dateLabel(a.start_time)}
          </span>
          <span>{timeLabel(a.start_time)}</span>
        </div>
        <div className="capacity">
          <div>
            <Users size={14} />
            <span>
              {a.registration_count} / {a.maximum_participants} joined
            </span>
            <span className="spaces">
              {a.status === "open"
                ? Math.max(0, a.maximum_participants - a.registration_count) +
                  " spots left"
                : human(a.status)}
            </span>
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
        <div className="card-bottom">
          <span className={free ? "free-cost" : "estimate-cost"}>
            {free ? "Free to join" : money(estimate) + " est."}
            <small>
              {a.funding_model === "organizer_funded"
                ? "Organizer funded"
                : free
                  ? "A little time. A lot of connection."
                  : "Per person · simulated cost"}
            </small>
          </span>
          <Link
            className="arrow-link"
            to={"/activities/" + a.id}
            aria-label={"View " + a.title}
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
      </div>
    </article>
  );
}
