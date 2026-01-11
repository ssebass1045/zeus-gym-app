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
  const [selectedField, setSelectedField] = useState(fields[0]);
  const [showChart, setShowChart] = useState(true);

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

  // Preparar datos para gráfico
  const chartData = userHistory.map(record => ({
    date: record.date,
    value: parseFloat(record.measures[selectedField]) || 0
  })).reverse(); // Ordenar de más antiguo a más reciente para el gráfico

  // Calcular promedio de medidas para representación corporal
  const calculateAverages = () => {
    if (userHistory.length === 0) return null;
    
    const latest = userHistory[0].measures;
    const averages = {};
    fields.forEach(field => {
      const values = userHistory.map(r => parseFloat(r.measures[field])).filter(v => !isNaN(v));
      if (values.length > 0) {
        averages[field] = values.reduce((a, b) => a + b, 0) / values.length;
      }
    });
    
    return { latest, averages };
  };

  const avgData = calculateAverages();

  // Determinar tipo de cuerpo basado en medidas (simplificado)
  const getBodyType = () => {
    if (!avgData || !avgData.latest) return 'normal';
    
    const { latest } = avgData;
    const cintura = latest.cintura || latest.cintura_bajo_ombligo || 0;
    const pecho = latest.pecho || 0;
    const cadera = latest.gluteo_cadera || latest.gluteo || 0;
    
    if (cintura > 100 && pecho > 100) return 'obeso';
    if (cintura < 70 && pecho < 90) return 'delgado';
    if (pecho > cadera && pecho > 100) return 'musculoso';
    return 'normal';
  };

  const bodyType = getBodyType();

  return (
    <div className="body-comp-card">
      <h3>Composición Corporal</h3>
      
      <div className="comp-controls">
        <button 
          className={`toggle-btn ${showChart ? 'active' : ''}`}
          onClick={() => setShowChart(!showChart)}
        >
          {showChart ? 'Ocultar Gráficos' : 'Mostrar Gráficos'}
        </button>
      </div>

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
                step="0.1"
                min="0"
              />
            </label>
          ))}
        </div>
        <button type="submit">Guardar Medidas</button>
      </form>

      {showChart && (
        <>
          {/* Gráfico de líneas */}
          <div className="comp-chart-section">
            <h4>Progreso de Medidas</h4>
            <div className="chart-controls">
              <select value={selectedField} onChange={(e) => setSelectedField(e.target.value)}>
                {fields.map(field => (
                  <option key={field} value={field}>
                    {field.replace('_', ' ').replace('_', ' / ')}
                  </option>
                ))}
              </select>
            </div>
            
            {chartData.length > 1 ? (
              <div className="line-chart-comp">
                <div className="chart-container">
                  {chartData.map((data, index) => {
                    const maxValue = Math.max(...chartData.map(d => d.value));
                    const minValue = Math.min(...chartData.map(d => d.value));
                    const range = maxValue - minValue;
                    const percentage = range > 0 ? ((data.value - minValue) / range) * 100 : 50;
                    
                    return (
                      <div 
                        key={index} 
                        className="chart-point"
                        style={{ 
                          left: `${(index / (chartData.length - 1 || 1)) * 100}%`,
                          bottom: `${percentage}%`
                        }}
                      >
                        <div className="point-value">{data.value.toFixed(1)}</div>
                        <div className="point-date">{data.date}</div>
                      </div>
                    );
                  })}
                  <div className="chart-line"></div>
                </div>
                <div className="chart-axis">
                  <span>Más antiguo</span>
                  <span>Más reciente</span>
                </div>
              </div>
            ) : (
              <p className="no-chart-data">Se necesitan al menos 2 mediciones para mostrar el gráfico.</p>
            )}
          </div>

          {/* Representación corporal */}
          <div className="body-representation">
            <h4>Representación Corporal</h4>
            <div className="body-visual">
              <div className={`body-figure ${bodyType} ${gender.toLowerCase()}`}>
                <div className="body-part head"></div>
                <div className="body-part torso"></div>
                <div className="body-part arm left"></div>
                <div className="body-part arm right"></div>
                <div className="body-part leg left"></div>
                <div className="body-part leg right"></div>
              </div>
              <div className="body-info">
                <p><strong>Tipo:</strong> {bodyType.charAt(0).toUpperCase() + bodyType.slice(1)}</p>
                <p><strong>Última medición:</strong> {userHistory.length > 0 ? userHistory[0].date : 'N/A'}</p>
                {avgData && (
                  <div className="measurement-summary">
                    <p><strong>Promedio de medidas:</strong></p>
                    <ul>
                      {fields.slice(0, 3).map(field => (
                        <li key={field}>
                          {field.replace('_', ' ')}: {avgData.averages[field] ? avgData.averages[field].toFixed(1) : 'N/A'} cm
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

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
                  {fields.map(f => <td key={f}>{record.measures[f] ? parseFloat(record.measures[f]).toFixed(1) : 'N/A'}</td>)}
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
