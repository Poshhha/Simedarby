import {
  Bike,
  Dumbbell,
  Leaf,
  Paintbrush,
  PersonStanding,
  Sprout,
  Users,
} from "lucide-react";
export function ActivityArt({
  category = "",
  className = "",
}: {
  category?: string;
  className?: string;
}) {
  const c = category.toLowerCase();
  if (
    c.includes("badminton") ||
    c.includes("futsal") ||
    c.includes("basketball")
  )
    return (
      <div className={"activity-art sport-art " + className}>
        <svg viewBox="0 0 600 300" aria-hidden="true">
          <defs>
            <pattern
              id="courtlines"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M36 0H0V36"
                fill="none"
                stroke="#ffffff"
                strokeOpacity=".05"
              />
            </pattern>
          </defs>
          <rect width="600" height="300" fill="#c8714e" />
          <rect width="600" height="300" fill="url(#courtlines)" />
          <g transform="translate(120,-24) rotate(19 150 150)">
            <rect x="0" y="0" width="350" height="350" rx="2" fill="#338b78" />
            <g fill="none" stroke="#f3ead9" strokeWidth="3" opacity=".9">
              <rect x="18" y="18" width="314" height="314" />
              <path d="M18 175H332M18 105H332M18 245H332M50 18V332M300 18V332M175 18V105M175 245V332" />
            </g>
            <path d="M-10 175H360" stroke="#14283f" strokeWidth="6" />
            <path d="M-10 170H360" stroke="white" strokeWidth="3" />
          </g>
          <ellipse
            cx="470"
            cy="215"
            rx="22"
            ry="32"
            transform="rotate(35 470 215)"
            fill="none"
            stroke="#fdf5d9"
            strokeWidth="7"
          />
          <path d="M452 242L424 280" stroke="#fdf5d9" strokeWidth="8" />
          <circle cx="126" cy="93" r="11" fill="#f6c46f" />
          <circle cx="126" cy="93" r="6" fill="#14283f" />
          <circle cx="359" cy="218" r="11" fill="#f6c46f" />
          <circle cx="359" cy="218" r="6" fill="#14283f" />
        </svg>
        <span className="art-caption">Illustration</span>
      </div>
    );
  if (
    c.includes("running") ||
    c === "cycling" ||
    c.includes("family") ||
    c.includes("cleanup")
  )
    return (
      <div className={"activity-art park-art " + className}>
        <img src="/images/community-park.png" alt="" loading="lazy" />
        <span className="art-caption">Illustrative park</span>
      </div>
    );
  const yoga = c.includes("yoga");
  const Icon = yoga
    ? PersonStanding
    : c.includes("garden")
      ? Sprout
      : c.includes("cycl")
        ? Bike
        : c.includes("work")
          ? Paintbrush
          : c.includes("fit")
            ? Dumbbell
            : c.includes("recycl")
              ? Leaf
              : Users;
  return (
    <div
      className={
        "activity-art illustration-art " +
        (yoga ? "lavender" : "peach") +
        " " +
        className
      }
    >
      <span className="art-orbit one" />
      <span className="art-orbit two" />
      <span className="art-sun" />
      <Icon size={100} strokeWidth={1} aria-hidden="true" />
      <span className="art-caption">Illustration</span>
    </div>
  );
}
