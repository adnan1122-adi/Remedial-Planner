import { GoogleGenAI, Type } from "@google/genai";
import { RemedialPlan, SmartGoal, TeacherProfile } from '../types';

// Access the injected API key
// The build process (vite.config.ts) replaces process.env.API_KEY with the actual string
const apiKey = process.env.API_KEY || ''; 

// Initialize AI Client
const ai = new GoogleGenAI({ apiKey });

const modelName = 'gemini-2.5-flash';

// Helper to validate key before calls
const checkApiKey = () => {
  if (!apiKey || apiKey.trim() === '') {
    console.error("RemedialAI: API Key is missing or empty.");
    throw new Error("API Key is missing. Please check your Vercel Environment Variables (Settings > Environment Variables > API_KEY).");
  }
  // Debug log (masked) to verify key presence in browser console
  console.log("RemedialAI: API Key loaded (" + apiKey.substring(0, 4) + "...)");
};

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
  checkApiKey();
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
  } catch (error: any) {
    console.error("AI Plan Gen Error", error);
    throw new Error(error.message || "Failed to generate remedial plan");
  }
};

export const generateSmartGoal = async (skill: string, currentAccuracy: number, profile: TeacherProfile): Promise<SmartGoal> => {
  checkApiKey();
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
    // Fallback if AI fails (e.g. quota)
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
  checkApiKey();
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
  
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt
    });

    return response.text || "Failed to generate worksheet.";
  } catch (error: any) {
    console.error("AI Worksheet Gen Error", error);
    throw new Error(error.message || "Failed to generate worksheet");
  }
};

export const generateParentReport = async (
    studentName: string, 
    weakSkills: {code: string, desc: string}[],
    profile: TeacherProfile
): Promise<string> => {
    checkApiKey();
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
    
    try {
        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt
        });

        return response.text || "Failed to generate report.";
    } catch (error: any) {
        console.error("AI Report Gen Error", error);
        throw new Error(error.message || "Failed to generate report");
    }
};