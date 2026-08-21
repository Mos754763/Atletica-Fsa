import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { z } from "zod";
import { getApiProfile } from "@/lib/api/auth";
import { canAccessRoles } from "@/lib/auth/roles";
import { formatBRL } from "@/lib/format";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  dataset: z.enum(["clientes", "vendas", "eventos", "relatorio"]),
  format: z.enum(["csv", "xlsx", "pdf"]),
  period: z.coerce.number().int().refine((value) => [7, 30, 90].includes(value)).default(30),
});
type ExportRow = Record<string, string | number>;

function safeFileName(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]/gi, "-").toLowerCase(); }
function csvCell(value: string | number) { const text = String(value); return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function csvBody(rows: ExportRow[]) { const headers = Object.keys(rows[0] ?? {}); return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header] ?? "")).join(","))].join("\n"); }
function labelFromKey(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function xmlCell(value: string | number) { return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function columnName(index: number) { let result = ""; let value = index + 1; while (value > 0) { const remainder = (value - 1) % 26; result = String.fromCharCode(65 + remainder) + result; value = Math.floor((value - 1) / 26); } return result; }

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) { let value = index; for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1); table[index] = value >>> 0; }
  return table;
})();
function crc32(input: Buffer) { let value = 0xffffffff; for (const byte of input) value = crcTable[(value ^ byte) & 0xff] ^ (value >>> 8); return (value ^ 0xffffffff) >>> 0; }
function uint16(value: number) { const output = Buffer.alloc(2); output.writeUInt16LE(value); return output; }
function uint32(value: number) { const output = Buffer.alloc(4); output.writeUInt32LE(value >>> 0); return output; }
function zipStored(files: Array<{ name: string; content: string }>) {
  const timestamp = new Date(); const dosTime = (timestamp.getHours() << 11) | (timestamp.getMinutes() << 5) | Math.floor(timestamp.getSeconds() / 2); const dosDate = ((timestamp.getFullYear() - 1980) << 9) | ((timestamp.getMonth() + 1) << 5) | timestamp.getDate();
  const locals: Buffer[] = []; const centrals: Buffer[] = []; let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8"); const content = Buffer.from(file.content, "utf8"); const checksum = crc32(content);
    const local = Buffer.concat([uint32(0x04034b50), uint16(20), uint16(0x0800), uint16(0), uint16(dosTime), uint16(dosDate), uint32(checksum), uint32(content.length), uint32(content.length), uint16(name.length), uint16(0), name, content]);
    locals.push(local);
    centrals.push(Buffer.concat([uint32(0x02014b50), uint16(20), uint16(20), uint16(0x0800), uint16(0), uint16(dosTime), uint16(dosDate), uint32(checksum), uint32(content.length), uint32(content.length), uint16(name.length), uint16(0), uint16(0), uint16(0), uint16(0), uint32(0), uint32(offset), name]));
    offset += local.length;
  }
  const directory = Buffer.concat(centrals); const localData = Buffer.concat(locals);
  return Buffer.concat([localData, directory, uint32(0x06054b50), uint16(0), uint16(0), uint16(files.length), uint16(files.length), uint32(directory.length), uint32(localData.length), uint16(0)]);
}
function xlsxBody(rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {}); const allRows: Array<Array<string | number>> = headers.length ? [headers, ...rows.map((row) => headers.map((header) => row[header] ?? ""))] : [];
  const rowXml = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => { const reference = `${columnName(columnIndex)}${rowIndex + 1}`; return typeof value === "number" ? `<c r="${reference}"><v>${value}</v></c>` : `<c r="${reference}" t="inlineStr"><is><t xml:space="preserve">${xmlCell(value)}</t></is></c>`; }).join("")}</row>`).join("");
  const lastColumn = headers.length ? columnName(headers.length - 1) : "A"; const lastRow = Math.max(allRows.length, 1);
  return zipStored([
    { name: "[Content_Types].xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>' },
    { name: "_rels/.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
    { name: "xl/workbook.xml", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Dados" sheetId="1" r:id="rId1"/></sheets></workbook>' },
    { name: "xl/_rels/workbook.xml.rels", content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>' },
    { name: "xl/worksheets/sheet1.xml", content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${lastColumn}${lastRow}"/><sheetData>${rowXml}</sheetData></worksheet>` },
  ]);
}

async function loadRows(dataset: z.infer<typeof querySchema>["dataset"], period: number, supabase: Awaited<ReturnType<typeof getApiProfile>> extends infer Result ? Result extends { supabase: infer Client } ? Client : never : never) {
  const since = new Date(); since.setDate(since.getDate() - period); const sinceIso = since.toISOString();
  if (dataset === "clientes") {
    const { data, error } = await supabase.from("profiles").select("display_name,email,role,created_at").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((profile) => ({ Nome: profile.display_name ?? "Não informado", "E-mail": profile.email ?? "Não informado", Papel: labelFromKey(profile.role), Cadastro: new Date(profile.created_at).toLocaleString("pt-BR") }));
  }
  if (dataset === "vendas") {
    const { data, error } = await supabase.from("orders").select("order_number,customer_name,customer_email,status,fulfillment,total_cents,created_at,paid_at,events(title)").gte("created_at", sinceIso).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((order) => ({ Pedido: `#${order.order_number}`, Cliente: order.customer_name ?? order.customer_email ?? "Consumidor não identificado", Evento: (order.events as { title?: string } | null)?.title ?? "Venda de catálogo", Situação: labelFromKey(order.status), Atendimento: labelFromKey(order.fulfillment), Total: formatBRL(order.total_cents), "Pagamento confirmado": order.paid_at ? new Date(order.paid_at).toLocaleString("pt-BR") : "Pendente", Criado: new Date(order.created_at).toLocaleString("pt-BR") }));
  }
  if (dataset === "eventos") {
    const { data, error } = await supabase.from("event_registrations").select("attendee_name,attendee_email,amount_cents,status,source,created_at,events(title),payments(status,method,approved_at)").gte("created_at", sinceIso).order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((registration) => {
      const payments = registration.payments as { status: string; method: string; approved_at: string | null }[] | null;
      const payment = payments?.find((item) => item.status === "aprovado");
      return { Evento: (registration.events as { title?: string } | null)?.title ?? "Evento indisponível", Participante: registration.attendee_name, "E-mail": registration.attendee_email ?? "Não informado", Origem: registration.source === "sympla" ? "Sympla" : registration.source === "manual" ? "Manual" : "Plataforma FSA", Inscrição: labelFromKey(registration.status), Valor: formatBRL(registration.amount_cents), Pagamento: registration.amount_cents === 0 ? "Gratuito" : payment ? "Pago" : "Pendente", Método: payment ? labelFromKey(payment.method) : "—", Cadastro: new Date(registration.created_at).toLocaleString("pt-BR") };
    });
  }
  const [{ data: orders, error: orderError }, { data: registrations, error: registrationError }] = await Promise.all([
    supabase.from("orders").select("status,total_cents,paid_at").gte("created_at", sinceIso),
    supabase.from("event_registrations").select("amount_cents,source,payments(status)").gte("created_at", sinceIso),
  ]);
  if (orderError) throw orderError; if (registrationError) throw registrationError;
  const orderRows = orders ?? []; const registrationRows = registrations ?? [];
  const approvedOrderRevenue = orderRows.filter((order) => Boolean(order.paid_at)).reduce((total, order) => total + order.total_cents, 0);
  const paidRegistrations = registrationRows.filter((registration) => (registration.payments as { status: string }[] | null)?.some((payment) => payment.status === "aprovado")).length;
  return [
    { Indicador: "Pedidos registrados", Valor: orderRows.length, Período: `Últimos ${period} dias` },
    { Indicador: "Pedidos com pagamento confirmado", Valor: orderRows.filter((order) => Boolean(order.paid_at)).length, Período: `Últimos ${period} dias` },
    { Indicador: "Receita de produtos confirmada", Valor: formatBRL(approvedOrderRevenue), Período: `Últimos ${period} dias` },
    { Indicador: "Inscrições em eventos", Valor: registrationRows.length, Período: `Últimos ${period} dias` },
    { Indicador: "Ingressos de evento pagos", Valor: paidRegistrations, Período: `Últimos ${period} dias` },
    { Indicador: "Ingressos gratuitos", Valor: registrationRows.filter((registration) => registration.amount_cents === 0).length, Período: `Últimos ${period} dias` },
    { Indicador: "Inscrições vindas da Sympla", Valor: registrationRows.filter((registration) => registration.source === "sympla").length, Período: `Últimos ${period} dias` },
  ];
}

function pdfBody(title: string, rows: ExportRow[]) {
  return new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ margin: 42, size: "A4" }); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("end", () => resolve(Buffer.concat(chunks))); document.on("error", reject);
    document.fontSize(18).fillColor("#0B3D91").text("ATLETICA FSA", { continued: true }).fillColor("#1E293B").text(` · ${title}`);
    document.moveDown(0.5).fontSize(8).fillColor("#64748B").text(`Exportado em ${new Date().toLocaleString("pt-BR")}. Dados operacionais restritos.`).moveDown();
    const headers = Object.keys(rows[0] ?? {});
    if (!rows.length) document.fontSize(11).fillColor("#334155").text("Nenhum registro no período selecionado.");
    rows.forEach((row, index) => { if (document.y > 720) document.addPage(); document.fontSize(10).fillColor("#0F172A").text(`${index + 1}. ${headers.map((header) => `${header}: ${row[header] ?? "—"}`).join(" · ")}`, { width: 510, lineGap: 2 }); document.moveDown(0.25); });
    document.end();
  });
}

export async function GET(request: Request) {
  const auth = await getApiProfile(request); if ("error" in auth) return auth.error;
  if (!canAccessRoles(auth.profile.roles, ["admin"])) return NextResponse.json({ error: "Somente administradores podem exportar dados operacionais." }, { status: 403 });
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Parâmetros de exportação inválidos." }, { status: 400 });
  try {
    const { dataset, format, period } = parsed.data; const rows = await loadRows(dataset, period, auth.supabase); const title = `${labelFromKey(dataset)}-${period}-dias`; const filename = safeFileName(`atletica-fsa-${title}`);
    if (format === "csv") return new NextResponse(csvBody(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}.csv"` } });
    if (format === "xlsx") { const output = xlsxBody(rows); return new NextResponse(output, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="${filename}.xlsx"` } }); }
    const output = await pdfBody(labelFromKey(dataset), rows); const body = output.buffer.slice(output.byteOffset, output.byteOffset + output.byteLength) as ArrayBuffer; return new NextResponse(body, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}.pdf"` } });
  } catch { return NextResponse.json({ error: "Não foi possível preparar a exportação solicitada." }, { status: 500 }); }
}
