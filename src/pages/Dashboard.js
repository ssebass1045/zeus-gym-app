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

// Función para obtener color según el plan
const getPlanColor = (plan) => {
  switch(plan) {
    case 'Quincena': return '#00aaff';
    case 'Mensualidad': return '#28a745';
    case 'Tiquetera': return '#ffc107';
    default: return '#6c757d';
  }
};


// --- The Main Dashboard Component ---

const Dashboard = () => {
  const { users } = useContext(DataContext);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().substr(0, 7) // Formato YYYY-MM
  );
  // Estados para controlar acordeones
  const [expandedSections, setExpandedSections] = useState({
    upcomingExpirations: true,
    expiredUsers: true,
    usersWithDebt: true,
    upcomingBirthdays: true,
    monthlyRevenue: true
  });
  
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

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
        
        {/* Próximos a Vencer */}
        <div className="alert-category">
          <div className="category-header" onClick={() => toggleSection('upcomingExpirations')}>
            <h4>Próximos a Vencer (5 días)</h4>
            <span className="toggle-icon">
              {expandedSections.upcomingExpirations ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.upcomingExpirations && (
            <div className="category-content">
              {upcomingExpirations.length > 0 ? upcomingExpirations.map(u => (
                <div key={u.id} className="alert-item">
                  <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
                  <span className="alert-detail">Vence: {u.fechaVencimiento}</span>
                </div>
              )) : <p className="no-alerts">Ningún usuario próximo a vencer.</p>}
            </div>
          )}
        </div>
        
        {/* Usuarios Vencidos */}
        <div className="alert-category">
          <div className="category-header" onClick={() => toggleSection('expiredUsers')}>
            <h4>Usuarios Vencidos</h4>
            <span className="toggle-icon">
              {expandedSections.expiredUsers ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.expiredUsers && (
            <div className="category-content">
              {expiredUsers.length > 0 ? expiredUsers.map(u => (
                <div key={u.id} className="alert-item">
                  <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
                  <span className="alert-detail">Venció: {u.fechaVencimiento}</span>
                </div>
              )) : <p className="no-alerts">Ningún usuario vencido.</p>}
            </div>
          )}
        </div>
        
        {/* Usuarios con Deuda */}
        <div className="alert-category">
          <div className="category-header" onClick={() => toggleSection('usersWithDebt')}>
            <h4>Usuarios con Deuda</h4>
            <span className="toggle-icon">
              {expandedSections.usersWithDebt ? '▼' : '▶'}
            </span>
          </div>
          {expandedSections.usersWithDebt && (
            <div className="category-content">
              {usersWithDebt.length > 0 ? usersWithDebt.map(u => (
                <div key={u.id} className="alert-item">
                  <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
                  <span className="alert-detail">Debe: ${u.debe.toLocaleString()}</span>
                </div>
              )) : <p className="no-alerts">Ningún usuario con deudas.</p>}
            </div>
          )}
        </div>
      </div>

      {/* Upcoming Birthdays */}
      <div className="birthdays-panel">
        <div className="category-header" onClick={() => toggleSection('upcomingBirthdays')}>
          <h3>Próximos Cumpleaños (30 días)</h3>
          <span className="toggle-icon">
            {expandedSections.upcomingBirthdays ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.upcomingBirthdays && (
          <div className="category-content">
            {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(u => (
                <div key={u.id} className="birthday-item">
                    <Link to={`/users/${u.id}`} className="user-name">{u.nombre}</Link>
                    <span className="birthday-detail">Cumple: {u.cumpleanos}</span>
                </div>
            )) : <p className="no-birthdays">No hay cumpleaños próximos.</p>}
          </div>
        )}
      </div>

      {/* Plan Distribution with Chart */}
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
        
        {/* Gráfico de barras simple */}
        <div className="bar-chart-container">
          <h4>Visualización de Distribución</h4>
          <div className="bar-chart">
            {Object.entries(planDistribution).map(([plan, count]) => {
              const maxCount = Math.max(...Object.values(planDistribution));
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={plan} className="bar-item">
                  <div className="bar-label">{plan}</div>
                  <div className="bar">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${percentage}%`, backgroundColor: getPlanColor(plan) }}
                    ></div>
                  </div>
                  <div className="bar-value">{count}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Monthly Revenue History with Chart */}
      <div className="monthly-revenue-panel alerts-panel">
        <div className="category-header" onClick={() => toggleSection('monthlyRevenue')}>
          <h3>Historial Mensual de Ingresos</h3>
          <span className="toggle-icon">
            {expandedSections.monthlyRevenue ? '▼' : '▶'}
          </span>
        </div>
        {expandedSections.monthlyRevenue && (
          <div className="category-content">
            {monthlyRevenueHistory.length > 0 ? (
              <>
                <table className="monthly-revenue-table table">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Ingresos</th>
                      <th>Tendencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRevenueHistory.map((data, index) => {
                      const prevRevenue = index < monthlyRevenueHistory.length - 1 
                        ? monthlyRevenueHistory[index + 1].revenue 
                        : data.revenue;
                      const trend = data.revenue > prevRevenue ? '📈' : data.revenue < prevRevenue ? '📉' : '➡️';
                      return (
                        <tr key={data.month}>
                          <td>{data.month}</td>
                          <td>${data.revenue.toLocaleString()}</td>
                          <td>{trend}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Gráfico de líneas simple */}
                <div className="line-chart-container">
                  <h4>Evolución de Ingresos</h4>
                  <div className="line-chart">
                    {monthlyRevenueHistory.slice(0, 12).reverse().map((data, index, arr) => {
                      const maxRevenue = Math.max(...arr.map(d => d.revenue));
                      const minRevenue = Math.min(...arr.map(d => d.revenue));
                      const range = maxRevenue - minRevenue;
                      const percentage = range > 0 ? ((data.revenue - minRevenue) / range) * 100 : 50;
                      return (
                        <div key={data.month} className="line-point" style={{ left: `${(index / (arr.length - 1 || 1)) * 100}%`, bottom: `${percentage}%` }}>
                          <div className="point-tooltip">
                            {data.month}: ${data.revenue.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                    <div className="line"></div>
                  </div>
                  <div className="chart-labels">
                    <span>Más antiguo</span>
                    <span>Más reciente</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="no-records">No hay registros de ingresos mensuales.</p>
            )}
          </div>
        )}
      </div>

      {/* Backup Manager 
      <BackupManager />
      */}
    </div>
  );
};

export default Dashboard;
