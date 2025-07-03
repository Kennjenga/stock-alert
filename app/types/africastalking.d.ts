// Extended type definitions for africastalking package
// This extends the incomplete @types/africastalking package

declare module 'africastalking' {
  interface AirtimeRecipient {
    phoneNumber: string;
    currencyCode: string;
    amount: string;
  }

  interface AirtimeOptions {
    recipients: AirtimeRecipient[];
    maxNumRetry?: number;
  }

  interface AirtimeResponse {
    errorMessage: string;
    numQueued: number;
    totalAmount: string;
    totalDiscount: string;
    responses: Array<{
      phoneNumber: string;
      amount: string;
      discount: string;
      status: string;
      requestId: string;
      errorMessage: string;
    }>;
  }

  interface AIRTIME {
    send: (options: AirtimeOptions) => Promise<AirtimeResponse>;
    findTransactionStatus: (transactionId: string) => Promise<unknown>;
  }

  interface MOBILE_DATA {
    send: (options: unknown) => Promise<unknown>;
    findTransaction: (options: unknown) => Promise<unknown>;
    fetchWalletBalance: () => Promise<unknown>;
  }

  interface VOICE {
    call: (options: unknown) => Promise<unknown>;
    fetchQuedCalls: (options: unknown) => Promise<unknown>;
    uploadMediaFile: (options: unknown) => Promise<unknown>;
  }

  interface INSIGHTS {
    checkSimSwapState: (phoneNumbers: string[]) => Promise<unknown>;
  }

  interface APPLICATION {
    fetchApplicationData: () => Promise<unknown>;
  }

  // Extend the existing AfricasTalking interface
  interface AfricasTalking {
    SMS: SMS;
    TOKEN: TOKEN;
    AIRTIME: AIRTIME;
    MOBILE_DATA: MOBILE_DATA;
    VOICE: VOICE;
    INSIGHTS: INSIGHTS;
    APPLICATION: APPLICATION;
  }

  // Define the factory function type
  interface AfricasTalkingFactory {
    (options: { username: string; apiKey: string }): AfricasTalking;
  }

  const africastalking: AfricasTalkingFactory;
  export = africastalking;
}
