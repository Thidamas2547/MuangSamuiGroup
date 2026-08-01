import React, { useState, useRef, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import "bootstrap/dist/css/bootstrap.min.css";
import { io } from 'socket.io-client';
import "./responsive.css";
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// ลงทะเบียน ChartJS ไว้ใช้งานตามโครงสร้างเดิมของคุณ
ChartJS.register(
  ArcElement, BarElement, CategoryScale, 
  LinearScale, PointElement, LineElement, 
  Tooltip, Legend
);

// ==========================================
// 🔔 Component: ส่วนแสดงโปรไฟล์และแจ้งเตือนด้านบน
// ==========================================
const UserStatusHeader = ({
  initialName = "Apichart Klaiboonnan",
  initialRole = "IT Manager",
  tickets,             // รายการตั๋วหลักทั้งหมดในระบบ
  setTickets,          // ฟังก์ชันสำหรับอัปเดตตั๋วหลัก
  setIsLogin,
  setCurrentUser,
  setCurrentView,
  currentUserRole = "admin" // เพิ่มสำหรับระบุสิทธิ์ (เช่น 'admin' หรือ 'user') เพื่อแยกหน้าจอแจ้งเตือน
}) => {
  // 🌟 ลบรายการแจ้งเตือนของเก่าออกทั้งหมดเรียบร้อยแล้ว เพื่อเริ่มต้นรับตั๋วใหม่จากระบบจริง
  const [newTickets, setNewTickets] = useState([]);

  const [profile, setProfile] = useState({ name: initialName, role: initialRole });
  const [tempProfile, setTempProfile] = useState({ name: initialName, role: initialRole });
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotif, setShowNotif] = useState(false); 
  const dateInputRef = useRef(null);

  // 🛠️ ฟังก์ชันสำหรับกด "รับเคสนี้" (ฝั่งช่าง/แอดมิน)
  const handleAcceptCase = (ticketId) => {
    // 1. หาข้อมูลของตั๋วใบนี้จากรายการงานใหม่
    const targetedTicket = newTickets.find(t => t.id === ticketId);
    if (!targetedTicket) return;

    // 2. ปรับปรุงข้อมูล: เปลี่ยนสถานะเป็น 'กำลังดำเนินการ' และแนบชื่อช่างผู้รับผิดชอบ
    const updatedData = {
      ...targetedTicket,
      status: 'กำลังดำเนินการ',
      technician: profile.name, // ดึงชื่อจากโปรไฟล์ปัจจุบัน
      modified: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };

    // 3. เรียกฟังก์ชันส่งข้อมูลไปอัปเดตระบบ
    handleUpdateTicketAction(ticketId, updatedData);
    alert(`รับเคสหมายเลข ${ticketId} เรียบร้อยแล้ว ระบบจะทำการแจ้งสถานะไปยังผู้แจ้งซ่อม`);
  };

  // ฟังก์ชันจัดการและอัปเดตตั๋วระหว่างผู้แจ้งและช่าง
  const handleUpdateTicketAction = (ticketId, updatedData) => {
    // 🔄 อัปเดตตั๋วหลักในตัวระบบแอปพลิเคชัน (ถ้ามีฟังก์ชัน setTickets ส่งมาทาง Props)
    if (typeof setTickets === 'function') {
      setTickets(prevTickets => {
        const isExist = prevTickets.some(t => t.id === ticketId);
        if (isExist) {
          return prevTickets.map(t => t.id === ticketId ? { ...t, ...updatedData } : t);
        }
        return [updatedData, ...prevTickets];
      });
    }

    // 🔄 อัปเดตรายการที่อยู่ในกระดิ่งแจ้งเตือน
    setNewTickets(prevNew => {
      if (currentUserRole === 'admin') {
        // ฝั่งช่าง: ถ้ารับงานแล้ว ให้ดึงงานนั้นออกจากกล่อง "งานใหม่ที่รอดำเนินการ"
        return prevNew.filter(t => t.id !== ticketId);
      } else {
        // ฝั่งผู้รับบริการ (User): ให้คงตั๋วไว้ในกระดิ่ง แต่เปลี่ยนสถานะให้เห็นว่าช่างรับเรื่องแล้ว
        return prevNew.map(t => t.id === ticketId ? { ...t, ...updatedData } : t);
      }
    });
  };

  const handleSaveProfile = () => {
    setProfile(tempProfile);
    if (typeof setCurrentUser === 'function') {
      setCurrentUser(prev => ({ ...prev, name: tempProfile.name, role: tempProfile.role }));
    }
    setShowEditModal(false);
    setShowProfileMenu(false);
  };

  return (
    <div className="d-flex align-items-center gap-3 mb-3 justify-content-end no-print" style={{ position: 'relative', fontFamily: "'Sarabun', sans-serif" }}>
      {/* ปฏิทิน */}
      <div className="bg-white px-3 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2 border hover-lift" style={{ cursor: 'pointer' }} onClick={() => dateInputRef.current.showPicker()}>
        <span>📅</span>
        <span className="small fw-bold text-dark">{selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <input type="date" ref={dateInputRef} className="position-absolute opacity-0" style={{ width: 0, height: 0 }} onChange={(e) => setSelectedDate(new Date(e.target.value))} />
      </div>

      {/* กระดิ่งแจ้งเตือน */}
      <div className="position-relative">
        <div className="bg-white p-2 rounded-circle shadow-sm border d-flex align-items-center justify-content-center hover-lift" style={{ width: '42px', height: '42px', cursor: 'pointer', fontSize: '1.2rem' }} onClick={() => { setShowNotif(!showNotif); setShowProfileMenu(false); }}>
          {newTickets.length > 0 ? '🔔' : '🔕'}
          {newTickets.length > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '10px', border: '2px solid white' }}>{newTickets.length}</span>}
        </div>
        
        {showNotif && (
          <div className="popup-animate position-absolute end-0 mt-2 bg-white shadow-lg border rounded-3 p-0" style={{ zIndex: 1100, width: '95vw',maxWidth:'350px', overflow: 'hidden' }}>
            <div className="p-2 px-3 border-bottom bg-primary bg-opacity-10 fw-bold small text-dark d-flex justify-content-between align-items-center">
              <span>{currentUserRole === 'admin' ? '📩 รายการงานแจ้งซ่อมใหม่' : '🔔 แจ้งเตือนสถานะงานซ่อม'}</span>
              <span className="badge bg-primary">{newTickets.length}</span>
            </div>
            <div className="custom-scrollbar" style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {newTickets.length > 0 ? newTickets.map((t) => (
                <div key={t.id} className="p-3 border-bottom text-dark text-start small">
                  <div className="d-flex justify-content-between mb-1">
                    <strong className="text-primary">🎫 {t.id}</strong>
                    <span className={`badge ${t.priority === 'ด่วน' ? 'bg-danger' : 'bg-info'}`}>{t.priority}</span>
                  </div>
                  <div><b>📍 สถานที่:</b> {t.location}</div>
                  <div className="my-1 p-2 bg-light rounded border-start border-4 border-warning">
                    <b>🛠️ ปัญหา:</b> {t.problem}
                  </div>
                  
                  {/* ปุ่มการตอบรับเคส (แสดงเฉพาะฝั่งแอดมิน/ช่าง และตั๋วที่ยังไม่มีคนรับ) */}
                  {t.status === 'เปิด Ticket' && currentUserRole === 'admin' && (
                    <button className="btn btn-sm btn-success w-100 mt-2" onClick={() => handleAcceptCase(t.id)}>รับเคสนี้</button>
                  )}

                  {/* ข้อความอัปเดตกลับไปหาผู้แจ้งซ่อม (เมื่อช่างกดรับเคสแล้ว) */}
                  {t.status === 'กำลังดำเนินการ' && (
                    <div className="p-2 mt-2 bg-success bg-opacity-10 text-success rounded text-center fw-bold border border-success border-opacity-25 animate-fade-in">
                      ⚙️ ช่าง {t.technician || 'IT'} รับเรื่องแล้วและกำลังไปดำเนินการ
                    </div>
                  )}
                </div>
              )) : <div className="p-4 text-center text-muted small">ไม่มีงานใหม่ในขณะนี้</div>}
            </div>
          </div>
        )}
      </div>

      {/* เมนูโปรไฟล์ */}
      <div className="position-relative">
        <div className="d-flex align-items-center gap-2 bg-white p-1 pe-3 rounded-pill shadow-sm border hover-lift" style={{ cursor: 'pointer' }} onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotif(false); }}>
          <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center text-white fw-bold" style={{ width: '35px', height: '35px' }}>{profile.name.charAt(0)}</div>
          <div className="d-none d-md-block text-start" style={{ lineHeight: '1.2' }}>
            <div className="fw-bold text-dark" style={{ fontSize: '12px' }}>{profile.name}</div>
            <div className="text-muted" style={{ fontSize: '10px' }}>{profile.role}</div>
          </div>
        </div>
        {showProfileMenu && (
          <div className="position-absolute end-0 mt-2 bg-white shadow-lg border rounded-3 p-2" style={{ zIndex: 1100, minWidth: '180px' }}>
            <button className="btn btn-sm btn-light w-100 text-start border-0 mb-1" onClick={() => { setShowEditModal(true); setShowProfileMenu(false); }}>✏️ แก้ไขโปรไฟล์</button>
            <div className="dropdown-divider"></div>
            <button className="btn btn-sm btn-light w-100 text-start border-0 text-danger" onClick={() => { if (window.confirm("ต้องการออกจากระบบ?")) { setIsLogin(false); setCurrentUser(null); setCurrentView('login'); } }}>🚪 ออกจากระบบ</button>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 2000 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg" style={{ width: '320px' }}>
            <h5 className="mb-3 fw-bold text-dark">📝 แก้ไขข้อมูลส่วนตัว</h5>
            <input type="text" className="form-control form-control-sm mb-2" value={tempProfile.name} onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})} />
            <input type="text" className="form-control form-control-sm mb-3" value={tempProfile.role} onChange={(e) => setTempProfile({...tempProfile, role: e.target.value})} />
            <div className="d-flex gap-2 text-dark">
              <button className="btn btn-sm btn-light w-100" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
              <button className="btn btn-sm btn-primary w-100" onClick={handleSaveProfile}>บันทึก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 💬 Component: ระบบแชทพูดคุยระหว่าง ช่าง และ ผู้ใช้งานแบบ Real-time Simulation
// ==========================================
const FloatingChatWidget = ({ tickets, chats, setChats }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [messageText, setMessageText] = useState('');
  const [senderRole, setSenderRole] = useState('User'); // จำลองว่าส่งจากใคร (User / Technician)
  const chatEndRef = useRef(null);

  // กรองตั๋วที่อยู่ในสถานะ "กำลังดำเนินการ" เพื่อใช้สำหรับแชทคุยกัน
  const activeChatTickets = tickets.filter(t => t.status === 'กำลังดำเนินการ');

  useEffect(() => {
    if (activeChatTickets.length > 0 && !selectedTicketId) {
      setSelectedTicketId(activeChatTickets[0].id);
    }
  }, [activeChatTickets, selectedTicketId]);

  useEffect(() => {
    // เลื่อนลงล่างสุดอัตโนมัติเมื่อมีข้อความใหม่เข้ามา
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chats, selectedTicketId, isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedTicketId) return;

    const newMessage = {
      id: Date.now(),
      sender: senderRole,
      text: messageText,
      time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    setChats(prev => ({
      ...prev,
      [selectedTicketId]: [...(prev[selectedTicketId] || []), newMessage]
    }));

    setMessageText('');
  };

  if (activeChatTickets.length === 0) return null;

  const currentChatList = chats[selectedTicketId] || [];
  const currentTicketDetail = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="position-fixed bottom-0 end-0 m-4 no-print" style={{ zIndex: 3000, fontFamily: "'Sarabun', sans-serif" }}>
      {/* 🔴 ปุ่มวงกลมแชทเด้งเตือน */}
      {!isOpen && (
        <button 
          className="btn btn-warning shadow-lg rounded-circle d-flex align-items-center justify-content-center border-3 border-white animate-pulse"
          style={{ width: '65px', height: '65px', fontSize: '1.8rem' }}
          onClick={() => setIsOpen(true)}
        >
          💬
          <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '11px' }}>
            {activeChatTickets.length}
          </span>
        </button>
      )}

      {/* 🟢 หน้าต่างพูดคุยของแชท */}
      {isOpen && (
        <div className="card shadow-lg border-0 rounded-4 overflow-hidden" style={{ width: '360px', height: '480px', display: 'flex', flexDirection: 'column' }}>
          
          {/* ส่วนหัวแชท */}
          <div className="bg-primary text-white p-3 d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">💬</span>
              <div>
                <h6 className="fw-bold mb-0 text-white">แชทคุยสอบถามงานซ่อม</h6>
                <small className="text-white-50">พูดคุยรายละเอียดเพื่อลดปัญหาการทำงาน</small>
              </div>
            </div>
            <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)}></button>
          </div>

          {/* แถบเลือก Ticket งานซ่อมที่กำลังคุย */}
          <div className="p-2 bg-light border-bottom d-flex align-items-center gap-2">
            <span className="small fw-bold text-dark">งานซ่อมที่คุย:</span>
            <select 
              className="form-select form-select-sm border-secondary-subtle" 
              value={selectedTicketId} 
              onChange={(e) => setSelectedTicketId(e.target.value)}
              style={{ flex: 1 }}
            >
              {activeChatTickets.map(t => (
                <option key={t.id} value={t.id}>
                  🎫 {t.id} - ({t.location})
                </option>
              ))}
            </select>
          </div>

          {/* รายละเอียดปัญหาที่แจ้งโดยย่อ */}
          {currentTicketDetail && (
            <div className="p-2 bg-warning bg-opacity-10 text-dark small border-bottom">
              ⚠️ <b>ปัญหา:</b> {currentTicketDetail.problem}
            </div>
          )}

          {/* ช่องจำลองสลับผู้ส่ง (เพื่อใช้ทดสอบการสนทนา 2 ฝ่ายในการพรีเซนต์) */}
          <div className="px-3 py-1 bg-secondary bg-opacity-10 d-flex align-items-center justify-content-between border-bottom">
            <span className="small text-muted font-monospace">ส่งข้อความในฐานะ:</span>
            <div className="btn-group btn-group-sm" role="group">
              <button 
                type="button" 
                className={`btn btn-sm ${senderRole === 'User' ? 'btn-info text-dark fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setSenderRole('User')}
              >
                👤 ผู้แจ้ง
              </button>
              <button 
                type="button" 
                className={`btn btn-sm ${senderRole === 'Technician' ? 'btn-success text-white fw-bold' : 'btn-outline-secondary'}`}
                onClick={() => setSenderRole('Technician')}
              >
                🛠️ ช่าง ({currentTicketDetail?.technician || 'IT'})
              </button>
            </div>
          </div>

          {/* ข้อความในแชท */}
          <div className="flex-grow-1 p-3 overflow-auto custom-scrollbar" style={{ backgroundColor: '#f1f5f9' }}>
            {currentChatList.length > 0 ? (
              currentChatList.map((msg) => {
                const isMe = msg.sender === senderRole;
                return (
                  <div key={msg.id} className={`d-flex flex-column mb-3 ${isMe ? 'align-items-end' : 'align-items-start'}`}>
                    <div className="small text-muted mb-1 px-1" style={{ fontSize: '10px' }}>
                      {msg.sender === 'User' ? '👤 ผู้รับบริการ' : `🛠️ ช่าง ${currentTicketDetail?.technician || 'IT'}`}
                    </div>
                    <div 
                      className={`p-2 px-3 rounded-4 text-dark shadow-sm`} 
                      style={{ 
                        maxWidth: '80%', 
                        fontSize: '13px',
                        backgroundColor: isMe ? '#cff4fc' : '#ffffff',
                        border: isMe ? '1px solid #b6effb' : '1px solid #e2e8f0',
                        borderRadius: isMe ? '18px 18px 0px 18px' : '18px 18px 18px 0px'
                      }}
                    >
                      {msg.text}
                    </div>
                    <span className="text-muted" style={{ fontSize: '9px', marginTop: '2px' }}>{msg.time}</span>
                  </div>
                );
              })
            ) : (
              <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted small">
                <span className="fs-1 mb-2">💬</span>
                <span>ยังไม่มีการสนทนาในเรื่องนี้</span>
                <span>พิมพ์พิมพ์คำถามสอบถามได้เลยครับ!</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* แบบฟอร์มส่งแชท */}
          <form onSubmit={handleSendMessage} className="p-2 border-top bg-white d-flex gap-1">
            <input 
              type="text" 
              className="form-control form-control-sm" 
              placeholder="ถามตอบรายละเอียดที่นี่..." 
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              style={{ borderRadius: '20px' }}
            />
            <button type="submit" className="btn btn-sm btn-primary rounded-pill px-3 fw-bold">ส่ง</button>
          </form>

        </div>
      )}
    </div>
  );
};

// ==========================================
// ⭐ Component: ระบบให้คะแนนดาวช่าง (แก้ไขให้กดส่งแล้วลิ้งก์ข้อมูลทันที)
// ==========================================
const TechnicianRating = ({ ticketId, technicianName, onSubmitRating }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  return (
    <div className="p-3 bg-white rounded-3 shadow-sm border mt-2 text-center text-dark">
      <h6 className="fw-bold m-0">ให้คะแนนความพึงพอใจช่าง</h6>
      <p className="small text-muted mb-1">ช่าง: {technicianName || 'ไม่ระบุ'}</p>
      
      <div className="d-flex flex-column align-items-center">
        <div className="d-flex gap-1 mb-2">
          {[...Array(5)].map((_, i) => {
            const val = i + 1;
            return (
              <span 
                key={val} 
                style={{ fontSize: '1.8rem', cursor: 'pointer', color: val <= (hover || rating) ? '#ffc107' : '#e4e5e9' }}
                onClick={() => setRating(val)} 
                onMouseEnter={() => setHover(val)} 
                onMouseLeave={() => setHover(rating)}
              >
                ★
              </span>
            );
          })}
        </div>
        <button 
          className="btn btn-sm btn-primary px-3 rounded-pill" 
          disabled={rating === 0} 
          onClick={() => { 
            // 🟢 จุดสำคัญ: เรียกฟังก์ชันที่ส่งมาจากหน้า UserRatingView เพื่อบันทึกคะแนนและเด้งหน้าจอข้ามไปหน้าผลคะแนน
            onSubmitRating(ticketId, rating); 
          }}
        >
          ส่งคะแนน
        </button>
      </div>
    </div>
  );
};

// ==========================================
// 🔒 Component: หน้าล็อกอิน
// ==========================================
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  return (
    <div className="d-flex justify-content-center align-items-center vh-100" style={{ backgroundImage: "url('/pool.png')", backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="p-5 rounded-4 shadow text-center" style={{ width:'100%',maxWidth:'400px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(10px)' }}>
        <img src="/logo.png" alt="Logo" style={{ width: "120px", marginBottom: "15px" }} />
        <h3 className="fw-bold mb-1" style={{ color: "#8B6B2E" }}>Muang Samui Group</h3>
        <p style={{ color: "#666", fontSize: "14px" }}>Hotel Maintenance System</p>
        <input className="form-control mb-2" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input type="password" className="form-control mb-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="btn btn-primary w-100 rounded-pill" onClick={() => onLogin(username, password)}>Login</button>
      </div>
    </div>
  );
};

// =========================================================================
// 🏨 Component: หน้าเลือกฝั่งโรงแรม (หลัง Login ก่อนเข้าแจ้งซ่อม)
// =========================================================================
const DeskSelectionLanding = ({ onSelectDesk = () => {} }) => {
  return (
    <div 
      className="vw-100 vh-100 d-flex align-items-center justify-content-center"
      style={{
        backgroundImage: `linear-gradient(rgba(10, 25, 47, 0.75), rgba(10, 25, 47, 0.85)), url('https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=1920&q=80')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: "'Sarabun', sans-serif"
      }}
    >
      <div className="text-center p-4 p-md-5 rounded-4 shadow-lg text-white" style={{ maxWidth: '650px', backdropFilter: 'blur(8px)', backgroundColor: 'rgba(2, 12, 27, 0.85)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        
        {/* 💻 โลโก้ HELP และไอคอนคอมพิวเตอร์ */}
        <div className="position-relative mb-4 d-inline-block">
          <div className="p-3 bg-light bg-opacity-10 rounded-circle mb-2">
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#4ecdc4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>
          
          {/* กล่องข้อความ HELP สีส้มที่ลอยอยู่ด้านบน */}
          <div className="position-absolute" style={{ top: '15px', left: '50%', transform: 'translateX(-50%)' }}>
            <div className="badge bg-warning text-dark fw-bold px-3 py-2 fs-5 rounded-3 shadow-sm border border-dark">
              💬 HELP
            </div>
          </div>
        </div>

        {/* หัวข้อบอกให้เลือกฝั่ง */}
        <h3 className="fw-bold mb-2 text-white">กรุณาเลือกฝั่งการปฏิบัติงาน</h3>
        <p className="text-muted mb-4 small">โปรดเลือกฝั่งโรงแรมที่คุณต้องการแจ้งซ่อมหรือค้นหาข้อมูลรายการ</p>

        {/* 🔘 ปุ่มตัวเลือก 2 ฝั่ง */}
        <div className="row g-3 justify-content-center">
          
          {/* ฝั่งที่ 1: IT Help Desk MSM (สีแดงเข้ม) */}
          <div className="col-sm-6">
            <button 
              className="btn btn-lg w-100 py-3 text-white fw-bold shadow-sm transition-hover" 
              style={{ 
                backgroundColor: '#990000', 
                borderRadius: '12px',
                border: '1px solid #770000',
                fontSize: '16px'
              }}
              onClick={() => onSelectDesk('MSM')}
            >
              IT Help Desk MSM
            </button>
          </div>

          {/* ฝั่งที่ 2: IT Help Desk RMSV (สีเหลืองมัสตาร์ด/ทอง) */}
          <div className="col-sm-6">
            <button 
              className="btn btn-lg w-100 py-3 text-white fw-bold shadow-sm transition-hover" 
              style={{ 
                backgroundColor: '#996600', 
                borderRadius: '12px',
                border: '1px solid #774e00',
                fontSize: '16px'
              }}
              onClick={() => onSelectDesk('RMSV')}
            >
              IT Help Desk RMSV
            </button>
          </div>

        </div>

        <div className="mt-4 pt-3 border-top border-secondary">
          <small className="text-muted">ระบบจะจดจำเซสชันนี้จนกว่าคุณจะออกจากระบบ</small>
        </div>

      </div>

      <style>{`
        .transition-hover {
          transition: all 0.2s ease-in-out;
        }
        .transition-hover:hover {
          transform: translateY(-3px);
          filter: brightness(1.2);
          box-shadow: 0 5px 15px rgba(255,255,255,0.15) !important;
        }
      `}</style>
    </div>
  );
};

// ==========================================
// 🚀 MAIN APPLICATION COMPONENT
// ==========================================
function App() {
  const [currentView, setCurrentView] = useState('login'); 
  const [isLogin, setIsLogin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedDesk, setSelectedDesk] = useState('MSM');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 💬 ส่วนที่เพิ่มเข้าไปใหม่: State สำหรับเก็บข้อมูลแชทคุยกัน 2 คน
  const [chats, setChats] = useState({});

  // เริ่มต้นตั๋วหลัก
  const [tickets, setTickets] = useState([]);

  const [users, setUsers] = useState([
  {
    id: "U001",
    name: "Apichart Klaiboonnan",
    username: "admin",
    password:"123456",
    role: "admin",
    department: "IT"
  },
  {
    id: "U002",
    name: "Thadarat Chochai",
    username: "thadarat",
    password:"123456",
    role: "reporter",
    department: "Front Office"
  },
  {
    id: "U003",
    name: "Anuwat Promsri",
    username: "anuwat",
    password:"123456",
    role: "technician",
    department: "Maintenance"
  }
]);

  const handleLogin = (username, password) => {

    const user = users.find(
        u => u.username === username && u.password === password
    );

    if (!user) {
        alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        return;
    }

    setIsLogin(true);

    setCurrentUser(user);

    setCurrentView("landing");
};

  const handleSelectDesk = (deskName) => {
    setSelectedDesk(deskName); 
    if (currentUser?.role === 'admin') {
      setCurrentView('adminDashboard'); 
    } else {
      setCurrentView('dashboard'); 
    }
  };

  const getTechnicianStats = () => {
    const stats = {};
    users.forEach(u => {
      stats[u.name] = { name: u.name, totalJobs: 0, totalScore: 0, ratedJobs: 0 };
    });

    tickets.forEach(ticket => {
      let assigneeName = ticket.assignee ? ticket.assignee.trim() : '';
      if (assigneeName && assigneeName !== '-') {
        if (!stats[assigneeName]) {
          stats[assigneeName] = { name: assigneeName, totalJobs: 0, totalScore: 0, ratedJobs: 0 };
        }
        if (ticket.status === 'สำเร็จ') {
          stats[assigneeName].totalJobs += 1;
        }
        if (ticket.rating) {
          stats[assigneeName].totalScore += Number(ticket.rating);
          stats[assigneeName].ratedJobs += 1;
        }
      }
    });

    return Object.values(stats).map(tech => {
      const avg = tech.ratedJobs > 0 ? (tech.totalScore / tech.ratedJobs).toFixed(1) : "0.0";
      return { 
        ...tech, 
        average: avg, 
        starRating: Math.round(Number(avg)) 
      };
    });
  };

  const handleRateTechnician = (ticketId, score) => {
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, rating: score } : t));
  };

  // 🌍 โครงสร้างเมนูหลักที่จะล็อกแถบซ้าย (Sidebar Layout) ไว้ตลอดทุกสถานการณ์
  const MainSystemLayout = ({ isAdmin = false, activeMenu, children, ...props }) => {
    const changeView = props.setCurrentView || (typeof setCurrentView !== 'undefined' ? setCurrentView : null);
    const currentDesk = props.selectedDesk || (typeof selectedDesk !== 'undefined' ? selectedDesk : 'MSM');

    return (
      <div className="vw-100 vh-100 m-0 p-0 overflow-hidden" style={{ background: isAdmin ? 'linear-gradient(135deg, #1e1e2f, #2d2d44)' : '#0a192f' }}>
        <div className="row g-0 h-100">
          
          {/* 📌 แถบเมนูด้านซ้าย (Sidebar) ล็อกตายตัวไม่ขยับ */}
          <div className="col-lg-2 col-md-3 col-12 d-flex flex-column p-4 h-100 shadow-lg no-print" style={{ backgroundColor: '#020c1b', borderRight: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="text-center mb-4 text-white">
              <img src="/logo.png" alt="Logo" style={{ width: "90px", marginBottom: "10px" }} />
              <div className={`badge ${isAdmin ? 'bg-danger':'bg-primary'} px-3 py-1 rounded-pill mb-2`}>{isAdmin ? 'ADMIN MODE':'USER MODE'}</div>
              <h6 className="m-0 text-truncate">Apichart Klaiboonnan</h6>
              <small className="text-muted">IT Manager ({currentDesk})</small>
            </div>

            <div className="flex-grow-1 d-flex flex-column gap-2">
              {!isAdmin ? (
                <>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='userDash'?'bg-info text-dark fw-bold':''}`} onClick={() => changeView && changeView('dashboard')}>🏠 หน้าหลักระบบ</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='userForm'?'bg-info text-dark fw-bold':''}`} onClick={() => changeView && changeView('userForm')}>📝 ฟอร์มแจ้งซ่อมใหม่</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='userTech'?'bg-info text-dark fw-bold':''}`} onClick={() => changeView && changeView('userTechSummary')}>📊 ผลคะแนนทีมช่าง</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='userRates'?'bg-info text-dark fw-bold':''}`} onClick={() => changeView && changeView('userRatings')}>⭐ ประเมินงานซ่อม</button>
                </>
              ) : (
                <>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='adminDash'?'bg-danger fw-bold':''}`} onClick={() => changeView && changeView('adminDashboard')}>📝 รายการแจ้งซ่อม</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='adminUsers'?'bg-danger fw-bold':''}`} onClick={() => changeView && changeView('adminUsers')}>👥 จัดการผู้ใช้งาน</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='adminTech'?'bg-danger fw-bold':''}`} onClick={() => changeView && changeView('adminTechSummary')}>⭐ ประเมินนายช่าง</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='adminReports'?'bg-danger fw-bold':''}`} onClick={() => changeView && changeView('adminReports')}>📊 ดูรายงานกราฟ</button>
                  <button className={`btn w-100 text-start text-white p-2 small border-0 ${activeMenu==='adminSettings'?'bg-danger fw-bold':''}`} onClick={() => changeView && changeView('adminSettings')}>⚙️ ตั้งค่าระบบ</button>
                </>
              )}
            </div>

            <div className="mt-auto pt-3 border-top border-secondary d-flex flex-column gap-2">
              {!isAdmin ? (
                <button className="btn btn-sm btn-outline-danger w-100" onClick={() => changeView && changeView('adminDashboard')}>⚙️ สลับไปหลังบ้าน Admin</button>
              ) : (
                <button className="btn btn-sm btn-outline-info w-100" onClick={() => changeView && changeView('dashboard')}>← กลับหน้าหลัก User</button>
              )}
              <button className="btn btn-sm btn-dark w-100" onClick={() => changeView && changeView('landing')}>Main Menu</button>
            </div>
          </div>

          {/* 📝 ส่วนเนื้อหาขวาแปรผันตามหน้า */}
          <div className="col-lg-10 col-md-9 col-12 p-4 h-100 d-flex flex-column overflow-hidden">
            <UserStatusHeader setCurrentView={changeView} tickets={tickets} setTickets={setTickets} {...props} />
            <div className="flex-grow-1 overflow-auto custom-scrollbar p-1">
              {children}
            </div>
          </div>

        </div>
      </div>
    );
  };

  // =========================================================================
  // 🔍 COMPONENT: ระบบค้นหาอัจฉริยะ (Smart Search Engine & History Container)
  // =========================================================================
  const UserTicketHistoryTable = ({ tickets = [], selectedDesk = 'MSM' }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedImage, setSelectedImage] = useState(null);
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'sender', 'location'

    // กรองตั๋วตามแท็ปค้นหา
    const filteredTickets = tickets.filter((t) => {
      // คัดเฉพาะตั๋วที่ตรงกับแผนกปฏิบัติการปัจจุบัน
      if (t.branch && t.branch !== selectedDesk.toLowerCase()) return false;

      const search = searchTerm.toLowerCase();
      if (!search) return true;

      const senderName = (t.sender || t.createdBy || '').toLowerCase();
      const roomNumber = (t.room || '').toLowerCase();
      const ticketId = (t.id || '').toLowerCase();
      const locationName = (t.location || '').toLowerCase();
      const problemDetail = (t.problem || '').toLowerCase();
      const techName = (t.technician || t.assignee || '').toLowerCase();
      const statusName = (t.status || '').toLowerCase();

      if (activeFilter === 'sender') {
        return senderName.includes(search);
      } else if (activeFilter === 'location') {
        return locationName.includes(search) || roomNumber.includes(search);
      } else {
        // 'all' ค้นหาแบบกวาดข้อมูลทุกอย่าง
        return (
          senderName.includes(search) ||
          roomNumber.includes(search) ||
          ticketId.includes(search) ||
          locationName.includes(search) ||
          problemDetail.includes(search) ||
          techName.includes(search) ||
          statusName.includes(search)
        );
      }
    });

    return (
      <div className="card p-4 bg-white shadow rounded-4 text-dark border-0">
        
        {/* ===================================================== */}
        {/* 🔍 ย้ายปุ่มกรองแท็ป และ ช่องค้นหาอัจฉริยะ มาไว้ที่หัวข้อมูลที่นี่ */}
        {/* ===================================================== */}
        <div className="mb-4 p-4 rounded-4" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="p-2 bg-primary bg-opacity-10 rounded-3">🔍</div>
            <h5 className="fw-bold m-0 text-dark">ระบบค้นหาและตัวกรองข้อมูลอัจฉริยะ</h5>
          </div>

          {/* แท็ปตัวเลือกการค้นหาอัปเดตแบบ Interactive */}
          <div className="d-flex gap-2 mb-3">
            <button 
              className={`btn btn-sm rounded-pill px-3 py-2 fw-bold transition-hover ${activeFilter === 'all' ? 'btn-dark text-white' : 'btn-outline-secondary'}`}
              onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
            >
              🌐 ค้นหาทั้งหมด
            </button>
            <button 
              className={`btn btn-sm rounded-pill px-3 py-2 fw-bold transition-hover ${activeFilter === 'sender' ? 'btn-primary text-white' : 'btn-outline-primary'}`}
              onClick={() => { setActiveFilter('sender'); setSearchTerm(''); }}
            >
              👤 ค้นหาตามคนแจ้ง
            </button>
            <button 
              className={`btn btn-sm rounded-pill px-3 py-2 fw-bold transition-hover ${activeFilter === 'location' ? 'btn-info text-dark' : 'btn-outline-info'}`}
              onClick={() => { setActiveFilter('location'); setSearchTerm(''); }}
            >
              📍 ค้นหาตามห้อง / สถานที่
            </button>
          </div>

          {/* ช่องกรอกค้นหาแถบยาว */}
          <div className="position-relative">
            <input
              type="text"
              placeholder={
                activeFilter === 'sender' ? "ระบุชื่อผู้แจ้งเพื่อเริ่มค้นหา..." :
                activeFilter === 'location' ? "ระบุพิกัด, ห้องสัมมนา หรือหมายเลขห้องพัก..." :
                "ค้นหาได้ทุกอย่าง (รหัส Ticket, รายละเอียดปัญหา, ช่างผู้รับผิดชอบ, แผนก)..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control form-control-lg border-2 shadow-sm"
              style={{ borderRadius: '12px', fontSize: '15px', paddingLeft: '45px' }}
            />
            <span className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted" style={{ fontSize: '1.2rem' }}>🔍</span>
            {searchTerm && (
              <button 
                className="btn btn-sm btn-link position-absolute top-50 end-0 translate-middle-y me-2 text-decoration-none text-muted"
                onClick={() => setSearchTerm('')}
              >
                ✕ ล้างข้อมูล
              </button>
            )}
          </div>
        </div>

        <div className="border-bottom pb-3 mb-3">
          <h6 className="fw-bold mb-0 text-primary d-flex align-items-center gap-2">
            <span>📋</span> ประวัติการแจ้งเรื่องและสถานะงานซ่อมทั้งหมด ({selectedDesk})
          </h6>
        </div>

        {/* 📊 ตารางประวัติ */}
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '14px' }}>
            <thead className="table-dark">
              <tr className="text-white">
                <th scope="col" style={{ width: '12%', borderTopLeftRadius: '10px' }}>Ticket No</th>
                <th scope="col" style={{ width: '12%' }}>วันที่แจ้ง</th>
                <th scope="col" style={{ width: '25%' }}>ผู้แจ้ง / ห้อง / สถานที่</th>
                <th scope="col" style={{ width: '25%' }}>ปัญหาที่แจ้ง</th>
                <th scope="col" style={{ width: '13%' }}>ช่างรับผิดชอบ</th>
                <th scope="col" style={{ width: '13%', borderTopRightRadius: '10px' }}>สถานะงาน</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length > 0 ? (
                filteredTickets.map((t) => (
                  <tr key={t.id} className="border-bottom">
                    <td>
                      <span className="badge bg-primary bg-opacity-10 text-primary fw-bold p-2">
                        🎫 {t.id}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {t.date ? t.date.split(' ')[0] : '-'}
                    </td>
                    <td className="text-start">
                      <div className="fw-bold text-dark">{t.sender || t.createdBy || 'ไม่ระบุชื่อผู้แจ้ง'}</div>
                      <div className="text-muted small">
                        🚪 ห้อง: <span className="text-primary fw-bold">{t.room && t.room !== '-' ? t.room : 'ทั่วไป'}</span>
                      </div>
                      <div className="text-muted text-truncate" style={{ fontSize: '11px', maxWidth: '200px' }}>
                        📍 {t.location} {t.dept ? `(${t.dept})` : ''}
                      </div>
                    </td>
                    <td className="text-start">
                      <div className="p-2 bg-light rounded text-dark border-start border-3 border-warning d-flex justify-content-between align-items-start" style={{ fontSize: '13px' }}>
                        <span className="text-truncate" style={{ maxWidth: '180px' }}>{t.problem}</span>
                        {t.image && (
                          <button 
                            type="button" 
                            className="btn btn-sm btn-outline-primary p-0 px-1 ms-1" 
                            onClick={() => setSelectedImage(t.image)}
                            style={{ fontSize: '10px', borderRadius: '4px' }}
                          >
                            📷 รูป
                          </button>
                        )}
                      </div>
                      {t.priority === 'ด่วน' && <span className="badge bg-warning text-dark mt-1" style={{ fontSize: '10px' }}>ด่วน ⚡</span>}
                      {t.priority === 'ด่วนที่สุด' && <span className="badge bg-danger mt-1 animate-pulse" style={{ fontSize: '10px' }}>ด่วนที่สุด 🔥</span>}
                    </td>
                    <td>
                      {t.technician || (t.assignee && t.assignee !== '-') ? (
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <span className="bg-secondary text-white rounded-circle d-inline-flex align-items-center justify-content-center fw-bold" style={{ width: '24px', height: '24px', fontSize: '11px' }}>
                            {(t.technician || t.assignee).charAt(0)}
                          </span>
                          <span className="fw-bold small text-dark text-truncate" style={{ maxWidth: '90px' }}>{t.technician || t.assignee}</span>
                        </div>
                      ) : (
                        <span className="text-muted italic small">⌛ รอช่าง</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge px-3 py-2 rounded-pill fw-bold ${
                        t.status === 'เปิด Ticket' ? 'bg-info text-dark' :
                        t.status === 'กำลังดำเนินการ' ? 'bg-warning text-dark' :
                        t.status === 'เสร็จสิ้น' || t.status === 'สำเร็จ' ? 'bg-success text-white' : 'bg-secondary'
                      }`} style={{ fontSize: '12px' }}>
                        {t.status === 'เปิด Ticket' ? '📝 รอรับเรื่อง' :
                         t.status === 'กำลังดำเนินการ' ? '⚙️ ดำเนินการ' : '✅ สำเร็จ'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-5 text-center text-muted">
                    <div style={{ fontSize: '2rem' }}>🔍</div>
                    <div className="mt-2 fw-bold">ไม่พบรายการแจ้งซ่อมที่ตรงกับคำค้นหาของคุณ</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 📸 MODAL แสดงรูปภาพ */}
        {selectedImage && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down modal-dialog modal-dialog-centered modal-fullscreen-sm-down-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg">
                <div className="modal-header border-0 pb-0 justify-content-between align-items-center mt-2 px-3">
                  <h6 className="modal-title fw-bold text-dark">📷 ภาพถ่ายสถานการณ์จริง</h6>
                  <button type="button" className="btn-close" onClick={() => setSelectedImage(null)}></button>
                </div>
                <div className="modal-body text-center p-3">
                  <img src={selectedImage} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '400px', objectFit: 'contain' }} />
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-secondary btn-sm w-100 rounded-pill" onClick={() => setSelectedImage(null)}>ปิดหน้าต่าง</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // 🏠 Component หลัก: หน้าอินเตอร์เฟสผู้ใช้งานหลัก
  // ==========================================
  const UserDashboardMain = ({ tickets = [], setTickets, setCurrentView, selectedDesk = 'MSM' }) => {
    const unrated = tickets.filter(t => t.status === 'สำเร็จ' && !t.rating);
    
    const handleAddTicket = (formData) => {
      const nextId = `IT${String(tickets.length + 1).padStart(3, '0')}`;
      const newTicket = { 
        id: nextId, 
        date: new Date().toLocaleString('th-TH'), 
        ...formData, 
        timeAccept: '-', 
        solution: '', 
        status: 'เปิด Ticket', 
        createdBy: formData.sender || 'Apichart', 
        assignee: '-', 
        branch: selectedDesk ? selectedDesk.toLowerCase() : 'msm', 
        cost: 0 
      };
      if (setTickets) setTickets([newTicket, ...tickets]);
    };

    return (
      <MainSystemLayout 
        activeMenu="userDash" 
        isAdmin={false}
        setCurrentView={setCurrentView}
        selectedDesk={selectedDesk}
        tickets={tickets}
        setTickets={setTickets}
      >
        {unrated.length > 0 && (
          <div className="alert alert-warning mb-3 d-flex justify-content-between align-items-center animate-pulse shadow-sm">
            <span className="fw-bold text-dark">🔔 มีงานสำเร็จที่ค้างให้คะแนนประเมินนายช่างอยู่จำนวน {unrated.length} รายการ</span>
            <button className="btn btn-sm btn-dark rounded-pill px-3" onClick={() => setCurrentView('userRatings')}>ไปหน้าประเมิน</button>
          </div>
        )}
        
        {/* เรียกใช้งานตารางและตัวค้นหาด้านล่าง */}
        <UserTicketHistoryTable tickets={tickets} selectedDesk={selectedDesk} />
      </MainSystemLayout>
    );
  };

  // =========================================================================
  // 📝 2. Component หน้าฟอร์มบันทึกรายการแจ้งซ่อมใหม่
  // =========================================================================
  const UserFormView = () => {
    const [formData, setFormData] = useState({ 
      location: '', 
      dept: '', 
      room: '', 
      priority: '', 
      typeOrder: '', 
      problem: '',
      image: null 
    });
    
    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData({ ...formData, image: reader.result }); 
        };
        reader.readAsDataURL(file);
      }
    };

    const handleFormSubmit = (e) => {
      e.preventDefault();
      if (!formData.location || !formData.dept || !formData.problem || !formData.priority || !formData.typeOrder) {
        return alert("❌ กรุณากรอกรายละเอียดและเลือกตัวเลือกให้ครบถ้วนด้วยครับ");
      }
      
      const nextId = `IT${String(tickets.length + 1).padStart(3, '0')}`;
      
      const newTicket = { 
        id: nextId, 
        date: new Date().toLocaleString('th-TH'), 
        ...formData, 
        timeAccept: '-', 
        solution: '', 
        status: 'เปิด Ticket', 
        createdBy: 'Apichart', 
        assignee: '-', 
        branch: selectedDesk.toLowerCase(), 
        cost: 0 
      };
      
      setTickets([newTicket, ...tickets]);
      alert(`🎉 ส่งแจ้งซ่อมเรียบร้อย! หมายเลขเคส: ${nextId}`);
      setCurrentView('dashboard');
    };

    return (
      <MainSystemLayout activeMenu="userForm" isAdmin={false}>
        <div className="card p-4 shadow-lg bg-white border-0 rounded-4 text-dark">
          <h4 className="text-primary fw-bold border-bottom pb-2 mb-4 text-center">🛠️ ฟอร์มบันทึกรายการแจ้งซ่อมออนไลน์ ({selectedDesk})</h4>
          
          <form onSubmit={handleFormSubmit}>
            <div className="row g-4">
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>สถานที่</label>
                <input type="text" className="form-control text-center border-danger-subtle" style={{ borderRadius: '8px' }} placeholder="ระบุสถานที่เกิดเหตุ" value={formData.location} onChange={e=>setFormData({...formData, location:e.target.value})} />
              </div>
              
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>แผนก</label>
                <select className="form-select border-danger-subtle" style={{ borderRadius: '8px' }} value={formData.dept} onChange={e => setFormData({...formData, dept: e.target.value})}>
                  <option value="">เลือกแผนก...</option>
                  <option value="IT">IT</option>
                  <option value="Sale & Marketing">Sale & Marketing</option>
                  <option value="Housekeeping MSM">Housekeeping MSM</option>
                  <option value="Main Kitchen Anand">Main Kitchen Anand</option>
                  <option value="Main Kitchen Samui Seafood">Main Kitchen Samui Seafood</option>
                  <option value="Front Office Msm">Front Office Msm</option>
                  <option value="Engineer MSM">Engineer MSM</option>
                  <option value="Spa MSM">Spa MSM</option>
                  <option value="Samui Seafood">Samui Seafood</option>
                  <option value="Anand">Anand</option>
                  <option value="Hr msm">Hr msm</option>
                  <option value="Nanyuan Lamai">Nanyuan Lamai</option>
                  <option value="Kinkao Kinpra">Kinkao Kinpra</option>
                  <option value="Account msm">Account msm</option>
                </select>
              </div>
              
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>Room Number</label>
                <input type="text" className="form-control text-center border-danger-subtle" style={{ borderRadius: '8px' }} placeholder="ระบุหมายเลขห้อง (ถ้ามี)" value={formData.room} onChange={e=>setFormData({...formData, room:e.target.value})} />
              </div>
              
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>ความสำคัญ</label>
                <select className="form-select border-danger-subtle" style={{ borderRadius: '8px' }} value={formData.priority} onChange={e=>setFormData({...formData, priority:e.target.value})}>
                  <option value="">เลือกความสำคัญ...</option>
                  <option value="ปกติ">ปกติ</option>
                  <option value="ด่วน">ด่วน ⚡</option>
                  <option value="ด่วนที่สุด">ด่วนที่สุด 🔥</option>
                </select>
              </div>
              
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>Type Order</label>
                <input 
                  className="form-control border-danger-subtle" 
                  style={{ borderRadius: '8px' }} 
                  list="typeOrderOptions"
                  placeholder="เลือกหรือพิมพ์ประเภท..."
                  value={formData.typeOrder} 
                  onChange={e => setFormData({...formData, typeOrder: e.target.value})}
                />
                <datalist id="typeOrderOptions">
                  <option value="Wifi" />
                  <option value="Internet Office" />
                  <option value="Opera" />
                  <option value="Micros" />
                  <option value="MC" />
                  <option value="SUN" />
                  <option value="Slip Printer (Print Bill ไม่ออก)" />
                  <option value="Slip Printer (Print Order ไม่ออก)" />
                  <option value="Wongnai POS" />
                  <option value="Ocha POS" />
                  <option value="CCTV" />
                </datalist>
              </div>
              
              <div className="col-lg-4 col-md-6 col-12 text-center">
                <label className="fw-bold mb-2" style={{ color: '#d93838' }}>ปัญหาที่แจ้ง</label>
                <input type="text" className="form-control border-danger-subtle" style={{ borderRadius: '8px' }} placeholder="ระบุอาการเสียที่พบ..." value={formData.problem} onChange={e=>setFormData({...formData, problem:e.target.value})} />
              </div>

              <div className="col-md-12 mt-4">
                <div className="p-3 border rounded-3 bg-light">
                  <label className="fw-bold small mb-2 text-success">📷 ถ่ายภาพหรือแนบรูปภาพสถานการณ์จริง (ถ้ามี)</label>
                  <input type="file" className="form-control" accept="image/*" onChange={handleImageChange} />
                  
                  {formData.image && (
                    <div className="mt-3 text-center">
                      <p className="small text-muted mb-1">📷 ตัวอย่างภาพสถานการณ์ที่ถ่าย/แนบมา:</p>
                      <img src={formData.image} alt="Preview" className="img-fluid rounded shadow-sm" style={{ maxHeight: '220px', objectFit: 'contain' }} />
                      <div className="mt-2">
                        <button type="button" className="btn btn-sm btn-outline-danger rounded-pill px-3" onClick={() => setFormData({ ...formData, image: null })}>ลบรูปภาพ ❌</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="text-center mt-4">
              <button type="submit" className="btn btn-primary px-5 rounded-pill fw-bold shadow-sm py-2">ส่งข้อมูลแจ้งซ่อมระบบ 🚀</button>
            </div>
          </form>
        </div>
      </MainSystemLayout>
    );
  };

  // ==========================================
  // ⭐ 3. หน้าประเมินคะแนนความพึงพอใจ
  // ==========================================
  const UserRatingView = () => {
    const unratedTickets = tickets.filter(t => t.status === 'สำเร็จ' && !t.rating);
    
    return (
      <MainSystemLayout activeMenu="userRates" isAdmin={false}>
        <div className="card p-4 bg-white shadow rounded-4 text-dark">
          <h4 className="fw-bold text-dark border-bottom pb-2 mb-3 text-center">⭐ รายการงานซ่อมเสร็จสิ้น (รอคิวประเมินผล)</h4>
          {unratedTickets.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <h5>ไม่มีเคสค้างประเมินในระบบในขณะนี้ครับ 🎉</h5>
              <button className="btn btn-sm btn-outline-primary rounded-pill mt-2 px-3" onClick={() => setCurrentView('userTechSummary')}>📊 ไปหน้าผลคะแนนทีมช่าง</button>
            </div>
          ) : (
            <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
              {unratedTickets.map(t => (
                <div key={t.id} className="col-md-6 col-lg-4">
                  <div className="p-3 border rounded-3 bg-light shadow-sm">
                    <span className="badge bg-success mb-2">เคสเสร็จสิ้น</span>
                    <h6 className="fw-bold text-primary">🎫 {t.id}</h6>
                    <p className="small mb-1 text-truncate"><b>🛠️ อาการ:</b> {t.problem}</p>
                    
                    <TechnicianRating 
                      ticketId={t.id} 
                      technicianName={t.assignee} 
                      onSubmitRating={(id, score) => {
                        handleRateTechnician(id, score);
                        alert(`⭐️ บันทึกคะแนนให้ช่าง ${t.assignee} เรียบร้อยแล้ว! ระบบกำลังพาไปหน้าผลคะแนนทีมช่าง`);
                        setCurrentView('userTechSummary');
                      }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </MainSystemLayout>
    );
  };

  // ==========================================
  // 📊 4. หน้าสรุปอันดับเรตติ้งของทีมช่าง
  // ==========================================
  const UserTechSummary = (props) => {
    const tickets = props.tickets || window.tickets || [];
    const getTechnicianStats = props.getTechnicianStats || window.getTechnicianStats;
    const techData = getTechnicianStats ? getTechnicianStats() : [];
    
    const [selectedTechName, setSelectedTechName] = useState(null);
    const [modalSearchTerm, setModalSearchTerm] = useState('');

    const getTechJobDetails = (techName) => {
      if (!tickets) return [];
      
      const baseJobs = tickets.filter(
        (ticket) => 
          ((ticket.technician === techName) || (ticket.assignee === techName)) && 
          (ticket.status === 'สำเร็จ' || ticket.status === 'เสร็จสิ้น')
      );

      if (!modalSearchTerm) return baseJobs;
      const search = modalSearchTerm.toLowerCase();
      return baseJobs.filter(job => 
        (job.id || '').toLowerCase().includes(search) ||
        (job.problem || '').toLowerCase().includes(search) ||
        (job.location || '').toLowerCase().includes(search)
      );
    };

    const selectedTechJobs = selectedTechName ? getTechJobDetails(selectedTechName) : [];

    return (
      <MainSystemLayout activeMenu="userTech" isAdmin={false}>
        <div className="card p-4 bg-white shadow rounded-4 text-dark">
          <h4 className="fw-bold mb-2 border-bottom pb-2 text-center text-primary">📊 อันดับเรตติ้งความพึงพอใจของทีมช่าง</h4>
          <p className="text-center text-muted small mb-4">💡 แตะที่การ์ดของช่างแต่ละคน เพื่อเปิดดูประวัติงานและวิเคราะห์ผลงานซ่อมทั้งหมดได้</p>
          
          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
            {techData.map((tech, i) => (
              <div className="col-md-4" key={i}>
                <div 
                  className="card p-3 text-center border shadow-sm h-100 rounded-3"
                  style={{ cursor: 'pointer', transition: 'all 0.2s ease-in-out' }}
                  onClick={() => {
                    setSelectedTechName(tech.name);
                    setModalSearchTerm(''); 
                  }} 
                  onMouseOver={(e) => {
                    e.currentTarget.style.border = "1px solid #0d6efd";
                    e.currentTarget.style.transform = "translateY(-3px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.border = "1px solid #dee2e6";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div className="mx-auto rounded-circle bg-dark text-white p-3 mb-2 fw-bold d-flex align-items-center justify-content-center" style={{ width: '55px', height: '55px', fontSize: '1.2rem' }}>
                    {tech.name ? tech.name.charAt(0) : '🛠️'}
                  </div>
                  <h6 className="fw-bold mb-1 text-dark text-truncate">{tech.name}</h6>
                  <div className="text-warning my-1" style={{ fontSize: '1.2rem' }}>
                    {'★'.repeat(tech.starRating || 0)}{'☆'.repeat(5 - (tech.starRating || 0))}
                  </div>
                  <p className="small text-muted mb-0 fw-bold">
                    คะแนนเฉลี่ย: <span className="text-primary">{tech.average || '0.0'}</span> ดาว
                  </p>
                  <div className="mt-2">
                    <span className="badge bg-success-subtle text-success border border-success-subtle px-3 py-1 rounded-pill small">
                      ✅ ทำสำเร็จ {tech.totalJobs || 0} งาน
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pop-up รายละเอียดงานทีมช่าง */}
        {selectedTechName && (
          <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 1500 }}>
            <div className="bg-white p-4 rounded-4 shadow-lg w-100 mx-3 text-dark" style={{ maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
              <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                <div className="d-flex align-items-center gap-2">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold" style={{ width: '40px', height: '40px' }}>
                    {selectedTechName.charAt(0)}
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">ช่าง {selectedTechName}</h5>
                    <small className="text-muted">รายการงานซ่อมและคะแนนประเมิน</small>
                  </div>
                </div>
                <button className="btn-close" onClick={() => setSelectedTechName(null)}></button>
              </div>

              <div className="mb-3">
                <input 
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="🔍 ค้นหารายการซ่อม... (เลขตั๋ว, อาการเสีย, สถานที่)"
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  style={{ borderRadius: '6px' }}
                />
              </div>

              <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1 }}>
                {selectedTechJobs.length > 0 ? (
                  <div className="d-flex flex-column gap-3 pe-1">
                    {selectedTechJobs.map((job) => (
                      <div key={job.id} className="p-3 bg-light rounded-3 border">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="badge bg-primary-subtle text-primary fw-bold">🎫 {job.id}</span>
                          <small className="text-muted">{job.date || job.modified || 'ไม่ระบุวันที่'}</small>
                        </div>
                        <div className="small mb-2 text-dark">
                          <div><b>📍 สถานที่/ห้อง:</b> {job.location} {job.room ? `(ห้อง ${job.room})` : ''}</div>
                          <div><b>🛠️ ปัญหาที่แจ้งซ่อม:</b> {job.problem}</div>
                        </div>
                        <div className="p-2 bg-white rounded border-start border-3 border-warning small">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="fw-bold text-dark">⭐ คะแนนความพึงพอใจ:</span>
                            <span className="text-warning" style={{ fontSize: '1rem' }}>
                              {job.rating ? (
                                <>
                                  {'★'.repeat(job.rating)}{'☆'.repeat(5 - job.rating)}
                                  <span className="text-muted ms-1">({job.rating}/5)</span>
                                </>
                              ) : (
                                <span className="text-muted">ยังไม่มีคะแนน</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted">
                    <span>📁</span>
                    <p className="mt-2 small">ไม่พบรายการซ่อมของช่างคนนี้</p>
                  </div>
                )}
              </div>

              <div className="border-top pt-3 mt-3 text-end">
                <button className="btn btn-primary btn-sm px-4 rounded-pill" onClick={() => setSelectedTechName(null)}>ปิดหน้าต่าง</button>
              </div>
            </div>
          </div>
        )}
      </MainSystemLayout>
    );
  };

  // =========================================================================
  // 🏢 VIEWS: ระบบของฝั่ง ADMIN หลังบ้าน (ปรับปรุงย้ายระบบค้นหามาไว้ที่นี่เรียบร้อย)
  // =========================================================================
  const AdminDashboard = () => {
    const [managingTicket, setManagingTicket] = useState(null);
    const [repairForm, setRepairForm] = useState({ assignee: '', cost: 0, solution: '', image: '', status: '' });

    const openManageModal = (ticket) => {
      setManagingTicket(ticket);
      setRepairForm({
        assignee: ticket.assignee !== '-' ? ticket.assignee : '',
        cost: ticket.cost || 0,
        solution: ticket.solution || '',
        status: ticket.status,
        image: ticket.image || '' 
      });
    };

    const saveTicketManagement = () => {
      if (!managingTicket) return;
      const updatedData = {
        assignee: repairForm.assignee,
        cost: Number(repairForm.cost) || 0,
        solution: repairForm.solution,
        status: repairForm.status,
        image: repairForm.image || '', 
      };

      setTickets(prevTickets => prevTickets.map(t => {
        if (t.id === managingTicket.id) {
          return {
            ...t,
            ...updatedData,
            imageBefore: t.imageBefore || t.image || '', 
            modified: new Date().toLocaleDateString('th-TH')
          };
        }
        return t;
      }));

      alert(`💾 บันทึกและส่งงานเคส ${managingTicket.id} เรียบร้อยแล้ว!`);
      setManagingTicket(null); 
    };

    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setRepairForm(prev => ({ ...prev, image: reader.result }));
        };
        reader.readAsDataURL(file);
      }
    };

    return (
      <MainSystemLayout activeMenu="adminDash" isAdmin={true} tickets={tickets} setTickets={setTickets}>
        <h3 className="text-white fw-bold mb-4">📁 ระบบบริหารจัดการงานและสถิติข้อมูลแอดมิน</h3>
        
        {/* ===================================================== */}
        {/* 🌟 ย้ายหน้าประวัติและกล่องค้นหาข้อมูล (Smart Search Panel) มาวางไว้ในหน้าหลังบ้านแอดมินตามคำขอที่นี่! */}
        {/* ===================================================== */}
        <div className="mb-4">
          <UserTicketHistoryTable tickets={tickets} selectedDesk={selectedDesk} />
        </div>

        {/* ตารางแสดงรายการเฉพาะฝั่ง Admin ที่มีปุ่มป้อนข้อมูลปิดงาน */}
        <div className="bg-white rounded-4 shadow overflow-hidden text-dark p-4 mt-4">
          <div className="border-bottom pb-3 mb-3">
            <h5 className="fw-bold mb-0 text-dark">👨‍💻 ตารางปฏิบัติงานช่างด่วน (สรุปความคืบหน้า)</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-hover mb-0 text-center">
              <thead className="table-dark">
                <tr>
                  <th>Ticket No</th>
                  <th>แผนก</th>
                  <th>ความเร่งด่วน</th>
                  <th>ปัญหาที่พบ</th>
                  <th>ช่างผู้รับผิดชอบ</th>
                  <th>ค่าใช้จ่าย</th>
                  <th>สถานะ</th>
                  <th className="text-center">เครื่องมือจัดการ</th>
                </tr>
              </thead>
              <tbody>
                {tickets.length > 0 ? (
                  tickets.map((t, idx) => (
                    <tr key={idx} className="align-middle">
                      <td><b>{t.id}</b></td>
                      <td>{t.dept}</td>
                      <td>
                        <span className={`badge ${t.priority === 'ด่วน' || t.priority === 'ด่วนที่สุด' ? 'bg-danger' : 'bg-secondary'}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="text-start">{t.problem}</td>
                      <td><span className="badge bg-light text-dark border">{t.assignee}</span></td>
                      <td className="fw-bold text-success">{t.cost > 0 ? `${t.cost.toLocaleString()} ฿` : '0 ฿'}</td>
                      <td>
                        <span className={`badge ${t.status === 'สำเร็จ' ? 'bg-success' : t.status === 'กำลังดำเนินการ' ? 'bg-warning text-dark' : 'bg-primary'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="text-center">
                        <button className="btn btn-sm btn-dark rounded-pill px-3" onClick={() => openManageModal(t)}>
                          ⚙️ จัดการเคส
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-4 text-center text-muted">ไม่มีรายการแจ้งซ่อมขณะนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pop-up การจัดการและอัปเดตงานซ่อม */}
        {managingTicket && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down modal-md modal-dialog modal-dialog-centered modal-fullscreen-sm-down-centered">
              <div className="modal-content text-dark border-0 shadow rounded-4">
                <div className="modal-header bg-dark text-white rounded-top-4">
                  <h5 className="modal-title fw-bold">⚙️ จัดการเคสซ่อม: {managingTicket.id}</h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setManagingTicket(null)}></button>
                </div>
                <div className="modal-body p-4 bg-light">
                  <div className="mb-3">
                    <p className="mb-1"><strong>❌ อาการเสีย:</strong> <span className="text-danger">{managingTicket.problem}</span></p>
                    <p className="small text-muted mb-0">📍 สถานที่: {managingTicket.location}</p>
                  </div>
                  <hr />
                  
                  {/* อัปเดตสถานะงาน */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small">🔄 อัปเดตสถานะงานซ่อม</label>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill rounded-3 py-2 fw-bold ${repairForm.status === 'กำลังดำเนินการ' ? 'btn-warning text-dark' : 'btn-outline-warning text-dark'}`}
                        onClick={() => setRepairForm({ ...repairForm, status: 'กำลังดำเนินการ' })}
                      >
                        ⚙️ กำลังดำเนินการ
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm flex-fill rounded-3 py-2 fw-bold ${repairForm.status === 'สำเร็จ' ? 'btn-success text-white' : 'btn-outline-success'}`}
                        onClick={() => setRepairForm({ ...repairForm, status: 'สำเร็จ' })}
                      >
                        ✅ เสร็จสิ้นงาน
                      </button>
                    </div>
                  </div>

                  {/* เลือกช่าง */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small">👨‍🔧 ช่างผู้รับผิดชอบงาน</label>
                    <select className="form-select form-select-sm" value={repairForm.assignee} onChange={(e) => setRepairForm({...repairForm, assignee: e.target.value})}>
                      <option value="">-- เลือกช่างผู้รับผิดชอบ --</option>
                      {users.map((u, i) => (
                        <option key={i} value={u.name}>{u.name} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  {/* ระบุค่าใช้จ่าย */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark">💰 ค่าใช้จ่ายในการซ่อม (บาท)</label>
                    <div className="input-group input-group-sm">
                      <span className="input-group-text bg-light">฿</span>
                      <input 
                        type="number" 
                        className="form-control" 
                        placeholder="0" 
                        value={repairForm.cost || ''} 
                        onChange={(e) => setRepairForm({ ...repairForm, cost: e.target.value })} 
                      />
                    </div>
                  </div>

                  {/* วิธีแก้ไข */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small">✅ วิธีการแก้ไขของช่าง</label>
                    <textarea className="form-control form-control-sm" rows="3" value={repairForm.solution} onChange={(e) => setRepairForm({...repairForm, solution: e.target.value})} placeholder="ระบุรายละเอียดการทำงานซ่อมแซม..."></textarea>
                  </div>

                  {/* อัปโหลดรูปภาพเปรียบเทียบ Before & After */}
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-dark">📊 ภาพเปรียบเทียบผลงานซ่อมแซม</label>
                    <div className="row g-2 mb-2">
                      <div className="col-6">
                        <div className="p-2 border rounded-3 bg-white text-center h-100 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '130px' }}>
                          <span className="badge bg-danger mb-1" style={{ fontSize: '10px' }}>BEFORE</span>
                          {managingTicket && (managingTicket.imageBefore || managingTicket.image) ? (
                            <img src={managingTicket.imageBefore || managingTicket.image} alt="Before" className="img-fluid rounded shadow-sm" style={{ maxHeight: '90px', objectFit: 'contain' }} />
                          ) : (
                            <div className="text-muted small italic p-2" style={{ fontSize: '11px' }}>ไม่มีรูปภาพตอนแจ้ง</div>
                          )}
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="p-2 border rounded-3 bg-white text-center h-100 d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '130px' }}>
                          <span className="badge bg-success mb-1" style={{ fontSize: '10px' }}>AFTER</span>
                          {repairForm.image ? (
                            <div className="position-relative w-100">
                              <img src={repairForm.image} alt="After" className="img-fluid rounded shadow-sm" style={{ maxHeight: '90px', objectFit: 'contain' }} />
                              <button type="button" className="btn btn-sm btn-danger position-absolute top-0 end-0 rounded-circle" style={{ width: '18px', height: '18px', fontSize: '10px' }} onClick={() => setRepairForm({ ...repairForm, image: '' })}>✕</button>
                            </div>
                          ) : (
                            <div className="text-muted small italic p-2" style={{ fontSize: '11px' }}>รอรูปอัปเดตส่งงาน</div>
                          )}
                        </div>
                      </div>
                    </div>
                    <input type="file" className="form-control form-control-sm" accept="image/*" onChange={handleImageChange} />
                  </div>
                </div>
                
                <div className="modal-footer bg-white rounded-bottom-4 border-top-0">
                  <button type="button" className="btn btn-sm btn-secondary px-3 rounded-pill" onClick={() => setManagingTicket(null)}>ยกเลิก</button>
                  <button type="button" className="btn btn-sm btn-primary px-4 rounded-pill fw-bold" onClick={saveTicketManagement}>💾 บันทึกข้อมูล</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </MainSystemLayout>
    );
  };

  // ==========================================
  // 👥 Component: หน้าการจัดการบัญชีผู้ใช้งานระบบ
  // ==========================================
  const AdminUsers = ({ users, setUsers }) => {
    const [newUser, setNewUser] = useState({ name: '', username: '', password: '', role: 'User', department: 'IT' });
    const [editingUserId, setEditingUserId] = useState(null);

    const handleSaveUser = (e) => {
      e.preventDefault();
      if (!newUser.name || !newUser.username || !newUser.password) {
        alert("กรุณากรอกข้อมูลให้ครบถ้วนด้วยครับ");
        return;
      }

      if (editingUserId) {
        setUsers(users.map(u => u.id === editingUserId ? { ...u, ...newUser } : u));
        alert(`อัปเดตข้อมูลของ ${newUser.name} เรียบร้อยแล้ว!`);
        setEditingUserId(null); 
      } else {
        const nextId = `U${String(users.length + 1).padStart(3, '0')}`;
        const userToSave = { id: nextId, ...newUser, status: 'Active' };
        setUsers([...users, userToSave]);
        alert(`เพิ่มผู้ใช้งาน ${newUser.name} เรียบร้อยแล้ว!`);
      }
      setNewUser({ name: '', username: '', password: '', role: 'User', department: 'IT' });
    };

    const handleEditClick = (user) => {
      setEditingUserId(user.id);
      setNewUser({ name: user.name, username: user.username, password: user.password, role: user.role, department: user.department });
    };

    const handleDeleteUser = (userId) => {
      if (window.confirm(`ต้องการลบผู้ใช้งานรหัส ${userId} หรือไม่?`)) {
        setUsers(users.filter(u => u.id !== userId));
        if (editingUserId === userId) {
          setEditingUserId(null);
          setNewUser({ name: '', username: '', password: '', role: 'User', department: 'IT' });
        }
      }
    };

    return (
      <MainSystemLayout activeMenu="adminUsers" isAdmin={true}>
        <div className="container-fluid px-0 text-start" style={{ fontFamily: "'Sarabun', sans-serif" }}>
          <h3 className="text-white fw-bold mb-4">👥 การจัดการบัญชีผู้ใช้งานระบบ</h3>
          <div className="row g-4">
            <div className="col-xl-4 col-lg-5">
              <div className="card border-0 shadow rounded-4 bg-white text-dark p-4">
                <h5 className={`mb-3 fw-bold border-bottom pb-2 ${editingUserId ? 'text-warning' : 'text-primary'}`}>
                  {editingUserId ? `✏️ แก้ไขบัญชีผู้ใช้งาน (${editingUserId})` : '➕ เพิ่มบัญชีผู้ใช้งานใหม่'}
                </h5>
                <form onSubmit={handleSaveUser}>
                  <div className="mb-2">
                    <label className="fw-bold small mb-1 text-secondary">ชื่อ-นามสกุล</label>
                    <input type="text" className="form-control form-control-sm" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="fw-bold small mb-1 text-secondary">Username (ใช้เข้าระบบ)</label>
                    <input type="text" className="form-control form-control-sm" required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="fw-bold small mb-1 text-secondary">Password</label>
                    <input type="password" className="form-control form-control-sm" required value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                  </div>
                  <div className="mb-2">
                    <label className="fw-bold small mb-1 text-secondary">ระดับสิทธิ์</label>
                    <select className="form-select form-select-sm" value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                      <option value="User">User (ผู้แจ้งซ่อมทั่วไป)</option>
                      <option value="Technician">Technician (ช่างซ่อมบำรุง)</option>
                      <option value="IT Support">IT Support (เจ้าหน้าที่ IT)</option>
                      <option value="IT Manager">IT Manager (แอดมิน/ผู้จัดการ)</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="fw-bold small mb-1 text-secondary">แผนก</label>
                    <select className="form-select form-select-sm" value={newUser.department} onChange={e => setNewUser({...newUser, department: e.target.value})}>
                      <option value="IT">IT</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="Housekeeping MSM">Housekeeping MSM</option>
                      <option value="Front Office Msm">Front Office Msm</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm w-100 rounded-pill py-2">💾 บันทึกผู้ใช้งาน</button>
                </form>
              </div>
            </div>

            <div className="col-xl-8 col-lg-7">
              <div className="bg-white p-4 rounded-4 text-dark shadow h-100">
                <h5 className="fw-bold text-dark mb-3 border-bottom pb-2">📋 รายชื่อผู้ใช้งานในระบบ</h5>
                <div className="table-responsive">
                  <table className="table table-bordered table-hover text-center" style={{ fontSize: '14px' }}>
                    <thead className="table-dark">
                      <tr>
                        <th>รหัส</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>Username</th>
                        <th>Password</th>
                        <th>ตำแหน่ง</th>
                        <th>แผนก</th>
                        <th>จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => (
                        <tr key={i}>
                          <td>{u.id}</td>
                          <td className="text-start"><b>{u.name}</b></td>
                          <td>{u.username}</td>
                          <td>{u.password}</td>
                          <td><span className="badge bg-danger">{u.role}</span></td>
                          <td>{u.department}</td>
                          <td>
                            <div className="d-flex gap-1 justify-content-center">
                              <button className="btn btn-sm btn-outline-warning rounded-pill" onClick={() => handleEditClick(u)}>✏️ แก้ไข</button>
                              <button className="btn btn-sm btn-outline-danger rounded-pill" disabled={u.id === 'U001'} onClick={() => handleDeleteUser(u.id)}>❌ ลบ</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </MainSystemLayout>
    );
  };

  const AdminTechSummary = () => (
    <MainSystemLayout activeMenu="adminTech" isAdmin={true}>
      <h3 className="text-white fw-bold mb-3">⭐ สรุปผลงานและคะแนนประเมินนายช่าง</h3>
      <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
        {getTechnicianStats().map((tech, i) => (
          <div key={i} className="col-md-4">
            <div className="card p-3 text-center border-0 rounded-3 shadow text-dark bg-white">
              <h5 className="fw-bold">{tech.name}</h5>
              <div className="text-warning fs-4">{tech.starRating > 0 ? '★'.repeat(tech.starRating) : 'ยังไม่มีผลประเมิน'}</div>
              <div className="mt-2 small text-muted">คะแนนเฉลี่ย: <b>{tech.average} ดาว</b></div>
              <div className="small">รับงานสำเร็จทั้งหมด: {tech.totalJobs} เคส</div>
            </div>
          </div>
        ))}
      </div>
    </MainSystemLayout>
  );

  // ==========================================
// 📊 COMPONENT: หน้าสรุปและรายงานสถิติ (Premium Financial Dashboard)
// ==========================================
const AdminReports = ({ tickets = [] }) => { // ใส่ default value เผื่อป้องกัน tickets เป็น undefined
  const totalCount = tickets.length;
  const successCount = tickets.filter(t => t.status === 'สำเร็จ').length;
  const pendingCount = tickets.filter(t => t.status === 'เปิด Ticket').length;
  const processCount = tickets.filter(t => t.status === 'กำลังดำเนินการ').length;
  const totalCost = tickets.reduce((sum, t) => sum + (t.cost || 0), 0);

  const deptMap = {};
  tickets.forEach(t => { 
    if (t.dept) {
      deptMap[t.dept] = (deptMap[t.dept] || 0) + 1; 
    }
  });

  // คำนวณเปอร์เซ็นต์สำหรับใส่ในการ์ด
  const pendingPct = totalCount > 0 ? ((pendingCount / totalCount) * 100).toFixed(1) : 0;
  const processPct = totalCount > 0 ? ((processCount / totalCount) * 100).toFixed(1) : 0;
  const successPct = totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0;

  // 📊 จัดการข้อมูลสำหรับ กราฟแท่ง (Bar Chart)
  const barChartLabels = Object.keys(deptMap).length > 0 ? Object.keys(deptMap) : ['ไม่มีข้อมูลแผนก'];
  const barChartValues = Object.keys(deptMap).length > 0 ? Object.values(deptMap) : [0];

  const barData = {
    labels: barChartLabels,
    datasets: [{
      label: 'จำนวนเคสแจ้งซ่อม (เคส)',
      data: barChartValues,
      backgroundColor: '#6366f1', // ปรับจาก CSS Gradient เป็น Hex Color ที่ Chart.js รองรับสมบูรณ์
      hoverBackgroundColor: '#4f46e5',
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 24
    }]
  };

  // 🟢 จัดการข้อมูลสำหรับ กราฟวงกลม (Doughnut Chart)
  const doughnutData = {
    labels: ['สำเร็จแล้ว', 'อยู่ระหว่างดำเนินการ'],
    datasets: [{
      data: totalCount > 0 ? [successCount, pendingCount + processCount] : [0, 100],
      backgroundColor: ['#10b981', '#f97316'],
      hoverBackgroundColor: ['#059669', '#ea580c'],
      borderWidth: 0,
      cutout: '78%' // ทำให้วงแหวนดูบางลง ทันสมัยขึ้น
    }]
  };

  return (
    <MainSystemLayout activeMenu="adminReports" isAdmin={true}>
      <div className="container-fluid p-4" style={{ backgroundColor: '#f8fafc', borderRadius: '24px', fontFamily: "'Sarabun', sans-serif", color: '#1e293b' }}>
        
        {/* Header Section */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mb-4 no-print">
          <div className="d-flex align-items-center gap-3">
            <div className="p-2 bg-white rounded-3 shadow-sm d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '1.6rem' }}>📊</span>
            </div>
            <div>
              <h4 className="fw-bold mb-0 text-dark" style={{ letterSpacing: '-0.5px' }}>รายงานสถิติและวิเคราะห์ข้อมูลระบบ</h4>
              <p className="text-muted small mb-0">ภาพรวมการแจ้งซ่อม และวิเคราะห์ข้อมูลเชิงลึกทางสถิติ</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2 w-100 w-sm-auto justify-content-end">
            <div className="bg-white px-3 py-2 rounded-pill shadow-sm border border-light d-flex align-items-center gap-2 text-muted small fw-bold">
              🗓️ 17 กรกฎาคม 2569
            </div>
            <button 
              className="btn btn-sm rounded-pill px-4 py-2 fw-bold shadow-sm d-flex align-items-center gap-2 transit" 
              onClick={() => window.print()}
              style={{ backgroundColor: '#ffffff', color: '#4f46e5', border: '1px solid #e2e8f0' }}
            >
              <span>📤</span> ออกรายงาน
            </button>
          </div>
        </div>

        {/* ⚡ Status Summary Cards Grid */}
        <div className="row g-3 mb-4">
          {/* 1. เคสแจ้งซ่อมทั้งหมด */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100 transition-hover">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="p-3 bg-primary bg-opacity-10 rounded-3 text-primary d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>📋</div>
                <div className="text-end">
                  <span className="text-muted small fw-bold d-block mb-1">เคสแจ้งซ่อมทั้งหมด</span>
                  <h2 className="fw-extrabold mb-0 text-dark font-monospace">{totalCount}</h2>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-end mt-3 border-top pt-2">
                <div className="small"><span className="text-muted">ทั้งหมด</span> <strong className="d-block text-primary">100%</strong></div>
                <div className="text-primary fw-bold small">Overview</div>
              </div>
            </div>
          </div>

          {/* 2. รอดำเนินการ */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100 transition-hover">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="p-3 bg-warning bg-opacity-10 rounded-3 text-warning d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>⏳</div>
                <div className="text-end">
                  <span className="text-muted small fw-bold d-block mb-1">รอดำเนินการ (Pending)</span>
                  <h2 className="fw-extrabold mb-0 text-dark font-monospace">{pendingCount}</h2>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-end mt-3 border-top pt-2">
                <div className="small"><span className="text-muted">รอการมอบหมาย</span> <strong className="d-block text-warning">{pendingPct}%</strong></div>
                <div className="text-warning fw-bold small">Queue</div>
              </div>
            </div>
          </div>

          {/* 3. กำลังดำเนินการ */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100 transition-hover">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="p-3 bg-info bg-opacity-10 rounded-3 text-info d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>⚙️</div>
                <div className="text-end">
                  <span className="text-muted small fw-bold d-block mb-1">กำลังดำเนินการ (WIP)</span>
                  <h2 className="fw-extrabold mb-0 text-dark font-monospace">{processCount}</h2>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-end mt-3 border-top pt-2">
                <div className="small"><span className="text-muted">ระหว่างดำเนินการ</span> <strong className="d-block text-info">{processPct}%</strong></div>
                <div className="text-info fw-bold small">Active</div>
              </div>
            </div>
          </div>

          {/* 4. สำเร็จแล้ว */}
          <div className="col-12 col-md-6 col-xl-3">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100 transition-hover">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="p-3 bg-success bg-opacity-10 rounded-3 text-success d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>✅</div>
                <div className="text-end">
                  <span className="text-muted small fw-bold d-block mb-1">สำเร็จ (Completed)</span>
                  <h2 className="fw-extrabold mb-0 text-dark font-monospace">{successCount}</h2>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-end mt-3 border-top pt-2">
                <div className="small"><span className="text-muted">ดำเนินการเสร็จสิ้น</span> <strong className="d-block text-success">{successPct}%</strong></div>
                <div className="text-success fw-bold small">Done</div>
              </div>
            </div>
          </div>
        </div>

        {/* 📈 Charts & Main Dark Financial Analytics */}
        <div className="row g-4 mb-4">
          
          {/* Doughnut Chart ด้านซ้าย */}
          <div className="col-12 col-lg-4 col-xl-3">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100">
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="text-danger">📌</span>
                <h6 className="fw-bold mb-0 text-dark">สัดส่วนความสำเร็จของงานซ่อม</h6>
              </div>
              <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '220px' }}>
                {totalCount > 0 ? (
                  <>
                    <div style={{ width: '100%', maxWidth: '150px', position: 'relative' }}>
                      <Doughnut 
                        data={doughnutData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: true,
                          plugins: { legend: { display: false }, tooltip: { borderRadius: 6 } }
                        }}
                      />
                      {/* เปอร์เซ็นต์ตรงกลางวงกลม */}
                      <div className="position-absolute top-50 start-50 translate-middle text-center" style={{ pointerEvents: 'none' }}>
                        <h3 className="fw-extrabold mb-0 text-dark font-monospace">{Math.round(successPct)}%</h3>
                        <span className="text-muted d-block" style={{ fontSize: '10px' }}>สำเร็จแล้ว</span>
                      </div>
                    </div>
                    <div className="mt-4 w-100 small px-2">
                      <div className="d-flex justify-content-between mb-2 border-bottom pb-1">
                        <span><span className="text-success me-1">●</span> สำเร็จแล้ว</span> 
                        <span className="fw-bold font-monospace text-dark">{successCount} เคส</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span><span className="text-warning me-1">●</span> อยู่ระหว่างดำเนินการ</span> 
                        <span className="fw-bold font-monospace text-dark">{pendingCount + processCount} เคส</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-5">
                    <span className="fs-3 text-muted d-block mb-2">⭕</span>
                    <span className="text-muted small italic">ไม่มีข้อมูลการแสดงผล</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bar Chart แผนก ตรงกลาง */}
          <div className="col-12 col-lg-5 col-xl-6">
            <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark h-100">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <div className="d-flex align-items-center gap-2">
                  <span className="text-primary">🏢</span>
                  <h6 className="fw-bold mb-0 text-dark">สถิติการแจ้งซ่อมแยกตามแผนก</h6>
                </div>
                <select className="form-select form-select-sm border-0 bg-light rounded-3 text-muted font-monospace" style={{ width: 'auto', fontSize: '12px' }}>
                  <option>แสดงผล: ทั้งหมด ({Object.keys(deptMap).length} แผนก)</option>
                </select>
              </div>
              <div style={{ height: '220px', position: 'relative' }}>
                {Object.keys(deptMap).length > 0 ? (
                  <Bar 
                    data={barData} 
                    options={{ 
                      responsive: true, 
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false }, tooltip: { borderRadius: 6 } },
                      scales: {
                        y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'Monospace' } }, border: { display: false } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                ) : (
                  <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted small italic">
                    <span className="fs-3 mb-1">📊</span>
                    ไม่มีข้อมูลสถิติของแผนก
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* การ์ดงบประมาณสีน้ำเงินเข้มขวาสุด (Luxury Deep Blue) */}
          <div className="col-12 col-lg-3 col-xl-3">
            <div 
              className="card border-0 rounded-4 shadow p-4 text-white h-100 text-center d-flex flex-column justify-content-between position-relative overflow-hidden shadow-indigo" 
              style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)' }}
            >
              <div className="position-absolute top-0 end-0 p-3 opacity-25" style={{ fontSize: '1.2rem' }}>💎</div>
              
              <div className="mt-2">
                <div className="p-3 bg-white bg-opacity-10 rounded-circle mx-auto d-flex align-items-center justify-content-center mb-3" style={{ width: '50px', height: '50px' }}>💼</div>
                <h6 className="fw-bold text-white mb-1" style={{ letterSpacing: '0.3px' }}>สรุปงบประมาณค่าใช้จ่าย</h6>
                <p className="text-white-50 small mb-0">ต้นทุนค่าอะไหล่รวมทั้งหมด</p>
              </div>

              <div className="my-3">
                <h1 className="fw-extrabold text-success font-monospace mb-2" style={{ letterSpacing: '-1px', fontSize: '2.6rem' }}>
                  {totalCost.toLocaleString()} <span className="fs-5 text-white fw-normal">฿</span>
                </h1>
                <div className="bg-white bg-opacity-10 py-1 px-3 rounded-pill d-inline-block small">
                  <span className="text-white-50">เฉลี่ยต่อเคส:</span>{' '}
                  <strong className="text-white font-monospace">{totalCount > 0 ? Math.round(totalCost / totalCount).toLocaleString() : '0'} ฿</strong>
                </div>
              </div>

              <div style={{ height: '10px', opacity: 0.15, background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 1440 320\'%3E%3Cpath fill=\'%23ffffff\' d=\'M0,96L120,122.7C240,149,480,203,720,202.7C960,203,1200,149,1320,122.7L1440,96L1440,320L1320,320C1200,320,960,320,720,320C480,320,240,320,120,320L0,320Z\'%3E%3C/path%3E%3C/svg%3E") bottom repeat-x' }}></div>
            </div>
          </div>

        </div>

        {/* 💵 FINANCIAL OVERVIEW (แถวยาวด้านล่างสุด) */}
        <div className="card border-0 rounded-4 shadow-sm p-4 bg-white text-dark">
          <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-2">
            <div className="d-flex align-items-center gap-2">
              <span className="text-primary">👔</span>
              <h6 className="fw-bold mb-0 text-dark">FINANCIAL OVERVIEW <span className="text-muted fw-normal ms-2">| สรุปงบประมาณรวมทั้งหมด</span></h6>
            </div>
            <select className="form-select form-select-sm border-0 bg-light rounded-3 text-muted" style={{ width: 'auto', fontSize: '12px' }}>
              <option>ช่วงเวลา: เดือนนี้</option>
            </select>
          </div>

          <div className="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-3">
            {/* บล็อกย่อย 1 */}
            <div className="col-12 col-sm-6 col-xl-3 border-sm-end border-light">
              <div className="d-flex align-items-center gap-3 py-1">
                <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-circle">💼</div>
                <div>
                  <span className="text-muted small d-block mb-1">งบประมาณรวม</span>
                  <h5 className="fw-bold mb-0 text-dark font-monospace">{totalCost.toLocaleString()} ฿</h5>
                  <span className="text-muted" style={{ fontSize: '10px' }}>ค่าอะไหล่ทั้งหมด</span>
                </div>
              </div>
            </div>
            {/* บล็อกย่อย 2 */}
            <div className="col-12 col-sm-6 col-xl-3 border-xl-end border-light">
              <div className="d-flex align-items-center gap-3 py-1">
                <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">💵</div>
                <div>
                  <span className="text-muted small d-block mb-1">ค่าอะไหล่เฉลี่ยต่อเคส</span>
                  <h5 className="fw-bold mb-0 text-dark font-monospace">{totalCount > 0 ? Math.round(totalCost / totalCount).toLocaleString() : 0} ฿</h5>
                  <span className="text-muted" style={{ fontSize: '10px' }}>เฉลี่ยต่อรายการ</span>
                </div>
              </div>
            </div>
            {/* บล็อกย่อย 3 */}
            <div className="col-12 col-sm-6 col-xl-3 border-sm-end border-light">
              <div className="d-flex align-items-center gap-3 py-1">
                <div className="p-3 bg-purple bg-opacity-10 rounded-circle" style={{ color: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)' }}>📊</div>
                <div>
                  <span className="text-muted small d-block mb-1">ค่าใช้จ่ายเดือนนี้</span>
                  <h5 className="fw-bold mb-0 text-dark font-monospace">0 ฿</h5>
                  <span className="text-muted" style={{ fontSize: '10px' }}>กรกฎาคม 2569</span>
                </div>
              </div>
            </div>
            {/* บล็อกย่อย 4 */}
            <div className="col-12 col-sm-6 col-xl-3">
              <div className="d-flex align-items-center gap-3 py-1">
                <div className="p-3 bg-success bg-opacity-10 text-success rounded-circle">📈</div>
                <div>
                  <span className="text-muted small d-block mb-1">เปรียบเทียบเดือนก่อน</span>
                  <h5 className="fw-bold mb-0 text-success font-monospace">+18.6%</h5>
                  <span className="text-muted" style={{ fontSize: '10px' }}>เพิ่มขึ้นจากเดือนที่แล้ว</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </MainSystemLayout>
  );
};

  const AdminSettings = () => (
    <MainSystemLayout activeMenu="adminSettings" isAdmin={true}>
      <h3 className="text-white mb-3">⚙️ ตั้งค่าระบบส่วนกลาง</h3>
      <div className="bg-white p-4 rounded-4 text-dark shadow">
        <h5 className="fw-bold text-secondary mb-3">ระบบแจ้งเตือน Line Notify & Email</h5>
        <div className="form-check form-switch mb-2">
          <input className="form-check-input" type="checkbox" defaultChecked />
          <label className="form-check-label ms-2">เปิดการส่งสถิติเข้าไลน์กลุ่มอัตโนมัติ (Line Notify Group)</label>
        </div>
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" defaultChecked />
          <label className="form-check-label ms-2">เปิดการเชื่อมระบบ EmailJS ส่งใบงานหาช่างทันทีที่มีงานเข้า</label>
        </div>
      </div>
    </MainSystemLayout>
  );

  return (
    <>
      <style>{`
        html, body, #root { margin: 0; padding: 0; width: 100vw; height: 100vh; overflow: hidden; background-color: #f1f5f9; font-family: 'Sarabun', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .hover-lift:hover { transform: translateY(-3px); transition: 0.2s ease; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
        .animate-pulse { animation: pulse 2s infinite; }
      `}</style>

      {currentView === 'login' && <LoginPage onLogin={handleLogin} />}
      {currentView === 'landing' && <DeskSelectionLanding onSelectDesk={handleSelectDesk} />}

      {/* กลุ่มหน้าจอฝั่ง User */}
      {currentView === 'dashboard' && <UserDashboardMain tickets={tickets} setTickets={setTickets} setCurrentView={setCurrentView} selectedDesk={selectedDesk} />}
      {currentView === 'userForm' && <UserFormView />}
      {currentView === 'userRatings' && <UserRatingView />}
      {currentView === 'userTechSummary' && <UserTechSummary />}

      {/* กลุ่มหน้าจอฝั่ง Admin */}
      {currentView === 'adminDashboard' && <AdminDashboard />}
      {currentView === 'adminUsers' && <AdminUsers users={users} setUsers={setUsers} />}
      {currentView === 'adminTechSummary' && <AdminTechSummary />}
      {currentView === 'adminReports' && <AdminReports />}
      {currentView === 'adminSettings' && <AdminSettings />}

      {/* 💬 เพิ่ม Widget แชทแบบลอยตัว แสดงเฉพาะเมื่องานมีสถานะ "กำลังดำเนินการ" */}
      {isLogin && (
        <FloatingChatWidget 
          tickets={tickets} 
          chats={chats} 
          setChats={setChats} 
        />
      )}
    </>
  );
}

export default App;