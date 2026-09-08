// Uploads a file straight to Cloudinary using short-lived signed params
// obtained from the backend (`trpc.cloudinary.signUpload`). The API secret
// never reaches the browser.

export type CloudinarySignature = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
};

export async function uploadSignedToCloudinary(
  file: File,
  sig: CloudinarySignature
): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`,
    { method: "POST", body: form }
  );

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(
      detail?.error?.message || `Cloudinary upload failed (${res.status})`
    );
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
