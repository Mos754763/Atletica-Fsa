import QRCode from "qrcode";

type EventTicketQrCodeProps = { checkInCode: string; eventTitle: string };

export async function EventTicketQrCode({ checkInCode, eventTitle }: EventTicketQrCodeProps) {
  const dataUrl = await QRCode.toDataURL(`FSA:TICKET:${checkInCode}`, { width: 176, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B3D91", light: "#FFFFFFFF" } });
  return <img src={dataUrl} width={176} height={176} alt={`QR Code de ingresso para ${eventTitle}`} />;
}
