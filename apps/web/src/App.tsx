import { useEffect, useId, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Bike,
  CalendarDays,
  CarFront,
  History,
  Leaf,
  LockKeyhole,
  LogOut,
  MapPinned,
  Medal,
  Navigation,
  Plus,
  Route,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import type {
  CarpoolMatch,
  CreateDailyRouteRequest,
  CreateDailyRouteSubscriptionRequest,
  CreateRideOfferRequest,
  CreateRideRequestRequest,
  DailyRoute,
  DailyRouteSubscription,
  HealthResponse,
  OptimizedRoute,
  Profile,
  Reward,
  RideOffer,
  RideRequest,
  RouteComparisonResponse,
  RoutePreference,
  SavingsStats,
  TransportMode,
  Trip,
  UpsertProfileRequest,
  UpsertVehicleRequest,
  Vehicle,
} from "@eco-carpool/shared";
import { apiRequest } from "./lib/api";
import { supabase } from "./utils/supabase";

type Page = "dashboard" | "planner" | "carpools" | "history" | "profile";
type AuthMode = "sign-in" | "sign-up";

type RoutePreview = {
  origin?: string;
  destination: string;
  waypoints?: string[];
  label?: string;
  distanceMeters?: number;
  durationSeconds?: number;
  provider?: OptimizedRoute["provider"];
};

type UserLocation = {
  latitude: number;
  longitude: number;
};

type PlaceSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

const navItems: Array<{ id: Page; label: string; icon: ReactNode }> = [
  { id: "dashboard", label: "Panel", icon: <Leaf size={18} /> },
  { id: "planner", label: "Planificador", icon: <Route size={18} /> },
  { id: "carpools", label: "Viajes compartidos", icon: <UsersRound size={18} /> },
  { id: "history", label: "Historial", icon: <History size={18} /> },
  { id: "profile", label: "Perfil", icon: <UserRound size={18} /> },
];

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    const loadingFallback = window.setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      window.clearTimeout(loadingFallback);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      window.clearTimeout(loadingFallback);
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || userLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => undefined,
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 8000 },
    );
  }, [session, userLocation]);

  if (isLoading) {
    return <div className="screen-center">Cargando GoPath...</div>;
  }

  if (!session) {
    return <AuthPanel />;
  }

  const token = session.access_token;

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Leaf size={22} />
          </span>
          <span>GoPath</span>
        </div>

        <nav className="nav-list" aria-label="Navegacion principal">
          {navItems.map((item) => (
            <button
              className={page === item.id ? "nav-button active" : "nav-button"}
              key={item.id}
              onClick={() => setPage(item.id)}
              type="button"
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <button className="sign-out-button" onClick={() => supabase.auth.signOut()} type="button">
          <LogOut size={18} />
          Cerrar sesion
        </button>
      </aside>

      <section className="content-panel">
        {page === "dashboard" && <Dashboard token={token} />}
        {page === "planner" && <Planner token={token} userLocation={userLocation} onFindCarpool={() => setPage("carpools")} />}
        {page === "carpools" && <Carpools token={token} userLocation={userLocation} />}
        {page === "history" && <HistoryPage token={token} />}
        {page === "profile" && <ProfilePage token={token} email={session.user.email ?? ""} />}
      </section>
    </main>
  );
}

function AuthPanel() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("Inicia sesion o crea una cuenta para planear viajes mas limpios.");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    const { data, error } =
      mode === "sign-up"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
    } else if (mode === "sign-up" && !data.session) {
      setMessage("Cuenta creada, pero Supabase tiene confirmacion por correo activa. Desactiva la confirmacion por correo para entrar sin enlaces.");
    } else {
      setMessage(mode === "sign-up" ? "Cuenta creada." : "Sesion iniciada.");
    }

    setIsSubmitting(false);
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand large">
          <span className="brand-mark">
            <Leaf size={24} />
          </span>
          <span>GoPath</span>
        </div>
        <h1>Planea rutas mas baratas y limpias con viajes compartidos.</h1>
        <p>{message}</p>
        <div className="auth-toggle" aria-label="Modo de autenticacion">
          <button className={mode === "sign-in" ? "active" : ""} onClick={() => setMode("sign-in")} type="button">
            Iniciar sesion
          </button>
          <button className={mode === "sign-up" ? "active" : ""} onClick={() => setMode("sign-up")} type="button">
            Crear cuenta
          </button>
        </div>
        <form className="stack-form" onSubmit={submit}>
          <label>
            Correo electronico
            <input
              onChange={(event) => setEmail(event.target.value)}
              placeholder="tu@ejemplo.com"
              required
              type="email"
              value={email}
            />
          </label>
          <label>
            Contrasena
            <input
              autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimo 6 caracteres"
              required
              type="password"
              value={password}
            />
          </label>
          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Procesando..." : mode === "sign-up" ? "Crear cuenta" : "Iniciar sesion"}
          </button>
        </form>
      </section>
    </main>
  );
}

function Dashboard({ token }: { token: string }) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<SavingsStats | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);

  useEffect(() => {
    void apiRequest<HealthResponse>("/health", null).then(setHealth);
    void apiRequest<SavingsStats>("/stats/savings", token).then(setStats).catch(() => setStats(emptyStats));
    void apiRequest<Reward[]>("/rewards", token).then(setRewards).catch(() => setRewards(seedRewards));
  }, [token]);

  return (
    <div className="page-stack">
      <PageHeader
        title="Panel de movilidad"
        text="Compara rutas por tiempo, costo y CO2, y encuentra viajes compartidos compatibles."
      />

      <div className="summary-grid">
        <MetricCard icon={<Route />} label="Viajes" value={stats?.tripsCompleted ?? 0} />
        <MetricCard icon={<Leaf />} label="CO2 ahorrado" value={`${Math.round((stats?.totalCo2SavingsGrams ?? 0) / 1000)} kg`} />
        <MetricCard icon={<CarFront />} label="Compartidos" value={stats?.carpoolTrips ?? 0} />
      </div>

      <section className="status-panel">
        <div>
          <h2>Estado del sistema</h2>
          <p>{health ? `${health.service} esta ${translateStatus(health.status)}` : "Revisando el estado del backend..."}</p>
        </div>
        <span className={health ? "status-pill ok" : "status-pill"}>{health ? translateStatus(health.status) : "revisando"}</span>
      </section>

      <section className="data-panel">
        <PanelTitle icon={<Medal size={20} />} title="Recompensas" />
        <div className="reward-list">
          {(rewards.length ? rewards : seedRewards).map((reward) => (
            <article className="reward-row" key={reward.id}>
              <div>
                <strong>{reward.label}</strong>
                <p>{reward.reason}</p>
              </div>
              <span>{reward.points} pts</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function Planner({ token, userLocation, onFindCarpool }: { token: string; userLocation: UserLocation | null; onFindCarpool: () => void }) {
  const [origin, setOrigin] = useState("Centro");
  const [destination, setDestination] = useState("Campus Norte");
  const [preference, setPreference] = useState<RoutePreference>("balanced");
  const [comparison, setComparison] = useState<RouteComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      setComparison(
        await apiRequest<RouteComparisonResponse>("/routes/compare", token, {
          method: "POST",
          body: JSON.stringify({
            origin,
            destination,
            preference,
            modes: ["driving", "transit", "carpool", "cycling"],
          }),
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron comparar las rutas");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Planificador de rutas" text="Elige una preferencia y compara emisiones, tiempo y costo." />

      <div className="planner-grid">
        <form className="route-form" onSubmit={submit}>
          <PlaceInput label="Origen" onChange={setOrigin} userLocation={userLocation} value={origin} />
          <PlaceInput label="Destino" onChange={setDestination} userLocation={userLocation} value={destination} />
          <label>
            Preferencia
            <select onChange={(event) => setPreference(event.target.value as RoutePreference)} value={preference}>
              <option value="balanced">Equilibrada</option>
              <option value="fastest">Mas rapida</option>
              <option value="cheapest">Mas barata</option>
              <option value="greenest">Mas ecologica</option>
            </select>
          </label>
          <button className="primary-button" disabled={isLoading} type="submit">
            <MapPinned size={18} />
            {isLoading ? "Comparando..." : "Comparar rutas"}
          </button>
        </form>

        <RouteMap
          route={{ origin, destination, label: "Ruta del planificador" }}
          text="La ruta se actualiza con el destino escrito y se puede abrir en navegacion."
          title="Mapa de ruta"
        />
      </div>

      {error && <p className="error-text">{error}</p>}

      {comparison && (
        <div className="route-options">
          {comparison.options.map((option) => (
            <article className={option.id === comparison.recommendedOptionId ? "option-card recommended" : "option-card"} key={option.id}>
              <div>
                <span className="status-pill">{translateTransportMode(option.mode)}</span>
                <h2>{translateRouteLabel(option.label, option.mode)}</h2>
                <p>{translateRouteExplanation(option.explanation)}</p>
              </div>
              <div className="option-metrics">
                <span>{Math.round(option.durationSeconds / 60)} min</span>
                <span>${(option.costCents / 100).toFixed(2)}</span>
                <span>{option.carbonGrams} g CO2</span>
                {option.mode === "cycling" && option.distanceMeters > 10_000 && (
                  <button className="secondary-button compact" onClick={onFindCarpool} type="button">
                    Buscar viaje compartido
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Carpools({ token, userLocation }: { token: string; userLocation: UserLocation | null }) {
  const [offers, setOffers] = useState<RideOffer[]>([]);
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [dailyRoutes, setDailyRoutes] = useState<DailyRoute[]>([]);
  const [subscriptions, setSubscriptions] = useState<DailyRouteSubscription[]>([]);
  const [matches, setMatches] = useState<CarpoolMatch[]>([]);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<CreateRideOfferRequest & CreateRideRequestRequest>({
    origin: "Centro",
    destination: "Campus Norte",
    departureTime: toInputDateTime(new Date(Date.now() + 60 * 60 * 1000)),
    arrivalTime: toInputDateTime(new Date(Date.now() + 100 * 60 * 1000)),
    seatsAvailable: 3,
    maxPassengers: 3,
    pricePerSeatCents: 0,
    seatsNeeded: 1,
    preference: "balanced",
    fuelEfficiencyKmPerLiter: 12,
    averageGasPriceCentsPerLiter: 2400,
  });
  const [dailyRouteForm, setDailyRouteForm] = useState<CreateDailyRouteRequest>({
    label: "Ruta al trabajo",
    origin: "Centro",
    destination: "Campus Norte",
    daysOfWeek: [1, 2, 3, 4, 5],
    departureTime: "08:00",
    arrivalTime: "09:00",
    maxPassengers: 3,
    fuelEfficiencyKmPerLiter: 12,
    averageGasPriceCentsPerLiter: 2400,
  });
  const [subscriptionForm, setSubscriptionForm] = useState<CreateDailyRouteSubscriptionRequest>({
    pickupAddress: "Centro",
    dropoffAddress: "Campus Norte",
  });

  const refresh = () => {
    void apiRequest<RideOffer[]>("/rides/offers", token).then(setOffers).catch(() => setOffers([]));
    void apiRequest<RideRequest[]>("/rides/requests", token).then(setRequests).catch(() => setRequests([]));
    void apiRequest<DailyRoute[]>("/daily-routes", token).then(setDailyRoutes).catch(() => setDailyRoutes([]));
  };

  useEffect(refresh, [token]);

  async function createOffer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      await apiRequest<RideOffer>("/rides/offers", token, {
        method: "POST",
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          departureTime: new Date(form.departureTime).toISOString(),
          arrivalTime: new Date(form.arrivalTime).toISOString(),
          seatsAvailable: Number(form.seatsAvailable),
          maxPassengers: Number(form.maxPassengers),
          pricePerSeatCents: Number(form.pricePerSeatCents),
          fuelEfficiencyKmPerLiter: Number(form.fuelEfficiencyKmPerLiter),
          averageGasPriceCentsPerLiter: Number(form.averageGasPriceCentsPerLiter),
        }),
      });
      setRoutePreview({ origin: form.origin, destination: form.destination, label: "Oferta publicada" });
      setMessage("Oferta publicada.");
      refresh();
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo publicar la oferta."));
    }
  }

  async function createRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const request = await apiRequest<RideRequest>("/rides/requests", token, {
        method: "POST",
        body: JSON.stringify({
          origin: form.origin,
          destination: form.destination,
          departureTime: new Date(form.departureTime).toISOString(),
          arrivalTime: form.arrivalTime ? new Date(form.arrivalTime).toISOString() : undefined,
          seatsNeeded: Number(form.seatsNeeded),
          preference: form.preference,
          bikeFallbackRequested: Boolean(form.bikeFallbackRequested),
        }),
      });
      setRequests((current) => [request, ...current]);
      setRoutePreview({ origin: form.origin, destination: form.destination, label: "Solicitud publicada" });
      setMessage("Solicitud publicada.");
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo solicitar el viaje compartido."));
    }
  }

  async function suggestMatches() {
    setMessage("");

    try {
      const nextMatches = await apiRequest<CarpoolMatch[]>("/carpools/match", token, {
        method: "POST",
        body: JSON.stringify({ requestId: requests[0]?.id }),
      });
      setMatches(nextMatches);
      if (nextMatches[0]) {
        await refreshMatchedRoute(nextMatches[0]);
      } else {
        setMessage("No hay coincidencias compatibles por ahora.");
      }
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudieron buscar coincidencias."));
    }
  }

  async function refreshMatchedRoute(match: CarpoolMatch) {
    const offer = offers.find((item) => item.id === match.offerId);
    const request = requests.find((item) => item.id === match.requestId);
    if (!offer || !request) {
      setRoutePreview({ origin: form.origin, destination: form.destination, label: "Ruta de viaje compartido" });
      return;
    }

    const fallbackPreview: RoutePreview = {
      origin: offer.origin,
      destination: offer.destination,
      waypoints: [request.origin, request.destination],
      label: "Ruta compartida con recogida",
    };

    try {
      const optimized = await apiRequest<OptimizedRoute>("/routes/optimize", token, {
        method: "POST",
        body: JSON.stringify({
          origin: { label: "Origen del conductor", address: offer.origin },
          destination: { label: "Destino del conductor", address: offer.destination },
          stops: [
            { label: "Recogida del pasajero", address: request.origin },
            { label: "Bajada del pasajero", address: request.destination },
          ],
          preference: request.preference,
        }),
      });

      setRoutePreview({
        ...fallbackPreview,
        waypoints: optimized.orderedStops.map((stop) => stop.address),
        distanceMeters: optimized.distanceMeters,
        durationSeconds: optimized.durationSeconds,
        provider: optimized.provider,
      });
      setMessage("Ruta actualizada con navegacion.");
    } catch (caught) {
      setRoutePreview(fallbackPreview);
      setMessage(getErrorMessage(caught, "Coincidencia encontrada. Abre navegacion para ajustar la ruta."));
    }
  }

  async function createDailyRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      const route = await apiRequest<DailyRoute>("/daily-routes", token, {
        method: "POST",
        body: JSON.stringify({
          ...dailyRouteForm,
          maxPassengers: Number(dailyRouteForm.maxPassengers),
          fuelEfficiencyKmPerLiter: Number(dailyRouteForm.fuelEfficiencyKmPerLiter),
          averageGasPriceCentsPerLiter: Number(dailyRouteForm.averageGasPriceCentsPerLiter),
        }),
      });
      setDailyRoutes((current) => [route, ...current]);
      setRoutePreview({ origin: route.origin, destination: route.destination, label: route.label });
      setMessage("Ruta diaria guardada.");
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo guardar la ruta diaria."));
    }
  }

  async function subscribeToRoute(routeId: string) {
    setMessage("");

    try {
      const subscription = await apiRequest<DailyRouteSubscription>(`/daily-routes/${routeId}/subscribe`, token, {
        method: "POST",
        body: JSON.stringify(subscriptionForm),
      });
      setSubscriptions((current) => [subscription, ...current]);
      setRoutePreview({
        origin: subscription.pickupAddress,
        destination: subscription.dropoffAddress,
        label: "Suscripcion a ruta",
      });
      setMessage("Solicitud enviada al conductor.");
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo suscribir a esta ruta."));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Tablero de viajes compartidos" text="Ofrece un viaje, solicita asiento y encuentra rutas compatibles." />

      <div className="two-column">
        <form className="route-form" onSubmit={createOffer}>
          <PanelTitle icon={<CarFront size={20} />} title="Ofrecer un viaje" />
          <SharedRideFields form={form} setForm={setForm} userLocation={userLocation} />
          <label>
            Asientos disponibles
            <input
              min={1}
              onChange={(event) =>
                setForm({
                  ...form,
                  seatsAvailable: Number(event.target.value),
                  maxPassengers: Number(event.target.value),
                })
              }
              type="number"
              value={form.seatsAvailable}
            />
          </label>
          <label>
            Rendimiento de combustible
            <input
              min={1}
              onChange={(event) => setForm({ ...form, fuelEfficiencyKmPerLiter: Number(event.target.value) })}
              type="number"
              value={form.fuelEfficiencyKmPerLiter}
            />
          </label>
          <label>
            Precio de gasolina en centavos/litro
            <input
              min={0}
              onChange={(event) => setForm({ ...form, averageGasPriceCentsPerLiter: Number(event.target.value) })}
              type="number"
              value={form.averageGasPriceCentsPerLiter}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            Publicar oferta
          </button>
        </form>

        <form className="route-form" onSubmit={createRequest}>
          <PanelTitle icon={<UsersRound size={20} />} title="Solicitar un viaje" />
          <SharedRideFields form={form} setForm={setForm} userLocation={userLocation} />
          <label className="checkbox-row">
            <input
              checked={Boolean(form.bikeFallbackRequested)}
              onChange={(event) => setForm({ ...form, bikeFallbackRequested: event.target.checked })}
              type="checkbox"
            />
            Buscar viaje compartido si la ruta en bici es demasiado larga
          </label>
          <label>
            Asientos necesarios
            <input
              min={1}
              onChange={(event) => setForm({ ...form, seatsNeeded: Number(event.target.value) })}
              type="number"
              value={form.seatsNeeded}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            Solicitar viaje compartido
          </button>
        </form>
      </div>

      <RouteMap
        route={routePreview ?? { origin: form.origin, destination: form.destination, label: "Ruta de viaje compartido" }}
        text="Al encontrar coincidencias, la ruta se refresca con recogida y bajada para abrirla en navegacion."
        title="Mapa de carpool"
      />

      {message && <p className="muted-text">{message}</p>}

      <section className="data-panel">
        <PanelTitle icon={<CalendarDays size={20} />} title="Rutas diarias" />
        <form className="route-form nested-form" onSubmit={createDailyRoute}>
          <label>
            Nombre de la ruta
            <input onChange={(event) => setDailyRouteForm({ ...dailyRouteForm, label: event.target.value })} value={dailyRouteForm.label} />
          </label>
          <div className="two-column dense">
            <PlaceInput
              label="Origen"
              onChange={(origin) => setDailyRouteForm({ ...dailyRouteForm, origin })}
              userLocation={userLocation}
              value={dailyRouteForm.origin}
            />
            <PlaceInput
              label="Destino"
              onChange={(destination) => setDailyRouteForm({ ...dailyRouteForm, destination })}
              userLocation={userLocation}
              value={dailyRouteForm.destination}
            />
          </div>
          <div className="day-picker" aria-label="Dias de la semana">
            {dayLabels.map((day) => (
              <label className={dailyRouteForm.daysOfWeek.includes(day.value) ? "day-chip active" : "day-chip"} key={day.value}>
                <input
                  checked={dailyRouteForm.daysOfWeek.includes(day.value)}
                  onChange={(event) => {
                    const days = event.target.checked
                      ? [...dailyRouteForm.daysOfWeek, day.value]
                      : dailyRouteForm.daysOfWeek.filter((value) => value !== day.value);
                    setDailyRouteForm({ ...dailyRouteForm, daysOfWeek: days.sort() });
                  }}
                  type="checkbox"
                />
                {day.label}
              </label>
            ))}
          </div>
          <div className="two-column dense">
            <label>
              Salida
              <input
                onChange={(event) => setDailyRouteForm({ ...dailyRouteForm, departureTime: event.target.value })}
                type="time"
                value={dailyRouteForm.departureTime}
              />
            </label>
            <label>
              Llegada
              <input
                onChange={(event) => setDailyRouteForm({ ...dailyRouteForm, arrivalTime: event.target.value })}
                type="time"
                value={dailyRouteForm.arrivalTime}
              />
            </label>
          </div>
          <label>
            Maximo de pasajeros
            <input
              min={1}
              onChange={(event) => setDailyRouteForm({ ...dailyRouteForm, maxPassengers: Number(event.target.value) })}
              type="number"
              value={dailyRouteForm.maxPassengers}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} />
            Guardar ruta diaria
          </button>
        </form>

        <div className="route-form nested-form">
          <PanelTitle icon={<UsersRound size={18} />} title="Suscribirse a una ruta cercana" />
          <div className="two-column dense">
            <label>
              Punto de recogida
              <input
                onChange={(event) => setSubscriptionForm({ ...subscriptionForm, pickupAddress: event.target.value })}
                value={subscriptionForm.pickupAddress}
              />
            </label>
            <label>
              Punto de destino
              <input
                onChange={(event) => setSubscriptionForm({ ...subscriptionForm, dropoffAddress: event.target.value })}
                value={subscriptionForm.dropoffAddress}
              />
            </label>
          </div>
        </div>

        <DailyRouteList routes={dailyRoutes} subscriptions={subscriptions} onSubscribe={subscribeToRoute} />
      </section>

      <section className="data-panel">
        <div className="panel-toolbar">
          <PanelTitle icon={<UsersRound size={20} />} title="Coincidencias sugeridas" />
          <button className="secondary-button" onClick={suggestMatches} type="button">
            Buscar coincidencias
          </button>
        </div>
        <div className="ride-list">
          {matches.map((match) => (
            <article className="ride-row" key={`${match.offerId}-${match.requestId}`}>
              <div>
                <h2>{match.score}% compatible</h2>
                <p>{translateMatchReason(match.reason)}</p>
              </div>
              <div className="ride-meta">
                <span>${(match.estimatedSavingsCents / 100).toFixed(2)} ahorrados</span>
                <span>{match.estimatedCo2SavingsGrams} g CO2</span>
                <span>{match.pickupOffsetMeters} m a la recogida</span>
                <button className="secondary-button compact" onClick={() => refreshMatchedRoute(match)} type="button">
                  <Navigation size={16} />
                  Actualizar ruta
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="two-column">
        <RideList title="Ofertas abiertas" rides={offers} />
        <RideRequestList title="Tus solicitudes" requests={requests} />
      </div>
    </div>
  );
}

function SharedRideFields({
  form,
  setForm,
  userLocation,
}: {
  form: CreateRideOfferRequest & CreateRideRequestRequest;
  setForm: (form: CreateRideOfferRequest & CreateRideRequestRequest) => void;
  userLocation: UserLocation | null;
}) {
  return (
    <>
      <PlaceInput label="Origen" onChange={(origin) => setForm({ ...form, origin })} userLocation={userLocation} value={form.origin} />
      <PlaceInput label="Destino" onChange={(destination) => setForm({ ...form, destination })} userLocation={userLocation} value={form.destination} />
      <label>
        Salida
        <input
          onChange={(event) => setForm({ ...form, departureTime: event.target.value })}
          type="datetime-local"
          value={form.departureTime}
        />
      </label>
      <label>
        Llegada
        <input
          onChange={(event) => setForm({ ...form, arrivalTime: event.target.value })}
          type="datetime-local"
          value={form.arrivalTime}
        />
      </label>
    </>
  );
}

function DailyRouteList({
  routes,
  subscriptions,
  onSubscribe,
}: {
  routes: DailyRoute[];
  subscriptions: DailyRouteSubscription[];
  onSubscribe: (routeId: string) => void;
}) {
  return (
    <div className="ride-list">
      {routes.map((route) => (
        <article className="ride-row" key={route.id}>
          <div>
            <h2>
              {route.label}: {route.origin} a {route.destination}
            </h2>
            <p>
              {formatDays(route.daysOfWeek)} · {route.departureTime.slice(0, 5)} a {route.arrivalTime.slice(0, 5)}
            </p>
          </div>
          <div className="ride-meta">
            <span>{route.maxPassengers} asientos</span>
            <span>${(route.costPerPersonCents / 100).toFixed(2)} c/u</span>
            <span>{Math.round(route.co2SavingsGrams / 1000)} kg CO2 ahorrados</span>
            <button className="secondary-button compact" onClick={() => onSubscribe(route.id)} type="button">
              Suscribirse
            </button>
          </div>
        </article>
      ))}
      {!routes.length && <p className="muted-text">Las rutas compartidas diarias apareceran cuando los conductores las publiquen.</p>}
      {subscriptions.map((subscription) => (
        <article className="ride-row pending-row" key={subscription.id}>
          <div>
            <h2>Suscripcion pendiente de confirmacion del conductor</h2>
            <p>
              {subscription.pickupAddress} a {subscription.dropoffAddress}
            </p>
          </div>
          <div className="ride-meta">
            <span>${(subscription.estimatedCostShareCents / 100).toFixed(2)}</span>
            <span>{subscription.estimatedCo2SavingsGrams} g CO2</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function HistoryPage({ token }: { token: string }) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [stats, setStats] = useState<SavingsStats | null>(null);

  useEffect(() => {
    void apiRequest<Trip[]>("/trips/history", token).then(setTrips).catch(() => setTrips([]));
    void apiRequest<SavingsStats>("/stats/savings", token).then(setStats).catch(() => setStats(emptyStats));
  }, [token]);

  return (
    <div className="page-stack">
      <PageHeader title="Historial de viajes" text="Revisa viajes completados y ahorros de sostenibilidad." />
      <div className="summary-grid">
        <MetricCard icon={<History />} label="Viajes" value={stats?.tripsCompleted ?? 0} />
        <MetricCard icon={<Leaf />} label="CO2 ahorrado" value={`${stats?.totalCo2SavingsGrams ?? 0} g`} />
        <MetricCard icon={<Medal />} label="Dinero ahorrado" value={`$${((stats?.totalMoneySavingsCents ?? 0) / 100).toFixed(2)}`} />
      </div>
      <section className="data-panel">
        <div className="ride-list">
          {trips.map((trip) => (
            <article className="ride-row" key={trip.id}>
              <div>
                <h2>
                  {trip.origin} a {trip.destination}
                </h2>
                <p>{translateTransportMode(trip.mode)} · {new Date(trip.completedAt).toLocaleString("es-MX")}</p>
              </div>
              <div className="ride-meta">
                <span>{Math.round(trip.distanceMeters / 1000)} km</span>
                <span>{trip.co2SavingsGrams} g CO2</span>
              </div>
            </article>
          ))}
          {!trips.length && <p className="muted-text">El historial aparecera despues de completar viajes.</p>}
        </div>
      </section>
    </div>
  );
}

function ProfilePage({ token, email }: { token: string; email: string }) {
  const [profile, setProfile] = useState<UpsertProfileRequest>({
    fullName: "",
    username: "",
    phone: "",
    hasVehicle: false,
    hasBike: false,
    defaultPreference: "balanced",
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleForm, setVehicleForm] = useState<UpsertVehicleRequest>({
    label: "Mi auto",
    seats: 4,
    fuelType: "gasoline",
    fuelEfficiencyKmPerLiter: 12,
    averageGasPriceCentsPerLiter: 2400,
  });
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  useEffect(() => {
    apiRequest<Profile>("/profile", token)
      .then((data) =>
        setProfile({
          fullName: data.fullName ?? "",
          username: data.username ?? "",
          phone: data.phone ?? "",
          hasVehicle: data.hasVehicle,
          hasBike: data.hasBike,
          defaultPreference: data.defaultPreference,
        }),
      )
      .catch(() => setMessage("Crea tu perfil para personalizar recomendaciones."));
    void apiRequest<Vehicle[]>("/vehicles", token).then(setVehicles).catch(() => setVehicles([]));
  }, [token]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiRequest<Profile>("/profile", token, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      setMessage("Perfil guardado.");
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo guardar el perfil."));
    }
  }

  async function createVehicle(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const vehicle = await apiRequest<Vehicle>("/vehicles", token, {
        method: "POST",
        body: JSON.stringify(vehicleForm),
      });
      setVehicles((current) => [vehicle, ...current]);
      setMessage("Vehiculo guardado.");
    } catch (caught) {
      setMessage(getErrorMessage(caught, "No se pudo guardar el vehiculo."));
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPasswordSubmitting(true);
    setPasswordMessage("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("Las contrasenas nuevas no coinciden.");
      setIsPasswordSubmitting(false);
      return;
    }

    const signInResult = await supabase.auth.signInWithPassword({
      email,
      password: passwordForm.currentPassword,
    });

    if (signInResult.error) {
      setPasswordMessage("La contrasena actual es incorrecta.");
      setIsPasswordSubmitting(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });

    if (error) {
      setPasswordMessage(error.message);
    } else {
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage("Contrasena actualizada.");
    }

    setIsPasswordSubmitting(false);
  }

  return (
    <div className="page-stack">
      <PageHeader title="Perfil" text={email} />
      <div className="two-column">
        <form className="route-form" onSubmit={submit}>
          <label>
            Nombre completo
            <input onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} value={profile.fullName} />
          </label>
          <label>
            Nombre de usuario
            <input onChange={(event) => setProfile({ ...profile, username: event.target.value })} value={profile.username} />
          </label>
          <label>
            Telefono
            <input onChange={(event) => setProfile({ ...profile, phone: event.target.value })} value={profile.phone} />
          </label>
          <label>
            Preferencia de ruta predeterminada
            <select
              onChange={(event) => setProfile({ ...profile, defaultPreference: event.target.value as RoutePreference })}
              value={profile.defaultPreference}
            >
              <option value="balanced">Equilibrada</option>
              <option value="fastest">Mas rapida</option>
              <option value="cheapest">Mas barata</option>
              <option value="greenest">Mas ecologica</option>
            </select>
          </label>
          <label className="checkbox-row">
            <input
              checked={Boolean(profile.hasVehicle)}
              onChange={(event) => setProfile({ ...profile, hasVehicle: event.target.checked })}
              type="checkbox"
            />
            Tengo vehiculo
          </label>
          <label className="checkbox-row">
            <input
              checked={Boolean(profile.hasBike)}
              onChange={(event) => setProfile({ ...profile, hasBike: event.target.checked })}
              type="checkbox"
            />
            Uso bicicleta
          </label>
          <button className="primary-button" type="submit">Guardar perfil</button>
        </form>

        <div className="page-stack compact-stack">
          <section className="data-panel">
            <PanelTitle icon={<LockKeyhole size={20} />} title="Cuenta" />
            <form className="route-form nested-form" onSubmit={changePassword}>
              <label>
                Contrasena actual
                <input
                  autoComplete="current-password"
                  onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
                  required
                  type="password"
                  value={passwordForm.currentPassword}
                />
              </label>
              <label>
                Nueva contrasena
                <input
                  autoComplete="new-password"
                  minLength={6}
                  onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
                  required
                  type="password"
                  value={passwordForm.newPassword}
                />
              </label>
              <label>
                Confirmar nueva contrasena
                <input
                  autoComplete="new-password"
                  minLength={6}
                  onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
                  required
                  type="password"
                  value={passwordForm.confirmPassword}
                />
              </label>
              <button className="primary-button" disabled={isPasswordSubmitting} type="submit">
                {isPasswordSubmitting ? "Actualizando..." : "Cambiar contrasena"}
              </button>
            </form>
            {passwordMessage && <p className="muted-text form-message">{passwordMessage}</p>}
          </section>

          <section className="data-panel">
            <PanelTitle icon={<ShieldCheck size={20} />} title="Verificacion" />
            <div className="notice-panel disabled">
              <strong>La verificacion por selfie aun no esta activa.</strong>
              <p>Las revisiones de conductor y pasajero verificados quedan para la siguiente etapa de requisitos.</p>
            </div>
            {profile.hasBike && (
              <div className="notice-panel">
                <PanelTitle icon={<Bike size={18} />} title="Modo bicicleta" />
                <p>La comparacion de rutas en bici sigue disponible. Las distancias largas ofreceran busqueda de viaje compartido.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {profile.hasVehicle && (
        <section className="data-panel">
          <PanelTitle icon={<CarFront size={20} />} title="Detalles del vehiculo" />
          <form className="route-form nested-form" onSubmit={createVehicle}>
            <div className="two-column dense">
              <label>
                Nombre del vehiculo
                <input onChange={(event) => setVehicleForm({ ...vehicleForm, label: event.target.value })} value={vehicleForm.label} />
              </label>
              <label>
                Asientos
                <input
                  min={1}
                  onChange={(event) => setVehicleForm({ ...vehicleForm, seats: Number(event.target.value) })}
                  type="number"
                  value={vehicleForm.seats}
                />
              </label>
            </div>
            <div className="two-column dense">
              <label>
                Tipo de combustible
                <select
                  onChange={(event) => setVehicleForm({ ...vehicleForm, fuelType: event.target.value as Vehicle["fuelType"] })}
                  value={vehicleForm.fuelType}
                >
                  <option value="gasoline">Gasolina</option>
                  <option value="hybrid">Hibrido</option>
                  <option value="electric">Electrico</option>
                </select>
              </label>
              <label>
                Km por litro
                <input
                  min={1}
                  onChange={(event) => setVehicleForm({ ...vehicleForm, fuelEfficiencyKmPerLiter: Number(event.target.value) })}
                  type="number"
                  value={vehicleForm.fuelEfficiencyKmPerLiter}
                />
              </label>
            </div>
            <label>
              Precio de gasolina en centavos/litro
              <input
                min={0}
                onChange={(event) => setVehicleForm({ ...vehicleForm, averageGasPriceCentsPerLiter: Number(event.target.value) })}
                type="number"
                value={vehicleForm.averageGasPriceCentsPerLiter}
              />
            </label>
            <button className="primary-button" type="submit">Guardar vehiculo</button>
          </form>
          <div className="ride-list">
            {vehicles.map((vehicle) => (
              <article className="ride-row" key={vehicle.id}>
                <div>
                  <h2>{vehicle.label}</h2>
                  <p>
                    {translateFuelType(vehicle.fuelType)} · {vehicle.seats} asientos
                  </p>
                </div>
                <div className="ride-meta">
                  <span>{vehicle.fuelEfficiencyKmPerLiter} km/L</span>
                  <span>${(vehicle.averageGasPriceCentsPerLiter / 100).toFixed(2)}/L</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      {message && <p className="muted-text">{message}</p>}
    </div>
  );
}

function RideList({ title, rides }: { title: string; rides: RideOffer[] }) {
  return (
    <section className="data-panel">
      <PanelTitle icon={<CarFront size={20} />} title={title} />
      <div className="ride-list">
        {rides.map((ride) => (
          <article className="ride-row" key={ride.id}>
            <div>
              <h2>
                {ride.origin} a {ride.destination}
              </h2>
              <p>{new Date(ride.departureTime).toLocaleString("es-MX")}</p>
            </div>
            <div className="ride-meta">
              <span>{ride.seatsAvailable} asientos</span>
              <span>${(ride.costPerPersonCents / 100).toFixed(2)} dividido</span>
              <span>{Math.round(ride.co2SavingsGrams / 1000)} kg CO2</span>
            </div>
          </article>
        ))}
        {!rides.length && <p className="muted-text">Aun no hay ofertas.</p>}
      </div>
    </section>
  );
}

function RideRequestList({ title, requests }: { title: string; requests: RideRequest[] }) {
  return (
    <section className="data-panel">
      <PanelTitle icon={<UsersRound size={20} />} title={title} />
      <div className="ride-list">
        {requests.map((request) => (
          <article className="ride-row" key={request.id}>
            <div>
              <h2>
                {request.origin} a {request.destination}
              </h2>
              <p>{new Date(request.departureTime).toLocaleString("es-MX")}</p>
            </div>
            <div className="ride-meta">
              <span>{request.seatsNeeded} asientos</span>
              <span>{translatePreference(request.preference)}</span>
            </div>
          </article>
        ))}
        {!requests.length && <p className="muted-text">Aun no hay solicitudes.</p>}
      </div>
    </section>
  );
}

function PageHeader({ title, text }: { title: string; text: string }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
    </header>
  );
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <article className="summary-card">
      <span className="summary-icon">{icon}</span>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function RouteMap({ route, text, title }: { route: RoutePreview; text: string; title: string }) {
  const destination = route.destination.trim();
  if (!destination) {
    return null;
  }

  return (
    <section className="map-panel">
      <div className="map-header">
        <PanelTitle icon={<MapPinned size={20} />} title={title} />
        <a className="secondary-button compact" href={buildNavigationUrl(route)} rel="noreferrer" target="_blank">
          <Navigation size={16} />
          Abrir navegacion
        </a>
      </div>
      <p className="muted-text">{route.label ? `${route.label}: ${formatRouteSummary(route)}` : formatRouteSummary(route)}</p>
      <iframe
        allow="fullscreen"
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={buildMapEmbedUrl(route)}
        title={title}
      />
      <div className="map-footer">
        <span>{text}</span>
        {(route.distanceMeters || route.durationSeconds) && (
          <strong>
            {route.distanceMeters ? `${Math.round(route.distanceMeters / 1000)} km` : ""}
            {route.distanceMeters && route.durationSeconds ? " · " : ""}
            {route.durationSeconds ? `${Math.round(route.durationSeconds / 60)} min` : ""}
          </strong>
        )}
      </div>
    </section>
  );
}

function PlaceInput({
  label,
  value,
  userLocation,
  onChange,
}: {
  label: string;
  value: string;
  userLocation: UserLocation | null;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      fetch(buildPlaceSearchUrl(query, userLocation), { signal: controller.signal })
        .then((response) => (response.ok ? response.json() : []))
        .then((places: PlaceSuggestion[]) => {
          setSuggestions(places.filter((place) => place.display_name).slice(0, 5));
          setIsOpen(true);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearching(false);
          }
        });
    }, 350);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [value, userLocation]);

  function selectPlace(place: PlaceSuggestion) {
    onChange(place.display_name);
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <label className="place-field">
      {label}
      <span className="place-input-wrap">
        <input
          aria-autocomplete="list"
          aria-controls={`${inputId}-suggestions`}
          aria-expanded={isOpen && suggestions.length > 0}
          autoComplete="off"
          onBlur={() => window.setTimeout(() => setIsOpen(false), 120)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={() => setIsOpen(suggestions.length > 0)}
          placeholder="Escribe una direccion o lugar real"
          value={value}
        />
        <span className="place-status">{isSearching ? "Buscando..." : userLocation ? "Cerca de ti" : "Ubicacion manual"}</span>
      </span>
      {isOpen && suggestions.length > 0 && (
        <span className="place-suggestions" id={`${inputId}-suggestions`} role="listbox">
          {suggestions.map((place) => (
            <button
              key={`${place.lat}-${place.lon}-${place.display_name}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => selectPlace(place)}
              role="option"
              type="button"
            >
              <MapPinned size={16} />
              <span>{place.display_name}</span>
            </button>
          ))}
        </span>
      )}
    </label>
  );
}

function toInputDateTime(date: Date): string {
  return date.toISOString().slice(0, 16);
}

function buildPlaceSearchUrl(query: string, userLocation: UserLocation | null): string {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    "accept-language": "es",
  });

  if (userLocation) {
    const latitudeDelta = 0.75;
    const longitudeDelta = 0.75;
    params.set(
      "viewbox",
      [
        userLocation.longitude - longitudeDelta,
        userLocation.latitude + latitudeDelta,
        userLocation.longitude + longitudeDelta,
        userLocation.latitude - latitudeDelta,
      ].join(","),
    );
    params.set("bounded", "0");
  }

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

function buildMapEmbedUrl(route: RoutePreview): string {
  const destination = route.destination.trim();
  const origin = route.origin?.trim();
  const waypoints = (route.waypoints ?? []).map((waypoint) => waypoint.trim()).filter(Boolean);
  const params = new URLSearchParams({ output: "embed" });

  if (origin) {
    params.set("saddr", origin);
    params.set("daddr", [...waypoints, destination].join(" to "));
  } else {
    params.set("q", destination);
  }

  return `https://maps.google.com/maps?${params.toString()}`;
}

function buildNavigationUrl(route: RoutePreview): string {
  const destination = route.destination.trim();
  const origin = route.origin?.trim();
  const waypoints = (route.waypoints ?? []).map((waypoint) => waypoint.trim()).filter(Boolean);
  const params = new URLSearchParams({ api: "1", destination, travelmode: "driving" });

  if (origin) {
    params.set("origin", origin);
  }

  if (waypoints.length) {
    params.set("waypoints", waypoints.join("|"));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function formatRouteSummary(route: RoutePreview): string {
  const origin = route.origin?.trim();
  const waypoints = (route.waypoints ?? []).map((waypoint) => waypoint.trim()).filter(Boolean);
  const stops = [origin, ...waypoints, route.destination.trim()].filter(Boolean);
  return stops.join(" -> ");
}

function getErrorMessage(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function formatDays(days: number[]): string {
  return days
    .map((value) => dayLabels.find((day) => day.value === value)?.label ?? "")
    .filter(Boolean)
    .join(", ");
}

function translateStatus(status: string): string {
  return status === "ok" ? "activo" : "degradado";
}

function translatePreference(preference: RoutePreference): string {
  const labels: Record<RoutePreference, string> = {
    balanced: "Equilibrada",
    fastest: "Mas rapida",
    cheapest: "Mas barata",
    greenest: "Mas ecologica",
  };
  return labels[preference];
}

function translateTransportMode(mode: TransportMode): string {
  const labels: Record<TransportMode, string> = {
    driving: "Auto",
    transit: "Transporte publico",
    walking: "Caminata",
    cycling: "Bicicleta",
    carpool: "Viaje compartido",
  };
  return labels[mode];
}

function translateFuelType(fuelType: Vehicle["fuelType"]): string {
  const labels: Record<Vehicle["fuelType"], string> = {
    gasoline: "Gasolina",
    hybrid: "Hibrido",
    electric: "Electrico",
  };
  return labels[fuelType];
}

function translateRouteLabel(label: string, mode: TransportMode): string {
  const translated = translateTransportMode(mode);
  return label === mode.replace("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ? translated : label;
}

function translateRouteExplanation(explanation: string): string {
  const labels: Record<string, string> = {
    "Bike route is long for this trip; compare it with carpool options before committing.":
      "La ruta en bici es larga para este viaje; comparala con opciones compartidas antes de decidir.",
    "Carpool reduces gas cost per person and CO2 when compatible riders join.":
      "El viaje compartido reduce el costo de gasolina por persona y el CO2 cuando se suman pasajeros compatibles.",
  };
  if (labels[explanation]) {
    return labels[explanation];
  }

  const mode = explanation.split(" ")[0]?.toLowerCase();
  if (mode && ["driving", "transit", "walking", "cycling", "carpool"].includes(mode)) {
    return `${translateTransportMode(mode as TransportMode)} equilibra tiempo, costo y emisiones para esta ruta.`;
  }

  return explanation;
}

function translateMatchReason(reason: string): string {
  const labels: Record<string, string> = {
    "Close pickup and destination; reroute after driver confirmation.":
      "Recogida y destino cercanos; la ruta se ajustara despues de que confirme el conductor.",
    "Close pickup and destination; driver confirmation is required before rerouting.":
      "Recogida y destino cercanos; se requiere confirmacion del conductor antes de ajustar la ruta.",
  };
  return labels[reason] ?? reason;
}

const dayLabels = [
  { label: "Dom", value: 0 },
  { label: "Lun", value: 1 },
  { label: "Mar", value: 2 },
  { label: "Mie", value: 3 },
  { label: "Jue", value: 4 },
  { label: "Vie", value: 5 },
  { label: "Sab", value: 6 },
];

const emptyStats: SavingsStats = {
  tripsCompleted: 0,
  totalDistanceMeters: 0,
  totalCo2SavingsGrams: 0,
  totalMoneySavingsCents: 0,
  carpoolTrips: 0,
};

const seedRewards: Reward[] = [
  {
    id: "seed-reward-1",
    userId: "seed",
    label: "Primera ruta limpia",
    points: 50,
    reason: "Compara tu primera ruta sostenible.",
    earnedAt: new Date().toISOString(),
  },
];

export default App;
