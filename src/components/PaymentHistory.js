import React, { useContext, useState } from 'react';
import { DataContext } from '../contexts/DataContext';
import './PaymentHistory.css';

const PaymentHistory = ({ userId }) => {
  const { users, updateUser } = useContext(DataContext);
  const user = users.find(u => u.id === userId);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    monto: '',
    tipo: 'Pago adicional',
    fecha: new Date().toISOString().split('T')[0]
  });

  const handleNewPayment = () => {
    if (!newPayment.monto || isNaN(parseFloat(newPayment.monto))) {
      alert('Por favor ingrese un monto válido');
      return;
    }

    const monto = parseFloat(newPayment.monto);
    const planPrices = {
      Quincena: 40000,
      Mensualidad: 80000,
      Tiquetera: 50000,
    };

    const updatedUser = { ...user };
    const precioPlan = planPrices[updatedUser.plan] || 0;
    
    // Actualizar pagos
    updatedUser.pagoRealizado = (updatedUser.pagoRealizado || 0) + monto;
    updatedUser.debe = Math.max(0, precioPlan - updatedUser.pagoRealizado);
    
    // Agregar al historial de pagos
    const nuevoPago = {
      fecha: newPayment.fecha,
      monto: monto,
      tipo: newPayment.tipo,
      plan: updatedUser.plan
    };
    
    updatedUser.historialPagos = [
      ...(updatedUser.historialPagos || []),
      nuevoPago
    ];

    updateUser(updatedUser);
    setShowAddPayment(false);
    setNewPayment({
      monto: '',
      tipo: 'Pago adicional',
      fecha: new Date().toISOString().split('T')[0]
    });
    alert('Pago registrado correctamente.');
  };

  // Función para calcular total pagado
  const getTotalPagado = () => {
    if (!user.historialPagos) return 0;
    return user.historialPagos.reduce((total, pago) => total + (pago.monto || 0), 0);
  };

  if (!user.historialPagos || user.historialPagos.length === 0) {
    return (
      <div className="payment-history-card">
        <h3>Historial de Pagos</h3>
        <p>No hay pagos registrados.</p>
        <button onClick={() => setShowAddPayment(true)} className="btn btn-primary">
          Registrar Nuevo Pago
        </button>
        
        {showAddPayment && (
          <div className="add-payment-form">
            <h4>Registrar Nuevo Pago</h4>
            <div className="form-group">
              <label>Monto:</label>
              <input
                type="number"
                value={newPayment.monto}
                onChange={(e) => setNewPayment({...newPayment, monto: e.target.value})}
                placeholder="Monto del pago"
              />
            </div>
            <div className="form-group">
              <label>Tipo:</label>
              <select
                value={newPayment.tipo}
                onChange={(e) => setNewPayment({...newPayment, tipo: e.target.value})}
              >
                <option value="Pago adicional">Pago adicional</option>
                <option value="Renovación">Renovación</option>
                <option value="Abono">Abono</option>
                <option value="Inicial">Pago inicial</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha:</label>
              <input
                type="date"
                value={newPayment.fecha}
                onChange={(e) => setNewPayment({...newPayment, fecha: e.target.value})}
              />
            </div>
            <div className="form-buttons">
              <button onClick={handleNewPayment} className="btn btn-success">
                Guardar Pago
              </button>
              <button onClick={() => setShowAddPayment(false)} className="btn btn-danger">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="payment-history-card">
      <h3>Historial de Pagos</h3>
      
      <div className="payment-summary">
        <strong>Total Pagado: ${getTotalPagado().toLocaleString()}</strong>
      </div>
      
      <button onClick={() => setShowAddPayment(true)} className="btn btn-primary">
        Registrar Nuevo Pago
      </button>
      
      {showAddPayment && (
        <div className="add-payment-form">
          <h4>Registrar Nuevo Pago</h4>
          <div className="form-group">
            <label>Monto:</label>
            <input
              type="number"
              value={newPayment.monto}
              onChange={(e) => setNewPayment({...newPayment, monto: e.target.value})}
              placeholder="Monto del pago"
            />
          </div>
          <div className="form-group">
            <label>Tipo:</label>
            <select
              value={newPayment.tipo}
              onChange={(e) => setNewPayment({...newPayment, tipo: e.target.value})}
            >
              <option value="Pago adicional">Pago adicional</option>
              <option value="Renovación">Renovación</option>
              <option value="Abono">Abono</option>
              <option value="Inicial">Pago inicial</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha:</label>
            <input
              type="date"
              value={newPayment.fecha}
              onChange={(e) => setNewPayment({...newPayment, fecha: e.target.value})}
            />
          </div>
          <div className="form-buttons">
            <button onClick={handleNewPayment} className="btn btn-success">
              Guardar Pago
            </button>
            <button onClick={() => setShowAddPayment(false)} className="btn btn-danger">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="payment-list">
        <h4>Últimos Pagos</h4>
        <table className="payment-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Monto</th>
              <th>Tipo</th>
              <th>Plan</th>
            </tr>
          </thead>
          <tbody>
            {user.historialPagos
              .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
              .slice(0, 10)
              .map((pago, index) => (
                <tr key={index}>
                  <td>{pago.fecha}</td>
                  <td>${pago.monto?.toLocaleString() || '0'}</td>
                  <td>{pago.tipo}</td>
                  <td>{pago.plan || user.plan}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentHistory;