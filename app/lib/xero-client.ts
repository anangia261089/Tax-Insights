import { XeroClient } from "xero-node";

let xeroClient: XeroClient | null = null;

export function getXeroClient(): XeroClient {
  if (!xeroClient) {
    xeroClient = new XeroClient({
      clientId: process.env.XERO_CLIENT_ID!,
      clientSecret: process.env.XERO_CLIENT_SECRET!,
      redirectUris: [process.env.XERO_REDIRECT_URI!],
      scopes: (process.env.XERO_SCOPES || "").split(" "),
    });
  }
  return xeroClient;
}
