import dotenv from 'dotenv';
import mongoose, { Connection, Model } from 'mongoose';
import path from 'path';
import { createHash, randomBytes, scrypt as scryptCallback } from 'crypto';
import { promisify } from 'util';
import { UserModel } from '../models/User';
import { CitizenReportModel } from '../models/CitizenReport';
import { IssueModel, IssueSeverity, IssueStatus, IssueType } from '../models/Issue';
import { StreetModel } from '../models/Street';
import { NotificationModel, NotificationKind } from '../models/Notification';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
const scrypt = promisify(scryptCallback);
const DEMO_DATABASE = 'nagardrishti_demo';
const DEPARTMENTS = [
  'Roads and Infrastructure', 'Street Lighting', 'Stormwater and Drainage',
  'Solid Waste Management', 'Water Supply', 'Traffic Management',
  'Footpaths and Accessibility', 'Emergency Response',
];
const AREAS = [
  { name: 'Koramangala', latitude: 12.9352, longitude: 77.6245, weight: 18 },
  { name: 'Whitefield', latitude: 12.9698, longitude: 77.7500, weight: 16 },
  { name: 'Indiranagar', latitude: 12.9784, longitude: 77.6408, weight: 15 },
  { name: 'Jayanagar', latitude: 12.9250, longitude: 77.5838, weight: 14 },
  { name: 'HSR Layout', latitude: 12.9116, longitude: 77.6389, weight: 13 },
  { name: 'Marathahalli', latitude: 12.9591, longitude: 77.6974, weight: 12 },
  { name: 'Malleshwaram', latitude: 13.0035, longitude: 77.5643, weight: 11 },
  { name: 'Rajajinagar', latitude: 12.9911, longitude: 77.5530, weight: 10 },
  { name: 'BTM Layout', latitude: 12.9166, longitude: 77.6101, weight: 10 },
  { name: 'Banashankari', latitude: 12.9255, longitude: 77.5468, weight: 9 },
  { name: 'Hebbal', latitude: 13.0358, longitude: 77.5970, weight: 8 },
  { name: 'Yelahanka', latitude: 13.1007, longitude: 77.5963, weight: 7 },
  { name: 'Electronic City', latitude: 12.8399, longitude: 77.6770, weight: 7 },
  { name: 'Basavanagudi', latitude: 12.9416, longitude: 77.5681, weight: 6 },
  { name: 'Vijayanagar', latitude: 12.9700, longitude: 77.5350, weight: 4 },
];
const CATEGORY_COUNTS: Array<[IssueType, number]> = [
  ['Pothole', 30], ['Broken Streetlight', 15], ['Blocked Drainage', 22],
  ['Garbage Accumulation', 18], ['Water Leakage', 10], ['Traffic Congestion', 9],
  ['Damaged Sidewalk', 12], ['Road Obstruction', 8], ['Waterlogging', 13], ['Road Damage', 13],
];
const DESCRIPTIONS: Record<IssueType, string[]> = {
  'Pothole': ['A deep pothole is affecting two-wheeler traffic near the junction.', 'The road surface has a wide depression after recent rain.', 'Several vehicles are swerving around a damaged patch of roadway.'],
  'Broken Streetlight': ['Streetlights on this stretch are not illuminating the footpath at night.', 'A damaged lamp post leaves the junction poorly lit after sunset.', 'The light near the bus stop has been out for several days.'],
  'Blocked Drainage': ['The roadside drain is blocked with silt and is not carrying runoff.', 'Water is collecting beside a drain covered by plastic waste.', 'The stormwater inlet appears clogged along this road.'],
  'Garbage Accumulation': ['Waste has overflowed from the collection point onto the footpath.', 'Uncollected household waste is attracting stray animals near shops.', 'A pile of mixed waste is blocking pedestrian access.'],
  'Water Leakage': ['A water pipe is leaking steadily onto the street.', 'Clean water is flowing from a damaged roadside connection.', 'A persistent leak has made the lane slippery.'],
  'Traffic Congestion': ['Vehicles are queueing through the junction during peak commute hours.', 'Poorly managed curbside parking is narrowing the carriageway.', 'Traffic is backing up near the market entrance.'],
  'Damaged Sidewalk': ['Broken paving stones create an uneven path for pedestrians.', 'A section of the footpath has collapsed beside the road.', 'The sidewalk surface is cracked and difficult to use with a wheelchair.'],
  'Road Obstruction': ['Construction material is occupying part of the travel lane.', 'A fallen branch is obstructing the road shoulder.', 'An abandoned object is narrowing the pedestrian route.'],
  'Waterlogging': ['Rainwater remains pooled across the low section of the road.', 'Standing water is reaching the edge of nearby properties.', 'The junction has pooled water after rainfall and drains slowly.'],
  'Road Damage': ['The road surface is cracked and breaking up along the lane.', 'A damaged asphalt section is spreading near the intersection.', 'Loose road material is creating an uneven driving surface.'],
  'Other Urban Infrastructure': ['A damaged public fixture needs inspection by the relevant municipal team.'],
};
const ACTIONS: Record<IssueType, string> = {
  'Pothole': 'Inspect the road section and schedule a safe surface repair.',
  'Broken Streetlight': 'Inspect the electrical fitting and restore the streetlight.',
  'Blocked Drainage': 'Clear the inlet and inspect the downstream drain.',
  'Garbage Accumulation': 'Arrange collection and clean the affected public area.',
  'Water Leakage': 'Inspect the supply connection and stop the leak.',
  'Traffic Congestion': 'Review junction operations and curbside obstructions.',
  'Damaged Sidewalk': 'Inspect the footpath and repair the damaged section.',
  'Road Obstruction': 'Remove the obstruction after confirming it is safe to do so.',
  'Waterlogging': 'Inspect nearby stormwater inlets and clear the drainage path.',
  'Road Damage': 'Assess the damaged surface and schedule road maintenance.',
  'Other Urban Infrastructure': 'Refer the issue to the appropriate municipal team for inspection.',
};

function stableHex(value: string, length: number): string {
  return createHash('sha256').update(value).digest('hex').slice(0, length).toUpperCase();
}
function stableObjectId(seed: string): mongoose.Types.ObjectId {
  return new mongoose.Types.ObjectId(stableHex(seed, 24));
}
function collectionDatabase(uri: string): string {
  try { return new URL(uri).pathname.replace(/^\//, '').split('/')[0]; }
  catch { throw new Error('MONGO_DEMO_URI is not a valid MongoDB connection URL.'); }
}
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}
function upsertOps<T extends Record<string, any>>(ModelType: Model<any>, rows: T[], key: keyof T) {
  return ModelType.bulkWrite(rows.map((row) => ({
    updateOne: { filter: { [key]: row[key] }, update: { $setOnInsert: row }, upsert: true },
  })), { ordered: true, timestamps: false });
}
function reportStatus(index: number, ageDays: number): string {
  if (ageDays > 110 && index % 3 === 0) return 'Resolved';
  if (ageDays > 75 && index % 4 === 0) return 'In Progress';
  if (ageDays > 40 && index % 5 < 2) return 'Assigned';
  if (ageDays > 18 && index % 3 !== 0) return 'Under Review';
  return 'Submitted';
}
function issueStatus(status: string): IssueStatus {
  return ({ Submitted: 'NEW', 'Under Review': 'VERIFIED', Assigned: 'ASSIGNED', 'In Progress': 'IN PROGRESS', Resolved: 'RESOLVED' } as Record<string, IssueStatus>)[status];
}
function severity(index: number): IssueSeverity {
  if (index % 30 === 0) return 'Critical';
  if (index % 4 === 0) return 'High';
  if (index % 4 === 1) return 'Low';
  return 'Medium';
}
function priorityFor(value: IssueSeverity): number {
  return value === 'Critical' ? 94 : value === 'High' ? 76 : value === 'Medium' ? 53 : 31;
}

async function seedMongoDemo() {
  const uri = process.env.MONGO_DEMO_URI?.trim();
  if (!uri) throw new Error('Set MONGO_DEMO_URI in server/.env to the isolated nagardrishti_demo database.');
  if (collectionDatabase(uri) !== DEMO_DATABASE) throw new Error('Refusing to seed: MONGO_DEMO_URI must target nagardrishti_demo.');
  const configuredSeedPassword = process.env.DEMO_SEED_PASSWORD;
  if (configuredSeedPassword && (configuredSeedPassword.length < 12 || configuredSeedPassword.length > 128 || /^(replace_with|your_|change_me|changeme)/i.test(configuredSeedPassword))) {
    throw new Error('DEMO_SEED_PASSWORD must be a private value between 12 and 128 characters, or be left unset.');
  }

  const connection: Connection = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 20000,
    maxPoolSize: 10,
  }).asPromise();

  try {
    const User = connection.model('User', UserModel.schema, 'users');
    const Street = connection.model('Street', StreetModel.schema, 'streets');
    const Issue = connection.model('Issue', IssueModel.schema, 'issues');
    const Complaint = connection.model('CitizenReport', CitizenReportModel.schema, 'complaints');
    const Notification = connection.model('Notification', NotificationModel.schema, 'notifications');
    await Promise.all([User.init(), Street.init(), Issue.init(), Complaint.init(), Notification.init()]);

    const baseTime = new Date();
    const daysAgo = (days: number) => new Date(baseTime.getTime() - days * 86400000);
    const users: any[] = [];
    for (let index = 1; index <= 30; index += 1) {
      const email = `citizen${String(index).padStart(2, '0')}@example.test`;
      users.push({
        _id: stableObjectId(`citizen:${index}`), name: ['Asha Rao', 'Rahul Nair', 'Meera Iyer', 'Arjun Kumar', 'Kavya Reddy'][index % 5] + ` ${index}`,
        email, passwordHash: await hashPassword(configuredSeedPassword || randomBytes(32).toString('base64url')), role: 'citizen', department: '', isActive: true, createdAt: daysAgo(180), updatedAt: baseTime,
      });
    }
    for (let index = 1; index <= 15; index += 1) {
      const email = `staff${String(index).padStart(2, '0')}@example.test`;
      users.push({
        _id: stableObjectId(`staff:${index}`), name: ['Ananya Menon', 'Vikram Shetty', 'Divya Prasad', 'Kiran Gowda', 'Neha Shah'][index % 5] + ` ${index}`,
        email, passwordHash: await hashPassword(configuredSeedPassword || randomBytes(32).toString('base64url')), role: 'municipal_staff', department: DEPARTMENTS[(index - 1) % DEPARTMENTS.length], isActive: true, createdAt: daysAgo(220), updatedAt: baseTime,
      });
    }
    const userWrite = await upsertOps(User, users, 'email');
    const savedUsers = await User.find({ email: { $in: users.map((user) => user.email) } }).select('_id email role department').lean();
    const userByEmail = new Map(savedUsers.map((user: any) => [user.email, user]));
    const citizens = Array.from({ length: 30 }, (_, i) => userByEmail.get(`citizen${String(i + 1).padStart(2, '0')}@example.test`)!);
    const staff = Array.from({ length: 15 }, (_, i) => userByEmail.get(`staff${String(i + 1).padStart(2, '0')}@example.test`)!);
    if (citizens.some((user) => !user) || staff.some((user) => !user)) throw new Error('Seed user validation failed.');

    const streets = AREAS.map((area, index) => ({
      _id: stableObjectId(`area:${area.name}`), name: area.name,
      healthScore: 87 - (index % 6) * 7, roadCondition: 84 - (index % 5) * 8,
      lightingScore: 89 - (index % 4) * 8, drainageScore: 82 - (index % 6) * 9,
      wasteScore: 88 - (index % 5) * 7, trafficScore: 80 - (index % 7) * 8,
      latitude: area.latitude, longitude: area.longitude,
      activeIssuesCount: 0, floodRiskPercent: 12 + (index * 7) % 38,
      isDemo: true, createdAt: daysAgo(180), updatedAt: baseTime,
    }));
    const weightedAreas = AREAS.flatMap((area) => Array.from({ length: area.weight }, () => area));
    const streetWrite = await upsertOps(Street, streets, 'name');

    const categories = CATEGORY_COUNTS.flatMap(([type, count]) => Array.from({ length: count }, () => type));
    const areaActiveCounts = new Map<string, number>();
    const reports: any[] = [];
    const issues: any[] = [];
    for (let index = 0; index < 150; index += 1) {
      const n = index + 1;
      const type = categories[(index * 37) % categories.length];
      const area = weightedAreas[(index * 29 + Math.floor(index / 4)) % weightedAreas.length];
      const age = 2 + (index * 11) % 170;
      const createdAt = daysAgo(age);
      const status = reportStatus(index, age);
      const severityValue = severity(index);
      const reportId = `ST-${baseTime.getFullYear()}-${stableHex(`complaint:${n}`, 16)}`;
      const issueId = `ISSUE-DEMO-${String(n).padStart(4, '0')}`;
      const citizen = citizens[(index * 7 + Math.floor(index / 10)) % citizens.length] as any;
      const staffMember = staff[(index * 3) % staff.length] as any;
      const descriptionList = DESCRIPTIONS[type];
      const description = `${descriptionList[index % descriptionList.length]} Reported in ${area.name}, Bengaluru.`;
      const lat = Number((area.latitude + (((index * 17) % 21) - 10) * 0.00045).toFixed(6));
      const lng = Number((area.longitude + (((index * 13) % 21) - 10) * 0.00045).toFixed(6));
      const assigned = ['Assigned', 'In Progress', 'Resolved'].includes(status);
      const resolvedAt = status === 'Resolved' ? new Date(createdAt.getTime() + Math.min(30, Math.max(1, Math.floor(age / 3))) * 86400000) : null;
      const department = DEPARTMENTS[(index + type.length) % DEPARTMENTS.length];
      const priorityScore = priorityFor(severityValue);
      const action = ACTIONS[type];
      const location = { type: 'Point', coordinates: [lng, lat] };
      const history = [{ action: 'complaint_submitted', actorId: String(citizen._id), actorRole: 'citizen', createdAt }];
      if (status !== 'Submitted') history.push({ action: 'status_updated', actorId: String(staffMember._id), actorRole: 'municipal_staff', createdAt: new Date(createdAt.getTime() + Math.max(1, Math.floor(age / 4)) * 86400000) });
      if (status === 'Resolved') history.push({ action: 'complaint_resolved', actorId: String(staffMember._id), actorRole: 'municipal_staff', createdAt: resolvedAt! });

      reports.push({
        reportId, issueType: type, description, image: '', latitude: lat, longitude: lng, location,
        streetName: area.name, severity: severityValue, status, contactEmail: citizen.email,
        associatedIssueId: issueId, duplicateGroupId: '', possibleDuplicateReportIds: [], duplicateLinkedReportIds: [],
        imageHash: '', department, assignedTo: assigned ? String(staffMember._id) : '',
        resolutionNotes: status === 'Resolved' ? 'Municipal crew completed the reported repair and recorded a field inspection.' : '',
        resolutionEvidence: [], history, priorityScore, priorityLevel: severityValue.toUpperCase(),
        priorityExplanation: `${severityValue} severity is the recorded assessment; age ${age} days is included as context.`,
        recommendedResponseHours: severityValue === 'Critical' ? 4 : severityValue === 'High' ? 24 : severityValue === 'Medium' ? 72 : 120,
        userId: String(citizen._id), resolvedAt, isDemo: true, aiAnalysisStatus: 'no_image',
        createdAt, updatedAt: resolvedAt || createdAt,
      });
      issues.push({
        id: issueId, title: `${type} · ${area.name}`, description, type, severity: severityValue,
        latitude: lat, longitude: lng, location, streetName: area.name, status: issueStatus(status),
        priorityScore, riskLevel: severityValue.toUpperCase(), priorityLevel: severityValue.toUpperCase(),
        reportsCount: 1, estimatedPopulationImpact: null,
        nearbyInfrastructure: { schools: 0, hospitals: 0, busStops: 0, residentialCount: 0, commercialCount: 0 },
        recommendedAction: action,
        reason: `Synthetic demonstration record; severity: ${severityValue}; issue age: ${age} days.`,
        priorityExplanation: `Demonstration priority based on recorded severity and complaint age (${age} days).`,
        priorityBreakdown: { severity: priorityScore, traffic: 0, population: 0, infrastructure: 0, reports: 0, duration: Math.min(20, age / 10), weatherRisk: 0 },
        assignedTeam: assigned ? department : '', assignedUserId: assigned ? String(staffMember._id) : '',
        department, resolutionNotes: status === 'Resolved' ? 'Repair recorded as complete for demonstration.' : '',
        verifiedVisualEvidence: false, recommendedResponseHours: severityValue === 'Critical' ? 4 : severityValue === 'High' ? 24 : severityValue === 'Medium' ? 72 : 120,
        resolvedAt, isDemo: true, createdAt, updatedAt: resolvedAt || createdAt,
      });
      if (status !== 'Resolved') areaActiveCounts.set(area.name, (areaActiveCounts.get(area.name) || 0) + 1);
    }
    const issueWrite = await upsertOps(Issue, issues, 'id');
    const complaintWrite = await upsertOps(Complaint, reports, 'reportId');
    await Promise.all([...areaActiveCounts.entries()].map(([name, count]) => Street.updateOne({ name }, { $set: { activeIssuesCount: count, isDemo: true } })));

    const notificationKinds: NotificationKind[] = ['complaint_submitted', 'complaint_assigned', 'status_changed', 'priority_changed', 'complaint_resolved'];
    const notifications = Array.from({ length: 40 }, (_, index) => {
      const report = reports[(index * 11) % reports.length];
      const kind = notificationKinds[index % notificationKinds.length];
      const linkedUserId = kind === 'complaint_assigned' ? String(staff[index % staff.length]._id) : report.userId;
      return {
        id: `demo-notification-${String(index + 1).padStart(3, '0')}`, userId: linkedUserId, kind,
        title: kind === 'complaint_resolved' ? 'Complaint resolved' : kind === 'complaint_assigned' ? 'Complaint assigned' : 'Complaint update',
        message: kind === 'complaint_resolved' ? `A demonstration report in ${report.streetName} is marked resolved.`
          : kind === 'complaint_assigned' ? `A demonstration report in ${report.streetName} was assigned to your department.`
            : `There is an update for your demonstration report in ${report.streetName}.`,
        reportId: report.reportId, dedupeKey: `demo-notification-dedupe-${String(index + 1).padStart(3, '0')}`,
        readAt: index % 3 === 0 ? daysAgo(index + 1) : null, createdAt: daysAgo(index * 3), updatedAt: daysAgo(index * 3),
      };
    });
    const notificationWrite = await upsertOps(Notification, notifications, 'id');

    const inserted = await Promise.all([
      User.countDocuments({ email: { $in: users.map((user) => user.email) } }),
      Street.countDocuments({ name: { $in: streets.map((street) => street.name) } }),
      Issue.countDocuments({ id: { $in: issues.map((issue) => issue.id) } }),
      Complaint.countDocuments({ reportId: { $in: reports.map((report) => report.reportId) } }),
      Notification.countDocuments({ id: { $in: notifications.map((notification) => notification.id) } }),
    ]);
    const citizenIds = citizens.map((user: any) => String(user._id));
    const staffIds = staff.map((user: any) => String(user._id));
    const reportIds = reports.map((report) => report.reportId);
    const issueIds = issues.map((issue) => issue.id);
    const invalidRelationships = await Promise.all([
      Complaint.countDocuments({ userId: { $nin: citizenIds }, reportId: { $in: reportIds } }),
      Complaint.countDocuments({ associatedIssueId: { $nin: issueIds }, reportId: { $in: reportIds } }),
      Complaint.countDocuments({ assignedTo: { $nin: [...staffIds, ''] }, reportId: { $in: reportIds } }),
      Notification.countDocuments({ userId: { $nin: [...citizenIds, ...staffIds] }, id: { $in: notifications.map((notification) => notification.id) } }),
      Notification.countDocuments({ reportId: { $nin: reportIds }, id: { $in: notifications.map((notification) => notification.id) } }),
    ]);
    if (invalidRelationships.some((count) => count > 0)) throw new Error('Seed relationship validation failed.');

    console.log(JSON.stringify({
      database: DEMO_DATABASE,
      collectionNames: { citizensAndStaff: 'users', complaints: 'complaints', issues: 'issues', neighborhoods: 'streets', notifications: 'notifications' },
      recordsPresent: { citizens: 30, staff: 15, complaints: 150, issues: 150, departments: DEPARTMENTS.length, neighborhoods: 15, notifications: 40, auditLogs: 0 },
      upserted: {
        users: userWrite.upsertedCount,
        streets: streetWrite.upsertedCount,
        issues: issueWrite.upsertedCount,
        complaints: complaintWrite.upsertedCount,
        notifications: notificationWrite.upsertedCount,
        verifiedPresent: { users: inserted[0], streets: inserted[1], issues: inserted[2], complaints: inserted[3], notifications: inserted[4] },
      },
      relationships: 'valid',
      limitations: ['Departments are represented in existing string fields; no Department model exists.', 'Neighborhoods use the existing Street model; no Area model exists.', 'No AuditLog schema exists, so audit records were not fabricated.'],
    }));
  } finally {
    await connection.close();
  }
}

seedMongoDemo().catch((error: unknown) => {
  const message = (error instanceof Error ? error.message : 'Demo database seeding failed.')
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, 'mongodb://[redacted]')
    .replace(/(password|passwd|pwd)=([^\s&]+)/gi, '$1=[redacted]');
  console.error(JSON.stringify({ level: 'error', event: 'demo_database_seed_failed', error: message }));
  process.exitCode = 1;
});
