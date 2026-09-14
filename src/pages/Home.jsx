import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// เรียก Vercel API เพื่อบันทึกข้อมูลและส่งการแจ้งเตือน
const SCRIPT_URL = '/api/bookings';

export default function Home() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  setIsLoading(true);
  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get" }) // ใช้ action มาตรฐาน
    });
    const result = await response.json();
    
    if (result.status === "success") {
      // แปลงข้อมูลที่ได้จาก GAS ให้เข้ากับหน้าตา Card ของ React ตรงนี้ได้เลย
      const formattedData = result.data.map(item => ({
        id: item.bookingId,       // แปลง bookingId เป็น id
        title: item.driverName,   // แปลง driverName เป็น title
        userId: item.userId,
        phone: item.phone,
        licenseNo: item.licenseNo,
        costCenter: item.costCenter,
        purpose: item.purpose,
        start: item.startDatetime,// แปลง startDatetime เป็น start
        end: item.endDatetime,    // แปลง endDatetime เป็น end
        returnDatetime: item.returnDatetime,
        status: item.status
      }));

      const latestBookings = formattedData.reverse().slice(0, 3);
      setBookings(latestBookings); 
    }
  } catch (error) {
    console.error("Error fetching data", error);
  }
  setIsLoading(false);
};

  // ฟังก์ชันกำหนดสีและไอคอนของป้ายสถานะ
  const getStatusStyle = (status) => {
    if (status === 'รออนุมัติ') return { icon: '⏳', color: '#856404', bg: '#fff3cd', border: '#ffeeba' }; 
    if (status === 'อนุมัติแล้ว' || status === 'กำลังยืม') return { icon: '✅', color: '#155724', bg: '#d4edda', border: '#c3e6cb' }; 
    return { icon: '🔹', color: '#004085', bg: '#cce5ff', border: '#b8daff' }; 
  };

  // ฟังก์ชันดึงเฉพาะข้อความในวงเล็บ (ตัดตัวเลขรหัสออก)
  const formatTitle = (title) => {
    if (!title) return "-";
    const match = title.match(/\((.*?)\)/); // หาข้อความที่อยู่ใน ()
    return match ? match[1] : title; // ถ้าเจอให้แสดงแค่ข้อความนั้น ถ้าไม่เจอให้แสดงปกติ
  };

  // ฟังก์ชันแปลงรูปแบบวันที่ให้สวยงาม (เช่น 25/07/2026 11:30)
  const formatDateTime = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString('th-TH', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '15px', borderBottom: '1px solid #ddd', flexWrap: 'wrap', gap: '10px' }}>
        <h2 style={{ margin: 0, color: '#333' }}>📋 3 รายการล่าสุด</h2>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => navigate('/book')}
            style={{ padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            🚗 ยืมรถ / จองรถ
          </button>
          <button 
            onClick={() => navigate('/return')}
            style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
          >
            🔑 คืนรถ
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '50px 0', fontSize: '18px', color: '#666' }}>
          กำลังโหลดข้อมูลรายการจอง...
        </div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 0', color: '#999', backgroundColor: '#f9f9f9', borderRadius: '8px' }}>
          ยังไม่มีรายการจองรถในขณะนี้
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
          gap: '16px' 
        }}>
          {bookings.map((item, index) => {
            const statusStyle = getStatusStyle(item.status);
            return (
              <div key={index} style={{ 
                border: '1px solid #e0e0e0', 
                borderRadius: '10px', 
                padding: '16px', 
                boxShadow: '0 3px 5px rgba(0,0,0,0.05)',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'transform 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: '#888', fontWeight: 'bold' }}>{item.id}</span>
                  <span style={{ 
                    fontSize: '12px', 
                    padding: '4px 10px', 
                    borderRadius: '20px', 
                    backgroundColor: statusStyle.bg, 
                    color: statusStyle.color,
                    border: `1px solid ${statusStyle.border}`,
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px' // เว้นระยะระหว่างไอคอนกับข้อความ
                  }}>
                    {statusStyle.icon} {item.status}
                  </span>
                </div>
                
                {/* แสดงเฉพาะชื่อที่จัดรูปแบบแล้ว */}
                <h3 style={{ margin: '0', fontSize: '18px', color: '#2c3e50', lineHeight: '1.4' }}>
                  {formatTitle(item.title)}
                </h3>
                
                <div style={{ fontSize: '14px', color: '#555', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '5px', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '6px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                    <span style={{ minWidth: '85px', color: '#666' }}><strong>วัตถุประสงค์:</strong></span> 
                    <span style={{ flex: 1, wordBreak: 'break-word' }}>{item.purpose || "-"}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ minWidth: '85px', color: '#666' }}><strong>เริ่มยืม:</strong></span> 
                    <span>{formatDateTime(item.start)}</span>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ minWidth: '85px', color: '#666' }}><strong>สิ้นสุด:</strong></span> 
                    <span>{formatDateTime(item.end)}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ minWidth: '85px', color: '#666' }}><strong>คืนรถจริง:</strong></span>
                    <span>{item.returnDatetime && item.returnDatetime !== '-' ? formatDateTime(item.returnDatetime) : 'ยังไม่คืนรถ'}</span>
                  </div>
                 </div>

                 <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                   <button
                     type="button"
                     onClick={() => navigate(`/edit/${encodeURIComponent(item.id)}`, { state: { booking: item } })}
                     style={{
                       flex: 1,
                       padding: '9px 12px',
                       backgroundColor: '#f8f9fa',
                       color: '#0056b3',
                       border: '1px solid #007bff',
                       borderRadius: '6px',
                       cursor: 'pointer',
                       fontWeight: 'bold'
                     }}
                   >
                     ✏️ แก้ไข
                   </button>
                   <button
                     type="button"
                     onClick={() => navigate('/return', { state: { bookingId: item.id } })}
                     style={{
                       flex: 1,
                       padding: '9px 12px',
                       backgroundColor: '#dc3545',
                       color: '#fff',
                       border: '1px solid #dc3545',
                       borderRadius: '6px',
                       cursor: 'pointer',
                       fontWeight: 'bold'
                     }}
                   >
                     🔑 คืนรถ
                   </button>
                 </div>

               </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
