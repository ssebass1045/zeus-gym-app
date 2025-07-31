import React, { useContext } from "react";
import { DataContext } from "../contexts/DataContext";
import { Link } from "react-router-dom";
import './BodyComposition.css'; // Asumiendo que crearás un archivo CSS para estilos

const BodyComposition = () => {
  const { users, bodyCompositions } = useContext(DataContext);

  // Mapear composiciones corporales con nombres de usuario
  const allBodyCompositions = bodyCompositions.map(comp => {
    const user = users.find(u => u.id === comp.userId);
    return {
      ...comp,
      userName: user ? user.nombre : 'Usuario Desconocido',
      userGender: user ? user.genero : 'N/A',
    };
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha descendente

  // Obtener todos los campos posibles de medidas para los encabezados de la tabla
  const allMeasureFields = Array.from(new Set(
    allBodyCompositions.flatMap(comp => Object.keys(comp.measures || {}))
  ));

  return (
    <div className="body-composition-page">
      <h2>Historial Global de Composición Corporal</h2>
      {allBodyCompositions.length > 0 ? (
        <div className="table-scroll-container"> {/* Contenedor para scroll horizontal */}
          <table className="body-composition-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Género</th>
                {allMeasureFields.map(field => (
                  <th key={field}>{field.replace('_', ' ').replace('_', ' / ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allBodyCompositions.map((record) => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  <td>
                    <Link to={`/users/${record.userId}`}>{record.userName}</Link>
                  </td>
                  <td>{record.userGender}</td>
                  {allMeasureFields.map(field => (
                    <td key={`${record.id}-${field}`}>{record.measures[field] || 'N/A'}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-records-message">No hay registros de composición corporal en el sistema.</p>
      )}
    </div>
  );
};

export default BodyComposition;
