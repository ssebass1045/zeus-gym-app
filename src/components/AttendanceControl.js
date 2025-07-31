/* src/components/AttendanceControl.js */
import React, { useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import './AttendanceControl.css';

const AttendanceControl = ({ userId }) => {
  const { users, updateUser, attendances, addAttendance } = useContext(DataContext);
  const user = users.find(u => u.id === userId);

  const handleMarkAttendance = () => {
    if (user.diasHabiles >= 15) {
      alert('El usuario ya ha consumido todos sus días de tiquetera.');
      return;
    }

    const today = new Date().toISOString().substr(0, 10);
    
    // Evitar marcar asistencia dos veces el mismo día
    const hasAttendedToday = attendances.some(a => a.userId === userId && a.date === today);
    if (hasAttendedToday) {
      alert('La asistencia para hoy ya ha sido registrada.');
      return;
    }

    const updatedUser = { ...user };
    updatedUser.diasHabiles = (updatedUser.diasHabiles || 0) + 1;

    // Si es la primera asistencia, se establece una fecha de vencimiento (ej. 60 días para usar los 15 días)
    if (updatedUser.diasHabiles === 1) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);
      updatedUser.fechaVencimiento = expirationDate.toISOString().substr(0, 10);
    }

    updateUser(updatedUser);
    addAttendance({
      userId: userId,
      date: today,
    });
  };

  const userAttendances = attendances.filter(a => a.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="attendance-card">
      <h3>Control de Asistencia (Tiquetera)</h3>
      <div className="attendance-summary">
        <div className="summary-item">
          <span>{15 - (user.diasHabiles || 0)}</span>
          <p>Días Disponibles</p>
        </div>
        <div className="summary-item">
          <span>{user.diasHabiles || 0}</span>
          <p>Días Utilizados</p>
        </div>
      </div>
      <button onClick={handleMarkAttendance} disabled={(user.diasHabiles || 0) >= 15}>
        Marcar Asistencia Hoy
      </button>
      <div className="attendance-history">
        <h4>Historial de Asistencias</h4>
        {userAttendances.length > 0 ? (
          <ul className="attendance-list">
            {userAttendances.map(a => (
              <li key={a.id} className="attendance-item">{a.date}</li>
            ))}
          </ul>
        ) : (
          <p className="no-history">No hay asistencias registradas.</p>
        )}
      </div>
    </div>
  );
};

export default AttendanceControl;
