/* src/pages/Dashboard.js */
import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext';
import { Link } from 'react-router-dom';
import './Dashboard.css';
//import BackupManager from '../components/BackupManager';

// --- Helper Functions to Calculate Metrics ---

const getActiveUsers = (users) => {
  const today = new Date();
  return users.filter(user => {
    if (user.debe > 0) return false;
    if (user.plan === 'Tiquetera') {
      return (user.diasHabiles || 0) < 15;
    }
    const expirationDate = new Date(user.fechaVencimiento);
    return expirationDate >= today;
  });
};

const getTotalRevenue = (users, startDate, endDate) => {
  let totalRevenue = 0;
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  users.forEach(user => {
    if (user.historialPagos) {
      user.historialPagos.forEach(payment => {
        const paymentDate = new Date(payment.fecha); // Asumiendo que 'fecha' es la propiedad de la fecha del pago
        if (
          (!start || paymentDate >= start) &&
          (!end || paymentDate <= end)
        ) {
          totalRevenue += (payment.monto || 0); // Asumiendo que 'monto' es la propiedad del monto del pago
        }
      });
    }
  });
  return totalRevenue;
};

// ... (tus funciones helper existentes, como getTotalRevenue, getActiveUsers, etc.) ...

const getMonthlyRevenueHistory = (users) => {
  const monthlyRevenue = {}; // Usaremos un objeto para agrupar por 'YYYY-MM'

  users.forEach(user => {
    if (user.historialPagos) {
      user.historialPagos.forEach(payment => {
        const paymentDate = new Date(payment.fecha);
        const year = paymentDate.getFullYear();
        const month = paymentDate.getMonth() + 1; // getMonth() es 0-indexado
        const monthKey = `${year}-${month < 10 ? '0' : ''}${month}`; // Formato YYYY-MM

        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = 0;
        }
        monthlyRevenue[monthKey] += (payment.monto || 0);
      });
    }
  });

  // Convertir el objeto a un array de objetos para facilitar el renderizado
  const sortedMonthlyRevenue = Object.keys(monthlyRevenue)
    .map(key => ({
      month: key,
      revenue: monthlyRevenue[key]
    }))
    .sort((a, b) => new Date(b.month) - new Date(a.month)); // Ordenar del más reciente al más antiguo

  return sortedMonthlyRevenue;
};


const getTotalDebt = (users) => {
  return users.reduce((total, user) => total + (user.debe || 0), 0);
};

const getUpcomingExpirations = (users) => {
  const today = new Date();
  const fiveDaysFromNow = new Date();
  fiveDaysFromNow.setDate(today.getDate() + 5);
  return users.filter(user => {
    if (user.plan === 'Tiquetera') return false;
    const expirationDate = new Date(user.fechaVencimiento);
    return expirationDate > today && expirationDate <= fiveDaysFromNow;
  });
};

const getExpiredUsers = (users) => {
    const today = new Date();
    return users.filter(user => {
        if (user.plan === 'Tiquetera') return false;
        const expirationDate = new Date(user.fechaVencimiento);
        return expirationDate < today;
    });
};

const getUsersWithDebt = (users) => {
  return users.filter(user => user.debe > 0);
};

const getUpcomingBirthdays = (users) => {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    return users.filter(user => {
        if (!user.cumpleanos) return false;
        const birthday = new Date(user.cumpleanos);
        birthday.setFullYear(today.getFullYear());
        // If birthday already passed this year, check for next year
        if (birthday < today) {
            birthday.setFullYear(today.getFullYear() + 1);
        }
        return birthday <= thirtyDaysFromNow;
    }).sort((a,b) => new Date(a.cumpleanos) - new Date(b.cumpleanos));
};

const getPlanDistribution = (users) => {
    return users.reduce((acc, user) => {
        acc[user.plan] = (acc[user.plan] || 0) + 1;
        return acc;
    }, { Quincena: 0, Mensualidad: 0, Tiquetera: 0 });
};


// --- The Main Dashboard Component ---

const Dashboard = () => {
  const { users } = useContext(DataContext);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substr(0, 7) // Formato YYYY-MM
  );

  // Función para obtener ingresos de un mes específico
  const getMonthlyRevenue = (users, yearMonth) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    
    return getTotalRevenue(
      users, 
      firstDay.toISOString().split('T')[0], 
      lastDay.toISOString().split('T')[0]
    );
  };

  // Calculate all metrics
  const totalUsers = users.length;
  const activeUsers = getActiveUsers(users).length;
  const totalRevenue = getTotalRevenue(users);
  const monthlyRevenue = getMonthlyRevenue(users, selectedMonth);
  const totalDebt = getTotalDebt(users);
  const monthlyRevenueHistory = getMonthlyRevenueHistory(users);
  const upcomingExpirations = getUpcomingExpirations(users);
  const expiredUsers = getExpiredUsers(users);
  const usersWithDebt = getUsersWithDebt(users);
  const upcomingBirthdays = getUpcomingBirthdays(users);
  const planDistribution = getPlanDistribution(users);

  return (
    <div className="dashboard-page">
      <h1>Dashboard ZEUS GYM</h1>
      
      {/* Selector de mes */}
      <div className="month-selector card">
        <h3>Seleccionar Mes para Ingresos</h3>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="form-control"
          style={{ maxWidth: '200px' }}
        />
      </div>
      
      {/* Metrics Grid */}
      <div className="dashboard-grid">
        <div className="metric-card">
          <h3>Total Usuarios</h3>
          <span className="metric-value">{totalUsers}</span>
        </div>
        <div className="metric-card">
          <h3>Usuarios Activos</h3>
          <span className="metric-value">{activeUsers}</span>
        </div>
        <div className="metric-card">
          <h3>Ingresos Totales</h3>
          <span className="metric-value">${totalRevenue.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <h3>Ingresos del Mes</h3>
          <span className="metric-value">${monthlyRevenue.toLocaleString()}</span>
        </div>
        <div className="metric-card">
          <h3>Deudas Pendientes</h3>
          <span className="metric-value">${totalDebt.toLocaleString()}</span>
        </div>
      </div>

      {/* Alerts Panel */}
      <div className="alerts-panel">
        <h3>Sistema de Alertas</h3>
        <div className="alert-category">
          <h4>Próximos a Vencer (5 días)</h4>
          {upcomingExpirations.length > 0 ? upcomingExpirations.map(u => (
            <div key={u.id} className="alert-item">
              <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
              <span className="alert-detail">Vence: {u.fechaVencimiento}</span>
            </div>
          )) : <p className="no-alerts">Ningún usuario próximo a vencer.</p>}
        </div>
        <div className="alert-category">
          <h4>Usuarios Vencidos</h4>
          {expiredUsers.length > 0 ? expiredUsers.map(u => (
            <div key={u.id} className="alert-item">
              <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
              <span className="alert-detail">Venció: {u.fechaVencimiento}</span>
            </div>
          )) : <p className="no-alerts">Ningún usuario vencido.</p>}
        </div>
        <div className="alert-category">
          <h4>Usuarios con Deuda</h4>
          {usersWithDebt.length > 0 ? usersWithDebt.map(u => (
            <div key={u.id} className="alert-item">
              <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
              <span className="alert-detail">Debe: ${u.debe.toLocaleString()}</span>
            </div>
          )) : <p className="no-alerts">Ningún usuario con deudas.</p>}
        </div>
      </div>

      {/* Upcoming Birthdays */}
      <div className="birthdays-panel">
          <h3>Próximos Cumpleaños (30 días)</h3>
          {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(u => (
              <div key={u.id} className="birthday-item">
                  <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
                  <span className="birthday-detail">Cumple: {u.cumpleanos}</span>
              </div>
          )) : <p className="no-birthdays">No hay cumpleaños próximos.</p>}
      </div>

      {/* Plan Distribution */}
      <div className="plans-panel">
          <h3>Distribución por Planes</h3>
          <div className="plan-distribution">
              <div className="plan-item">
                  <span>{planDistribution.Quincena}</span>
                  <p>Quincena</p>
              </div>
              <div className="plan-item">
                  <span>{planDistribution.Mensualidad}</span>
                  <p>Mensualidad</p>
              </div>
              <div className="plan-item">
                  <span>{planDistribution.Tiquetera}</span>
                  <p>Tiquetera</p>
              </div>
          </div>

          {/* --- NUEVO: Historial Mensual de Ingresos --- */}
      <div className="monthly-revenue-panel alerts-panel"> {/* Reutilizamos la clase alerts-panel para estilos básicos */}
        <h3>Historial Mensual de Ingresos</h3>
        {monthlyRevenueHistory.length > 0 ? (
          <table className="monthly-revenue-table table"> {/* Reutilizamos la clase table para estilos básicos */}
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {monthlyRevenueHistory.map(data => (
                <tr key={data.month}>
                  <td>{data.month}</td>
                  <td>${data.revenue.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-records">No hay registros de ingresos mensuales.</p>
        )}
      </div>
      {/* --- FIN NUEVO --- */}
      </div>

      {/* Backup Manager 
      <BackupManager />
      */}
    </div>
  );
};

export default Dashboard;
