import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';
import card0 from './assets/card.png';
import card1 from './assets/card1.png';
import card2 from './assets/card2.png';
import card3 from './assets/card3.png';

const cardImages = [card0, card1, card2, card3];

const getCardImage = (sessionId) => {
  if (!sessionId) return cardImages[0];
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % cardImages.length;
  return cardImages[index];
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Initialize socket connection to backend
const socketConnection = io(API_URL); 

function App() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states for Guest
  const [showModal, setShowModal] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestLevels, setGuestLevels] = useState(['Newbie']); // Default level
  const [guestSlots, setGuestSlots] = useState(1);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/sessions`);
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
      fetchSessions(); // Re-fetch data silently when someone updates
    });

    return () => {
      socketConnection.off('sessionsUpdated');
    };
  }, []);

  const handleOpenRegister = (id) => {
    setSelectedSessionId(id);
    setShowModal(true);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    // 1. Client-side Name Validation
    const nameClean = guestName.trim();
    if (nameClean.length < 2 || nameClean.length > 50) {
      alert('Họ và tên phải từ 2 đến 50 ký tự!');
      return;
    }
    const hasInvalidChars = /[\d`~!@#$%^&*()_\-+={[}\]|\\:;"'<,>.?\/]/.test(nameClean);
    if (hasInvalidChars) {
      alert('Họ và tên không được chứa số hoặc ký tự đặc biệt!');
      return;
    }

    // 2. Client-side Phone Validation
    const phoneClean = guestPhone.trim();
    const phoneRegex = /^(0|\+84)[35789][0-9]{8}$/;
    if (!phoneRegex.test(phoneClean)) {
      alert('Số điện thoại không hợp lệ! Vui lòng nhập số điện thoại Việt Nam (ví dụ: 0987654321).');
      return;
    }

    if (guestLevels.length === 0) {
      alert('Vui lòng chọn ít nhất một trình độ!');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/sessions/${selectedSessionId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: nameClean, 
          phone: phoneClean, 
          level: guestLevels.join(', '),
          levels: guestLevels,
          slots: guestSlots
        })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.error);
        return;
      }
      
      alert('Đăng ký thành công!');
      setShowModal(false);
      setGuestName('');
      setGuestPhone('');
      setGuestLevels(['Newbie']);
      setGuestSlots(1);
      // No need to fetchSessions here, the socket event will trigger it
    } catch (err) {
      alert(err.message);
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

  return (
    <div className="app-container">
      <div className="header glow-effect">
        <h1>Sân Cầu Lông</h1>
        <p>Giao lưu - Kết nối - Đam mê</p>
      </div>

      {loading ? (
        <div className="loader"></div>
      ) : (
        <div className="grid-layout">
          {sessions.length === 0 ? <p style={{textAlign:'center', width:'100%', color: 'var(--text-muted)'}}>Hiện tại chưa có buổi giao lưu nào.</p> : null}
          {sessions.map(s => {
            const registeredCount = s.registeredMembers?.reduce((sum, m) => sum + (m.slots || 1), 0) || 0;
            const slotsLeft = s.maxSlots - registeredCount;
            const isFull = slotsLeft <= 0;
            const isPast = isPastSession(s.date);

            return (
              <div key={s._id} className="session-card" style={isPast ? { opacity: 0.5, filter: 'grayscale(100%)' } : {}}>
                <div className="card-image" style={{ backgroundImage: `url(${getCardImage(s._id)})` }}>
                  <div className={`status-badge ${isPast ? '' : isFull ? 'full pulse-red' : 'pulse-green'}`} style={isPast ? {background: '#64748b'} : {}}>
                    {isPast ? 'ĐÃ KẾT THÚC' : (isFull ? 'HẾT SLOT' : `CÒN ${slotsLeft} SLOT`)}
                  </div>
                </div>
                <div className="card-content">
                  <h3 className="session-title">{s.title}</h3>
                  <div className="info-row">
                    <span>Thời gian:</span>
                    <span className="info-val" style={isPast ? {textDecoration: 'line-through', color: 'var(--text-muted)'} : {}}>{formatDate(s.date)}</span>
                  </div>
                  <div className="info-row">
                    <span>Quy mô:</span>
                    <span className="info-val">{s.courtCount} Sân - {s.maxSlots} Người</span>
                  </div>
                  <div className="info-row">
                    <span>Yêu cầu trình:</span>
                    <span className="info-val highlight-text">{s.level}</span>
                  </div>
                  <div className="info-row">
                    <span>Lệ phí:</span>
                    <span className="info-val price-text">
                      {s.price.toLocaleString()}đ / slot
                    </span>
                  </div>
                  <button 
                    className={`btn-action ${isFull || isPast ? 'btn-disabled' : 'btn-glow'}`} 
                    disabled={isFull || isPast}
                    onClick={() => handleOpenRegister(s._id)}
                  >
                    {isPast ? 'KHÔNG THỂ ĐĂNG KÝ' : (isFull ? 'ĐÃ KÍN CHỖ' : 'ĐĂNG KÝ NGAY')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Modal */}
      {showModal && (
        <div className="modal-overlay fade-in">
          <div className="modal-content slide-up">
            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            <h2 style={{marginBottom:'1.5rem', color: 'var(--primary)'}}>Xác nhận tham gia</h2>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Họ và Tên</label>
                <input type="text" className="input-field" value={guestName} onChange={e=>setGuestName(e.target.value)} required placeholder="Nhập tên của bạn" />
              </div>
              <div className="form-group">
                <label>Số điện thoại</label>
                <input type="tel" className="input-field" value={guestPhone} onChange={e=>setGuestPhone(e.target.value)} required placeholder="09xxxx..." />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Trình độ của bạn (chọn nhiều)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', padding: '0.5rem 0' }}>
                  {['Newbie', 'Yếu -', 'Yếu +', 'Trung bình yếu', 'Trung bình -', 'Trung bình', 'Trung bình +'].map(lvl => (
                    <label key={lvl} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      <input
                        type="checkbox"
                        checked={guestLevels.includes(lvl)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setGuestLevels([...guestLevels, lvl]);
                          } else {
                            setGuestLevels(guestLevels.filter(l => l !== lvl));
                          }
                        }}
                        style={{ accentColor: 'var(--primary)', width: '1.1rem', height: '1.1rem' }}
                      />
                      {lvl}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>Số lượng Slot đăng ký</label>
                <select className="input-field select-animated" value={guestSlots} onChange={e=>setGuestSlots(Number(e.target.value))} required>
                  <option value="1">1 Slot</option>
                  <option value="2">2 Slot</option>
                  <option value="3">3 Slot</option>
                  <option value="4">4 Slot</option>
                  <option value="5">5 Slot</option>
                </select>
              </div>
              <button type="submit" className="btn-submit btn-glow" style={{marginTop: '1rem'}}>Xác Nhận Giữ Chỗ</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
