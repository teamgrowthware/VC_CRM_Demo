import { jsPDF } from 'jspdf';
import autoTable, { CellInput } from 'jspdf-autotable';
import { Payslip, PayslipData, PayslipItem, PayslipPenalty, PayslipLeave, PayslipDeductionBreakdownItem } from '@/lib/api/payslip';

type PdfWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

const LOGO_PATH = '/Vortexcubes%20Logo%20-%204.png';
const COMPANY_NAME = 'VORTEX CUBES';

export const formatINR = (value: number | undefined | null) => {
  const num = Math.round(value || 0);
  return `Rs. ${num.toLocaleString('en-IN')}`;
};

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (num: number): string => {
  if (num < 20) return ones[num];
  return `${tens[Math.floor(num / 10)]}${num % 10 ? ' ' + ones[num % 10] : ''}`;
};

const threeDigits = (num: number): string => {
  const hundred = Math.floor(num / 100);
  const rest = num % 100;
  let result = '';
  if (hundred) result += `${ones[hundred]} Hundred`;
  if (rest) result += (result ? ' ' : '') + twoDigits(rest);
  return result;
};

export const amountInWords = (amount: number): string => {
  const value = Math.round(amount || 0);
  if (value === 0) return 'Zero';
  const crore = Math.floor(value / 10000000);
  const lakh = Math.floor((value % 10000000) / 100000);
  const thousand = Math.floor((value % 100000) / 1000);
  const rest = value % 1000;
  let result = '';
  if (crore) result += `${threeDigits(crore)} Crore`;
  if (lakh) result += (result ? ' ' : '') + `${threeDigits(lakh)} Lakh`;
  if (thousand) result += (result ? ' ' : '') + `${threeDigits(thousand)} Thousand`;
  if (rest) result += (result ? ' ' : '') + threeDigits(rest);
  return result;
};

const fetchLogoDataUrl = async (): Promise<string | null> => {
  try {
    const res = await fetch(LOGO_PATH);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const getEmployeeInfo = (payslip: Payslip) => {
  const data: PayslipData = payslip.data || {};
  const emp = data.employee || payslip.employee || {};
  const department = typeof emp.department === 'string' ? emp.department : emp.department?.name || null;
  return {
    name: emp.name || '',
    employeeId: emp.employeeId || '',
    designation: emp.designation || '',
    department,
    joiningDate: emp.joiningDate || null
  };
};

export const downloadPayslipPdf = async (payslip: Payslip) => {
  const doc = new jsPDF() as PdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const data: PayslipData = payslip.data || {};
  const emp = getEmployeeInfo(payslip);
  const earnings = data.earnings || {};
  const deductions = data.deductions || {};
  const attendance = data.attendance || {};

  const logo = await fetchLogoDataUrl();

  // Header
  if (logo) {
    try {
      doc.addImage(logo, 'PNG', margin, 10, 30, 16);
    } catch {
      // fall through to text logo
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(COMPANY_NAME, pageWidth - margin, 16, { align: 'right' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(113, 113, 122);
  doc.text('Salary & Human Resource Management', pageWidth - margin, 21, { align: 'right' });

  // Divider
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(margin, 28, pageWidth - margin, 28);

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(24, 24, 27);
  doc.text('PAYSLIP', margin, 36);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(82, 82, 91);
  doc.text(`${payslip.month}`, pageWidth - margin, 36, { align: 'right' });
  doc.text(`Period: ${payslip.period}`, pageWidth - margin, 41, { align: 'right' });

  const y = 46;

  // Employee details
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [63, 63, 70], lineColor: [228, 228, 231], lineWidth: 0.3 },
    headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
    head: [['EMPLOYEE DETAILS', '', '', '']],
    body: [
      ['Employee Name', emp.name, 'Employee ID', emp.employeeId],
      ['Designation', emp.designation || '-', 'Department', emp.department || '-']
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 34 },
      1: { cellWidth: (contentWidth - 68) / 2 },
      2: { fontStyle: 'bold', cellWidth: 40 },
      3: { cellWidth: (contentWidth - 68) / 2 }
    }
  });

  let cursorY = doc.lastAutoTable.finalY + 6;

  // Leave Details
  const leaves: PayslipLeave[] = data.leaves || [];
  if (leaves.length > 0) {
    const leaveRows: CellInput[][] = leaves.map(l => [
      `${new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} - ${new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}`,
      l.leaveType.replace(/_/g, ' '),
      String(l.numberOfDays),
      l.reason.length > 30 ? l.reason.substring(0, 30) + '...' : l.reason,
      l.isPaid ? 'PAID' : 'UNPAID'
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: [63, 63, 70], lineColor: [228, 228, 231], lineWidth: 0.3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
      head: [['PERIOD', 'TYPE', 'DAYS', 'REASON', 'STATUS']],
      body: leaveRows,
      columnStyles: {
        0: { cellWidth: 32 },
        1: { cellWidth: 30 },
        2: { cellWidth: 14, halign: 'center' },
        3: { cellWidth: 55 },
        4: { cellWidth: 22, halign: 'center' }
      }
    });

    cursorY = doc.lastAutoTable.finalY + 3;

    // Paid/Unpaid summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(82, 82, 91);
    doc.text(`Paid Leaves: ${data.paidLeaveDays ?? 0}  |  Unpaid Leaves: ${data.unpaidLeaveDays ?? 0}`, margin, cursorY);
    cursorY += 6;
  }

  // Earnings
  const addons: PayslipItem[] = earnings.addons || [];
  const earningRows: CellInput[][] = [['Base Salary', formatINR(data.baseSalary || earnings.baseSalary || payslip.netSalary)]];
  addons.forEach((a) => earningRows.push([`${a.type}${a.reason ? ` (${a.reason})` : ''}`, formatINR(a.amount)]));
  earningRows.push([{ content: 'Gross Earnings', styles: { fontStyle: 'bold' } }, { content: formatINR(earnings.grossEarnings || (data.baseSalary || 0) + (earnings.totalAddons || 0)), styles: { fontStyle: 'bold' } }]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [63, 63, 70], lineColor: [228, 228, 231], lineWidth: 0.3 },
    headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
    head: [['EARNINGS', 'AMOUNT']],
    body: earningRows,
    columnStyles: { 0: { cellWidth: contentWidth - 55 }, 1: { cellWidth: 55, halign: 'right' } }
  });

  cursorY = doc.lastAutoTable.finalY + 6;

  // Deductions
  const custom: PayslipItem[] = deductions.customDeductions || [];
  const penalties: PayslipPenalty[] = deductions.penalties || [];
  const deductionBreakdown: PayslipDeductionBreakdownItem[] = data.deductionBreakdown || [];
  const deductionRows: CellInput[][] = [];

  if (deductionBreakdown.length > 0) {
    deductionBreakdown.forEach(d => {
      const label = d.type === 'ABSENT' ? `Absent - ${d.label}` :
                    d.type === 'HALFDAY' ? `Half Day - ${d.label}` :
                    d.type === 'PENALTY' ? `Fine - ${d.label}` :
                    d.type === 'JOINING' ? 'Joining Pro-rata' :
                    d.label;
      const dateStr = new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      deductionRows.push([`${label} (${dateStr})`, formatINR(d.amount)]);
    });
  } else {
    if (deductions.attendanceDeduction) deductionRows.push(['Attendance / Leave Deduction', formatINR(deductions.attendanceDeduction)]);
    if (deductions.halfDayDeduction) deductionRows.push(['Half-Day Deduction', formatINR(deductions.halfDayDeduction)]);
    if (deductions.joiningDeduction) deductionRows.push(['Joining Pro-rata Deduction', formatINR(deductions.joiningDeduction)]);
  }
  custom.forEach((d) => deductionRows.push([`${d.type}${d.reason ? ` (${d.reason})` : ''}`, formatINR(d.amount)]));
  penalties.forEach((p) => deductionRows.push([`Penalty${p.reason ? ` - ${p.reason}` : ''}`, formatINR(p.amount)]));
  if (deductionRows.length === 0) deductionRows.push(['No Deductions', 'Rs. 0']);
  deductionRows.push([{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: formatINR(deductions.totalDeductions), styles: { fontStyle: 'bold' } }]);

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2, textColor: [63, 63, 70], lineColor: [228, 228, 231], lineWidth: 0.3 },
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
    head: [['DEDUCTIONS', 'AMOUNT']],
    body: deductionRows,
    columnStyles: { 0: { cellWidth: contentWidth - 55 }, 1: { cellWidth: 55, halign: 'right' } }
  });

  cursorY = doc.lastAutoTable.finalY + 6;

  // Net pay
  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 3, textColor: [63, 63, 70], lineColor: [228, 228, 231], lineWidth: 0.3 },
    headStyles: { fillColor: [24, 24, 27], textColor: 255, fontStyle: 'bold' },
    head: [['NET PAYABLE', '']],
    body: [
      ['Amount', { content: formatINR(payslip.netSalary), styles: { fontStyle: 'bold', fontSize: 12, textColor: [22, 163, 74] } }],
      ['In Words', `Rupees ${amountInWords(payslip.netSalary)} Only`]
    ],
    columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' }, 1: { cellWidth: contentWidth - 60 } }
  });

  cursorY = doc.lastAutoTable.finalY + 8;

  // Attendance summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(82, 82, 91);
  const attText = `Attendance: ${attendance.presentDays ?? 0} Present  |  ${attendance.absentDays ?? 0} Absent  |  ${attendance.halfDays ?? 0} Half  |  ${attendance.lateMarks ?? 0} Late  |  Productive: ${attendance.productiveHours ?? 0} hrs`;
  doc.text(attText, margin, cursorY);
  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 100, 110);
  const leaveText = `Leaves: ${data.paidLeaveDays ?? 0} Paid  |  ${data.unpaidLeaveDays ?? 0} Unpaid`;
  doc.text(leaveText, margin, cursorY);
  cursorY += 8;

  doc.setDrawColor(228, 228, 231);
  doc.setLineWidth(0.3);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);

  // Signatures
  const sigY = doc.internal.pageSize.getHeight() - 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(113, 113, 122);
  doc.text('Authorized Signatory', margin, sigY + 7);
  doc.text('HR / Accounts', margin, sigY + 11);
  doc.setFont('helvetica', 'bold');
  doc.text('This is a computer generated payslip and does not require a physical signature.', pageWidth / 2 + margin / 2, sigY + 7, { align: 'center' });

  const fileName = `Salary_Slip_${emp.name.replace(/\s+/g, '_')}_${payslip.month.replace(/\s+/g, '_')}.pdf`;
  doc.save(fileName);
};
