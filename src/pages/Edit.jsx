import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import DatePicker, { registerLocale } from 'react-datepicker';
import { th } from 'date-fns/locale/th';
import 'react-datepicker/dist/react-datepicker.css';
import Swal from 'sweetalert2';

registerLocale('th', th);

const SCRIPT_URL = import.meta.env.VITE_SCRIPT_URL;

const emptyForm = {
  userId: '',
  driverName: '',
  phone: '',
  licenseNo: '',
  costCenter: '',
  purpose: '',
  startDatetime: '',
  endDatetime: '',
  returnDatetime: ''
};

function toDateTimeInput(value) {
  if (!value) return '';

  const thaiFormat = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (thaiFormat) {
    const [, day, month, year, hour, minute] = thaiFormat;
    return `${year}-${month}-${day}T${hour}:${minute}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function dateWithTime(dateValue, timeText) {
  const match = timeText.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  const date = new Date(dateValue);
  if (!match || Number.isNaN(date.getTime())) return null;
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function normalizeBooking(booking) {
  return {
    userId: booking.userId || '',
    driverName: booking.driverName || booking.title || '',
    phone: booking.phone || '',
    licenseNo: booking.licenseNo || '',
    costCenter: booking.costCenter || '',
    purpose: booking.purpose || '',
    startDatetime: toDateTimeInput(booking.startDatetime || booking.start),
    endDatetime: toDateTimeInput(booking.endDatetime || booking.end),
    returnDatetime: booking.returnDatetime || ''
  };
}

export default function Edit() {
  const { bookingId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(emptyForm);
  const [startTimeText, setStartTimeText] = useState('');
  const [endTimeText, setEndTimeText] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const applyBooking = (booking) => {
      const normalized = normalizeBooking(booking);
      setFormData(normalized);
      setStartTimeText(normalized.startDatetime.slice(11, 16));
      setEndTimeText(normalized.endDatetime.slice(11, 16));
    };

    const passedBooking = location.state?.booking;
    if (passedBooking) {
      applyBooking(passedBooking);
      setIsLoading(false);
      return;
    }

    async function loadBooking() {
      try {
        const response = await fetch(SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'get_booking', bookingId })
        });
        const result = await response.json();
        if (result.status !== 'success') throw new Error(result.message || 'ไม่พบรายการจอง');
        applyBooking(result.data);
      } catch (error) {
        await Swal.fire({
          icon: 'error',
          title: 'โหลดข้อมูลไม่สำเร็จ',
          text: error.message,
          confirmButtonColor: '#dc3545'
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    }

    loadBooking();
  }, [bookingId, location.state, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((previous) => ({ ...previous, [name]: value }));
  };

  const updateDatePart = (target, selectedDate) => {
    if (!selectedDate) return;
    const field = target === 'start' ? 'startDatetime' : 'endDatetime';
    const current = new Date(formData[field]);
    current.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    setFormData((previous) => ({ ...previous, [field]: toDateTimeInput(current) }));
  };

  const handleTimeTextChange = (target, value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    const formatted = digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
    if (target === 'start') setStartTimeText(formatted);
    else setEndTimeText(formatted);
  };

  const applyTimeText = (target) => {
    const field = target === 'start' ? 'startDatetime' : 'endDatetime';
    const value = target === 'start' ? startTimeText : endTimeText;
    const updated = dateWithTime(formData[field], value);

    if (!updated) {
      const oldTime = formData[field].slice(11, 16);
      if (target === 'start') setStartTimeText(oldTime);
      else setEndTimeText(oldTime);
      Swal.fire({ icon: 'warning', title: 'รูปแบบเวลาไม่ถูกต้อง', text: 'กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 08:30 หรือ 16:45' });
      return;
    }

    setFormData((previous) => ({ ...previous, [field]: toDateTimeInput(updated) }));
  };

  const setDuration = (minutes) => {
    const start = dateWithTime(formData.startDatetime, startTimeText);
    if (!start) return;
    const end = new Date(start.getTime() + minutes * 60 * 1000);
    setFormData((previous) => ({
      ...previous,
      endDatetime: toDateTimeInput(end)
    }));
    setEndTimeText(toDateTimeInput(end).slice(11, 16));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const submittedStart = dateWithTime(formData.startDatetime, startTimeText);
    const submittedEnd = dateWithTime(formData.endDatetime, endTimeText);

    if (!formData.driverName || !formData.licenseNo || !formData.purpose || !formData.startDatetime || !formData.endDatetime) {
      Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกช่องที่มีเครื่องหมาย * ให้ครบ' });
      return;
    }

    if (!submittedStart || !submittedEnd) {
      Swal.fire({ icon: 'warning', title: 'รูปแบบเวลาไม่ถูกต้อง', text: 'กรุณากรอกเวลาแบบ 24 ชั่วโมง เช่น 08:30 หรือ 16:45' });
      return;
    }

    if (submittedEnd <= submittedStart) {
      Swal.fire({ icon: 'warning', title: 'วันเวลาไม่ถูกต้อง', text: 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มยืม' });
      return;
    }

    Swal.fire({
      title: 'กำลังบันทึกการแก้ไข...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'update_booking',
          bookingId,
          ...formData,
          startDatetime: submittedStart.toISOString(),
          endDatetime: submittedEnd.toISOString()
        })
      });
      const result = await response.json();
      if (result.status !== 'success') throw new Error(result.message || 'แก้ไขข้อมูลไม่สำเร็จ');

      await Swal.fire({
        icon: 'success',
        title: 'แก้ไขข้อมูลสำเร็จ',
        text: `อัปเดตรายการ ${bookingId} เรียบร้อยแล้ว`,
        confirmButtonColor: '#28a745'
      });
      navigate('/');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'แก้ไขข้อมูลไม่สำเร็จ',
        text: error.message,
        confirmButtonColor: '#dc3545'
      });
    }
  };

  const inputStyle = { width: '100%', padding: '12px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ccc', boxSizing: 'border-box', minHeight: '46px', fontSize: '16px' };
  const labelStyle = { display: 'block', marginTop: '15px', fontWeight: 'bold', color: '#444' };

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

  if (isLoading) {
    return <div style={{ padding: '50px', textAlign: 'center', color: '#666' }}>กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div style={{ width: '100%', maxWidth: '620px', margin: '20px auto', padding: '24px', boxSizing: 'border-box', background: '#fff', borderRadius: '10px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      <style>{`
        .date-picker-full, .date-picker-full .react-datepicker-wrapper, .date-picker-full .react-datepicker__input-container { width: 100%; }
        .react-datepicker { font-size: 0.95rem; }
        .react-datepicker__day, .react-datepicker__day-name { width: 2rem; line-height: 2rem; }
        .react-datepicker__current-month { padding-bottom: 8px; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', borderBottom: '2px solid #f0f0f0', paddingBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#333' }}>✏️ แก้ไขรายการจอง</h2>
          <div style={{ marginTop: '6px', color: '#777' }}>{bookingId}</div>
        </div>
        <button type="button" onClick={() => navigate('/')} style={{ padding: '9px 15px', border: 0, borderRadius: '5px', background: '#6c757d', color: '#fff', cursor: 'pointer' }}>ยกเลิก</button>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={labelStyle}>ชื่อ-สกุล คนขับ *</label>
        <input name="driverName" value={formData.driverName} onChange={handleChange} style={inputStyle} required />

        <label style={labelStyle}>เลขที่ใบขับขี่ *</label>
        <input name="licenseNo" value={formData.licenseNo} onChange={handleChange} style={inputStyle} required />

        <label style={labelStyle}>เบอร์โทรศัพท์</label>
        <input name="phone" value={formData.phone} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>Cost Center</label>
        <input name="costCenter" value={formData.costCenter} onChange={handleChange} style={inputStyle} />

        <label style={labelStyle}>วัตถุประสงค์ *</label>
        <input name="purpose" value={formData.purpose} onChange={handleChange} style={inputStyle} required />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
          <div>
            <label style={labelStyle}>วันที่เริ่มยืม *</label>
            <DatePicker
              selected={new Date(formData.startDatetime)}
              onChange={(date) => updateDatePart('start', date)}
              dateFormat="dd/MM/yyyy"
              locale="th"
              calendarStartDay={1}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              todayButton="วันนี้"
              showPopperArrow={false}
              wrapperClassName="date-picker-full"
              customInput={<input style={inputStyle} />}
            />
            {renderTimeInput('start', startTimeText)}
          </div>
          <div>
            <label style={labelStyle}>วันที่สิ้นสุด *</label>
            <DatePicker
              selected={new Date(formData.endDatetime)}
              onChange={(date) => updateDatePart('end', date)}
              minDate={new Date(formData.startDatetime)}
              dateFormat="dd/MM/yyyy"
              locale="th"
              calendarStartDay={1}
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              todayButton="วันนี้"
              showPopperArrow={false}
              wrapperClassName="date-picker-full"
              customInput={<input style={inputStyle} />}
            />
            {renderTimeInput('end', endTimeText)}
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '12px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #e5e5e5' }}>
          <div style={{ marginBottom: '9px', fontSize: '14px', fontWeight: 'bold', color: '#555' }}>กำหนดเวลาสิ้นสุดแบบรวดเร็ว</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {[
              { minutes: 10, label: '10 นาที' },
              { minutes: 15, label: '15 นาที' },
              { minutes: 30, label: '30 นาที' },
              { minutes: 60, label: '1 ชม.' }
            ].map((option) => (
              <button key={option.minutes} type="button" onClick={() => setDuration(option.minutes)} style={{ padding: '8px 13px', backgroundColor: '#fff', color: '#007bff', border: '1px solid #007bff', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                ใช้ {option.label}
              </button>
            ))}
          </div>
        </div>

        <label style={labelStyle}>เวลาคืนรถจริง</label>
        <input
          value={formData.returnDatetime && formData.returnDatetime !== '-' ? formData.returnDatetime : 'ยังไม่คืนรถ'}
          readOnly
          style={{ ...inputStyle, backgroundColor: '#e9ecef', color: '#666', cursor: 'not-allowed' }}
        />

        <button type="submit" style={{ width: '100%', marginTop: '28px', padding: '13px', border: 0, borderRadius: '6px', background: '#007bff', color: '#fff', cursor: 'pointer', fontSize: '17px', fontWeight: 'bold' }}>
          💾 บันทึกการแก้ไข
        </button>
      </form>
    </div>
  );
}
