import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

// *** อย่าลืมนำ URL Web App ของคุณมาใส่ตรงนี้ในไฟล์ .env นะครับ ***
const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL;

export default function Return() {
  const navigate = useNavigate();

  const [bookingId, setBookingId] = useState('');
  const [returnDatetime, setReturnDatetime] = useState(new Date());
  const [formData, setFormData] = useState({
    hoursBefore: '',
    hoursAfter: '',
    batteryBefore: '',
    batteryAfter: ''
  });

  const sanitizeHourInput = (value) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    const dotIndex = cleaned.indexOf('.');
    if (dotIndex === -1) return cleaned;

    const integer = cleaned.slice(0, dotIndex);
    const decimals = cleaned.slice(dotIndex + 1).replace(/\./g, '');
    if (cleaned.endsWith('.')) return `${integer}.`;
    return `${integer}.${decimals.slice(0, 1)}`;
  };

  const formatHourValue = (value) => {
    const cleaned = sanitizeHourInput(value);
    if (!cleaned) return '';
    if (cleaned.includes('.')) {
      const [integer, decimal] = cleaned.split('.');
      return `${integer}.${decimal || '0'}`;
    }
    return `${cleaned}.0`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'hoursBefore' || name === 'hoursAfter') {
      setFormData(prev => ({ ...prev, [name]: sanitizeHourInput(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const formatBookingId = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 2) return cleaned;
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 8)}`;
  };

  const handleHourBlur = (name) => {
    setFormData(prev => ({ ...prev, [name]: formatHourValue(prev[name]) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!bookingId) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณาระบุรหัสการจอง', confirmButtonColor: '#007bff' });
      return;
    }

    Swal.fire({
      title: 'กำลังตรวจสอบและบันทึกข้อมูล...',
      html: 'กรุณารอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูล',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const payload = {
        action: "return_car",
        bookingId: bookingId,
        returnDatetime: returnDatetime.toISOString(),
        hoursBefore: formData.hoursBefore,
        hoursAfter: formData.hoursAfter,
        batteryBefore: formData.batteryBefore,
        batteryAfter: formData.batteryAfter
      };

      const response = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      const result = await response.json();

      if (result.status === "success") {
        Swal.fire({
          icon: 'success',
          title: 'คืนรถสำเร็จ!',
          text: `ระบบได้บันทึกการคืนรถสำหรับรหัส: ${bookingId} เรียบร้อยแล้ว`,
          confirmButtonColor: '#28a745',
          confirmButtonText: 'กลับสู่หน้าหลัก'
        }).then((res) => {
          if (res.isConfirmed) navigate('/');
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถบันทึกข้อมูลได้: ' + error.message,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'ลองใหม่อีกครั้ง'
      });
    }
  };

  const containerStyle = { width: '100%', maxWidth: '600px', padding: 'clamp(16px, 3vw, 24px)', margin: '20px auto', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', boxSizing: 'border-box' };
  const inputStyle = { width: '100%', maxWidth: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '48px', fontSize: '16px' };
  const labelStyle = { fontWeight: 'bold', color: '#444', display: 'block', marginTop: '15px' };
  const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px', gap: '12px', flexWrap: 'wrap' };
  const titleStyle = { margin: 0, color: '#333', fontSize: 'clamp(20px, 3.5vw, 28px)' };
  const buttonStyle = { padding: '8px 15px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '15px' };
  const formStyle = { marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '4px' };
  const fieldRowStyle = { display: 'flex', gap: '20px', marginTop: '15px', flexWrap: 'wrap' };
  const fieldColStyle = { flex: '1 1 220px', minWidth: '220px' };

  return (
    <div style={containerStyle}>
      <style>{`
        @media (max-width: 480px) {
          .responsive-header { flex-direction: column; align-items: flex-start; }
          .responsive-button { width: 100%; }
          .responsive-row { gap: 12px; }
          .responsive-col { flex-basis: 100%; min-width: 0; }
        }
      `}</style>
      <div style={headerStyle} className="responsive-header">
        <h2 style={titleStyle}>🔑 แบบฟอร์มคืนรถ</h2>
        <button onClick={() => navigate('/')} style={buttonStyle} className="responsive-button">
          ย้อนกลับ
        </button>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        
        <label style={labelStyle}>รหัสการจอง (Booking ID) <span style={{color: 'red'}}>*</span></label>
        <input
          type="text"
          value={bookingId}
          onChange={(e) => setBookingId(formatBookingId(e.target.value))}
          style={inputStyle}
          placeholder="เช่น BK-123456"
          maxLength={9}
          required
        />

        <label style={labelStyle}>เวลาที่ส่งคืนรถจริง <span style={{color: 'red'}}>*</span></label>
        <DatePicker 
          selected={returnDatetime} 
          onChange={(date) => setReturnDatetime(date)} 
          showTimeSelect 
          timeFormat="HH:mm" 
          timeIntervals={15} 
          dateFormat="dd/MM/yyyy HH:mm"
          timeCaption="เวลา" 
          customInput={<input style={inputStyle} />}
        />

        <div style={fieldRowStyle} className="responsive-row">
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>เลขชั่วโมงก่อนใช้งาน<span style={{color: 'red'}}>*</span></label>
            <input type="text" name="hoursBefore" value={formData.hoursBefore} onChange={handleChange} onBlur={() => handleHourBlur('hoursBefore')} style={inputStyle} placeholder="เช่น 1234.0" required/>
          </div>
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>เลขชั่วโมงหลังใช้งาน<span style={{color: 'red'}}>*</span></label>
            <input type="text" name="hoursAfter" value={formData.hoursAfter} onChange={handleChange} onBlur={() => handleHourBlur('hoursAfter')} style={inputStyle} placeholder="เช่น 1234.0" required />
          </div>
        </div>

        <div style={fieldRowStyle} className="responsive-row">
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>แบตเตอรี่/น้ำมัน ก่อน (%)<span style={{color: 'red'}}>*</span></label>
            <input type="number" name="batteryBefore" value={formData.batteryBefore} onChange={handleChange} style={inputStyle} placeholder="0 - 100" required />
          </div>
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>แบตเตอรี่/น้ำมัน หลัง (%)<span style={{color: 'red'}}>*</span></label>
            <input type="number" name="batteryAfter" value={formData.batteryAfter} onChange={handleChange} style={inputStyle} placeholder="0 - 100" required />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '18px', marginTop: '30px', fontWeight: 'bold' }}>
          ✅ ยืนยันการคืนรถ
        </button>
      </form>
    </div>
  );
}