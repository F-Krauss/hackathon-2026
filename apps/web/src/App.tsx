import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Bike, CarFront, Leaf, MapPinned, Plus, Route } from "lucide-react";
import type { HealthResponse, Ride, RouteEstimate, RouteEstimateRequest } from "@eco-carpool/shared";

type Page = "home" | "rides" | "route";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const navItems: Array<{ id: Page; label: string }> = [
  { id: "home", label: "Home" },
  { id: "rides", label: "Rides" },
  { id: "route", label: "Route estimate" },
];

function App() {
  const [page, setPage] = useState<Page>("home");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          <span>Eco Carpool</span>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              className={page === item.id ? "nav-button active" : "nav-button"}
              key={item.id}
              onClick={() => setPage(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="content-panel">
        {page === "home" && <HomePage />}
        {page === "rides" && <RidesPage />}
        {page === "route" && <RouteEstimatePage />}
      </section>
    </main>
  );
}

function HomePage() {
  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Eco-friendly carpool skeleton</h1>
          <p>Frontend, API, and route service are wired for future ride-sharing requirements.</p>
        </div>
      </header>

      <div className="summary-grid">
        <SummaryCard icon={<CarFront />} title="Ride listings" text="Placeholder ride cards from the NestJS API." />
        <SummaryCard icon={<Route />} title="Route estimates" text="NestJS proxies estimate requests to FastAPI." />
        <SummaryCard icon={<Bike />} title="CO2 savings" text="Mock values reserve space for sustainability metrics." />
      </div>

      <HealthCheck />
    </div>
  );
}

function SummaryCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="summary-card">
      <span className="summary-icon">{icon}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function HealthCheck() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/health`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return response.json() as Promise<HealthResponse>;
      })
      .then(setHealth)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Unable to reach API");
      });
  }, []);

  return (
    <section className="status-panel">
      <div>
        <h2>API connectivity</h2>
        <p>Checks the NestJS health endpoint configured by VITE_API_URL.</p>
      </div>
      <span className={health ? "status-pill ok" : "status-pill"}>
        {health ? `${health.service}: ${health.status}` : error ?? "Checking..."}
      </span>
    </section>
  );
}

function RidesPage() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${apiUrl}/rides`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        return response.json() as Promise<Ride[]>;
      })
      .then(setRides)
      .catch((caught: unknown) => {
        setError(caught instanceof Error ? caught.message : "Unable to load rides");
      });
  }, []);

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Rides</h1>
          <p>Placeholder ride data until matching and persistence requirements are added.</p>
        </div>
        <button className="primary-button" type="button">
          <Plus size={18} />
          New ride
        </button>
      </header>

      {error && <p className="error-text">{error}</p>}

      <div className="ride-list">
        {rides.map((ride) => (
          <article className="ride-row" key={ride.id}>
            <div>
              <h2>
                {ride.origin} to {ride.destination}
              </h2>
              <p>
                {ride.driverName} · {new Date(ride.departureTime).toLocaleString()}
              </p>
            </div>
            <div className="ride-meta">
              <span>{ride.seatsAvailable} seats</span>
              <span>{ride.status}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RouteEstimatePage() {
  const [form, setForm] = useState<RouteEstimateRequest>({
    origin: "Downtown",
    destination: "North Campus",
  });
  const [estimate, setEstimate] = useState<RouteEstimate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const distance = useMemo(() => {
    if (!estimate) {
      return null;
    }
    return `${(estimate.distanceMeters / 1000).toFixed(1)} km`;
  }, [estimate]);

  async function submitEstimate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch(`${apiUrl}/routes/estimate`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      setEstimate((await response.json()) as RouteEstimate);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to estimate route");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <header className="page-header">
        <div>
          <h1>Route estimate</h1>
          <p>Posts to NestJS, which delegates to the Python route service.</p>
        </div>
      </header>

      <form className="route-form" onSubmit={submitEstimate}>
        <label>
          Origin
          <input
            onChange={(event) => setForm({ ...form, origin: event.target.value })}
            type="text"
            value={form.origin}
          />
        </label>
        <label>
          Destination
          <input
            onChange={(event) => setForm({ ...form, destination: event.target.value })}
            type="text"
            value={form.destination}
          />
        </label>
        <button className="primary-button" disabled={isLoading} type="submit">
          <MapPinned size={18} />
          {isLoading ? "Estimating..." : "Estimate"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}

      {estimate && (
        <section className="status-panel">
          <div>
            <h2>{distance}</h2>
            <p>
              {Math.round(estimate.durationSeconds / 60)} min · {estimate.estimatedCo2SavingsGrams} g CO2 saved ·{" "}
              {estimate.provider}
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
