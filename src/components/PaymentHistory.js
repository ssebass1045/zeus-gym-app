/* src/components/PaymentHistory.js */
import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import './PaymentHistory.css';

const PaymentHistory = ({ userId }) => {
  const { users, updateUser } = useContext(DataContext);
  const user = users.find(u => u.id === userId);

  const [paymentAmount, setPaymentAmount] = useState('');

  if (!user) {
    return <p>Usuario no encontrado para el historial de pagos.</p>;
  }

  const handleAddPayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);

    if (isNaN(amount) || amount <= 0) {
      alert('Por favor, ingresa un monto de pago válido.');
      return;
    }

    const newPayment = {
      id: Date.now(),
      amount: amount,
      date: new Date().toISOString().substr(0, 10),
    };

    const updatedUser = { ...user };
    updatedUser.pagos = [...(updatedUser.pagos || []), newPayment];
    updatedUser.debe = Math.max(0, updatedUser.debe - amount); // Asegura que no sea negativo
    updatedUser.historialPagos = [...(updatedUser.historialPagos || []), {
      fecha: new Date().toISOString().substr(0, 10), // Usar 'fecha' para consistencia
      monto: amount, // Usar 'monto' para consistencia
      tipo: "Pago Adicional", // Puedes especificar un tipo si lo deseas
      id: Date.now(), // Añadir un ID único para el pago
    }];

    // Recalcular el pago realizado total sumando todos los montos en historialPagos
    updatedUser.pagoRealizado = updatedUser.historialPagos.reduce((sum, p) => sum + p.monto, 0);

    // Recalcular la deuda pendiente
    updatedUser.debe = Math.max(0, (user.precioPlan || 0) - updatedUser.pagoRealizado);

    updateUser(updatedUser);
    setPaymentAmount('');
  };

  return (
    <div className="payment-history-card">
      <h3>Historial de Pagos</h3>
      <form onSubmit={handleAddPayment} className="payment-form">
        <label htmlFor="paymentAmount">Registrar Nuevo Pago:</label>
        <input
          type="number"
          id="paymentAmount"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Monto del pago"
          required
        />
        <button type="submit">Registrar Pago</button>
      </form>

      <h4>Pagos Realizados:</h4>
      {user.historialPagos && user.historialPagos.length > 0 ? (
        <ul className="payment-list">
           {user.historialPagos.map(payment => (
              <li key={payment.id} className="payment-item"> {/* <-- Añadir key={payment.id} */}
                <span>{payment.fecha}</span>
                <span className="payment-amount">${payment.monto.toLocaleString()}</span>
              </li>
            ))}
        </ul>
      ) : (
        <p className="no-payments">No hay pagos registrados para este usuario.</p>
      )}
    </div>
  );
};

export default PaymentHistory;
