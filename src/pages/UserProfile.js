/* src/pages/UserProfile.js */
import React, { useContext, useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DataContext } from '../contexts/DataContext';
// --- RUTAS CORREGIDAS ---
import PaymentHistory from '../components/PaymentHistory';
import BodyComposition from '../components/BodyComposition';
import AttendanceControl from '../components/AttendanceControl';
import './UserProfile.css';

const UserProfile = () => {
  const { id } = useParams();
  const { users, updateUser } = useContext(DataContext);
  const navigate = useNavigate();

  const user = users.find(u => String(u.id) === id); // <-- Cambio sugerido en UserProfile.js


  // --- NUEVOS ESTADOS PARA EDICIÓN ---
  const [isEditing, setIsEditing] = useState(false);
  const [editableUser, setEditableUser] = useState({});
  // --- FIN NUEVOS ESTADOS ---

  // Cargar los datos del usuario en editableUser cuando el componente se monta o el usuario cambia
  useEffect(() => {
    if (user) {
      setEditableUser({ ...user });
    }
  }, [user]); // Dependencia en 'user' para recargar si el usuario cambia (aunque no debería en esta página)

  if (!user) {
    return <div className="alert alert-danger">Usuario no encontrado.</div>;
  }

    if (!user) {
    return <div className="alert alert-danger">Usuario no encontrado.</div>;
  }

  // --- FUNCIONES PARA MANEJAR LA EDICIÓN ---
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditableUser(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // --- NUEVA FUNCIÓN: calculateDueDate ---
  const calculateDueDate = (plan, startDate) => {
    if (!startDate) return null; // Si no hay fecha de inicio, no hay fecha de vencimiento
    const date = new Date(startDate);
    if (plan === "Quincena") {
      date.setDate(date.getDate() + 15);
    } else if (plan === "Mensualidad" || plan === "Tiquetera") {
      date.setMonth(date.getMonth() + 1);
    } 
    return date.toISOString().split("T")[0];
  };
  // --- FIN NUEVA FUNCIÓN ---

  const handleSave = () => {
    // Recalcular IMC si peso o altura han cambiado
    const calculateIMC = (weight, height) => {
      if (!weight || !height) return 0;
      const heightInMeters = height / 100;
      return (weight / (heightInMeters * heightInMeters)).toFixed(2);
    };

    const getIMCCategory = (imc) => {
      if (imc < 18.5) return "Bajo peso";
      if (imc >= 18.5 && imc <= 24.9) return "Peso normal";
      if (imc >= 25 && imc <= 29.9) return "Sobrepeso";
      if (imc >= 30 && imc <= 34.9) return "Obesidad grado I";
      if (imc >= 35 && imc <= 39.9) return "Obesidad grado II";
      return "Obesidad grado III";
    };

    let updatedIMC = editableUser.imc;
    let updatedIMCCategory = editableUser.imcCategory;

    if (editableUser.peso !== user.peso || editableUser.altura !== user.altura) {
      updatedIMC = calculateIMC(parseFloat(editableUser.peso), parseFloat(editableUser.altura));
      updatedIMCCategory = getIMCCategory(updatedIMC);
    }

    // Recalcular deuda si plan o pagoRealizado han cambiado
    const planPrices = {
      Quincena: 40000,
      Mensualidad: 80000,
      Tiquetera: 50000,
    };
    const costoPlan = planPrices[editableUser.plan] || 0;
    const updatedDebe = costoPlan - parseFloat(editableUser.pagoRealizado || 0);

    // --- NUEVO: Recalcular fechaVencimiento si el plan o la fecha de ingreso cambian ---
    let updatedFechaVencimiento = editableUser.fechaVencimiento;
    if (editableUser.plan !== user.plan || editableUser.fechaIngreso !== user.fechaIngreso) {
      updatedFechaVencimiento = calculateDueDate(editableUser.plan, editableUser.fechaIngreso);
    }
    // --- FIN NUEVO ---

    // Actualizar el usuario en el contexto
    updateUser({
      ...editableUser,
      imc: updatedIMC,
      imcCategory: updatedIMCCategory,
      precioPlan: costoPlan, // Asegurarse de que el precio del plan se actualice
      debe: updatedDebe,
      fechaVencimiento: updatedFechaVencimiento, // Actualizar fechaVencimiento
    });
    setIsEditing(false); // Salir del modo edición
    alert("Información del usuario actualizada correctamente.");
  };

  const handleCancel = () => {
    setEditableUser({ ...user }); // Revertir cambios
    setIsEditing(false); // Salir del modo edición
  };
  // --- FIN FUNCIONES PARA MANEJAR LA EDICIÓN ---



  const getStatus = () => {
    const today = new Date();
    const expirationDate = new Date(user.fechaVencimiento);
    
    if (user.debe > 0) {
      return <span className="status-badge status-debt">Con Deuda</span>;
    }
    if (user.plan !== 'Tiquetera' && expirationDate < today) {
      return <span className="status-badge status-expired">Vencido</span>;
    }
    return <span className="status-badge status-active">Activo</span>;
  };

  return (
    <div className="user-profile-page">
            <div className="profile-header">
        <div>
          <h1>{user.nombre}</h1>
          {getStatus()}
          {/* --- BOTONES DE EDICIÓN --- */}
          <div style={{ marginTop: '15px' }}> {/* Contenedor para los botones */}
            {!isEditing ? (
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                Editar Perfil
              </button>
            ) : (
              <>
                <button className="btn btn-success" onClick={handleSave} style={{ marginRight: '10px' }}>
                  Guardar Cambios
                </button>
                <button className="btn btn-danger" onClick={handleCancel}>
                  Cancelar
                </button>
              </>
            )}
          </div>
          {/* --- FIN BOTONES DE EDICIÓN --- */}
        </div>
        <Link to="/users" className="back-link">← Volver a Usuarios</Link>
      </div>


      <div className="profile-grid">
                <div className="profile-card">
          <h3>Información Personal</h3>
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Nombre:</label>
                <input type="text" name="nombre" value={editableUser.nombre} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Teléfono:</label>
                <input type="text" name="telefono" value={editableUser.telefono} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Dirección:</label>
                <input type="text" name="direccion" value={editableUser.direccion} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Género:</label>
                <select name="genero" value={editableUser.genero} onChange={handleEditChange}>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de Nacimiento:</label>
                <input type="date" name="cumpleanos" value={editableUser.cumpleanos} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Observaciones Médicas:</label>
                <textarea name="observaciones" value={editableUser.observaciones} onChange={handleEditChange}></textarea>
              </div>
            </>
          ) : (
            <>
              <p><strong>Nombre:</strong> {user.nombre}</p> {/* Añadido para que se vea el nombre en modo visualización */}
              <p><strong>Teléfono:</strong> {user.telefono}</p>
              <p><strong>Dirección:</strong> {user.direccion}</p>
              <p><strong>Género:</strong> {user.genero}</p>
              <p><strong>Fecha de Nacimiento:</strong> {user.cumpleanos}</p>
              <p><strong>Observaciones Médicas:</strong> {user.observaciones || 'Ninguna'}</p>
            </>
          )}
        </div>


                <div className="profile-card">
          <h3>Plan y Pagos</h3>
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Plan:</label>
                <select name="plan" value={editableUser.plan} onChange={handleEditChange}>
                  <option value="Quincena">Quincena</option>
                  <option value="Mensualidad">Mensualidad</option>
                  <option value="Tiquetera">Tiquetera</option>
                </select>
              </div>
              <div className="form-group">
                <label>Fecha de Ingreso:</label>
                <input type="date" name="fechaIngreso" value={editableUser.fechaIngreso} onChange={handleEditChange} />
              </div>
              <div className="form-group">
                <label>Pago Realizado:</label>
                <input type="number" name="pagoRealizado" value={editableUser.pagoRealizado} onChange={handleEditChange} min="0" />
              </div>
              {/* Estos campos se recalculan, no se editan directamente */}
              <p><strong>Precio del Plan:</strong> ${editableUser.precioPlan ? editableUser.precioPlan.toLocaleString() : 'N/A'}</p>
              <p><strong>Fecha de Vencimiento:</strong> {editableUser.fechaVencimiento || 'N/A (Tiquetera)'}</p>
              <p><strong>Deuda Pendiente:</strong> <span className="debt">${editableUser.debe ? editableUser.debe.toLocaleString() : 'N/A'}</span></p>
            </>
          ) : (
            <>
              <p><strong>Plan:</strong> {user.plan}</p>
              <p><strong>Precio del Plan:</strong> ${user.precioPlan ? user.precioPlan.toLocaleString() : 'N/A'}</p>
              <p><strong>Fecha de Ingreso:</strong> {user.fechaIngreso}</p>
              <p><strong>Fecha de Vencimiento:</strong> {user.fechaVencimiento || 'N/A (Tiquetera)'}</p>
              <p><strong>Pago Realizado:</strong> ${user.pagoRealizado ? user.pagoRealizado.toLocaleString() : 'N/A'}</p>
              <p><strong>Deuda Pendiente:</strong> <span className="debt">${user.debe ? user.debe.toLocaleString() : 'N/A'}</span></p>
            </>
          )}
        </div>


                <div className="profile-card">
          <h3>Métricas de Salud</h3>
          {isEditing ? (
            <>
              <div className="form-group">
                <label>Peso (kg):</label>
                <input type="number" name="peso" value={editableUser.peso} onChange={handleEditChange} step="0.1" min="0" />
              </div>
              <div className="form-group">
                <label>Altura (cm):</label>
                <input type="number" name="altura" value={editableUser.altura} onChange={handleEditChange} step="0.1" min="0" />
              </div>
              {/* IMC y Categoría IMC se mostrarán pero no se editan directamente */}
              <p><strong>IMC:</strong> {editableUser.imc || 'N/A'}</p>
              <p><strong>Categoría IMC:</strong> {editableUser.imcCategory || 'N/A'}</p>
            </>
          ) : (
            <>
              <p><strong>Peso:</strong> {user.peso} kg</p>
              <p><strong>Altura:</strong> {user.altura} m</p>
              <p><strong>IMC:</strong> {user.imc || 'N/A'}</p>
              <p><strong>Categoría IMC:</strong> {user.imcCategory || 'N/A'}</p>
            </>
          )}
        </div>

      </div>

      <div className="profile-sections">
        <PaymentHistory userId={user.id} />
        <BodyComposition userId={user.id} gender={user.genero} />
        
        {user.plan === 'Tiquetera' && (
          <AttendanceControl userId={user.id} />
        )}
      </div>
    </div>
  );
};

export default UserProfile;
