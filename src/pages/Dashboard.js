import React, { useContext, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { auth } from "../firebaseConfig";
import { DataContext } from "../contexts/DataContext";
import "./Dashboard.css";

const toAmount = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const num = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? num : 0;
};

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const daysBetween = (from, to) => {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
};

const getTotalRevenue = (users, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  let total = 0;

  users.forEach((user) => {
    (user.historialPagos || []).forEach((payment) => {
      const paymentDate = new Date(payment.fecha);
      if ((!start || paymentDate >= start) && (!end || paymentDate <= end)) {
        total += toAmount(payment.monto);
      }
    });
  });

  return total;
};

const getMonthlyRevenueHistory = (users) => {
  const monthlyRevenue = {};

  users.forEach((user) => {
    (user.historialPagos || []).forEach((payment) => {
      const paymentDate = new Date(payment.fecha);
      if (Number.isNaN(paymentDate.getTime())) return;
      const year = paymentDate.getFullYear();
      const month = paymentDate.getMonth() + 1;
      const monthKey = `${year}-${month < 10 ? "0" : ""}${month}`;
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] || 0) + toAmount(payment.monto);
    });
  });

  return Object.keys(monthlyRevenue)
    .map((key) => ({ month: key, revenue: monthlyRevenue[key] }))
    .sort((a, b) => new Date(a.month) - new Date(b.month));
};

const getPlanDistribution = (users) =>
  users.reduce(
    (acc, u) => {
      const plan = u.plan || "Sin plan";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    },
    { Quincena: 0, Mensualidad: 0, Tiquetera: 0 },
  );

const getUpcomingBirthdays = (users) => {
  const today = startOfDay(new Date());
  const in30 = startOfDay(new Date());
  in30.setDate(in30.getDate() + 30);

  return users
    .filter((u) => !!u.cumpleanos)
    .map((u) => {
      const raw = new Date(u.cumpleanos);
      if (Number.isNaN(raw.getTime())) return null;
      const b = new Date(raw);
      b.setFullYear(today.getFullYear());
      if (b < today) b.setFullYear(today.getFullYear() + 1);
      return { user: u, nextBirthday: b };
    })
    .filter(Boolean)
    .filter((x) => x.nextBirthday <= in30)
    .sort((a, b) => a.nextBirthday - b.nextBirthday);
};

const Dashboard = () => {
  const { users } = useContext(DataContext);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [sending, setSending] = useState({});
  const [healthCheck, setHealthCheck] = useState({
    loading: false,
    tone: "",
    message: "",
  });

  const today = startOfDay(new Date());

  const monthRevenue = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    return getTotalRevenue(
      users,
      firstDay.toISOString().split("T")[0],
      lastDay.toISOString().split("T")[0],
    );
  }, [users, selectedMonth]);

  const currentYearRevenue = useMemo(() => {
    const year = new Date().getFullYear();
    return getTotalRevenue(users, `${year}-01-01`, `${year}-12-31`);
  }, [users]);

  const currentMonthRevenue = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return getTotalRevenue(
      users,
      start.toISOString().split("T")[0],
      end.toISOString().split("T")[0],
    );
  }, [users]);

  const totalDebt = useMemo(
    () => users.reduce((t, u) => t + toAmount(u.debe), 0),
    [users],
  );

  const activeUsers = useMemo(() => {
    return users.filter((u) => {
      if (toAmount(u.debe) > 0) return false;
      if (u.plan === "Tiquetera") return (u.diasHabiles || 0) < 15;
      const exp = new Date(u.fechaVencimiento);
      if (Number.isNaN(exp.getTime())) return false;
      return startOfDay(exp) >= today;
    }).length;
  }, [users, today]);

  const monthlyRevenueHistory = useMemo(
    () => getMonthlyRevenueHistory(users),
    [users],
  );

  const last12Revenue = useMemo(() => {
    if (!monthlyRevenueHistory.length) return [];
    return monthlyRevenueHistory.slice(-12);
  }, [monthlyRevenueHistory]);

  const planDistribution = useMemo(() => getPlanDistribution(users), [users]);

  const planData = useMemo(() => {
    const colors = {
      Quincena: "#60a5fa",
      Mensualidad: "#34d399",
      Tiquetera: "#fbbf24",
      "Sin plan": "#9ca3af",
    };
    return Object.entries(planDistribution).map(([name, value]) => ({
      name,
      value,
      color: colors[name] || "#9ca3af",
    }));
  }, [planDistribution]);

  const whatsappBuckets = useMemo(() => {
    const expiringIn3 = [];
    const expiringToday = [];
    const expiredDay1to5 = [];
    const expiredDay6to15 = [];

    users.forEach((u) => {
      if (u.plan === "Tiquetera") return;
      if (!u.fechaVencimiento) return;
      const exp = new Date(u.fechaVencimiento);
      if (Number.isNaN(exp.getTime())) return;
      const daysToExpiry = daysBetween(today, exp);
      const daysSinceExpired = -daysToExpiry;
      const row = { ...u, daysToExpiry, daysSinceExpired };

      if (daysToExpiry === 3) expiringIn3.push(row);
      if (daysToExpiry === 0) expiringToday.push(row);
      if (daysSinceExpired >= 1 && daysSinceExpired <= 5)
        expiredDay1to5.push(row);
      if (daysSinceExpired >= 6 && daysSinceExpired <= 15)
        expiredDay6to15.push(row);
    });

    const sortByExpiry = (a, b) =>
      (a.daysToExpiry ?? 0) - (b.daysToExpiry ?? 0);
    const sortByOverdue = (a, b) =>
      (b.daysSinceExpired ?? 0) - (a.daysSinceExpired ?? 0);

    return {
      expiringIn3: expiringIn3.sort(sortByExpiry),
      expiringToday: expiringToday.sort(sortByExpiry),
      expiredDay1to5: expiredDay1to5.sort(sortByOverdue),
      expiredDay6to15: expiredDay6to15.sort(sortByOverdue),
    };
  }, [users, today]);

  const upcomingBirthdays = useMemo(() => getUpcomingBirthdays(users), [users]);

  const sendManualWhatsapp = async ({ userId, type }) => {
    setSending((s) => ({ ...s, [`${userId}_${type}`]: true }));
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        alert("Debes iniciar sesión para enviar WhatsApp.");
        return;
      }
      const res = await fetch("/api/notifications/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, type }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        alert(`No se pudo enviar: ${data.error || "Error"}`);
        return;
      }
      alert("WhatsApp enviado.");
    } catch (e) {
      alert("No se pudo enviar WhatsApp.");
    } finally {
      setSending((s) => ({ ...s, [`${userId}_${type}`]: false }));
    }
  };

  const verifyWhatsAppHealth = async () => {
    setHealthCheck({
      loading: true,
      tone: "",
      message: "Verificando conexión y enviando mensaje de prueba...",
    });
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setHealthCheck({
          loading: false,
          tone: "error",
          message: "Debes iniciar sesión para verificar WhatsApp.",
        });
        return;
      }

      const res = await fetch("/api/notifications/health-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setHealthCheck({
          loading: false,
          tone: "error",
          message: data.error || "No se pudo validar la conexión de WhatsApp.",
        });
        return;
      }

      setHealthCheck({
        loading: false,
        tone: "success",
        message: `WhatsApp OK. Mensaje de prueba enviado a ${data.result?.to || "3105302619"}. Estado: ${data.result?.connectionState || "open"}.`,
      });
    } catch (error) {
      setHealthCheck({
        loading: false,
        tone: "error",
        message: "No se pudo completar la verificación de WhatsApp.",
      });
    }
  };

  const StatCard = ({ title, value, sub }) => (
    <div className="zg-card zg-stat">
      <div className="zg-stat-title">{title}</div>
      <div className="zg-stat-value">{value}</div>
      {sub ? <div className="zg-stat-sub">{sub}</div> : null}
    </div>
  );

  const UsersTable = ({ rows, getActionType, actionLabel, emptyLabel }) => (
    <div className="zg-card">
      <div className="zg-table">
        <div className="zg-table-head">
          <div>Usuario</div>
          <div>Teléfono</div>
          <div>Vencimiento</div>
          <div></div>
        </div>
        {rows.length ? (
          rows.map((u) => {
            const type = getActionType(u);
            const key = `${u.id}_${type}`;
            return (
              <div className="zg-table-row" key={u.id}>
                <div className="zg-user">
                  <Link to={`/users/${u.id}`} className="zg-user-name">
                    {u.nombre}
                  </Link>
                  <div className="zg-user-sub">{u.plan}</div>
                </div>
                <div className="zg-mono">{u.telefono || "-"}</div>
                <div className="zg-mono">{u.fechaVencimiento || "-"}</div>
                <div className="zg-actions">
                  <button
                    className="zg-btn zg-btn-primary"
                    onClick={() => sendManualWhatsapp({ userId: u.id, type })}
                    disabled={!!sending[key]}
                  >
                    {sending[key] ? "Enviando..." : actionLabel}
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="zg-empty">{emptyLabel}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="zg-page">
      <div className="zg-header">
        <div>
          <div className="zg-title">ZEUS GYM</div>
          <div className="zg-subtitle">Control, ingresos y notificaciones</div>
        </div>
        <div className="zg-month">
          <div className="zg-month-label">Mes</div>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
      </div>

      <div className="zg-grid zg-grid-5">
        <StatCard title="Usuarios" value={users.length} />
        <StatCard title="Activos" value={activeUsers} />
        <StatCard
          title={`Ingresos ${new Date().getFullYear()}`}
          value={`$${currentYearRevenue.toLocaleString()}`}
        />
        <StatCard
          title="Ingresos mes actual"
          value={`$${currentMonthRevenue.toLocaleString()}`}
        />
        <StatCard
          title="Deuda pendiente"
          value={`$${totalDebt.toLocaleString()}`}
          sub={`Mes seleccionado: $${monthRevenue.toLocaleString()}`}
        />
      </div>

      <div className="zg-grid zg-grid-2">
        <div className="zg-card">
          <div className="zg-card-title">Ingresos (últimos 12 meses)</div>
          <div className="zg-chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={last12Revenue}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.08)"
                />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.7)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="rgba(255,255,255,0.7)" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "rgba(17,24,39,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="zg-card">
          <div className="zg-card-title">Distribución por plan</div>
          <div className="zg-chart">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={planData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={58}
                  outerRadius={92}
                  paddingAngle={3}
                >
                  {planData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "rgba(17,24,39,0.95)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.9)" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="zg-section-header">
        <div className="zg-section-title">Notificaciones WhatsApp (hoy)</div>
        <button
          className="zg-btn zg-btn-primary"
          onClick={verifyWhatsAppHealth}
          disabled={healthCheck.loading}
        >
          {healthCheck.loading ? "Verificando WhatsApp..." : "Probar WhatsApp"}
        </button>
      </div>
      {healthCheck.message ? (
        <div
          className={`zg-inline-status ${
            healthCheck.tone === "error"
              ? "zg-inline-status-error"
              : "zg-inline-status-success"
          }`}
        >
          {healthCheck.message}
        </div>
      ) : null}
      <div className="zg-grid zg-grid-2">
        <div>
          <div className="zg-mini-title">Vencen en 3 días</div>
          <UsersTable
            rows={whatsappBuckets.expiringIn3}
            getActionType={() => "pre_expiry_3"}
            actionLabel="Enviar aviso"
            emptyLabel="No hay usuarios en esta categoría."
          />
        </div>
        <div>
          <div className="zg-mini-title">Vencen hoy</div>
          <UsersTable
            rows={whatsappBuckets.expiringToday}
            getActionType={() => "expiry"}
            actionLabel="Enviar aviso"
            emptyLabel="No hay usuarios en esta categoría."
          />
        </div>
        <div>
          <div className="zg-mini-title">Vencidos (día 1 a 5)</div>
          <UsersTable
            rows={whatsappBuckets.expiredDay1to5}
            getActionType={(u) => `post_expiry_day_${u.daysSinceExpired}`}
            actionLabel="Enviar recordatorio"
            emptyLabel="No hay usuarios en esta categoría."
          />
        </div>
        <div>
          <div className="zg-mini-title">Vencidos (día 6 a 15)</div>
          <UsersTable
            rows={whatsappBuckets.expiredDay6to15}
            getActionType={(u) => `post_expiry_day_${u.daysSinceExpired}`}
            actionLabel="Enviar mensaje"
            emptyLabel="No hay usuarios en esta categoría."
          />
        </div>
      </div>

      <div className="zg-section-title">Cumpleaños próximos (30 días)</div>
      <div className="zg-card">
        <div className="zg-table">
          <div className="zg-table-head">
            <div>Usuario</div>
            <div>Teléfono</div>
            <div>Fecha</div>
            <div></div>
          </div>
          {upcomingBirthdays.length ? (
            upcomingBirthdays.map((x) => (
              <div className="zg-table-row" key={x.user.id}>
                <div className="zg-user">
                  <Link to={`/users/${x.user.id}`} className="zg-user-name">
                    {x.user.nombre}
                  </Link>
                  <div className="zg-user-sub">Cumpleaños</div>
                </div>
                <div className="zg-mono">{x.user.telefono || "-"}</div>
                <div className="zg-mono">
                  {x.nextBirthday.toISOString().split("T")[0]}
                </div>
                <div></div>
              </div>
            ))
          ) : (
            <div className="zg-empty">No hay cumpleaños próximos.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
