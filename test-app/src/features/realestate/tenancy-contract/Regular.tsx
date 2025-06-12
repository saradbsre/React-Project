import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import axios from 'axios';
import jsPDF from 'jspdf';

  type Unit = { flat_no: string };
  type Building = { id: string; name: string };
  type Equipment = { id: string; name: string };
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

  // type EquipmentState = { [key: string]: { status: string; remarks: string } } & { [key: number]: { status: string; remarks: string } };



  // Fetch buildings on mount
    useEffect(() => {
      setLoadingBuildings(true);
      axios.get('https://react-project-backend-4cfx.onrender.com/api/buildings')
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
    axios.get(`https://react-project-backend-4cfx.onrender.com/api/units?buildingId=${form.buildingId}`)
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
    axios.get(`https://react-project-backend-4cfx.onrender.com/api/equipment?buildingId=${form.buildingId}&unitId=${form.unitId}`)
      .then(res => {
        if (res.data.success) {
          // Map susec_name to name
          const equipment = res.data.equipment.map((eq: { susec_name: string }, idx: number) => ({
            id: idx, // or use another unique value if available
            name: eq.susec_name
          }));
          setEquipmentList(equipment);
          // Initialize equipmentState with default values
          const initial: Record<string, { status: string; remarks: string }> = {};
          equipment.forEach((eq: { name: string }) => {
            initial[eq.name] = { status: 'Good', remarks: '' };
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
    axios.get(`https://react-project-backend-4cfx.onrender.com/api/unit-details?unit_id=${form.unitId}`)
      .then(res => {
        if (res.data.contract && res.data.tenant) {
          setForm(f => ({
            ...f,
            tenantName: res.data.tenant.full_name || '',
            contractNo: res.data.contract.contract_number || '',
            startDate: res.data.contract.start_date || '',
            endDate: res.data.contract.end_date || '',
            contractId: res.data.contract.id || ''
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
    // const signature = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
    const tenantsignature = tenantSignatureData
    const techniciansignature = techniciansignatureref.current ? techniciansignatureref.current.toDataURL('image/png') : '';
    try {
      await axios.post('https://react-project-backend-4cfx.onrender.com/api/checklist', {
        unit: form.unitId,
        contract: form.contractId, // Now using contract_id
        visitType: form.visitType,
        equipment: equipmentState,
        techniciansignature,
        tenantsignature,
        date: new Date().toISOString()
      });
      // setSuccess('Checklist submitted successfully!');
      setError('');
      // Prepare report data for preview
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
      // Only reset equipment state if equipmentList is available
      if (equipmentList && equipmentList.length > 0) {
        const initial: Record<string, { status: string; remarks: string }> = {};
        equipmentList.forEach(eq => {
          initial[eq.name] = { status: 'Good', remarks: '' };
        });
        setEquipmentState(initial);
      }
      // Clear signature pad
      if (tenantsignatureref.current) tenantsignatureref.current.clear();
      if (techniciansignatureref.current) techniciansignatureref.current.clear();
      // Do NOT reset buildingId and unitId so names can be shown in summary
      setForm(prev => ({
        ...prev,
        tenantName: '',
        contractNo: '',
        startDate: '',
        endDate: '',
        visitType: 'Move-In',
      }));
    } catch {
      setError('Submission failed');
    } finally {
      setSubmitLoading(false);
    }
  };

  // Print handler
  const handlePrint = () => {
    const previewElement = document.getElementById('checklist-report-preview');
    if (!previewElement) {
      alert('Could not find report preview element.');
      return;
    }
    const printContents = previewElement.innerHTML;
    const win = window.open('', '', 'width=900,height=700');
    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>Checklist Report</title>
            <style>
              body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5fafd; margin: 0; padding: 0; }
              .report-header { text-align: center; padding: 24px 0 8px 0; border-bottom: 2px solid #1976d2; }
              .report-title { font-size: 2rem; color: #1976d2; font-weight: 800; letter-spacing: 2px; }
              .report-footer { text-align: center; color: #1976d2; font-size: 1rem; padding: 12px 0 8px 0; border-top: 2px solid #1976d2; margin-top: 32px; }
              .report-section { margin: 24px 0; }
              .report-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              .report-table th, .report-table td { border: 1px solid #90caf9; padding: 8px 12px; }
              .report-table th { background: #e3f2fd; color: #1976d2; }
              .tenantsignature-img { border: 2px solid #1976d2; border-radius: 8px; margin-top: 12px; }
              .techniciansignature-img { border: 2px solid #1976d2; border-radius: 8px; margin-top: 12px; }         
            </style>
          </head>
          <body>${printContents}</body>
        </html>
      `);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    } else {
      alert('Failed to open print window.');
    }
  };

  // PDF handler
  const handleDownloadPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF();
    // Header
    doc.setFontSize(20);
    doc.setTextColor(25, 118, 210);
    doc.text('ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Checklist Report', 105, 28, { align: 'center' });
    // Details
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
    doc.text(`Start: ${reportData.startDate ? new Date(reportData.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, 10, y);
    doc.text(`End: ${reportData.endDate ? new Date(reportData.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, 140, y);
    y += 10;
    doc.text(`Visit Type: ${reportData.visitType}`, 10, y);
    y += 10;
    doc.text('Equipment:', 10, y);
    y += 8;
    reportData.equipment.forEach(eq => {
      doc.text(`- ${eq.name}: ${eq.status}${eq.remarks ? ` (Remarks: ${eq.remarks})` : ''}`, 14, y);
      y += 7;
    });
    // Signature
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
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(25, 118, 210);
    doc.text('This is a system-generated report. © ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 285, { align: 'center' });
    doc.save('Checklist_Report.pdf');
  };



  // Step 1: Checklist Form
  if (step === 1 && !showReport) {
    return (
      <div className="checklist-form">
        <h2>Equipment Checklist</h2>
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
            <span style={{ color: '#388e3c', fontWeight: 700, fontSize: '1.08rem', marginTop: 2 }}>{form.startDate ? new Date(form.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 120 }}>
            <span style={{ color: '#1976d2', fontWeight: 700, fontSize: '1.08rem', letterSpacing: 0.5 }}>End</span>
            <span style={{ color: '#d32f2f', fontWeight: 700, fontSize: '1.08rem', marginTop: 2 }}>{form.endDate ? new Date(form.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
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
            equipmentList
              .filter(eq => eq.name && eq.name.trim() !== "") // Only show if name is not empty/null
              .map(eq => (
                <div className="equipment-row" style={{ alignItems: 'center', marginBottom: 16 }} key={eq.id}>
                  <label className="equip-label" style={{ minWidth: 120 }}>{eq.name}:</label>
                  <div style={{ display: 'flex', gap: 18 }}>
                    <label className="radio-label" style={{ marginRight: 18 }}>
                      <input
                        type="radio"
                        name={`status-${eq.name}`}
                        value="Good"
                        checked={equipmentState[eq.name]?.status === 'Good'}
                        onChange={() => handleEquipmentRadio(eq.name, 'Good')}
                      /> Good
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name={`status-${eq.name}`}
                        value="Not Working"
                        checked={equipmentState[eq.name]?.status === 'Not Working'}
                        onChange={() => handleEquipmentRadio(eq.name, 'Not Working')}
                      /> Not Working
                    </label>
                  </div>
                  <input
                    type="text"
                    name={`remarks-${eq.name}`}
                    placeholder="Remarks"
                    value={equipmentState[eq.name]?.remarks || ''}
                    onChange={e => handleEquipmentRemarks(eq.name, e.target.value)}
                    style={{ marginLeft: 18, flex: 1 }}
                  />
                </div>
              ))
          )
        ) : null}

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
    );
  }

  // Report Preview
  if (showReport && reportData) {
    return (
      <div className="checklist-form" style={{ maxWidth: 800 }}>
        <div id="checklist-report-preview">
          <div className="report-header">
            <div className="report-title">ABDULWAHED AHMAD RASHED BIN SHABIB</div>
            <div style={{ fontSize: 18, color: '#1976d2', fontWeight: 700, marginTop: 4 }}>Checklist Report</div>
          </div>
          <div className="report-section" style={{ marginTop: 24 }}>
            <table className="report-table" style={{ width: '100%', marginBottom: 18 }}>
              <tbody>
                <tr>
                  <th style={{ width: 160 }}>Date</th>
                  <td>{reportData.date}</td>
                  <th style={{ width: 160 }}>Technician</th>
                  <td>{reportData.username}</td>
                </tr>
                <tr>
                  <th>Building</th>
                  <td>{reportData.buildingName}</td>
                  <th>Unit</th>
                  <td>{reportData.unitName}</td>
                </tr>
                <tr>
                  <th>Tenant</th>
                  <td>{reportData.tenantName}</td>
                  <th>Contract No</th>
                  <td>{reportData.contractNo}</td>
                </tr>
                <tr>
                  <th>Start</th>
                  <td>{reportData.startDate ? new Date(reportData.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td>
                  <th>End</th>
                  <td>{reportData.endDate ? new Date(reportData.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</td>
                </tr>
                <tr>
                  <th>Visit Type</th>
                  <td colSpan={3}>{reportData.visitType}</td>
                </tr>
              </tbody>
            </table>
            <div style={{ marginBottom: 12 }}>
              <b>Equipment Status:</b>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {reportData.equipment.map((eq, idx) => (
                  <li key={idx}>
                    <b>{eq.name}:</b> {eq.status}
                    {eq.remarks ? ` (Remarks: ${eq.remarks})` : ''}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ marginTop: 18 }}>
              <b>Tenant Signature:</b><br />
              {reportData.tenantsignature && (
                <img
                  src={reportData.tenantsignature}
                  alt="Tenant Signature"
                  className="tenantsignature-img"
                  style={{ width: 240, height: 80, background: '#fff', border: '2px solid #1976d2', borderRadius: 8, marginTop: 8 }}
                />
              )}
            </div>
                        <div style={{ marginTop: 18 }}>
              <b>Technician Signature:</b><br />
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
          <div className="report-footer">
            This is a system-generated report. &copy; ABDULWAHED AHMAD RASHED BIN SHABIB
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, marginTop: 32, justifyContent: 'center' }}>
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
                setUnits([]); // Optionally clear units list
              }}
              style={{ background: '#bbdefb', color: '#1976d2', fontWeight: 700 }}
          >     
            Back
          </button>
          <button onClick={handlePrint} style={{ background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)', color: '#fff', fontWeight: 700 }}>Preview & Print</button>
          <button onClick={handleDownloadPDF} style={{ background: 'linear-gradient(90deg, #1976d2 60%, #90caf9 100%)', color: '#fff', fontWeight: 700 }}>Download PDF</button>
          <button onClick={async () => {
            // Generate PDF as base64
            const doc = new jsPDF();
            doc.setFontSize(20);
            doc.setTextColor(25, 118, 210);
            doc.text('ABDULWAHED AHMAD RASHED BIN SHABIB', 105, 18, { align: 'center' });
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text('Checklist Report', 105, 28, { align: 'center' });
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
            doc.text(`Start: ${reportData.startDate ? new Date(reportData.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, 10, y);
            doc.text(`End: ${reportData.endDate ? new Date(reportData.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}`, 140, y);
            y += 10;
            doc.text(`Visit Type: ${reportData.visitType}`, 10, y);
            y += 10;
            doc.text('Equipment:', 10, y);
            y += 8;
            reportData.equipment.forEach(eq => {
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
            doc.setTextColor(25, 118, 210);
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
            console.log('PDF base64 length:', pdfBase64.length);
            // Send contractId and pdfBase64 to backend, backend will fetch tenant email
            // Debug log
            console.log('Sending to /api/send-report:', {
              contractId: form.contractId,
              pdfBase64Preview: pdfBase64 ? pdfBase64.substring(0, 100) + '...' : pdfBase64,
              pdfBase64Length: pdfBase64 ? pdfBase64.length : 0
            });
            try {
              const resp = await axios.post('https://react-project-backend-4cfx.onrender.com/api/send-report', {
                pdfBase64,
                contractId: form.contractNo,
                subject: 'Checklist Report',
                text: 'Please find attached your checklist report.'
              });
              if (resp.data.success) {
                alert('Report sent successfully!');
              } else {
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
    <div className="checklist-form">
      <h2>Tenant Signature</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <div style={{ marginBottom: 18, width: '100%' }}>
        <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 8 }}>Checklist Summary</h3>
        <div style={{ background: '#e3f2fd', border: '1.5px solid #90caf9', borderRadius: 8, padding: '1rem', marginBottom: 10 }}>
          <div><b>Building:</b> {buildingName}</div>
          <div><b>Unit:</b> {unitName}</div>
          <div><b>Tenant:</b> {form.tenantName || '—'}</div>
          <div><b>Contract No:</b> {form.contractNo || '—'}</div>
          <div><b>Start:</b> {form.startDate ? new Date(form.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
          <div><b>End:</b> {form.endDate ? new Date(form.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
          <div><b>Visit Type:</b> {form.visitType}</div>
          <div style={{ marginTop: 8 }}><b>Equipment:</b></div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {equipmentList.map(eq => (
              <li key={eq.id}>
                <b>{eq.name}:</b> {equipmentState[eq.name]?.status || '—'}
                {equipmentState[eq.name]?.remarks ? ` (Remarks: ${equipmentState[eq.name].remarks})` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 16 }}>
        <SignatureCanvas penColor='black' canvasProps={{ width: 500, height: 180, className: 'sigCanvas' }} ref={tenantsignatureref} />
        <button
          type="button"
          onClick={() => tenantsignatureref.current?.clear()}
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
          onClick={() => setStep(1)}
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
          onClick={handleNext1}
          disabled={submitLoading}
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
            opacity: submitLoading ? 0.7 : 1,
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
};

  // Step 3: Signature and Review
  // Always get the building and unit name from the lists using the current form.buildingId and form.unitId
  if (step === 3 && !showReport) {
  return (
    <div className="checklist-form">
      <h2>Technician Signature</h2>
      {error && <div style={{ color: 'red', marginBottom: 10 }}>{error}</div>}
      <div style={{ marginBottom: 18, width: '100%' }}>
        <h3 style={{ color: '#1976d2', fontWeight: 700, marginBottom: 8 }}>Checklist Summary</h3>
        <div style={{ background: '#e3f2fd', border: '1.5px solid #90caf9', borderRadius: 8, padding: '1rem', marginBottom: 10 }}>
          <div><b>Building:</b> {buildingName}</div>
          <div><b>Unit:</b> {unitName}</div>
          <div><b>Tenant:</b> {form.tenantName || '—'}</div>
          <div><b>Contract No:</b> {form.contractNo || '—'}</div>
          <div><b>Start:</b> {form.startDate ? new Date(form.startDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
          <div><b>End:</b> {form.endDate ? new Date(form.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</div>
          <div><b>Visit Type:</b> {form.visitType}</div>
          <div style={{ marginTop: 8 }}><b>Equipment:</b></div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {equipmentList.map(eq => (
              <li key={eq.id}>
                <b>{eq.name}:</b> {equipmentState[eq.name]?.status || '—'}
                {equipmentState[eq.name]?.remarks ? ` (Remarks: ${equipmentState[eq.name].remarks})` : ''}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginBottom: 16 }}>
        <SignatureCanvas
          penColor='black'
          canvasProps={{ width: 500, height: 180, className: 'sigCanvas' }}
          ref={techniciansignatureref}
        />
        <button
          type="button"
          onClick={() => techniciansignatureref.current?.clear()}
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
          onClick={() => setStep(2)}
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
          onClick={handleSubmit}
          disabled={submitLoading}
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
            opacity: submitLoading ? 0.7 : 1,
          }}
        >
          {submitLoading ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
};

export default Checklist;
