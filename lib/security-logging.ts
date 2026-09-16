export type LogSeverity = 'debug' | 'info' | 'warn' | 'error';

export type SecurityLogEvent = {
  correlationId?: string;
  errorCode?: string;
  event: string;
  severity: LogSeverity;
};

export type StructuredLogRecord = {
  correlation_id?: string;
  error_code?: string;
  event: string;
  severity: LogSeverity;
  timestamp: string;
};

const SAFE_TOKEN = /^[a-zA-Z0-9._:-]{1,100}$/;

function safeToken(value: string | undefined): string | undefined {
  return value && SAFE_TOKEN.test(value) ? value : undefined;
}

export function createStructuredLogRecord(
  event: SecurityLogEvent,
  now: Date = new Date(),
): StructuredLogRecord {
  const record: StructuredLogRecord = {
    event: safeToken(event.event) ?? 'invalid_event',
    severity: event.severity,
    timestamp: now.toISOString(),
  };
  const correlationId = safeToken(event.correlationId);
  const errorCode = safeToken(event.errorCode);

  if (correlationId) {
    record.correlation_id = correlationId;
  }
  if (errorCode) {
    record.error_code = errorCode;
  }

  return record;
}

export function writeSecurityLog(event: SecurityLogEvent): void {
  const record = createStructuredLogRecord(event);
  const serializedRecord = JSON.stringify(record);

  if (event.severity === 'error') {
    console.error(serializedRecord);
    return;
  }

  if (event.severity === 'warn') {
    console.warn(serializedRecord);
    return;
  }

  console.info(serializedRecord);
}
