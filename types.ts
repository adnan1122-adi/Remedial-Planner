export interface QuestionMapping {
  questionNo: string;
  skillCode: string;
  skillDescription: string;
  maxMarks: number;
}

export interface StudentRawScore {
  studentName: string;
  studentId: string;
  scores: Record<string, number>; // questionNo -> score
}

export enum ProficiencyLevel {
  Strong = 'Strong', // > 80%
  Moderate = 'Moderate', // 70-79%
  Weak = 'Weak', // < 70%
  Critical = 'Critical', // < 50%
}

export interface SkillPerformance {
  skillCode: string;
  skillDescription: string;
  marksEarned: number;
  totalMaxMarks: number;
  accuracy: number; // Percentage
  level: ProficiencyLevel;
}

export interface SkillStat {
  skillCode: string;
  description: string;
  avgAccuracy: number;
  strongCount: number;
  moderateCount: number;
  weakCount: number;
  criticalCount: number;
}

export interface StudentAnalysis {
  studentId: string;
  studentName: string;
  overallScore: number;
  skillPerformances: SkillPerformance[];
  weakestSkills: SkillPerformance[]; // Sorted by accuracy asc
}

export interface ClassAnalysis {
  students: StudentAnalysis[];
  skillStats: Record<string, SkillStat>;
  weakestSkillsClasswide: string[]; // Skill codes
  groups: RemedialGroup[];
}

export interface RemedialGroup {
  id: string;
  skillCode: string;
  skillDescription: string;
  students: StudentAnalysis[];
}

export interface RemedialPlan {
  skillCode: string;
  objective: string;
  targetGroup: 'Individual' | 'Small Group' | 'Whole Class';
  duration: '20 min' | '30 min' | '45 min';
  lessonFlow: {
    warmUp: string;
    miniLesson: string;
    guidedPractice: string;
    independentPractice: string;
    assessment: string;
    exitTicket: string;
  };
}

export interface SmartGoal {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
  fullStatement: string;
}

export interface GeneratedContent {
  remedialPlan?: RemedialPlan;
  worksheetContent?: string; // Markdown/Text
  smartGoal?: SmartGoal;
  parentReport?: string; // Markdown/Text
}

export interface TeacherProfile {
  name: string;
  gradeLevel: string;
  subject: 'Math' | 'English' | 'Science' | 'General';
}