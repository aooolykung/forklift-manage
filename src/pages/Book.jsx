import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

// *** อย่าลืมนำ URL Web App ของคุณมาใส่ตรงนี้ในไฟล์ .env นะครับ ***
const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL;

export default function Book() {
  const navigate = useNavigate();

  // State สำหรับเก็บข้อมูลฟอร์ม
  const [formData, setFormData] = useState({
    driverName: '',
    licenseNo: '',
    phone: '',
    costCenter: '',
    purpose: ''
  });

  const [startDatetime, setStartDatetime] = useState(new Date());
  const [endDatetime, setEndDatetime] = useState(new Date());

  const formatLicenseNo = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 7);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  };

  const formatCostCenter = (value) => {
    return value.replace(/\D/g, '').slice(0, 6);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'licenseNo') {
      setFormData(prev => ({ ...prev, [name]: formatLicenseNo(value) }));
    } else if (name === 'phone') {
      setFormData(prev => ({ ...prev, [name]: formatPhone(value) }));
    } else if (name === 'costCenter') {
      setFormData(prev => ({ ...prev, [name]: formatCostCenter(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // แจ้งเตือนกรณีข้อมูลไม่ครบ
    if (!formData.driverName || !formData.licenseNo || !formData.purpose) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอก ชื่อ-สกุล, ทะเบียนรถ และวัตถุประสงค์ ให้ครบถ้วน',
        confirmButtonColor: '#007bff'
      });
      return;
    }

    // Popup โหลดข้อมูลระหว่างรอ
    Swal.fire({
      title: 'กำลังบันทึกข้อมูล...',
      html: 'กรุณารอสักครู่ ระบบกำลังสื่อสารกับฐานข้อมูล',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const payload = {
        action: "book_car",
        userId: "U-" + new Date().getTime().toString().slice(-4), // จำลอง userId 
        driverName: formData.driverName,
        phone: formData.phone,
        licenseNo: formData.licenseNo,
        costCenter: formData.costCenter,
        purpose: formData.purpose,
        startDatetime: startDatetime.toISOString(),
        endDatetime: endDatetime.toISOString()
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
          title: 'บันทึกการจองสำเร็จ!',
          text: `รหัสการจองของคุณคือ: ${result.bookingId}`,
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

  // Styles
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
        <h2 style={titleStyle}>🚗 แบบฟอร์มยืมรถ / จองรถ</h2>
        <button onClick={() => navigate('/')} style={buttonStyle} className="responsive-button">
          ย้อนกลับ
        </button>
      </div>

      <form onSubmit={handleSubmit} style={formStyle}>
        
        <label style={labelStyle}>ชื่อ-สกุล คนขับ <span style={{color: 'red'}}>*</span></label>
        <input type="text" name="driverName" value={formData.driverName} onChange={handleChange} style={inputStyle} placeholder="ระบุชื่อผู้ขับขี่" required />

        <label style={labelStyle}>เลขที่ใบขับขี่ <span style={{color: 'red'}}>*</span></label>
        <input type="text" name="licenseNo" value={formData.licenseNo} onChange={handleChange} style={inputStyle} placeholder="เช่น 12-34567" maxLength={8} required />

        <label style={labelStyle}>รหัสค่าใช่จ่าย / Cost Center <span style={{color: 'red'}}>*</span></label>
        <input type="text" name="costCenter" value={formData.costCenter} onChange={handleChange} style={inputStyle} placeholder="เช่น 500000" maxLength={6} required />

        <label style={labelStyle}>เบอร์โทรศัพท์ <span style={{color: 'red'}}>*</span></label>
        <input type="text" name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} placeholder="เช่น 123-4567890" maxLength={11} required/>

        <label style={labelStyle}>วัตถุประสงค์ <span style={{color: 'red'}}>*</span></label>
        <input type="text" name="purpose" value={formData.purpose} onChange={handleChange} style={inputStyle} placeholder="ระบุวัตถุประสงค์การใช้งาน" required />

        <div style={fieldRowStyle} className="responsive-row">
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>เวลาเริ่มยืม <span style={{color: 'red'}}>*</span></label>
            <DatePicker 
              selected={startDatetime} 
              onChange={(date) => setStartDatetime(date)} 
              showTimeSelect 
              timeFormat="HH:mm" 
              timeIntervals={15} 
              dateFormat="dd/MM/yyyy HH:mm" 
              timeCaption="เวลา"
              className="custom-datepicker"
              customInput={<input style={inputStyle} />}
            />
          </div>
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>เวลาสิ้นสุด(คาดการณ์) <span style={{color: 'red'}}>*</span></label>
            <DatePicker 
              selected={endDatetime} 
              onChange={(date) => setEndDatetime(date)} 
              showTimeSelect 
              timeFormat="HH:mm" 
              timeIntervals={15} 
              dateFormat="dd/MM/yyyy HH:mm"
              timeCaption="เวลา" 
              className="custom-datepicker"
              customInput={<input style={inputStyle} />}
            />
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '18px', marginTop: '30px', fontWeight: 'bold' }}>
          💾 บันทึกข้อมูลการจอง
        </button>
      </form>
    </div>
  );
}