import React, { useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import { Link } from "react-router-dom";
import './Attendance.css'; // Asumiendo que crearás un archivo CSS para estilos

const Attendance = () => {
  const { users, attendances } = useContext(DataContext);

  // Mapear asistencias con nombres de usuario
  const allAttendances = attendances.map(att => {
    const user = users.find(u => u.id === att.userId);
    return {
      ...att,
      userName: user ? user.nombre : 'Usuario Desconocido',
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha descendente

  return (
    <div className="attendance-page">
      <h2>Historial Global de Asistencias</h2>
      {allAttendances.length > 0 ? (
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {allAttendances.map((att) => (
              <tr key={att.id}>
                <td>{att.date}</td>
                <td>
                  <Link to={`/users/${att.userId}`}>{att.userName}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-records-message">No hay registros de asistencia en el sistema.</p>
      )}
    </div>
  );
};

export default Attendance;
