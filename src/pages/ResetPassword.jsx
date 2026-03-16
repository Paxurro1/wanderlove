import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight, ShieldCheck } from 'lucide-react';
import '../styles/Auth.css';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-icon">W</span>
            <h1>WanderLove</h1>
          </div>
          <p>Establece tu nueva contraseña</p>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <div style={{ background: 'rgba(46, 204, 113, 0.1)', color: '#2ecc71', padding: '15px', borderRadius: '12px', marginBottom: '20px' }}>
              <ShieldCheck size={48} style={{ margin: '0 auto 10px' }} />
              <h3 style={{ marginBottom: '5px' }}>¡Contraseña actualizada!</h3>
              <p>Redirigiendo al inicio de sesión...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="auth-form">
            {error && <div className="auth-error">{error}</div>}
            
            <div className="form-group">
              <label><Lock size={18} /> Nueva Contraseña</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label><Lock size={18} /> Confirmar Contraseña</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Actualizando...' : 'Cambiar Contraseña'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
