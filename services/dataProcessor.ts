import * as XLSX from 'xlsx';
import { 
  QuestionMapping, 
  StudentRawScore, 
  StudentAnalysis, 
  ProficiencyLevel, 
  ClassAnalysis, 
  SkillPerformance,
  RemedialGroup
} from '../types';

export const parseExcelData = async (file: File): Promise<ClassAnalysis> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });

        // Validate Sheets
        if (!workbook.SheetNames.includes('QuestionsMapping') || !workbook.SheetNames.includes('StudentResults')) {
          throw new Error("Invalid File: Must contain 'QuestionsMapping' and 'StudentResults' sheets.");
        }

        // 1. Parse Questions Mapping
        const mappingSheet = workbook.Sheets['QuestionsMapping'];
        const mappingRaw = XLSX.utils.sheet_to_json<any>(mappingSheet);
        
        const questionMap: Record<string, QuestionMapping> = {};
        const skillMetadata: Record<string, string> = {}; // code -> desc

        mappingRaw.forEach((row: any) => {
          // Normalize keys (handle potential casing issues or spaces)
          const qNo = String(row['Question No'] || row['QuestionNo'] || row['q_no']).trim();
          const sCode = String(row['Skill Code'] || row['SkillCode']).trim();
          const sDesc = String(row['Skill Description'] || row['SkillDescription']).trim();
          const max = Number(row['Max Marks'] || row['MaxMarks']);

          if (qNo && sCode && !isNaN(max)) {
            questionMap[qNo] = {
              questionNo: qNo,
              skillCode: sCode,
              skillDescription: sDesc,
              maxMarks: max
            };
            skillMetadata[sCode] = sDesc;
          }
        });

        // 2. Parse Student Results
        const resultsSheet = workbook.Sheets['StudentResults'];
        const resultsRaw = XLSX.utils.sheet_to_json<any>(resultsSheet);
        
        const students: StudentAnalysis[] = resultsRaw.map((row: any) => {
          const name = row['Student Name'] || row['StudentName'];
          const id = String(row['Student ID'] || row['StudentID']);
          
          if (!name || !id) return null;

          const skillAccumulator: Record<string, { earned: number, max: number }> = {};

          // Initialize skills
          Object.keys(skillMetadata).forEach(code => {
            skillAccumulator[code] = { earned: 0, max: 0 };
          });

          let totalEarned = 0;
          let totalMax = 0;

          // Process each column that matches a question number
          Object.keys(row).forEach(key => {
            const qKey = String(key).trim();
            if (questionMap[qKey]) {
              const score = Number(row[key]);
              const mapping = questionMap[qKey];
              
              if (!isNaN(score)) {
                 // Validate max marks
                 const safeScore = Math.min(score, mapping.maxMarks);
                 
                 skillAccumulator[mapping.skillCode].earned += safeScore;
                 skillAccumulator[mapping.skillCode].max += mapping.maxMarks;
                 
                 totalEarned += safeScore;
                 totalMax += mapping.maxMarks;
              }
            }
          });

          // Calculate Proficiency per skill
          const skillPerformances: SkillPerformance[] = Object.keys(skillAccumulator).map(skillCode => {
            const data = skillAccumulator[skillCode];
            const accuracy = data.max > 0 ? (data.earned / data.max) * 100 : 0;
            
            let level = ProficiencyLevel.Strong;
            if (accuracy < 50) level = ProficiencyLevel.Critical;
            else if (accuracy < 70) level = ProficiencyLevel.Weak;
            else if (accuracy < 80) level = ProficiencyLevel.Moderate;

            return {
              skillCode,
              skillDescription: skillMetadata[skillCode],
              marksEarned: data.earned,
              totalMaxMarks: data.max,
              accuracy,
              level
            };
          });

          const overallAccuracy = totalMax > 0 ? (totalEarned / totalMax) * 100 : 0;

          return {
            studentId: id,
            studentName: name,
            overallScore: overallAccuracy,
            skillPerformances,
            weakestSkills: skillPerformances.filter(s => s.accuracy < 70).sort((a, b) => a.accuracy - b.accuracy)
          };
        }).filter((s): s is StudentAnalysis => s !== null);

        // 3. Class Level Analysis
        const skillStats: ClassAnalysis['skillStats'] = {};
        Object.keys(skillMetadata).forEach(code => {
            const studentSkills = students.map(s => s.skillPerformances.find(sp => sp.skillCode === code)).filter(Boolean) as SkillPerformance[];
            const totalAcc = studentSkills.reduce((acc, curr) => acc + curr.accuracy, 0);
            const avg = studentSkills.length ? totalAcc / studentSkills.length : 0;
            
            skillStats[code] = {
                skillCode: code,
                description: skillMetadata[code],
                avgAccuracy: avg,
                strongCount: studentSkills.filter(s => s.level === ProficiencyLevel.Strong).length,
                moderateCount: studentSkills.filter(s => s.level === ProficiencyLevel.Moderate).length,
                weakCount: studentSkills.filter(s => s.level === ProficiencyLevel.Weak).length,
                criticalCount: studentSkills.filter(s => s.level === ProficiencyLevel.Critical).length
            };
        });

        const weakestSkillsClasswide = Object.values(skillStats)
            .sort((a, b) => a.avgAccuracy - b.avgAccuracy)
            .slice(0, 3) // Top 3 weakest
            .map(s => s.skillCode);

        // 4. Grouping (Simple Logic: Group by weakest skill)
        const groupsMap: Record<string, RemedialGroup> = {};
        
        students.forEach(student => {
            if (student.weakestSkills.length > 0) {
                // Primary need is the lowest skill
                const primaryWeakness = student.weakestSkills[0]; 
                if (!groupsMap[primaryWeakness.skillCode]) {
                    groupsMap[primaryWeakness.skillCode] = {
                        id: `group-${primaryWeakness.skillCode}`,
                        skillCode: primaryWeakness.skillCode,
                        skillDescription: primaryWeakness.skillDescription,
                        students: []
                    };
                }
                groupsMap[primaryWeakness.skillCode].students.push(student);
            }
        });

        resolve({
          students,
          skillStats,
          weakestSkillsClasswide,
          groups: Object.values(groupsMap)
        });

      } catch (err) {
        reject(err);
      }
    };
    reader.readAsBinaryString(file);
  });
};

// Helper for Demo Data
export const generateDemoData = (): Promise<ClassAnalysis> => {
    // This mocks the parsed result of an Excel file
    return new Promise((resolve) => {
        const skills = [
            { code: 'M4.N.1', desc: 'Multi-digit Multiplication' },
            { code: 'M4.F.2', desc: 'Equivalent Fractions' },
            { code: 'M4.G.3', desc: 'Area and Perimeter' },
            { code: 'M4.D.4', desc: 'Interpreting Data Charts' },
            { code: 'M4.A.5', desc: 'Algebraic Patterns' },
            { code: 'M4.M.6', desc: 'Measurement Conversions' },
        ];
        
        const students: StudentAnalysis[] = Array.from({ length: 25 }).map((_, i) => {
            const skillPerfs = skills.map(skill => {
                // Random accuracy between 30 and 100 for variety
                const acc = Math.floor(Math.random() * 70) + 30; 
                let level = ProficiencyLevel.Strong;
                if (acc < 50) level = ProficiencyLevel.Critical;
                else if (acc < 70) level = ProficiencyLevel.Weak;
                else if (acc < 80) level = ProficiencyLevel.Moderate;

                return {
                    skillCode: skill.code,
                    skillDescription: skill.desc,
                    marksEarned: acc,
                    totalMaxMarks: 100,
                    accuracy: acc,
                    level
                };
            });
            
            return {
                studentId: `ST-${1000 + i}`,
                studentName: `Student ${String.fromCharCode(65 + (i%26))}${i > 25 ? i : ''}`,
                overallScore: skillPerfs.reduce((a,b) => a + b.accuracy, 0) / skills.length,
                skillPerformances: skillPerfs,
                weakestSkills: skillPerfs.filter(s => s.accuracy < 70).sort((a,b) => a.accuracy - b.accuracy)
            };
        });

        // Generate aggregate stats
         const skillStats: ClassAnalysis['skillStats'] = {};
         skills.forEach(skill => {
             const studentSkills = students.map(s => s.skillPerformances.find(sp => sp.skillCode === skill.code)!);
             const avg = studentSkills.reduce((a,b) => a + b.accuracy, 0) / students.length;
             skillStats[skill.code] = {
                 skillCode: skill.code,
                 description: skill.desc,
                 avgAccuracy: avg,
                 strongCount: studentSkills.filter(s => s.level === ProficiencyLevel.Strong).length,
                 moderateCount: studentSkills.filter(s => s.level === ProficiencyLevel.Moderate).length,
                 weakCount: studentSkills.filter(s => s.level === ProficiencyLevel.Weak).length,
                 criticalCount: studentSkills.filter(s => s.level === ProficiencyLevel.Critical).length
             };
         });

         const groupsMap: Record<string, RemedialGroup> = {};
         students.forEach(student => {
             if (student.weakestSkills.length > 0) {
                 const primaryWeakness = student.weakestSkills[0];
                 if (!groupsMap[primaryWeakness.skillCode]) {
                     groupsMap[primaryWeakness.skillCode] = {
                         id: `group-${primaryWeakness.skillCode}`,
                         skillCode: primaryWeakness.skillCode,
                         skillDescription: primaryWeakness.skillDescription,
                         students: []
                     };
                 }
                 groupsMap[primaryWeakness.skillCode].students.push(student);
             }
         });

         resolve({
             students,
             skillStats,
             weakestSkillsClasswide: ['M4.F.2', 'M4.G.3'], 
             groups: Object.values(groupsMap)
         });
    });
};

export const downloadTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: QuestionsMapping
  const mappingData = [
    { "Question No": "Q1", "Skill Code": "M4.N.1", "Skill Description": "Multiplication", "Max Marks": 5 },
    { "Question No": "Q2", "Skill Code": "M4.F.2", "Skill Description": "Equivalent Fractions", "Max Marks": 5 },
    { "Question No": "Q3", "Skill Code": "M4.G.3", "Skill Description": "Area and Perimeter", "Max Marks": 10 },
    { "Question No": "Q4", "Skill Code": "M4.N.1", "Skill Description": "Multiplication", "Max Marks": 5 },
  ];
  const ws1 = XLSX.utils.json_to_sheet(mappingData);
  XLSX.utils.book_append_sheet(wb, ws1, "QuestionsMapping");

  // Sheet 2: StudentResults
  const studentData = [
    { "Student Name": "Student A", "Student ID": "1001", "Q1": 5, "Q2": 4, "Q3": 8, "Q4": 5 },
    { "Student Name": "Student B", "Student ID": "1002", "Q1": 3, "Q2": 2, "Q3": 5, "Q4": 3 },
    { "Student Name": "Student C", "Student ID": "1003", "Q1": 5, "Q2": 5, "Q3": 9, "Q4": 4 },
  ];
  const ws2 = XLSX.utils.json_to_sheet(studentData);
  XLSX.utils.book_append_sheet(wb, ws2, "StudentResults");

  XLSX.writeFile(wb, "Remedial_Assessment_Template.xlsx");
};