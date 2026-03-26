// ============================================================================
// ARCHIVO: TripTransports.jsx
// DESCRIPCIÓN: Pestaña central de Logística (Versión Blindada).
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plane, Bus, Train, Ship, Car, Plus, Pencil, Trash2, Clock, MapPin, X } from 'lucide-react';
import NewTransportModal from './NewTransportModal';
import NewTransferModal from './NewTransferModal';
import ConfirmModal from '../Common/ConfirmModal';

export default function TripTransports({ tripId, isReadOnly, hidePrices }) {
  const [transports, setTransports] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [loading, setLoading] = useState(true);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false, id: null, title: '', name: '', type: ''
  });

  useEffect(() => {
    if (tripId) fetchTransports();
  }, [tripId]);

  const fetchTransports = async () => {
    try {
      setLoading(true);
      const resT = await supabase.from('transports').select('*').eq('trip_id', tripId).order('departure_time', { ascending: true });
      const resA = await supabase.from('airport_transfers').select('*').eq('trip_id', tripId);
      setTransports(resT.data || []);
      setTransfers(resA.data || []);
    } catch (err) {
      console.error('Error fetch logistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const safeFormatTime = (dateStr) => {
    if (!dateStr) return '--:--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '--:--';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch { return '--:--'; }
  };

  const executeDelete = async () => {
    if (!confirmModal.id) return;
    try {
      // Also delete linked expenses
      await supabase.from('expenses').delete().eq('reference_id', confirmModal.id);
      const table = confirmModal.type === 'transport' ? 'transports' : 'airport_transfers';
      await supabase.from(table).delete().eq('id', confirmModal.id);
      fetchTransports();
    } catch (err) { alert('Error: ' + err.message); }
    setConfirmModal({ ...confirmModal, isOpen: false });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* TRASLADOS */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Car size={24} color="var(--color-secondary)" /> Traslados y Parking</h3>
          {!isReadOnly && (
            <button className="btn-primary" onClick={() => { setEditingTransfer(null); setIsTransferModalOpen(true); }} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>+ Añadir</button>
          )}
        </div>
        {transfers.length === 0 ? <p>No hay traslados.</p> : transfers.map(t => (
          <div key={t.id} className="item-card" style={{ background: 'var(--color-surface)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', marginBottom: '8px', border: '1px solid var(--color-border)' }}>
            <div>
              <div style={{ fontWeight: 600 }}>Traslado: {t.type}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {t.transfer_duration_mins} min trayecto
                {t.parking_cost > 0 && !hidePrices && ` • Parking: ${Number(t.parking_cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {t.cost > 0 && !hidePrices && (
                <div style={{ fontWeight: 700, color: 'var(--color-text-main)' }}>
                  {Number(t.cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                </div>
              )}
              {!isReadOnly && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => { setEditingTransfer(t); setIsTransferModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                  <button onClick={() => setConfirmModal({ isOpen: true, id: t.id, title: 'Borrar Traslado', name: t.type, type: 'transfer' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TRAYECTOS */}
      <div className="glass-panel" style={{ padding: 'var(--spacing-xl)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}><Plane size={24} color="var(--color-primary)" /> Billetes y Trayectos</h3>
          {!isReadOnly && (
            <button className="btn-primary" onClick={() => { setEditingTransport(null); setIsModalOpen(true); }} style={{ padding: '4px 12px', fontSize: '0.9rem' }}>+ Añadir Trayecto</button>
          )}
        </div>
        {transports.length === 0 ? <p>No hay trayectos.</p> : transports.map(t => (
          <div key={t.id} style={{ background: 'var(--color-surface)', padding: '16px', borderRadius: '8px', marginBottom: '12px', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '16px' }}>
             <Plane size={20} color="var(--color-primary)" />
             <div style={{ flex: 1 }}>
               <div style={{ fontWeight: 600 }}>{t.origin} → {t.destination}</div>
               <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{safeFormatTime(t.departure_time)} - {safeFormatTime(t.arrival_time)}</div>
             </div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                {t.cost > 0 && !hidePrices && (
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {Number(t.cost).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}
                  </div>
                )}
                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => { setEditingTransport(t); setIsModalOpen(true); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><Pencil size={14} /></button>
                    <button onClick={() => setConfirmModal({ isOpen: true, id: t.id, title: 'Borrar Trayecto', name: `${t.origin}->${t.destination}`, type: 'transport' })} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-error)' }}><Trash2 size={14} /></button>
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>

      <NewTransportModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tripId={tripId} onTransportAdded={fetchTransports} editingTransport={editingTransport} />
      <NewTransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} tripId={tripId} onTransferAdded={fetchTransports} editingTransfer={editingTransfer} />
      <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({...confirmModal, isOpen: false})} onConfirm={executeDelete} title={confirmModal.title} message={`¿Borrar ${confirmModal.name}?`} />
    </div>
  );
}
