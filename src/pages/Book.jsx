import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale/th';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

registerLocale('th', th);

const formatTimeValue = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const dateWithTime = (date, timeText) => {
  const match = timeText.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  const updated = new Date(date);
  updated.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return updated;
};

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
  const [endDatetime, setEndDatetime] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [startTimeText, setStartTimeText] = useState(() => formatTimeValue(new Date()));
  const [endTimeText, setEndTimeText] = useState(() => formatTimeValue(new Date(Date.now() + 60 * 60 * 1000)));

  const commitStartDatetime = (date) => {
    setStartDatetime(date);
    setStartTimeText(formatTimeValue(date));
    if (!endDatetime || endDatetime <= date) {
      const nextEnd = new Date(date.getTime() + 60 * 60 * 1000);
      setEndDatetime(nextEnd);
      setEndTimeText(formatTimeValue(nextEnd));
    }
  };

  const handleStartDateChange = (date) => {
    if (!date) return;
    const updated = new Date(startDatetime);
    updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    commitStartDatetime(updated);
  };

  const handleEndDateChange = (date) => {
    if (!date) return;
    const updated = new Date(endDatetime);
    updated.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setEndDatetime(updated);
  };

  const handleTimeTextChange = (target, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    if (target === 'start') setStartTimeText(formatted);
    else setEndTimeText(formatted);
  };

  const applyTimeText = (target) => {
    const value = target === 'start' ? startTimeText : endTimeText;
    const current = target === 'start' ? startDatetime : endDatetime;
    const updated = dateWithTime(current, value);

    if (!updated) {
      if (target === 'start') setStartTimeText(formatTimeValue(current));
      else setEndTimeText(formatTimeValue(current));
      Swal.fire({ icon: 'warning', title: 'รูปแบบเวลาไม่ถูกต้อง', text: 'กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 08:30 หรือ 16:45' });
      return;
    }

    if (target === 'start') commitStartDatetime(updated);
    else {
      setEndDatetime(updated);
      setEndTimeText(formatTimeValue(updated));
    }
  };

  const setStartToNow = () => {
    const now = new Date();
    setStartDatetime(now);
    setStartTimeText(formatTimeValue(now));
    const nextEnd = new Date(now.getTime() + 60 * 60 * 1000);
    setEndDatetime(nextEnd);
    setEndTimeText(formatTimeValue(nextEnd));
  };

  const setDuration = (minutes) => {
    const nextEnd = new Date(startDatetime.getTime() + minutes * 60 * 1000);
    setEndDatetime(nextEnd);
    setEndTimeText(formatTimeValue(nextEnd));
  };

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

    const submittedStart = dateWithTime(startDatetime, startTimeText);
    const submittedEnd = dateWithTime(endDatetime, endTimeText);

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

    if (!submittedStart || !submittedEnd) {
      Swal.fire({
        icon: 'warning',
        title: 'รูปแบบเวลาไม่ถูกต้อง',
        text: 'กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 08:30 หรือ 16:45',
        confirmButtonColor: '#007bff'
      });
      return;
    }

    if (submittedEnd <= submittedStart) {
      Swal.fire({
        icon: 'warning',
        title: 'วันเวลาไม่ถูกต้อง',
        text: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มยืม',
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
        startDatetime: submittedStart.toISOString(),
        endDatetime: submittedEnd.toISOString()
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
  const renderTimeInput = (target, value) => (
    <label style={{ display: 'block', marginTop: '8px', fontSize: '13px', color: '#666' }}>
      เวลาแบบ 24 ชั่วโมง
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onFocus={(event) => event.target.select()}
        onChange={(event) => handleTimeTextChange(target, event.target.value)}
        onBlur={() => applyTimeText(target)}
        placeholder="HH:mm"
        maxLength={5}
        style={{ ...inputStyle, marginTop: '4px', fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}
        required
      />
      <span style={{ display: 'block', marginTop: '4px' }}>พิมพ์ตัวเลข 4 หลัก เช่น 1630 → 16:30</span>
    </label>
  );

  return (
    <div style={containerStyle}>
      <style>{`
        .date-picker-full, .date-picker-full .react-datepicker-wrapper, .date-picker-full .react-datepicker__input-container { width: 100%; }
        .react-datepicker { font-size: 0.95rem; }
        .react-datepicker__day, .react-datepicker__day-name { width: 2rem; line-height: 2rem; }
        .react-datepicker__current-month { padding-bottom: 8px; }
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
            <label style={{...labelStyle, marginTop: '0'}}>วันที่เริ่มยืม <span style={{color: 'red'}}>*</span></label>
              <DatePicker
                selected={startDatetime}
                onChange={handleStartDateChange}
                dateFormat="dd/MM/yyyy"
                locale="th"
                calendarStartDay={1}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                todayButton="วันนี้"
                showPopperArrow={false}
                placeholderText="เลือกวันที่เริ่ม"
                wrapperClassName="date-picker-full"
                className="custom-datepicker"
              customInput={<input style={inputStyle} />}
            />
            {renderTimeInput('start', startTimeText)}
          </div>
          <div style={fieldColStyle} className="responsive-col">
            <label style={{...labelStyle, marginTop: '0'}}>วันที่สิ้นสุด (คาดการณ์) <span style={{color: 'red'}}>*</span></label>
              <DatePicker
                selected={endDatetime}
                onChange={handleEndDateChange}
                minDate={startDatetime}
                dateFormat="dd/MM/yyyy"
                locale="th"
                calendarStartDay={1}
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                todayButton="วันนี้"
                showPopperArrow={false}
                placeholderText="เลือกวันที่สิ้นสุด"
                wrapperClassName="date-picker-full"
                className="custom-datepicker"
              customInput={<input style={inputStyle} />}
            />
            {renderTimeInput('end', endTimeText)}
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: '9px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>เลือกเวลาแบบรวดเร็ว</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <button type="button" onClick={setStartToNow} style={{ ...buttonStyle, backgroundColor: '#17a2b8' }}>เริ่มตอนนี้</button>
            {[
              { minutes: 10, label: '10 นาที' },
              { minutes: 15, label: '15 นาที' },
              { minutes: 30, label: '30 นาที' },
              { minutes: 60, label: '1 ชม.' }
            ].map((option) => (
              <button key={option.minutes} type="button" onClick={() => setDuration(option.minutes)} style={{ ...buttonStyle, backgroundColor: '#fff', color: '#007bff', border: '1px solid #007bff' }}>
                ใช้ {option.label}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" style={{ width: '100%', padding: '12px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '18px', marginTop: '30px', fontWeight: 'bold' }}>
          💾 บันทึกข้อมูลการจอง
        </button>
      </form>
    </div>
  );
}
