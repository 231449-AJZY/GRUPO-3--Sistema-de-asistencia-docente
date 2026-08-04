export interface ReportPeriod {
  from: string;
  to: string;
}

export interface ReportSummaryMetrics {
  totalRecords: number;
  registered: number;
  rejected: number;
  duplicated: number;
  punctual: number;
  late: number;
  present: number;
  absent: number;
  attendanceCount: number;
  complianceRate: number;
  punctualityRate: number;
  teachersWithRecords: number;
  coursesWithRecords: number;
  courseRecords: number;
  institutionalEntries: number;
  activeTeachers: number;
  activeCourses: number;
  activeDepartments: number;
  semesters: number;
}

export interface ReportTrendPoint {
  date: string;
  total: number;
  punctual: number;
  late: number;
  absent: number;
}

export interface ReportDepartmentPoint {
  department: string;
  total: number;
  punctual: number;
  late: number;
  absent: number;
  complianceRate: number;
}

export interface ReportRecentRecord {
  id: string;
  teacherId: number;
  teacherCode?: string | null;
  teacher?: string | null;
  email?: string | null;
  department?: string | null;
  type?: string | null;
  courseCode?: string | null;
  course?: string | null;
  classroom?: string | null;
  date?: string | null;
  time?: string | null;
  status?: string | null;
  result?: string | null;
  method?: string | null;
  source?: string | null;
  deviceId?: number | null;
  signatureVerified?: boolean;
  bleRequired?: boolean;
  bleValidated?: boolean;
  createdAt?: string | null;
}

export interface ReportSummaryResponse {
  generatedAt: string;
  period: ReportPeriod;
  summary: ReportSummaryMetrics;
  trend: ReportTrendPoint[];
  departments: ReportDepartmentPoint[];
  recent: ReportRecentRecord[];
}

export type ReportModuleId =
  | "asistencia"
  | "inasistencias"
  | "docente"
  | "curso"
  | "departamento"
  | "rango"
  | "exportacion";

export interface ReportModuleDefinition {
  id: ReportModuleId;
  title: string;
  description: string;
  eyebrow: string;
  status: "available" | "priority" | "popular" | "academic" | "institutional" | "flexible";
  href: string;
  tone: "blue" | "red" | "green" | "amber" | "indigo" | "orange" | "purple";
}

export interface ReportCatalogTeacher {
  id: number;
  codigo?: string | null;
  nombre: string;
  email?: string | null;
  departamento_codigo?: string | null;
  departamento?: string | null;
}

export interface ReportCatalogCourse {
  id?: number;
  codigo: string;
  nombre: string;
}

export interface ReportCatalogDepartment {
  id: number;
  codigo: string;
  nombre: string;
}

export interface ReportCatalogSemester {
  id: number;
  codigo: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
}

export interface ReportCatalogsResponse {
  teachers: ReportCatalogTeacher[];
  courses: ReportCatalogCourse[];
  methods: string[];
  departments: ReportCatalogDepartment[];
  semesters: ReportCatalogSemester[];
}

export interface AttendanceReportFilters {
  dateFrom: string;
  dateTo: string;
  teacherId: string;
  courseCode: string;
  department: string;
  status: string;
  method: string;
}

export interface AttendanceReportSummary {
  totalRecords: number;
  registered: number;
  rejected: number;
  duplicated: number;
  punctual: number;
  present: number;
  late: number;
  absent: number;
  attendanceCount: number;
  complianceRate: number;
  punctualityRate: number;
  teachers: number;
  courses: number;
  averageDelayMinutes: number;
}

export interface AttendanceReportComparison {
  totalRecordsPercent: number;
  attendancePercent: number;
  latePercent: number;
  compliancePoints: number;
  punctualityPoints: number;
}

export interface AttendanceWeekdayPoint {
  weekday: number;
  total: number;
  punctual: number;
  late: number;
  absent: number;
}

export interface AttendanceMethodPoint {
  method: string;
  total: number;
}

export interface AttendanceReportRecord {
  id: string;
  teacherId: number;
  teacherCode?: string | null;
  teacher?: string | null;
  email?: string | null;
  department?: string | null;
  type?: string | null;
  scheduleId?: number | null;
  courseCode?: string | null;
  course?: string | null;
  classroom?: string | null;
  date?: string | null;
  scheduledTime?: string | null;
  registeredTime?: string | null;
  differenceMinutes?: number | null;
  status?: string | null;
  result?: string | null;
  method?: string | null;
  source?: string | null;
  deviceId?: number | null;
  signatureVerified?: boolean;
  bleRequired?: boolean;
  bleValidated?: boolean;
  detail?: Record<string, unknown>;
  createdAt?: string | null;
}

export interface AttendanceReportPagination {
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface AttendanceAnalyticsResponse {
  generatedAt: string;
  period: ReportPeriod;
  comparisonPeriod: ReportPeriod;
  filters: {
    teacherId?: number | null;
    courseCode?: string | null;
    department?: string | null;
    status?: string | null;
    method?: string | null;
    result?: string | null;
    type?: string | null;
  };
  summary: AttendanceReportSummary;
  comparison: AttendanceReportComparison;
  trend: ReportTrendPoint[];
  weekdays: AttendanceWeekdayPoint[];
  departments: ReportDepartmentPoint[];
  methods: AttendanceMethodPoint[];
  records: AttendanceReportRecord[];
  pagination: AttendanceReportPagination;
}

export interface AbsenceReportFilters {
  dateFrom: string;
  dateTo: string;
  teacherId: string;
  courseCode: string;
  department: string;
  type: string;
}

export interface AbsenceReportSummary {
  totalAbsences: number;
  affectedTeachers: number;
  recurrentTeachers: number;
  affectedCourses: number;
  courseAbsences: number;
  institutionalAbsences: number;
}

export interface AbsenceReportComparison {
  totalAbsencesPercent: number;
  affectedTeachersPercent: number;
  recurrentTeachersPercent: number;
  courseAbsencesPercent: number;
}

export interface AbsenceTrendPoint {
  date: string;
  total: number;
  course: number;
  institutional: number;
}

export interface AbsenceDepartmentPoint {
  department: string;
  total: number;
  teachers: number;
  course: number;
  institutional: number;
}

export interface AbsenceTeacherPoint {
  teacherId: number;
  teacherCode?: string | null;
  teacher?: string | null;
  department?: string | null;
  total: number;
  course: number;
  institutional: number;
  lastDate?: string | null;
}

export interface AbsenceReportRecord {
  id: string;
  teacherId: number;
  teacherCode?: string | null;
  teacher?: string | null;
  email?: string | null;
  department?: string | null;
  type?: string | null;
  scheduleId?: number | null;
  courseCode?: string | null;
  course?: string | null;
  classroom?: string | null;
  date?: string | null;
  scheduledTime?: string | null;
  registeredTime?: string | null;
  status?: string | null;
  result?: string | null;
  method?: string | null;
  source?: string | null;
  detail?: Record<string, unknown>;
  createdAt?: string | null;
}

export interface AbsenceAnalyticsResponse {
  generatedAt: string;
  period: ReportPeriod;
  comparisonPeriod: ReportPeriod;
  filters: {
    teacherId?: number | null;
    courseCode?: string | null;
    department?: string | null;
    type?: string | null;
  };
  dataScope: {
    justificationWorkflowAvailable: boolean;
    note: string;
  };
  summary: AbsenceReportSummary;
  comparison: AbsenceReportComparison;
  trend: AbsenceTrendPoint[];
  departments: AbsenceDepartmentPoint[];
  teachers: AbsenceTeacherPoint[];
  records: AbsenceReportRecord[];
  pagination: AttendanceReportPagination;
}

export interface TeacherReportFilters {
  dateFrom: string;
  dateTo: string;
  teacherId: string;
  semesterId: string;
}

export interface TeacherProfile {
  id: number;
  code?: string | null;
  firstNames?: string | null;
  lastNames?: string | null;
  name: string;
  email?: string | null;
  active: boolean;
  departmentId?: number | null;
  departmentCode?: string | null;
  department?: string | null;
  dni?: string | null;
  category?: string | null;
  condition?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
}

export interface TeacherReportSummary {
  totalRecords: number;
  registered: number;
  rejected: number;
  duplicated: number;
  punctual: number;
  late: number;
  absent: number;
  attendanceCount: number;
  complianceRate: number;
  punctualityRate: number;
  institutionalEntries: number;
  coursesWithActivity: number;
  activeDays: number;
  averageDelayMinutes: number;
  assignedCourses: number;
  scheduleSlots: number;
  plannedSessions: number;
}

export interface TeacherReportComparison {
  attendancePercent: number;
  latePercent: number;
  absencePercent: number;
  compliancePoints: number;
  punctualityPoints: number;
}

export interface TeacherCoursePerformance {
  id: number;
  code: string;
  name: string;
  semesterId: number;
  semester: string;
  classrooms?: string | null;
  schedule?: string | null;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  totalRecords: number;
  punctual: number;
  late: number;
  absent: number;
  complianceRate: number;
}

export interface TeacherMethodPoint {
  method: string;
  total: number;
}

export interface TeacherSelectedSemester {
  id: number;
  code: string;
  from: string;
  to: string;
  active: boolean;
}

export interface TeacherAnalyticsResponse {
  generatedAt: string;
  period: ReportPeriod;
  comparisonPeriod: ReportPeriod;
  selectedSemester?: TeacherSelectedSemester | null;
  teacher: TeacherProfile;
  summary: TeacherReportSummary;
  comparison: TeacherReportComparison;
  insights: {
    bestCourse?: TeacherCoursePerformance | null;
    attentionCourse?: TeacherCoursePerformance | null;
    topMethod?: TeacherMethodPoint | null;
    scopeNote: string;
  };
  trend: ReportTrendPoint[];
  courses: TeacherCoursePerformance[];
  methods: TeacherMethodPoint[];
  recent: AttendanceReportRecord[];
}



export interface CourseReportFilters {
  dateFrom: string;
  dateTo: string;
  courseCode: string;
  semesterId: string;
}

export interface CourseProfile {
  id: number;
  code: string;
  name: string;
  credits: number;
  active: boolean;
  departmentId?: number | null;
  departmentCode?: string | null;
  department?: string | null;
}

export interface CourseReportSummary {
  totalRecords: number;
  registered: number;
  rejected: number;
  duplicated: number;
  punctual: number;
  late: number;
  absent: number;
  attendanceCount: number;
  complianceRate: number;
  punctualityRate: number;
  coverageRate: number;
  assignedTeachers: number;
  teachersWithActivity: number;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  activeDays: number;
  classrooms: number;
  classroomList?: string | null;
  averageDelayMinutes: number;
}

export interface CourseReportComparison {
  attendancePercent: number;
  latePercent: number;
  absencePercent: number;
  compliancePoints: number;
  coveragePoints: number;
}

export interface CourseTeacherPerformance {
  id: number;
  code?: string | null;
  name: string;
  email?: string | null;
  active: boolean;
  departmentCode?: string | null;
  department?: string | null;
  semesters?: string | null;
  classrooms?: string | null;
  schedule?: string | null;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  totalRecords: number;
  punctual: number;
  late: number;
  absent: number;
  complianceRate: number;
  coverageRate: number;
}

export interface CourseScheduleBlock {
  id: number;
  weekday: number;
  day: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  semesterId: number;
  semester: string;
  teacherId: number;
  teacherCode?: string | null;
  teacher: string;
  plannedSessions: number;
  recordedSessions: number;
}

export interface CourseAnalyticsResponse {
  generatedAt: string;
  period: ReportPeriod;
  comparisonPeriod: ReportPeriod;
  selectedSemester?: TeacherSelectedSemester | null;
  course: CourseProfile;
  summary: CourseReportSummary;
  comparison: CourseReportComparison;
  insights: {
    bestTeacher?: CourseTeacherPerformance | null;
    attentionTeacher?: CourseTeacherPerformance | null;
    topMethod?: TeacherMethodPoint | null;
    busiestDay?: ReportTrendPoint | null;
    scopeNote: string;
  };
  trend: ReportTrendPoint[];
  teachers: CourseTeacherPerformance[];
  schedules: CourseScheduleBlock[];
  schedulePreviewLimit: number;
  methods: TeacherMethodPoint[];
  recent: AttendanceReportRecord[];
}

export interface DepartmentReportFilters {
  dateFrom: string;
  dateTo: string;
  departmentId: string;
  semesterId: string;
}

export interface DepartmentProfile {
  id: number;
  code: string;
  name: string;
  active: boolean;
}

export interface DepartmentReportSummary {
  totalRecords: number;
  registered: number;
  rejected: number;
  duplicated: number;
  punctual: number;
  late: number;
  absent: number;
  attendanceCount: number;
  complianceRate: number;
  punctualityRate: number;
  coverageRate: number;
  activeTeachers: number;
  teachersWithActivity: number;
  activeCourses: number;
  coursesWithActivity: number;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  courseRecords: number;
  institutionalEntries: number;
  activeDays: number;
  averageDelayMinutes: number;
}

export interface DepartmentReportComparison {
  attendancePercent: number;
  latePercent: number;
  absencePercent: number;
  compliancePoints: number;
  coveragePoints: number;
}

export interface DepartmentTeacherPerformance {
  id: number;
  code?: string | null;
  name: string;
  email?: string | null;
  active: boolean;
  category?: string | null;
  condition?: string | null;
  assignedCourses: number;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  totalRecords: number;
  punctual: number;
  late: number;
  absent: number;
  complianceRate: number;
  punctualityRate: number;
  coverageRate: number;
}

export interface DepartmentCoursePerformance {
  id: number;
  code: string;
  name: string;
  credits: number;
  active: boolean;
  assignedTeachers: number;
  scheduleSlots: number;
  plannedSessions: number;
  recordedSessions: number;
  totalRecords: number;
  punctual: number;
  late: number;
  absent: number;
  complianceRate: number;
  coverageRate: number;
}

export interface DepartmentAnalyticsResponse {
  generatedAt: string;
  period: ReportPeriod;
  comparisonPeriod: ReportPeriod;
  selectedSemester?: TeacherSelectedSemester | null;
  department: DepartmentProfile;
  summary: DepartmentReportSummary;
  comparison: DepartmentReportComparison;
  insights: {
    bestTeacher?: DepartmentTeacherPerformance | null;
    attentionTeacher?: DepartmentTeacherPerformance | null;
    bestCourse?: DepartmentCoursePerformance | null;
    attentionCourse?: DepartmentCoursePerformance | null;
    topMethod?: TeacherMethodPoint | null;
    busiestDay?: ReportTrendPoint | null;
    scopeNote: string;
  };
  trend: ReportTrendPoint[];
  teachers: DepartmentTeacherPerformance[];
  courses: DepartmentCoursePerformance[];
  methods: TeacherMethodPoint[];
  recent: AttendanceReportRecord[];
}

export interface DateRangeReportFilters extends AttendanceReportFilters {
  type: string;
  result: string;
}

export interface DateRangeExportResponse {
  generatedAt: string;
  maxRows: number;
  truncated: boolean;
  summary: Record<string, number>;
  records: ReportRecentRecord[];
}

export type DateRangeAnalyticsResponse = AttendanceAnalyticsResponse;
