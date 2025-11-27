import { GoogleGenAI, Type } from "@google/genai";
import { RemedialPlan, SmartGoal, TeacherProfile } from '../types';

// NOTE: In a real app, API key should not be exposed on client side directly if public.
// Assuming process.env.API_KEY is available as per instructions.
const apiKey = process.env.API_KEY || ''; 
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';

// Helper to determine standard type based on subject
const getStandardContext = (subject: string) => {
    if (subject === 'Math' || subject === 'English') return "CCSS (Common Core State Standards)";
    if (subject === 'Science') return "NGSS (Next Generation Science Standards)";
    return "Standard Curriculum";
};

export const generateRemedialPlan = async (
  skillCode: string,
  skillDescription: string,
  targetGroup: string,
  duration: string,
  profile: TeacherProfile
): Promise<RemedialPlan> => {
  const standardType = getStandardContext(profile.subject);
  
  const prompt = `
    Act as an expert Grade ${profile.gradeLevel} ${profile.subject} teacher.
    Create a remedial lesson plan for the skill/standard: "${skillCode}: ${skillDescription}".
    Context: This plan is for Grade ${profile.gradeLevel} students. The skill code follows ${standardType}.
    Target Group: ${targetGroup}.
    Duration: ${duration}.
    Structure it exactly with these fields: objective, warmUp, miniLesson, guidedPractice, independentPractice, assessment, exitTicket.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             objective: { type: Type.STRING },
             warmUp: { type: Type.STRING },
             miniLesson: { type: Type.STRING },
             guidedPractice: { type: Type.STRING },
             independentPractice: { type: Type.STRING },
             assessment: { type: Type.STRING },
             exitTicket: { type: Type.STRING },
          },
          required: ["objective", "warmUp", "miniLesson", "guidedPractice", "independentPractice", "assessment", "exitTicket"]
        }
      }
    });

    const json = JSON.parse(response.text || '{}');

    return {
      skillCode,
      targetGroup: targetGroup as any,
      duration: duration as any,
      objective: json.objective,
      lessonFlow: {
        warmUp: json.warmUp,
        miniLesson: json.miniLesson,
        guidedPractice: json.guidedPractice,
        independentPractice: json.independentPractice,
        assessment: json.assessment,
        exitTicket: json.exitTicket
      }
    };
  } catch (error) {
    console.error("AI Plan Gen Error", error);
    throw error;
  }
};

export const generateSmartGoal = async (skill: string, currentAccuracy: number, profile: TeacherProfile): Promise<SmartGoal> => {
  const prompt = `
    Create a SMART goal for a Grade ${profile.gradeLevel} student who scored ${currentAccuracy.toFixed(0)}% in "${skill}". 
    Subject: ${profile.subject}.
    The goal is to reach 80% accuracy in 2 weeks. Return JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            specific: { type: Type.STRING },
            measurable: { type: Type.STRING },
            achievable: { type: Type.STRING },
            relevant: { type: Type.STRING },
            timeBound: { type: Type.STRING },
            fullStatement: { type: Type.STRING },
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (e) {
    console.error(e);
    return {
        specific: "Improve " + skill,
        measurable: "80% accuracy",
        achievable: "With practice",
        relevant: "Core curriculum",
        timeBound: "2 weeks",
        fullStatement: `The student will improve proficiency in ${skill} to 80% within 2 weeks.`
    };
  }
};

export const generateWorksheet = async (skill: string, description: string, profile: TeacherProfile): Promise<string> => {
  const standardType = getStandardContext(profile.subject);

  const prompt = `
    Create a professional practice worksheet for Grade ${profile.gradeLevel} ${profile.subject} students.
    Focus Standard: "${skill}: ${description}" (${standardType}).
    
    Format:
    - Use Markdown.
    - IMPORTANT: Use LaTeX syntax for ALL math equations and symbols (enclose in single $ for inline, double $$ for block). Example: $2x + 5 = 10$.
    - Do NOT include a main "Title" header (H1) or Name/Date lines at the top; these will be added by the template.
    - Start directly with a centered sub-header if needed, or the Review section.
    
    Structure:
    1. **Quick Review**: Brief explanation of the concept suitable for Grade ${profile.gradeLevel}.
    2. **Guided Practice**: Part A. 3 simple problems with steps shown/explained.
    3. **Independent Practice**: Part B. 5 mixed difficulty problems suitable for this grade.
    4. **Challenge Problem**: Part C. 1 word problem/application.
    5. **Answer Key**: (At the very bottom, separated by a horizontal rule '---').
    
    Ensure clear separation between sections using '##' headers.
    Use bullet points or numbered lists for questions.
  `;
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt
  });

  return response.text || "Failed to generate worksheet.";
};

export const generateParentReport = async (
    studentName: string, 
    weakSkills: {code: string, desc: string}[],
    profile: TeacherProfile
): Promise<string> => {
    const skillsList = weakSkills.map(s => `${s.desc} (${s.code})`).join(", ");
    const prompt = `
      Write a supportive, parent-friendly report for student "${studentName}" in Grade ${profile.gradeLevel}.
      Teacher Name: ${profile.name}.
      Subject: ${profile.subject}.
      The student needs help with: ${skillsList}.
      
      Tone: Encouraging, partnership-oriented, professional.
      Structure: 
      - Summary of performance in ${profile.subject}
      - Specific Areas for growth (mentioning the skills)
      - How the school is helping (remedial sessions)
      - 3 simple things parents can do at home to support Grade ${profile.gradeLevel} ${profile.subject}.
      - Sign off with Teacher Name.
      Format: Markdown.
    `;
    
    const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt
    });

    return response.text || "Failed to generate report.";
};