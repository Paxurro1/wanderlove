import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { UserPlus, UserCheck, Search, Users, Clock, Check, X } from 'lucide-react';
import '../styles/Friends.css';

const Friends = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadFriendsData();
    }
  }, [user]);

  const loadFriendsData = async () => {
    setLoading(true);
    await Promise.all([fetchFriends(), fetchPendingRequests()]);
    setLoading(false);
  };

  const fetchFriends = async () => {
    try {
      // Fetch where I am user_id
      const { data: data1, error: error1 } = await supabase
        .from('friendships')
        .select('friend_id, profiles!friendships_friend_id_fkey(id, email, full_name)')
        .eq('user_id', user.id)
        .eq('status', 'accepted');
      
      // Fetch where I am friend_id
      const { data: data2, error: error2 } = await supabase
        .from('friendships')
        .select('user_id, profiles!friendships_user_id_fkey(id, email, full_name)')
        .eq('friend_id', user.id)
        .eq('status', 'accepted');

      if (error1 || error2) throw error1 || error2;

      const formattedFriends = [
        ...(data1?.map(f => f.profiles) || []),
        ...(data2?.map(f => f.profiles) || [])
      ];
      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error.message);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('id, user_id, profiles!friendships_user_id_fkey(id, email, full_name)')
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      
      if (error) throw error;
      setPendingRequests(data);
    } catch (error) {
      console.error('Error fetching pending requests:', error.message);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
        .neq('id', user.id)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (targetUserId) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: user.id,
          friend_id: targetUserId,
          status: 'pending'
        });
      
      if (error) {
        if (error.code === '23505') {
          alert('Ya existe una solicitud o amistad con este usuario.');
        } else {
          throw error;
        }
      } else {
        alert('Solicitud enviada correctamente');
        setSearchResults(prev => prev.filter(r => r.id !== targetUserId));
      }
    } catch (error) {
      console.error('Error sending friend request:', error.message);
    }
  };

  const handleRequest = async (requestId, accept) => {
    try {
      if (accept) {
        const { error } = await supabase
          .from('friendships')
          .update({ status: 'accepted' })
          .eq('id', requestId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('friendships')
          .delete()
          .eq('id', requestId);
        if (error) throw error;
      }
      loadFriendsData();
    } catch (error) {
      console.error('Error handling friend request:', error.message);
    }
  };

  return (
    <div className="friends-container">
      <header className="friends-header">
        <h1><Users size={28} /> Amigos</h1>
        <form onSubmit={handleSearch} className="search-bar">
          <input 
            type="text" 
            placeholder="Buscar por nombre o email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit"><Search size={20} /></button>
        </form>
      </header>

      <div className="friends-grid">
        <aside className="friends-sidebar">
          <section className="friends-section">
            <h2><Clock size={20} /> Solicitudes Pendientes</h2>
            <div className="requests-list">
              {pendingRequests.length === 0 ? (
                <p className="no-data">Sin solicitudes</p>
              ) : (
                pendingRequests.map(req => (
                  <div key={req.id} className="request-card">
                    <div className="req-info">
                      <strong>{req.profiles.full_name}</strong>
                      <span>{req.profiles.email}</span>
                    </div>
                    <div className="req-actions">
                      <button onClick={() => handleRequest(req.id, true)} className="btn-accept"><Check size={16} /></button>
                      <button onClick={() => handleRequest(req.id, false)} className="btn-reject"><X size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="friends-section">
            <h2><Search size={20} /> Resultados Búsqueda</h2>
            <div className="results-list">
              {searchResults.length === 0 ? (
                <p className="no-data">Busca amigos para conectar</p>
              ) : (
                searchResults.map(res => (
                  <div key={res.id} className="result-card">
                    <div className="res-info">
                      <strong>{res.full_name}</strong>
                      <span>{res.email}</span>
                    </div>
                    {friends.some(f => f.id === res.id) ? (
                      <span className="already-friend"><UserCheck size={16} /> Amigos</span>
                    ) : (
                      <button onClick={() => sendFriendRequest(res.id)} className="btn-add">
                        <UserPlus size={16} /> Agregar
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>

        <main className="friends-main">
          <section className="friends-section">
            <h2> Mis Amigos ({friends.length})</h2>
            <div className="friends-list">
              {friends.length === 0 ? (
                <div className="empty-friends">
                  <Users size={48} />
                  <p>Aún no tienes amigos agregados</p>
                </div>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="friend-card">
                    <div className="friend-avatar">
                      {friend.full_name?.charAt(0) || friend.email?.charAt(0)}
                    </div>
                    <div className="friend-info">
                      <strong>{friend.full_name}</strong>
                      <span>{friend.email}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default Friends;
