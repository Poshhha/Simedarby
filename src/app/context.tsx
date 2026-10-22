import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Snapshot } from "./types";
export const money = (sen: number) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    sen / 100,
  );
export const dateLabel = (date: string) =>
  new Date(date).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
export const timeLabel = (date: string) =>
  new Date(date).toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
export const human = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export async function request(path: string, method = "GET", body?: unknown) {
  const r = await fetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok)
    throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}
interface AppValue {
  data: Snapshot;
  township: string;
  setTownship: (s: string) => void;
  refresh: () => Promise<void>;
  mutate: (
    path: string,
    method?: string,
    body?: unknown,
    message?: string,
  ) => Promise<any>;
  toast: (s: string) => void;
}
const Ctx = createContext<AppValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [township, setTownshipState] = useState(
      () => localStorage.getItem("ruangkita-township") || "all",
    );
  const setTownship = (s: string) => {
    setTownshipState(s);
    localStorage.setItem("ruangkita-township", s);
  };
  const refresh = async () => {
    setData(await request("/bootstrap"));
    setError("");
  };
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (notice) {
      const id = setTimeout(() => setNotice(""), 4500);
      return () => clearTimeout(id);
    }
  }, [notice]);
  const mutate = async (
    path: string,
    method = "POST",
    body?: unknown,
    message = "Saved successfully",
  ) => {
    const r = await request(path, method, body);
    await refresh();
    setNotice(message);
    return r;
  };
  if (!data)
    return (
      <main className="boot-state">
        <div className="brand">
          RUANG<span>KITA</span>
          <small>YOUR TOWNSHIP. YOUR COMMUNITY.</small>
        </div>
        {error ? (
          <>
            <p role="alert">
              Couldn’t connect to the community server. {error}
            </p>
            <button
              className="btn primary"
              onClick={() => refresh().catch((e) => setError(e.message))}
            >
              Try again
            </button>
          </>
        ) : (
          <p>Bringing your neighbourhood together…</p>
        )}
      </main>
    );
  return (
    <Ctx.Provider
      value={{ data, township, setTownship, refresh, mutate, toast: setNotice }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
    </Ctx.Provider>
  );
}
export function useApp() {
  const v = useContext(Ctx);
  if (!v) throw new Error("AppProvider missing");
  return v;
}
