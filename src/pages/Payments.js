import React, { useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import { Link } from "react-router-dom";
import './Payments.css'; // Asumiendo que crearás un archivo CSS para estilos

const Payments = () => {
  const { users } = useContext(DataContext);

  // Recopilar todos los pagos de todos los usuarios
  const allPayments = users.flatMap(user => 
    (user.historialPagos || []).map(payment => ({
      ...payment,
      userName: user.nombre,
      userId: user.id,
    }))
  ).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // Ordenar por fecha descendente

  return (
    <div className="payments-page">
      <h2>Historial de Pagos Global</h2>
      {allPayments.length > 0 ? (
        <table className="payments-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Monto</th>
              <th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {allPayments.map((payment) => (
              <tr key={payment.id}>
                <td>{payment.fecha}</td>
                <td>
                  <Link to={`/users/${payment.userId}`}>{payment.userName}</Link>
                </td>
                <td>${payment.monto.toLocaleString()}</td>
                <td>{payment.tipo || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-payments-message">No hay pagos registrados en el sistema.</p>
      )}
    </div>
  );
};

export default Payments;
