export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class SelfReportError extends DomainError {
  constructor() {
    super('SELF_REPORT_NOT_ALLOWED', 'You cannot report yourself.');
  }
}

export class AccountNotFoundError extends DomainError {
  constructor() {
    super('ACCOUNT_NOT_FOUND', 'No account found with the given identifier.');
  }
}

export class ReportTypeNotFoundError extends DomainError {
  constructor() {
    super('REPORT_TYPE_NOT_FOUND', 'No report type found with the given identifier.');
  }
}

export class ReportTypeInactiveError extends DomainError {
  constructor() {
    super('REPORT_TYPE_INACTIVE', 'This report type is no longer active.');
  }
}

export class ReportNotFoundError extends DomainError {
  constructor() {
    super('REPORT_NOT_FOUND', 'No report found with the given identifier.');
  }
}

export class ReportAlreadyResolvedError extends DomainError {
  constructor() {
    super('REPORT_ALREADY_RESOLVED', 'This report has already been confirmed and cannot be reviewed again.');
  }
}

export class ReportTypeNameTakenError extends DomainError {
  constructor() {
    super('REPORT_TYPE_NAME_TAKEN', 'A report type with this name already exists.');
  }
}

export class EmptyUpdateError extends DomainError {
  constructor() {
    super('EMPTY_UPDATE', 'At least one field must be provided to update.');
  }
}

export class InvalidDeductionPointsError extends DomainError {
  constructor() {
    super('INVALID_DEDUCTION_POINTS', 'Deduction points must be between 1 and 100 inclusive.');
  }
}
