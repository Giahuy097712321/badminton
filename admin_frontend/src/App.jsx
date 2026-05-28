import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

// Socket connection
const socketConnection = io('http://localhost:5000'); 

function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for Host
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [courtCount, setCourtCount] = useState(1);
  const [level, setLevel] = useState('Trung bình -');
  const [price, setPrice] = useState(50000);
  const [maxSlots, setMaxSlots] = useState(10);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/sessions');
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Lỗi tải dữ liệu', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    
    // Listen for real-time updates
    socketConnection.on('sessionsUpdated', () => {
      fetchSessions();
    });

    return () => {
      socketConnection.off('sessionsUpdated');
    };
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, date, courtCount, level, price, maxSlots })
      });
      if (res.ok) {
        alert('Tạo buổi giao lưu thành công!');
        setTitle('');
        // No need to fetchSessions, socket will handle it
      }
    } catch (err) {
      alert('Lỗi tạo buổi giao lưu');
    }
  };

  const handleDeleteSession = async (id) => {
    if(!window.confirm('Chắc chắn xoá buổi này?')) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
      // Socket handles refresh
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (sessionId, phone) => {
    if(!window.confirm(`Xoá thành viên (SĐT: ${phone}) khỏi danh sách?`)) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/members/${phone}`, { method: 'DELETE' });
      if (!res.ok) {
        const errData = await res.json();
        alert(errData.error || 'Lỗi khi xoá thành viên');
      }
      // Socket handles refresh
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('vi-VN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const isPastSession = (dateStr) => {
    return new Date(dateStr).getTime() < new Date().getTime();
  };

  if (loading) return <div className="loader"></div>;

  return (
    <div className="app-container">
      <div className="header glow-effect">
        <h1>Trang Quản Lý Sân</h1>
      </div>

      <div className="form-panel slide-up">
        <h2 style={{marginBottom: '2rem'}}>Tạo Buổi Giao Lưu Mới</h2>
        <form onSubmit={handleCreateSession}>
          <div className="form-group">
            <label>Tên buổi giao lưu</label>
            <input type="text" className="input-field" value={title} onChange={e => setTitle(e.target.value)} required placeholder="VD: Giao lưu Tối Thứ 7 - Sân 1,2,3" />
          </div>
          <div className="form-group">
            <label>Thời gian</label>
            <input type="datetime-local" className="input-field" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
            <div className="form-group">
              <label>Số lượng sân</label>
              <input type="number" min="1" className="input-field" value={courtCount} onChange={e => setCourtCount(Number(e.target.value))} required />
            </div>
            <div className="form-group">
              <label>Tổng Slot tối đa</label>
              <input type="number" min="1" className="input-field" value={maxSlots} onChange={e => setMaxSlots(Number(e.target.value))} required />
            </div>
          </div>
          <div className="form-group">
            <label>Trình độ yêu cầu</label>
            <select className="input-field select-animated" value={level} onChange={e => setLevel(e.target.value)}>
              <option value="Trung bình yếu">Trung bình yếu</option>
              <option value="Trung bình -">Trung bình -</option>
              <option value="Trung bình">Trung bình</option>
              <option value="Trung bình +">Trung bình +</option>
            </select>
          </div>
          <div className="form-group">
            <label>Lệ phí / Người (VNĐ)</label>
            <input type="number" min="0" className="input-field" value={price} onChange={e => setPrice(Number(e.target.value))} required />
          </div>
          <button type="submit" className="btn-submit btn-glow">Tạo Lịch</button>
        </form>

        <h3 style={{marginTop: '3rem', marginBottom: '1rem'}}>Danh sách quản lý</h3>
        <div className="admin-list-container">
          {sessions.map(s => {
              const isPast = isPastSession(s.date);
              return (
              <div key={s._id} className="admin-session-card" style={{border: isPast ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(16, 185, 129, 0.4)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <h4 style={{color: isPast ? 'var(--text-muted)' : 'var(--primary)', fontSize: '1.2rem', textShadow: isPast ? 'none' : '0 0 8px rgba(16, 185, 129, 0.3)'}}>
                    {s.title} ({s.registeredMembers?.length || 0}/{s.maxSlots}) {isPast && '[Đã kết thúc]'}
                  </h4>
                  <button onClick={() => handleDeleteSession(s._id)} className="btn-delete-session">Xoá buổi này</button>
                </div>
                <p style={{fontSize:'0.9rem', color:'var(--text-muted)', margin:'0.5rem 0'}}>{formatDate(s.date)}</p>
                
                {s.registeredMembers?.length > 0 ? (
                  <div className="members-list">
                    {s.registeredMembers.map((m, idx) => (
                      <div key={idx} className="member-item">
                        <div className="member-info">
                          <span className="member-number">{idx + 1}.</span>
                          <span className="member-name">{m.name}</span>
                          <span className="member-phone">{m.phone}</span>
                          <span className="member-level badge-level">{m.level || 'Chưa chọn'}</span>
                        </div>
                        <button 
                          onClick={() => handleRemoveMember(s._id, m.phone)}
                          className="btn-kick"
                          title="Kích người này"
                        >
                          Huỷ Slot
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{fontSize:'0.9rem', color:'var(--text-muted)', marginTop:'0.5rem', fontStyle: 'italic'}}>Chưa có ai đăng ký.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;
