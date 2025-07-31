/* src/components/BodyComposition.js */
import React, { useState, useContext } from 'react';
import { DataContext } from '../contexts/DataContext';
import './BodyComposition.css';

const BodyComposition = ({ userId, gender }) => {
  const { bodyCompositions, addBodyComposition } = useContext(DataContext);

  // Define los campos según el género
  const fields = gender === 'Femenino' 
    ? ['cuello', 'brazo', 'pecho', 'cintura', 'gluteo_cadera', 'pierna']
    : ['cuello', 'biceps', 'pecho', 'cintura_bajo_ombligo', 'gluteo', 'pierna'];

  const initialMeasures = fields.reduce((acc, field) => ({ ...acc, [field]: '' }), {});
  
  const [measures, setMeasures] = useState(initialMeasures);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeasures(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newComposition = {
      userId: userId,
      date: new Date().toISOString().substr(0, 10),
      measures: measures,
    };
    addBodyComposition(newComposition);
    setMeasures(initialMeasures); // Limpiar formulario
  };

  // Filtrar el historial para el usuario actual
  const userHistory = bodyCompositions.filter(comp => comp.userId === userId).sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="body-comp-card">
      <h3>Composición Corporal</h3>
      <form onSubmit={handleSubmit} className="comp-form">
        <div className="form-grid">
          {fields.map(field => (
            <label key={field}>
              {field.replace('_', ' ').replace('_', ' / ')} (cm)
              <input
                type="number"
                name={field}
                value={measures[field]}
                onChange={handleInputChange}
                placeholder="0"
                required
              />
            </label>
          ))}
        </div>
        <button type="submit">Guardar Medidas</button>
      </form>

      <div className="comp-history">
        <h4>Historial de Progreso</h4>
        {userHistory.length > 0 ? (
          <table className="history-table">
            <thead>
              <tr>
                <th>Fecha</th>
                {fields.map(f => <th key={f}>{f.replace('_', ' ').replace('_', ' / ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {userHistory.map(record => (
                <tr key={record.id}>
                  <td>{record.date}</td>
                  {fields.map(f => <td key={f}>{record.measures[f] || 'N/A'}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-history">No hay registros de medidas.</p>
        )}
      </div>
    </div>
  );
};

export default BodyComposition;
