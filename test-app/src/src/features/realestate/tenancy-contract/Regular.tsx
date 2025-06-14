import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import jsPDF from 'jspdf';
import bsreheader from '../../../assets/bsreheader.png';
import { handlePrint } from '../../../components/reportfiles/rptmoveinout';


  type Unit = { flat_no: string };
  type Building = { id: string; name: string };
  type Equipment = { id: string; name: string; usec_name: string; susec_name?: string };
  type ReportData = {
  buildingName: string;
  unitName: string;
  tenantName: string;
  contractNo: string;
  startDate: string;
  endDate: string;
  visitType: string;
  equipment: { name: string; status: string; remarks: string }[];
  tenantsignature: string;
  techniciansignature: string;
  date: string;
  username: string;
};

function formatDate_ddMMMyyyy(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatDate_ddMMMyyyy_hhmmtt(dateString: string) {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  let hour = date.getHours();
  const min = date.getMinutes().toString().padStart(2, '0');
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  hour = hour ? hour : 12; // 0 should be 12
  const hourStr = hour.toString().padStart(2, '0');
  return `${day}/${month}/${year} ${hourStr}:${min} ${ampm}`;
}

function SignatureStepSummary({
  title,
  error,
  buildingName,
  unitName,
  form,
  equipmentList,
  equipmentState,
  signatureRef,
  onClearSignature,
  onBack,
  onNext,
  nextLabel,
  loading,
}: {
  title: string;
  error?: string;
  buildingName: string;
  unitName: string;
  form: {
    buildingId: string;
    unitId: string;
    tenantName: string;
    contractNo: string;
    contractId: string;
    startDate: string;
    endDate: string;
    visitType: string;
  };
  equipmentList: Equipment[];
  equipmentState: Record<string, { status: string; remarks: string }>;
  signatureRef: React.RefObject<SignatureCanvas | null>;
  onClearSignature: () => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  loading?: boolean;
}) {
  return (
    <div className="checklist-form" style={{ maxWidth: 800, fontFamily: '"Times New Roman", Times, serif' }}>
      <h2>{title}</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <div style={{ marginBottom: 18, width: '100%' }}>
        <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 8 }}>{form.visitType} Checklist Summary</h3>
        <div style={{ background: '#e3f2fd', border: '1.5px solid #90caf9', borderRadius: 8, padding: '1rem', marginBottom: 10 }}>
          <div><b>Building:</b> {buildingName}</div>
          <div><b>Unit:</b> {unitName}</div>
          <div><b>Tenant:</b> {form.tenantName || '—'}</div>
          <div><b>Contract No:</b> {form.contractNo || '—'}</div>
          <div><b>Start:</b> {form.startDate ? formatDate_ddMMMyyyy(form.startDate) : '—'}</div>
          <div><b>End:</b> {form.endDate ? formatDate_ddMMMyyyy(form.endDate) : '—'}</div>
          <div><b>Visit Type:</b> {form.visitType}</div>
          <div style={{ marginTop: 8 }}>
            <b>Equipment:</b>
            {Object.entries(
              equipmentList.reduce((acc, eq) => {
                if (!acc[eq.usec_name]) acc[eq.usec_name] = [];
                acc[eq.usec_name].push({
                  ...eq,
                  status: equipmentState[eq.name]?.status || '—',
                  remarks: equipmentState[eq.name]?.remarks || ''
                });
                return acc;
              }, {} as Record<string, Array<{ name: string; susec_name?: string; status: string; remarks: string }>>)
            ).map(([usecName, items]) => {
              // Filter items according to your logic
              const filteredItems = items.filter(
                eq =>
                  eq.status !== 'Good' ||
                  (eq.status === 'Good' && eq.remarks && eq.remarks.trim() !== '')
              );
              // Only render the table if there are filtered items
              if (filteredItems.length === 0) return null;
              return (
                <div key={usecName} style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '12px 0 4px 0', color: '#000' }}>
                    {usecName}
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '5%' }}>Srno</th>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '40%' }}>Item Des</th>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '10%' }}>Unit</th>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '10%' }}>Qty</th>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '15%' }}>Status</th>
                        <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '20%' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((eq, idx) => (
                        <tr key={eq.susec_name || eq.name}>
                          <td style={{ border: '1px solid #000', padding: 6, width: '1%' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: 6, width: '40%' }}>{eq.susec_name || eq.name}</td>
                          <td style={{ border: '1px solid #000', padding: 6, width: '14%' }}>SQM</td>
                          <td style={{ border: '1px solid #000', padding: 6, width: '10%' }}>1</td>
                          <td style={{ border: '1px solid #000', padding: 6, width: '15%' }}>{eq.status || '—'}</td>
                          <td style={{ border: '1px solid #000', padding: 6, width: '20%', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{eq.remarks || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          marginBottom: 16,
          padding: 0,
          boxSizing: 'border-box'
        }}
      >
        <SignatureCanvas
          penColor="#1976d2"
          canvasProps={{
            className: 'sigCanvas'
          }}
          ref={signatureRef}
        />
        <button
          type="button"
          onClick={onClearSignature}
          style={{
            marginTop: 12,
            background: '#fff',
            color: '#1976d2',
            border: '1.5px solid #1976d2',
            borderRadius: 8,
            padding: '0.5rem 1.2rem',
            fontWeight: 700,
            cursor: 'pointer',
            alignSelf: 'center',
          }}
        >
          Clear Signature
        </button>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, width: '100%', maxWidth: 320, alignSelf: 'center' }}>
        <button
          onClick={onBack}
          style={{
            width: '50%',
            fontSize: '1.1rem',
            fontWeight: 700,
            borderRadius: 10,
            boxShadow: '0 2px 12px #90caf933',
            background: '#90caf9',
            color: '#1976d2',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          style={{
            width: '50%',
            fontSize: '1.1rem',
            fontWeight: 700,
            borderRadius: 10,
            boxShadow: '0 2px 12px #90caf933',
            background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

const Checklist = () => {
  // const username = localStorage.getItem('username')
  const tenantsignatureref = useRef<SignatureCanvas | null>(null);
  const techniciansignatureref = useRef<SignatureCanvas | null>(null);
  const [step, setStep] = useState(1); // 1: form, 2: signature
  const [form, setForm] = useState({
    buildingId: '',
    unitId: '',
    tenantName: '',
    contractNo: '',
    contractId: '', // Added contractId to form state
    startDate: '',
    endDate: '',
    visitType: 'Move-In',
  });
 
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]); // [{id, name}]
  const [equipmentState, setEquipmentState] = useState<Record<string, { status: string; remarks: string }>>({}); // { [name]: { status, remarks } }
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [loadingEquipment, setLoadingEquipment] = useState(false);
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [tenantSignatureData, setTenantSignatureData] = useState('');
  const groupedEquipment = equipmentList.reduce((acc, eq) => {
  if (!acc[eq.usec_name]) acc[eq.usec_name] = [];
  acc[eq.usec_name].push(eq);
  return acc;
}, {} as Record<string, typeof equipmentList>);
  const [attachmentPopup, setAttachmentPopup] = useState<{ open: boolean; eqKey: string | null; type: 'image' | 'video' | null }>({ open: false, eqKey: null, type: null });
  const [attachments, setAttachments] = useState<{ images: File[]; videos: File[] }>({ images: [], videos: [] });

const grouped = reportData?.equipment
  ? reportData.equipment.reduce((acc: { [key: string]: Array<{ name: string; status: string; remarks: string; susec_name?: string }> }, eq) => {
      // If you store usec_name and susec_name separately, use them directly
      // If not, split eq.name as needed
      const [usec, susecRaw] = eq.name.split(' (');
      const susec = susecRaw ? susecRaw.replace(')', '') : '';
      if (!acc[usec]) acc[usec] = [];
      acc[usec].push({ ...eq, susec_name: susec });
      return acc;
    }, {} as { [key: string]: Array<{ name: string; status: string; remarks: string; susec_name?: string }> })
  : {};

  // type EquipmentState = { [key: string]: { status: string; remarks: string } } & { [key: number]: { status: string; remarks: string } };

      function renderAttachmentPopup() {
        if (!attachmentPopup.open) return null;
        const isImage = attachmentPopup.type === 'image';
        const files = isImage ? attachments.images : attachments.videos;
        const maxFiles = 5;

        return (
          <div style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
          }}>
            <div style={{
              background: '#fff', padding: 24, borderRadius: 10, minWidth: 320, boxShadow: '0 4px 24px #1976d244'
            }}>
              <h3 style={{ marginBottom: 16, color: '#1976d2' }}>
                Attach up to 5 {isImage ? 'Images' : 'Videos'}
              </h3>
              <input
                type="file"
                accept={isImage ? 'image/*' : 'video/*'}
                multiple
                onChange={e => {
                  if (e.target.files) {
                    const selected = Array.from(e.target.files).slice(0, maxFiles - files.length);
                    setAttachments(prev => ({
                      ...prev,
                      [isImage ? 'images' : 'videos']: [...prev[isImage ? 'images' : 'videos'], ...selected].slice(0, maxFiles)
                    }));
                  }
                }}
                disabled={files.length >= maxFiles}
              />
              <div style={{ margin: '10px 0', fontSize: 13 }}>
                {files.length > 0 && (
                  <ul style={{ paddingLeft: 18 }}>
                    {files.map((file, idx) => (
                      <li key={idx}>
                        {file.name}
                        <button
                          style={{
                            marginLeft: 8,
                            color: '#d32f2f',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setAttachments(prev => ({
                              ...prev,
                              [isImage ? 'images' : 'videos']: prev[isImage ? 'images' : 'videos'].filter((_, i) => i !== idx)
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setAttachmentPopup({ open: false, eqKey: null, type: null })}
                  style={{ background: '#90caf9', color: '#1976d2', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', fontWeight: 700 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      }

  // Fetch buildings on mount
    useEffect(() => {
      setLoadingBuildings(true);
      axios.get('http://localhost:3001/api/buildings')
        .then(res => {
          if (res.data.success) setBuildings(res.data.buildings);
          else setError('Failed to load buildings');
        })
        .catch(() => setError('Failed to load buildings'))
        .finally(() => setLoadingBuildings(false));
    }, []);

  // Fetch units when building changes
  useEffect(() => {
    if (!form.buildingId) {
      setUnits([]);
      setForm(f => ({ ...f, unitId: '' }));
      return;
    }
    setLoadingUnits(true);
    axios.get(`http://localhost:3001/api/units?buildingId=${form.buildingId}`)
      .then(res => {
        if (res.data.success) setUnits(res.data.units);
        else setError('Failed to load units');
      })
      .catch(() => setError('Failed to load units'))
      .finally(() => setLoadingUnits(false));
  }, [form.buildingId]);

  // Fetch equipment when buildingId or unitId changes
  useEffect(() => {
    if (!form.buildingId || !form.unitId) {
      setEquipmentList([]);
      setEquipmentState({});
      return;
    }
    setLoadingEquipment(true);
    axios.get(`http://localhost:3001/api/equipment?buildingId=${form.buildingId}&unitId=${form.unitId}`)
      .then(res => {
        if (res.data.success) {
          // Map both usec_name and susec_name
          const equipment = res.data.equipment.map((eq: { usec_name: string, susec_name: string }, idx: number) => ({
            id: idx,
            usec_name: eq.usec_name,
            susec_name: eq.susec_name,
            name: `${eq.usec_name} (${eq.susec_name})`
          }));
          setEquipmentList(equipment);
          // Initialize equipmentState with default values
          const initial: Record<string, { status: string; remarks: string }> = {};
          equipment.forEach((eq: { name: string; usec_name: string; susec_name: string }) => {
            initial[`${eq.usec_name} (${eq.susec_name})`] = { status: 'Good', remarks: '' };
          });
          setEquipmentState(initial);
        } else setError('Failed to load equipment');
      })
      .catch(() => setError('Failed to load equipment'))
      .finally(() => setLoadingEquipment(false));
  }, [form.buildingId, form.unitId]);


  // For visitType radio
  const handleRadioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // For dynamic equipment radio
  const handleEquipmentRadio = (name: string | number, value: string) => {
    setEquipmentState(prev => ({
      ...prev,
      [name]: { ...prev[name], status: value }
    }));
  };

  // For dynamic equipment remarks
  const handleEquipmentRemarks = (name: string | number, value: string) => {
    setEquipmentState(prev => ({
      ...prev,
      [name]: { ...prev[name], remarks: value }
    }));
  };


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => {
      const updated = { ...prev, [e.target.name]: e.target.value };
      // Reset unit and tenant if building changes
      if (e.target.name === 'buildingId') {
        updated.unitId = '';
        updated.tenantName = '';
      }
      // Clear tenant if unit changes
      if (e.target.name === 'unitId') {
        updated.tenantName = '';
      }
      return updated;
    });
  };

  // Auto-fill tenant name, contract no, start date, and end date when unitId changes
  useEffect(() => {
    if (!form.unitId) {
      setForm(f => ({ ...f, tenantName: '', contractNo: '', startDate: '', endDate: '' }));
      return;
    }
    // Always send both buildingId and unitId to backend
    axios.get(`http://localhost:3001/api/unit-details?unit_id=${form.unitId}`)
      .then(res => {
        if (res.data.contract && res.data.tenant) {
          setForm(f => ({
            ...f,
            tenantName: res.data.tenant.full_name || '',
            contractNo: res.data.contract.contract_number || '',
            startDate: res.data.contract.start_date || '',
            endDate: res.data.contract.end_date || '',
            contractId: res.data.contract.contract_no || ''
          }));
        } else {
          setForm(f => ({ ...f, tenantName: '', contractNo: '', startDate: '', endDate: '', contractId: '' }));
        }
      })
      .catch(() => setForm(f => ({ ...f, tenantName: '', contractNo: '', startDate: '', endDate: '', contractId: '' })));
  }, [form.unitId]);



  // Step 1: Validate and go to signature step
  const handleNext = () => {
    setError('');
    setSuccess('');
    if (!form.buildingId || !form.unitId) {
      setError('Please select building and unit');
      return;
    }
    if (!form.tenantName) {
      setError('Please enter tenant name');
      return;
    }
    setStep(2);
  };

      useEffect(() => {
      if (step === 3 && techniciansignatureref.current) {
        techniciansignatureref.current.clear();
      }
    }, [step]);

    const handleNext1 = () => {
    setError('');
    setSuccess('');
    if (!tenantsignatureref.current || tenantsignatureref.current.isEmpty()) {
      setError('Please enter tenant signature');
      return;
    }
    // Save tenant signature before moving to step 3
    if (tenantsignatureref.current && !tenantsignatureref.current.isEmpty()) {
      setTenantSignatureData(tenantsignatureref.current.toDataURL('image/png'));
    } else {
      setTenantSignatureData('');
    }
    setStep(3);
  };

  // Step 2: Submit checklist with signature
  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    if (!techniciansignatureref.current || techniciansignatureref.current.isEmpty()) {
      setError('Please provide a signature');
      return;
    }
    setSubmitLoading(true);
    const tenantsignature = tenantSignatureData;
    const techniciansignature = techniciansignatureref.current ? techniciansignatureref.current.toDataURL('image/png') : '';
    try {
      // Use FormData for file and data upload
      const formData = new FormData();
      formData.append('unit', form.unitId);
      formData.append('contract', form.contractNo);
      formData.append('visitType', form.visitType);
      formData.append('equipment', JSON.stringify(equipmentState));
      formData.append('techniciansignature', techniciansignature);
      formData.append('tenantsignature', tenantsignature);
      formData.append('date', new Date().toISOString());

      // Attach images
      attachments.images.forEach(file => {
        formData.append('images', file, file.name);
      });
      // Attach videos
      attachments.videos.forEach(file => {
        formData.append('videos', file, file.name);
      });

      await axios.post('http://localhost:3001/api/checklist', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setError('');
      setReportData({
        buildingName,
        unitName,
        tenantName: form.tenantName,
        contractNo: form.contractNo,
        startDate: form.startDate,
        endDate: form.endDate,
        visitType: form.visitType,
        equipment: equipmentList.map(eq => ({
          name: eq.name,
          status: equipmentState[eq.name]?.status || '—',
          remarks: equipmentState[eq.name]?.remarks || ''
        })),
        tenantsignature,
        techniciansignature,
        date: new Date().toLocaleString(),
        username: localStorage.getItem('username') || 'Technician'
      });
      setShowReport(true);
      setStep(1);
      if (equipmentList && equipmentList.length > 0) {
        const initial: Record<string, { status: string; remarks: string }> = {};
        equipmentList.forEach(eq => {
          initial[eq.name] = { status: 'Good', remarks: '' };
        });
        setEquipmentState(initial);
      }
      if (tenantsignatureref.current) tenantsignatureref.current.clear();
      if (techniciansignatureref.current) techniciansignatureref.current.clear();
      setForm(prev => ({
        ...prev,
        visitType: 'Move-In',
      }));
    } catch {
      setError('Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };
  
  // PDF handler
  // const handleDownloadPDF = () => {
  //   if (!reportData) return;
  //   const doc = new jsPDF();
  //   // Header
  //   let y = 40;
  //   const pageHeight = doc.internal.pageSize.getHeight();
  //   const bottomMargin = 20;
  //   doc.setFontSize(20);
  //   doc.setTextColor(25, 118, 210);
  //   doc.text('ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 18, { align: 'center' });
  //   // Checklist Report title in blue
  //   doc.setFontSize(14);
  //   doc.setTextColor(25, 118, 210); // <-- blue
  //   doc.text('Checklist Report', 105, 28, { align: 'center' });
  //   // Details
  //   doc.setTextColor(0, 0, 0);
  //   doc.setFontSize(12);
  //   doc.text(`Date: ${reportData.date}`, 10, y);
  //   doc.text(`Technician: ${reportData.username}`, 140, y);
  //   y += 10;
  //   doc.text(`Building: ${reportData.buildingName}`, 10, y);
  //   doc.text(`Unit: ${reportData.unitName}`, 140, y);
  //   y += 10;
  //   doc.text(`Tenant: ${reportData.tenantName}`, 10, y);
  //   doc.text(`Contract No: ${reportData.contractNo}`, 140, y);
  //   y += 10;
  //   doc.text(`Start: ${reportData.startDate ? formatDate_ddMMMyyyy(reportData.startDate) : '—'}`, 10, y);
  //   doc.text(`End: ${reportData.endDate ? formatDate_ddMMMyyyy(reportData.endDate) : '—'}`, 140, y);
  //   y += 10;
  //   doc.text(`Visit Type: ${reportData.visitType}`, 10, y);
  //   y += 10;
  //   doc.text('Equipment Status:', 10, y);
  //   y += 8;

  //   Object.entries(grouped).forEach(([usec, items]) => {
  //     doc.setFont('times', 'bold');
  //     doc.text(usec, 12, y);
  //     doc.setFont('times', 'normal');
  //     y += 7;

  //     // Table header (no background)
  //     doc.setFontSize(11);
  //     const startX = 14;
  //     const colWidths = [60, 35, 50]; // Equipment, Status, Remarks
  //     const rowY = y;
  //     // Draw header borders
  //     doc.rect(startX, rowY - 5, colWidths[0], 8);
  //     doc.rect(startX + colWidths[0], rowY - 5, colWidths[1], 8);
  //     doc.rect(startX + colWidths[0] + colWidths[1], rowY - 5, colWidths[2], 8);
  //     // Draw header text
  //     doc.text('Equipment', startX + 2, rowY);
  //     doc.text('Status', startX + colWidths[0] + 2, rowY);
  //     doc.text('Remarks', startX + colWidths[0] + colWidths[1] + 2, rowY);
  //     // Move y by full row height (8) so first data row starts after header border
  //     y += 8;

  //     // Draw rows
  //     items.forEach(eq => {
  //       if (y > pageHeight - bottomMargin) {
  //         doc.addPage();
  //         y = 20;
  //       }
  //       // Draw cell borders only (no fill)
  //       doc.rect(startX, y - 5, colWidths[0], 8);
  //       doc.rect(startX + colWidths[0], y - 5, colWidths[1], 8);
  //       doc.rect(startX + colWidths[0] + colWidths[1], y - 5, colWidths[2], 8);
  //       // Draw text
  //       doc.text(eq.susec_name || '', startX + 2, y);
  //       doc.text(eq.status, startX + colWidths[0] + 2, y);
  //       doc.text(eq.remarks || '', startX + colWidths[0] + colWidths[1] + 2, y);
  //       y += 8;
  //     });
  //     y += 4;
  //     doc.setFontSize(12);
  //   });
  //   // Signature
  //   if (reportData.tenantsignature) {
  //     // Check if there is enough space for the signature image (height: 30)
  //     if (y + 35 > pageHeight - bottomMargin) {
  //       doc.addPage();
  //       y = 20;
  //     }
  //     doc.text('Tenant Signature:', 10, y + 5);
  //     doc.addImage(reportData.tenantsignature, 'PNG', 60, y, 80, 30);
  //     y += 35;
  //   }
  //     if (reportData.techniciansignature) {
  //       // Check if there is enough space for the signature image (height: 30)
  //       if (y + 35 > pageHeight - bottomMargin) {
  //         doc.addPage();
  //         y = 20;
  //       }
  //       doc.text('Technician Signature:', 10, y + 5);
  //       doc.addImage(reportData.techniciansignature, 'PNG', 60, y, 80, 30);
  //       y += 35;
  //   }
  //   // Footer
  //   const footerText = 'This is a system-generated report. © ABDULWAHED AHMAD RASHED BIN SHABIB';
  //   const footerY = pageHeight - 15; // 15 units from the bottom

  //   // If current y is too close to the footer, add a new page
  //   if (y > footerY - 10) { // 10 units buffer for safety
  //     doc.addPage();
  //   }

  //   // Set font and color for footer
  //   doc.setFontSize(10);
  //   doc.setTextColor(25, 118, 210);
  //   doc.text(footerText, 105, footerY, { align: 'center' });

  //   doc.save('Checklist_Report.pdf');
  // };

  // Step 1: Checklist Form
  if (step === 1 && !showReport) {
    return (
      <>
      {renderAttachmentPopup()}
      <div className="checklist-form" style={{ maxWidth: 800, fontFamily: '"Times New Roman", Times, serif' }}>
        <h2>{form.visitType} Checklist</h2>
        {success && <div style={{ color: '#388e3c', background: '#e8f5e9', border: '1.5px solid #66bb6a', borderRadius: 8, padding: '0.7rem 1rem', marginBottom: 12, fontWeight: 700, fontSize: '1.08rem', textAlign: 'center' }}>{success}</div>}
        {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
        <label>Building</label>
        <select name="buildingId" value={form.buildingId} onChange={handleInputChange} disabled={loadingBuildings}>
          <option value="">{loadingBuildings ? 'Loading...' : '-- Select Building --'}</option>
          {buildings.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <label>Unit / Flat</label>
          <select name="unitId" value={form.unitId} onChange={handleInputChange} disabled={!form.buildingId || loadingUnits}>
            <option value="">{loadingUnits ? 'Loading...' : '-- Select Unit --'}</option>
            {units.map(u => (
              <option key={u.flat_no} value={u.flat_no}>{u.flat_no}</option>
            ))}
          </select>
        <div
          style={{
            background: '#e3f2fd',
            border: '1.5px solid #90caf9',
            borderRadius: 8,
            marginBottom: '1rem',
            padding: '0.8rem 1rem',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: 56,
            boxShadow: '0 1px 6px #90caf922',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 180 }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: '1.08rem', letterSpacing: 0.5 }}>Tenant</span>
            <span style={{ color: '#0d47a1', fontWeight: 800, fontSize: '1.08rem', marginTop: 2 }}>{form.tenantName || '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: '1.08rem', letterSpacing: 0.5 }}>Contract No</span>
            <span style={{ color: '#1565c0', fontWeight: 700, fontSize: '1.08rem', marginTop: 2 }}>{form.contractNo || '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: '1.08rem', letterSpacing: 0.5 }}>Start</span>
            <span style={{ color: '#388e3c', fontWeight: 700, fontSize: '1.08rem', marginTop: 2 }}>{form.startDate ? formatDate_ddMMMyyyy(form.startDate) : '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: '1.08rem', letterSpacing: 0.5 }}>End</span>
            <span style={{ color: '#d32f2f', fontWeight: 700, fontSize: '1.08rem', marginTop: 2 }}>{form.endDate ? formatDate_ddMMMyyyy(form.endDate) : '—'}</span>
          </div>
        </div>

        <div className="equipment-row" style={{ marginTop: 10, marginBottom: 18, alignItems: 'center' }}>
          <label className="equip-label" style={{ minWidth: 120 }}>Visit Type:</label>
          <div style={{ display: 'flex', gap: 18 }}>
            <label className="radio-label" style={{ marginRight: 18 }}>
              <input type="radio" name="visitType" value="Move-In" checked={form.visitType === 'Move-In'} onChange={handleRadioChange} /> Move-In
            </label>
            <label className="radio-label">
              <input type="radio" name="visitType" value="Move-Out" checked={form.visitType === 'Move-Out'} onChange={handleRadioChange} /> Move-Out
            </label>
          </div>
        </div>

        {/* Dynamic equipment rows */}
        {form.unitId && equipmentList.length > 0 ? (
          loadingEquipment ? (
            <div style={{ margin: '1rem 0', color: '#1976d2' }}>Loading equipment...</div>
          ) : (
            Object.entries(groupedEquipment).map(([usecName, items]) => (
              <div key={usecName} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '12px 0 4px 0', color: '#1976d2' }}>
                  {usecName}
                </div>
                {items.map(eq => (
                  <div className="equipment-row" style={{ alignItems: 'center', marginBottom: 16 }} key={eq.id}>
                    <label className="equip-label" style={{ minWidth: 120 }}>{eq.susec_name}:</label>
                    <div style={{ display: 'flex', gap: 18 }}>
                      <label className="radio-label" style={{ marginRight: 18 }}>
                        <input
                          type="radio"
                          name={`status-${eq.usec_name}-${eq.susec_name}`}
                          value="Good"
                          checked={equipmentState[`${eq.usec_name} (${eq.susec_name})`]?.status === 'Good'}
                          onChange={() => handleEquipmentRadio(`${eq.usec_name} (${eq.susec_name})`, 'Good')}
                        /> Good
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name={`status-${eq.usec_name}-${eq.susec_name}`}
                          value="Not Working"
                          checked={equipmentState[`${eq.usec_name} (${eq.susec_name})`]?.status === 'Not Working'}
                          onChange={() => handleEquipmentRadio(`${eq.usec_name} (${eq.susec_name})`, 'Not Working')}
                        /> Not Working
                      </label>
                    </div>
                    <input
                      type="text"
                      name={`remarks-${eq.usec_name}-${eq.susec_name}`}
                      placeholder="Remarks"
                      value={equipmentState[`${eq.usec_name} (${eq.susec_name})`]?.remarks || ''}
                      onChange={e => handleEquipmentRemarks(`${eq.usec_name} (${eq.susec_name})`, e.target.value)}
                      style={{ marginLeft: 18, flex: 1 }}
                    />
                  </div>
                ))}
              </div>
            ))
          )
        ) : null}

          {/* Attachments section */}
          <div style={{ display: 'flex', gap: 16, margin: '18px 0', justifyContent: 'center' }}>
            <button
              type="button"
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: 8,
                border: '1px solid #1976d2',
                background: '#e3f2fd',
                color: '#1976d2',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => setAttachmentPopup({ open: true, eqKey: null, type: 'image' })}
            >
              📷 Attach Image
            </button>
            <button
              type="button"
              style={{
                padding: '0.5rem 1.2rem',
                borderRadius: 8,
                border: '1px solid #1976d2',
                background: '#e3f2fd',
                color: '#1976d2',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => setAttachmentPopup({ open: true, eqKey: null, type: 'video' })}
            >
              🎥 Attach Video
            </button>
          </div>

        <button
          onClick={handleNext}
          style={{
            marginTop: 24,
            width: '100%',
            maxWidth: 320,
            alignSelf: 'center',
            fontSize: '1.15rem',
            fontWeight: 700,
            borderRadius: 10,
            boxShadow: '0 2px 12px #90caf933',
          }}
        >
          Next
        </button>
      </div>
      </>
    );
  }

  // Report Preview
  if (showReport && reportData) {
    return (
      <div className="checklist-form" style={{ maxWidth: 800, fontFamily: '"Times New Roman", Times, serif' }}>
        <div id="checklist-report-preview">
        <div className="report-header"
          style={{
            textAlign: 'center',
            fontFamily: '"Times New Roman", Times, serif', // Set font for header
            width: '100%',
            margin: '0 auto'
          }}>
          <img
            src={bsreheader}
            alt="Company Header"
            style={{ width: '100%', maxWidth: 1100, margin: '0 auto', display: 'block' }}
          />
          {/* Remove the line above Checklist Report */}
        <div
          className="report-title"
          style={{
            color: '#000',
            fontWeight: 700,
            marginTop: 12,
            textAlign: 'center',
            fontFamily: '"Times New Roman", Times, serif'
          }}
        >
          {form.visitType} Checklist Report
        </div>
        </div>
          <div className="report-section" style={{ marginTop: 24 }}>
          <table className="report-table" style={{ width: '100%', marginBottom: 18, borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <th style={{ width: 160, color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Date</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }} colSpan={3}>{formatDate_ddMMMyyyy_hhmmtt(reportData.date)}</td>
                {/* <th style={{ width: 160, color: '#000', textAlign: 'left', border: '1px solid #000' }}>Technician</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.username}</td> */}
              </tr>
              <tr>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Building</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.buildingName}</td>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Unit</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.unitName}</td>
              </tr>
              <tr>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Tenant</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.tenantName}</td>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Contract No</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.contractNo}</td>
              </tr>
              <tr>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Start</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.startDate ? formatDate_ddMMMyyyy(reportData.startDate) : '—'}</td>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>End</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }}>{reportData.endDate ? formatDate_ddMMMyyyy(reportData.endDate) : '—'}</td>
              </tr>
              <tr>
                <th style={{ color: '#000', textAlign: 'left', border: '1px solid #000', paddingLeft: 6 }}>Visit Type</th>
                <td style={{ textAlign: 'left', border: '1px solid #000' }} colSpan={3}>{reportData.visitType}</td>
              </tr>
            </tbody>
          </table>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, display: 'inline-block' }}>
                Equipment Status:
                <div
                  style={{
                    borderBottom: '2px solid #000',
                    width: '100%',
                    marginTop: 2
                  }}
                />
              </div>
              {Object.entries(grouped).map(([usecName, items]) => {
                // Filter items according to your logic
                const filteredItems = items.filter(
                  eq =>
                    (eq.status !== 'Good' || (eq.status === 'Good' && eq.remarks && eq.remarks.trim() !== '')) &&
                    (eq.susec_name || eq.name)
                );
                // Only render the table if there are filtered items
                if (filteredItems.length === 0) return null;
                return (
                  <div key={usecName} style={{ marginBottom: 24 }}>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', margin: '12px 0 4px 0', color: '#000' }}>
                      {usecName}
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 4 }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '5%' }}>Srno</th>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '40%' }}>Item Des</th>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '10%' }}>Unit</th>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '10%' }}>Qty</th>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '15%' }}>Status</th>
                          <th style={{ border: '1px solid #000', padding: 6, background: '#e3f2fd', color: '#000', width: '20%' }}>Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((eq, idx) => (
                          <tr key={eq.susec_name || eq.name}>
                            <td style={{ border: '1px solid #000', padding: 6, width: '1%', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: 6, width: '40%' }}>{eq.susec_name || eq.name}</td>
                            <td style={{ border: '1px solid #000', padding: 6, width: '14%', textAlign: 'center' }}>SQM</td>
                            <td style={{ border: '1px solid #000', padding: 6, width: '10%', textAlign: 'center' }}>1</td>
                            <td style={{ border: '1px solid #000', padding: 6, width: '15%' }}>{eq.status || '—'}</td>
                            <td style={{ border: '1px solid #000', padding: 6, width: '20%', wordBreak: 'break-word', whiteSpace: 'pre-line' }}>{eq.remarks || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 32, marginTop: 18, width: '100%' }}>
              {/* Tenant Signature: label and box left-aligned */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <b>ACCEPTED BY:</b>
                <b>{reportData.tenantName || 'Tenant'}</b>
                {reportData.tenantsignature && (
                  <img
                    src={reportData.tenantsignature}
                    alt="Tenant Signature"
                    className="tenantsignature-img"
                    style={{ width: 240, height: 80, background: '#fff', border: '2px solid #1976d2', borderRadius: 8, marginTop: 8 }}
                  />
                )}
              </div>
              {/* Technician Signature: label left, box right */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              <b style={{ textAlign: 'right', display: 'block', width: '100%' }}>PREPARED BY:</b>
              <b style={{ textAlign: 'right', display: 'block', width: '100%' }}>{reportData.username || 'Technician'}:</b>
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                {reportData.techniciansignature && (
                  <img
                    src={reportData.techniciansignature}
                    alt="Technician Signature"
                    className="techniciansignature-img"
                    style={{ width: 240, height: 80, background: '#fff', border: '2px solid #1976d2', borderRadius: 8, marginTop: 8 }}
                  />
                )}
              </div>
            </div>
            </div>
          </div>
          <div className="report-footer">
            This is a system-generated report. &copy; ABDULWAHED AHMAD RASHED BIN SHABIB
          </div>
          <div className="print-footer">
            <div className="print-footer-left">
              Printed date: {new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '')}
            </div>
            <div className="print-footer-right"></div>
          </div>
        </div>
        <div className="report-buttons" style={{ display: 'flex', gap: 18, marginTop: 32, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
        <button
          onClick={() => {
            setShowReport(false);
            setForm(prev => ({
              ...prev,
              buildingId: '',
              unitId: '',
              tenantName: '',
              contractNo: '',
              contractId: '',
              startDate: '',
              endDate: '',
            }));
            setUnits([]);
          }}
          style={{ background: '#bbdefb', color: '#1976d2', fontWeight: 700 }}
        >
          Back
        </button>
          <button onClick={() => handlePrint('checklist-report-preview')} style={{ background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)', color: '#fff', fontWeight: 700 }}>Preview & Print</button>
          {/* <button onClick={handleDownloadPDF} style={{ background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)', color: '#fff', fontWeight: 700 }}>Download PDF</button> */}
          <button onClick={async () => {
            // Generate PDF as base64
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(25, 118, 210);
            doc.text('ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 18, { align: 'center' });
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(`${reportData.visitType} Checklist Report`, 105, 28, { align: 'center' });
            doc.setFontSize(12);
            let y = 40;
            doc.text(`Date: ${reportData.date}`, 10, y);
            doc.text(`Technician: ${reportData.username}`, 140, y);
            y += 10;
            doc.text(`Building: ${reportData.buildingName}`, 10, y);
            doc.text(`Unit: ${reportData.unitName}`, 140, y);
            y += 10;
            doc.text(`Tenant: ${reportData.tenantName}`, 10, y);
            doc.text(`Contract No: ${reportData.contractNo}`, 140, y);
            y += 10;
            doc.text(`Start: ${reportData.startDate ? formatDate_ddMMMyyyy(reportData.startDate) : '—'}`, 10, y);
            doc.text(`End: ${reportData.endDate ? formatDate_ddMMMyyyy(reportData.endDate) : '—'}`, 140, y);
            y += 10;
            doc.text(`Visit Type: ${reportData.visitType}`, 10, y);
            y += 10;
            doc.text('Equipment:', 10, y);
            y += 8;
            reportData.equipment
            .filter(eq => eq.name && eq.name.trim() !== "")
            .forEach(eq => {
              doc.text(`- ${eq.name}: ${eq.status}${eq.remarks ? ` (Remarks: ${eq.remarks})` : ''}`, 14, y);
              y += 7;
            });
            if (reportData.tenantsignature) {
              doc.text('Tenant Signature:', 10, y + 5);
              doc.addImage(reportData.tenantsignature, 'PNG', 60, y, 80, 30);
              y += 35;
            }
            if (reportData.techniciansignature) {
              doc.text('Technician Signature:', 10, y + 5);
              doc.addImage(reportData.techniciansignature, 'PNG', 60, y, 80, 30);
              y += 35;
            }
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('This is a system-generated report. © ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 285, { align: 'center' });
            // Get PDF as base64
            // SAFER: Use doc.output('datauristring') and extract base64 part
            let pdfBase64 = '';
            try {
              // jsPDF v2+ supports 'datauristring' output
              const dataUri = doc.output('datauristring');
              // dataUri is like 'data:application/pdf;filename=generated.pdf;base64,JVBERi0xLjc...'
              const base64Match = dataUri.match(/base64,(.+)$/);
              if (base64Match) {
                pdfBase64 = base64Match[1];
              } else {
                throw new Error('Could not extract base64 PDF');
              }
            } catch (e) {
              const errorMsg = typeof e === 'object' && e !== null && 'message' in e ? (e as { message: string }).message : String(e);
              alert('Failed to generate PDF for email: ' + errorMsg);
              return;
            }
            // Debug: log base64 length
            // console.log('PDF base64 length:', pdfBase64.length);
            // Send contractId and pdfBase64 to backend, backend will fetch tenant email
            // Debug log
            // console.log('Sending to /api/send-report:', {
            //   contractId: form.contractNo,
              // pdfBase64Preview: pdfBase64 ? pdfBase64.substring(0, 100) + '...' : pdfBase64,
              // pdfBase64Length: pdfBase64 ? pdfBase64.length : 0
            // });
            try {
              const resp = await axios.post('http://localhost:3001/api/send-report', {
                pdfBase64,
                contractId: form.contractNo,
                subject: `${reportData.visitType} Checklist Report`,
                text: 'Please find attached your checklist report.'
              });
              if (resp.data.success) {
                alert('Report sent successfully!');
              } else {
                // console.log(contractId)
                alert('Failed to send report: ' + (resp.data.error || 'Unknown error'));
              }
            } catch (err) {
              let errorMsg = 'Unknown error';
              if (typeof err === 'object' && err !== null) {
                // Type guard for error with response
                if (
                  'response' in err &&
                  typeof (err as { response?: { data?: { error?: unknown } } }).response?.data?.error === 'string'
                ) {
                  errorMsg = (err as { response: { data: { error: string } } }).response.data.error;
                } else if (
                  'message' in err &&
                  typeof (err as { message?: unknown }).message === 'string'
                ) {
                  errorMsg = (err as { message: string }).message;
                }
              }
              alert('Failed to send report: ' + errorMsg);
            }
          }} style={{ background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)', color: '#fff', fontWeight: 700 }}>Send by Email</button>
        </div>
      </div>
    );
  }

  const buildingName = buildings.find(b => String(b.id) === String(form.buildingId))?.name || '—';
  const unitName = units.find(u => String(u.flat_no) === String(form.unitId))?.flat_no || '—';
  // Step 2: Signature and Review
  if (step === 2 && !showReport) {
    return (
      <SignatureStepSummary
        title="Tenant Signature"
        error={error}
        buildingName={buildingName}
        unitName={unitName}
        form={form}
        equipmentList={equipmentList}
        equipmentState={equipmentState}
        signatureRef={tenantsignatureref}
        onClearSignature={() => tenantsignatureref.current?.clear()}
        onBack={() => setStep(1)}
        onNext={handleNext1}
        nextLabel="Next"
        loading={submitLoading}
      />
    );
  }

  // Step 3: Signature and Review
  // Always get the building and unit name from the lists using the current form.buildingId and form.unitId
  if (step === 3 && !showReport) {
    return (
      <SignatureStepSummary
        title="Technician Signature"
        error={error}
        buildingName={buildingName}
        unitName={unitName}
        form={form}
        equipmentList={equipmentList}
        equipmentState={equipmentState}
        signatureRef={techniciansignatureref}
        onClearSignature={() => techniciansignatureref.current?.clear()}
        onBack={() => setStep(2)}
        onNext={handleSubmit}
        nextLabel={submitLoading ? 'Submitting...' : 'Submit'}
        loading={submitLoading}
      />
    );
  }
};

export default Checklist;
