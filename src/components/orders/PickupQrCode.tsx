import QRCode from "qrcode";
import { buildPickupQrPayload } from "@/lib/orders/pickup-token";

type PickupQrCodeProps = { token: string; orderNumber: number };

export async function PickupQrCode({ token, orderNumber }: PickupQrCodeProps) {
  const dataUrl = await QRCode.toDataURL(buildPickupQrPayload(token), { width: 176, margin: 1, errorCorrectionLevel: "M", color: { dark: "#0B3D91", light: "#FFFFFFFF" } });
  return <img src={dataUrl} width={176} height={176} alt={`QR Code de retirada do pedido ${orderNumber}`} />;
}
