import type { MaterialItem, Organization, Project } from '../types';
import type { Worksheet } from 'exceljs';

const TEMPLATE_URL = '/order-template.xlsx';

const round = (value: number, digits = 2): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const normalize = (value: string): string => value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

const formatQuantity = (value: number): number => round(Number(value) || 0, 2);

const orderQuantity = (item: MaterialItem): number => {
  const quantity = Number(item.quantity) || 0;
  if ((item.category === 'profile' || item.category === 'plinth') && (item.unit === 'pcs' || item.profileUnitMode === 'pcs')) {
    return formatQuantity(quantity * 2);
  }
  return formatQuantity(quantity);
};

const extractRollWidth = (name: string): number | null => {
  const match = name.match(/\((\d+(?:[.,]\d+)?)\s*м/i);
  const width = match ? Number(match[1].replace(',', '.')) : NaN;
  return Number.isFinite(width) && width > 0 ? width : null;
};

const fabricLinearMeters = (item: MaterialItem): number => {
  const width = extractRollWidth(item.name);
  return width ? round(item.quantity / width) : formatQuantity(item.quantity);
};

const profileRow = (item: MaterialItem, usedRows: Set<number>): number | null => {
  const name = normalize(item.name);
  const candidates: number[] = [];
  if (name.includes('базовый') && name.includes('черн')) candidates.push(16);
  else if (name.includes('теневой мини')) candidates.push(17);
  else if (name.includes('бокс')) candidates.push(18);
  else if (name.includes('стена-потолок')) candidates.push(19);
  else if (name.includes('контур плюс')) candidates.push(20);
  else if (name.includes('окно-откос') && name.includes('черн')) candidates.push(21);
  else if (name.includes('разделитель') && name.includes('черн')) candidates.push(22);
  else if (name.includes('световая линия') && name.includes('черн')) candidates.push(23);
  else if (name.includes('конструкционный')) candidates.push(24);
  else if (name.includes('конструктор')) candidates.push(25);
  else if (name.includes('отбойник') && name.includes('не')) candidates.push(27, 28);
  else if (name.includes('внутр') && name.includes('угол')) candidates.push(29);
  else if (name.includes('каскад')) candidates.push(30);
  else if (name.includes('окно-откос') && name.includes('не')) candidates.push(31);
  else if (name.includes('базовый') && name.includes('не')) candidates.push(32);
  else if (name.includes('окно-откос') && name.includes('бел')) candidates.push(34);
  else if (name.includes('базовый') && name.includes('бел')) candidates.push(35);
  else if (name.includes('разделитель') && name.includes('бел')) candidates.push(36);
  else if (name.includes('световая линия') && name.includes('бел')) candidates.push(37);

  return candidates.find((row) => !usedRows.has(row)) ?? null;
};

const componentRow = (item: MaterialItem, usedRows: Set<number>): number | null => {
  const name = normalize(item.name);
  const candidates: number[] = [];
  const postMatch = name.match(/пост\s*(\d+)/);
  if (name.includes('рондо') && postMatch) candidates.push(42 + Number(postMatch[1]));
  else if (name.includes('соединитель') && name.includes('№1')) candidates.push(59);
  else if (name.includes('соединитель') && name.includes('№2')) candidates.push(60);
  else if (name.includes('соединитель') && name.includes('№3')) candidates.push(61);
  else if (name.includes('рассеиватель')) candidates.push(65);
  return candidates.find((row) => !usedRows.has(row)) ?? null;
};

const appendExtraMaterial = (worksheet: Worksheet, item: MaterialItem, row: number): void => {
  worksheet.getCell(`A${row}`).value = 'Дополнительные материалы';
  worksheet.getCell(`C${row}`).value = item.name;
  worksheet.getCell(`D${row}`).value = formatQuantity(item.quantity);
  worksheet.getCell(`C${row}`).alignment = { wrapText: true, vertical: 'middle' };
  worksheet.getCell(`D${row}`).numFmt = '#,##0.00';
  for (const column of ['A', 'B', 'C', 'D']) {
    worksheet.getCell(`${column}${row}`).border = {
      top: { style: 'thin', color: { argb: 'FFD9E2EC' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2EC' } },
    };
  }
};

export interface OrderExportInput {
  project: Project;
  materials: MaterialItem[];
  organization?: Organization | null;
}

export async function exportOrderWorkbook({ project, materials, organization }: OrderExportInput): Promise<void> {
  const excelModule = await import('exceljs');
  const ExcelJS = excelModule.default ?? excelModule;
  const workbook = new ExcelJS.Workbook();
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) throw new Error('Не удалось загрузить шаблон бланка заказа');
  await workbook.xlsx.load(await response.arrayBuffer());

  const worksheet = workbook.worksheets[0];
  const title = project.title.trim() || 'Без названия';
  const date = new Date().toLocaleDateString('ru-RU');
  worksheet.getCell('B2').value = `${title} — ${date}`;
  worksheet.getCell('C2').value = organization?.name || 'ООО "Тихие Стены"';
  worksheet.getCell('D3').value = [project.clientName, project.phone, project.address].filter(Boolean).join('\n') || 'Данные для отгрузки не указаны';

  const activeMaterials = materials.filter((item) => Number(item.quantity) > 0);
  const usedRows = new Set<number>();
  let fabricRow = 6;
  let extraRow = 67;

  for (const item of activeMaterials) {
    const category = normalize(item.category);
    if (category === 'fabric') {
      if (fabricRow <= 12) {
        worksheet.getCell(`A${fabricRow}`).value = item.name;
        worksheet.getCell(`B${fabricRow}`).value = null;
        worksheet.getCell(`C${fabricRow}`).value = formatQuantity(fabricLinearMeters(item));
        worksheet.getCell(`C${fabricRow}`).numFmt = '#,##0.00';
        worksheet.getCell(`C${fabricRow}`).alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
        fabricRow += 1;
      } else {
        appendExtraMaterial(worksheet, item, extraRow++);
      }
      continue;
    }

    const row = ['profile', 'plinth', 'bumper', 'divider', 'lighting'].includes(category)
      ? profileRow(item, usedRows)
      : componentRow(item, usedRows);
    if (row) {
      usedRows.add(row);
      worksheet.getCell(`D${row}`).value = orderQuantity(item);
      worksheet.getCell(`D${row}`).numFmt = '#,##0.00';
    } else {
      appendExtraMaterial(worksheet, item, extraRow++);
    }
  }

  const filename = `Бланк-заказа-${title.replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'проект'}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
