import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, Mail, Lock, User, ArrowRight } from 'lucide-react';
import '../styles/Auth.css';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot-password'
  
  const navigate = useNavigate();


  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      } else if (view === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden');
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage('¡Registro exitoso! Ya puedes iniciar sesión con tu cuenta.');
        setFullName(''); // Limpiamos campos
        setConfirmPassword('');
        setView('login');
      } else if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('Se ha enviado un enlace de recuperación a tu correo electrónico.');
      }
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
          <p>
            {view === 'login' && 'Bienvenido de nuevo. Aquí comienza tu nueva aventura.'}
            {view === 'register' && 'Crea tu cuenta'}
            {view === 'forgot-password' && 'Recuperar contraseña'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="auth-form">
          {error && <div className="auth-error">{error}</div>}
          {message && <div className="auth-success" style={{ color: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center', fontSize: '14px' }}>{message}</div>}
          
          {view === 'register' && (
            <div className="form-group">
              <label><User size={18} /> Nombre Completo</label>
              <input 
                type="text" 
                placeholder="Tu nombre"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label><Mail size={18} /> Email</label>
            <input 
              type="email" 
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {view !== 'forgot-password' && (
            <>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span><Lock size={18} /> Contraseña</span>
                  {view === 'login' && (
                    <button 
                      type="button" 
                      onClick={() => setView('forgot-password')}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                    >
                      ¿La has olvidado?
                    </button>
                  )}
                </label>
                <input 
                  type="password" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {view === 'register' && (
                <>
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

                  {/* Consejos de seguridad para la contraseña */}
                  <div style={{
                    background: 'rgba(118,75,162,0.08)',
                    border: '1px solid rgba(118,75,162,0.25)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    fontSize: '0.82rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.6
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      🔐 Consejos para una contraseña segura
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '16px' }}>
                      <li><strong>Usa una contraseña única</strong> — no la uses en ningún otro sitio</li>
                      <li>Combina <strong>mayúsculas y minúsculas</strong> (ej. WanderL0ve)</li>
                      <li>Incluye <strong>números y símbolos</strong> (ej. ! @ # $)</li>
                      <li>Mínimo <strong>8 caracteres</strong> (cuantos más, mejor)</li>
                      <li>Evita datos personales: nombre, fecha de nacimiento, etc.</li>
                      <li>Considera usar un <strong>gestor de contraseñas</strong> (Bitwarden, 1Password...)</li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Procesando...' : (view === 'login' ? 'Entrar' : view === 'register' ? 'Registrarse' : 'Enviar instrucciones')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="auth-footer">
          {view === 'login' && (
            <button onClick={() => setView('register')} className="toggle-auth">
              ¿No tienes cuenta? Registrate
            </button>
          )}
          {view === 'register' && (
            <button onClick={() => setView('login')} className="toggle-auth">
              ¿Ya tienes cuenta? Inicia sesión
            </button>
          )}
          {view === 'forgot-password' && (
            <button onClick={() => setView('login')} className="toggle-auth">
              Volver al inicio de sesión
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
