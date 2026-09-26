export type SmsMessage = {
  to: string;
  body: string;
};

export type TwilioConfiguration = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export type DeliveryResult =
  | { kind: 'submitted'; providerSid: string }
  | { kind: 'transient_failure'; reasonCode: string }
  | { kind: 'permanent_skip'; reasonCode: string };

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

const permanentTwilioCodes = new Set([
  21211, // Invalid destination number.
  21610, // Recipient has opted out at the carrier/provider.
  21612, // Destination cannot be reached from this sender.
  21614, // Destination is not a mobile number.
]);

function boundedReasonCode(prefix: string, value: string | number): string {
  return `${prefix}_${value}`.slice(0, 80);
}

export async function submitWithTwilio(
  message: SmsMessage,
  configuration: TwilioConfiguration,
  fetchImplementation: Fetch = fetch,
): Promise<DeliveryResult> {
  const params = new URLSearchParams({
    To: message.to,
    From: configuration.fromNumber,
    Body: message.body,
  });

  let response: Response;
  try {
    response = await fetchImplementation(
      `https://api.twilio.com/2010-04-01/Accounts/${configuration.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${btoa(`${configuration.accountSid}:${configuration.authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        },
        body: params,
      },
    );
  } catch {
    return { kind: 'transient_failure', reasonCode: 'twilio_network_error' };
  }

  let payload: { sid?: unknown; code?: unknown } = {};
  try {
    payload = (await response.json()) as { sid?: unknown; code?: unknown };
  } catch {
    // The status code still gives us a safe, non-secret failure reason.
  }

  if (response.ok && typeof payload.sid === 'string' && payload.sid.length > 0) {
    return { kind: 'submitted', providerSid: payload.sid.slice(0, 80) };
  }

  const providerCode = typeof payload.code === 'number' ? payload.code : response.status;
  if (permanentTwilioCodes.has(providerCode)) {
    return {
      kind: 'permanent_skip',
      reasonCode: boundedReasonCode('twilio_permanent', providerCode),
    };
  }

  return {
    kind: 'transient_failure',
    reasonCode: boundedReasonCode('twilio_transient', providerCode),
  };
}
