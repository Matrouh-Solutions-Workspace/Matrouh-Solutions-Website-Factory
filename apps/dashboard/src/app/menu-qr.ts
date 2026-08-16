import QRCode from "qrcode";

export async function createMenuQrDataUrl(publicUrl: string): Promise<string> {
  const url = new URL(publicUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("MENU_QR_URL_PROTOCOL_UNSUPPORTED");
  }
  return QRCode.toDataURL(url.toString(), {
    color: { dark: "#17120f", light: "#ffffff" },
    errorCorrectionLevel: "H",
    margin: 3,
    type: "image/png",
    width: 720,
  });
}

