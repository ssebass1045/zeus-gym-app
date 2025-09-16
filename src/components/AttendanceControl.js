import React, { useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import './AttendanceControl.css';

const AttendanceControl = ({ userId }) => {
  const { users, updateUser, attendances, addAttendance } = useContext(DataContext);
  const user = users.find(u => u.id === userId);

  const handleMarkAttendance = () => {
    const today = new Date().toISOString().substr(0, 10);
    
    // Verificar días disponibles
    const diasDisponibles = 15 - (user.diasHabiles || 0);
    if (diasDisponibles <= 0) {
      alert('El usuario ya ha consumido todos sus días de tiquetera.');
      return;
    }

    const updatedUser = { ...user };
    updatedUser.diasHabiles = (updatedUser.diasHabiles || 0) + 1;

    // Si es la primera asistencia, establecer fecha de vencimiento
    if (updatedUser.diasHabiles === 1) {
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 60);
      updatedUser.fechaVencimiento = expirationDate.toISOString().substr(0, 10);
    }

    updateUser(updatedUser);
    addAttendance({
      userId: userId,
      date: today,
      timestamp: new Date().toISOString()
    });
    
    alert(`Asistencia registrada. Días restantes: ${diasDisponibles - 1}`);
  };

  // Función para reiniciar tiquetera
  const handleResetTiquetera = () => {
    if (window.confirm('¿Estás seguro de reiniciar la tiquetera? Se perderán todos los días utilizados.')) {
      const updatedUser = { ...user };
      updatedUser.diasHabiles = 0;
      updatedUser.fechaVencimiento = null;
      
      updateUser(updatedUser);
      alert('Tiquetera reiniciada correctamente.');
    }
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
      <div className="attendance-buttons">
        <button onClick={handleMarkAttendance} disabled={(user.diasHabiles || 0) >= 15}>
          Marcar Asistencia Hoy
        </button>
        <button onClick={handleResetTiquetera} className="btn btn-warning">
          Reiniciar Tiquetera
        </button>
      </div>
      <div className="attendance-history">
        <h4>Historial de Asistencias</h4>
        {userAttendances.length > 0 ? (
          <ul className="attendance-list">
            {userAttendances.map(a => (
              <li key={a.id} className="attendance-item">
                {a.date} {a.timestamp && `- ${new Date(a.timestamp).toLocaleTimeString()}`}
              </li>
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