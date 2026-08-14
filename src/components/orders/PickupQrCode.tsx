import QRCode from "qrcode";

type PickupQrCodeProps = { code: string; orderNumber: number };

export async function PickupQrCode({ code, orderNumber }: PickupQrCodeProps) {
  const dataUrl = await QRCode.toDataURL(code, { width: 176, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B3D91", light: "#FFFFFFFF" } });
  return <img src={dataUrl} width={176} height={176} alt={`QR Code de retirada do pedido ${orderNumber}`} />;
}
