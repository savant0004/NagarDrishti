export function sanitizeCitizenReport(report: any) {
  const value = typeof report?.toObject === 'function' ? report.toObject() : { ...report };
  delete value.contactEmail;
  delete value.userId;
  delete value.possibleDuplicateReportIds;
  delete value.duplicateLinkedReportIds;
  return value;
}
