import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { User, LogOut, Key, Mail, Bell, Check, X, Shield } from 'lucide-react';
import '../styles/Profile.css';

const Profile = () => {
  const { user, profile, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      fetchInvitations();
    }
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('trip_participants')
        .select(`
          id,
          status,
          trips (
            id,
            destination,
            owner_id
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      setInvitations(data);
    } catch (error) {
      console.error('Error fetching invitations:', error.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMsg({ text: 'Las contraseñas no coinciden', type: 'error' });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setMsg({ text: 'Contraseña actualizada correctamente', type: 'success' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setMsg({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInvitation = async (invitationId, accept) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from('trip_participants')
          .update({ status: 'accepted' })
          .eq('id', invitationId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('trip_participants')
          .delete()
          .eq('id', invitationId);
        if (error) throw error;
      }
      fetchInvitations();
    } catch (error) {
      console.error('Error handling invitation:', error.message);
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-info">
          <div className="profile-avatar">
            {profile?.full_name?.charAt(0) || user?.email?.charAt(0)}
          </div>
          <div>
            <h1>{profile?.full_name || 'Usuario'}</h1>
            <p><Mail size={14} /> {user?.email}</p>
          </div>
        </div>
        <button onClick={signOut} className="btn-logout">
          <LogOut size={18} /> Cerrar Sesión
        </button>
      </div>

      <div className="profile-grid">
        <section className="profile-section">
          <h2><Key size={20} /> Cambiar Contraseña</h2>
          <form onSubmit={handleUpdatePassword} className="password-form">
            {msg.text && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
            <div className="form-group">
              <label>Nueva Contraseña</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                required
              />
            </div>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </section>

        <section className="profile-section">
          <h2><Bell size={20} /> Invitaciones a Viajes</h2>
          <div className="invitations-list">
            {invitations.length === 0 ? (
              <p className="no-data">No tienes invitaciones pendientes</p>
            ) : (
              invitations.map((inv) => (
                <div key={inv.id} className="invitation-card">
                  <div className="inv-info">
                    <strong>{inv.trips.destination}</strong>
                    <span>Invitación recibida</span>
                  </div>
                  <div className="inv-actions">
                    <button onClick={() => handleInvitation(inv.id, true)} className="btn-accept" title="Aceptar">
                      <Check size={18} />
                    </button>
                    <button onClick={() => handleInvitation(inv.id, false)} className="btn-reject" title="Rechazar">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
