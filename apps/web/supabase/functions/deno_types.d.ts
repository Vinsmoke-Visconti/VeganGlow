// Supplemental types for Deno global when the Deno extension is not active
declare namespace Deno {
  export const env: {
    get(key: string): string | undefined;
    toObject(): { [key: string]: string };
  };
  export function serve(handler: (request: Request) => Promise<Response> | Response): void;
}

declare module "resend" {
  export class Resend {
    constructor(apiKey?: string);
    emails: {
      send(payload: any): Promise<{ data: any; error: any }>;
    };
  }
}
