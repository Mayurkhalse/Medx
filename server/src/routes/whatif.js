const express = require('express');
const router = express.Router();
const axios = require('axios');
const ChatHistory = require('../models/ChatHistory');
const Report = require('../models/Report');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

const GEMINI_API_KEY = process.env.LLM_API_KEY;

// POST /api/whatif/ask
router.post('/ask', verifyToken, async (req, res) => {
  const { sessionId, question } = req.body;

  if (!question || !sessionId) {
    return res.status(400).json({ message: 'Question and sessionId are required' });
  }

  try {
    // 1. Fetch user profile for personalization
    const userDetails = await User.findById(req.user.id).select('name dob gender');
    let userAge = 'N/A';
    if (userDetails && userDetails.dob) {
      const diffMs = Date.now() - new Date(userDetails.dob).getTime();
      const ageDate = new Date(diffMs);
      userAge = Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    const userProfileStr = `
User Profile Demographics:
- Name: ${userDetails ? userDetails.name : 'User'}
- Age: ${userAge}
- Gender: ${userDetails ? userDetails.gender || 'N/A' : 'N/A'}
`;

    // Fetch latest report context
    const latestReport = await Report.findOne({ userId: req.user.id }).sort({ reportDate: -1 });
    
    let reportContext = 'No blood report data available yet.';
    if (latestReport) {
      const getFlag = (k) => {
        const flags = latestReport.mlResult.flags;
        if (!flags) return 'normal';
        return typeof flags.get === 'function' ? flags.get(k) : flags[k];
      };

      const getRisk = (disease) => {
        const risks = latestReport.mlResult.diseaseRisks;
        if (!risks) return 0;
        const val = typeof risks.get === 'function' ? risks.get(disease) : risks[disease];
        return val || 0;
      };

      const parametersStr = Array.from(latestReport.parameters.entries())
        .map(([k, v]) => `- ${k}: ${v.value} ${v.unit || ''} (ref: ${v.ref_range || 'N/A'}) [Flag: ${getFlag(k) || 'normal'}]`)
        .join('\n');

      reportContext = `
Latest Blood Report Date: ${latestReport.reportDate.toISOString().split('T')[0]}
Overall Risk Score: ${latestReport.mlResult.overallRiskScore}/100
Risk Tier: ${latestReport.mlResult.riskTier}
Flags:
${parametersStr}
Predicted Disease Risk Probabilities:
- Anemia: ${getRisk('anemia') * 100}%
- Diabetes: ${getRisk('diabetes') * 100}%
- Kidney Dysfunction: ${getRisk('kidney_dysfunction') * 100}%
- Infection: ${getRisk('infection') * 100}%
`;
    }

    // 2. Fetch or create ChatHistory
    let chat = await ChatHistory.findOne({ userId: req.user.id, sessionId });
    if (!chat) {
      chat = await ChatHistory.create({
        userId: req.user.id,
        sessionId,
        messages: []
      });
    }

    // Append user question
    chat.messages.push({ role: 'user', content: question, timestamp: new Date() });

    // 3. Assemble prompt
    const systemPrompt = `You are MedX AI, a health-intelligence virtual assistant.
You MUST personalize every reply specifically to this user's current data.
Always address the user by name (${userDetails ? userDetails.name : 'User'}) and reference their specific demographic profile (Age: ${userAge}, Gender: ${userDetails ? userDetails.gender || 'N/A' : 'N/A'}).
Always ground your answers in their actual biomarker levels (like glucose, hemoglobin, etc.) and predicted disease risk probabilities.
Analyze the user's specific risk score (${latestReport ? latestReport.mlResult.overallRiskScore : 'N/A'}/100) and risk tier (${latestReport ? latestReport.mlResult.riskTier : 'N/A'}).
Keep answers highly tailored, informative, empathetic, and plain-spoken.
Provide general educational details about how diet, exercise, and habits affect their specific lab values.
IMPORTANT: You are NOT a doctor. You must include a subtle, clear medical disclaimer in your answer. Do not diagnose.

${userProfileStr}

Here is the user's latest blood report details:
${reportContext}

Respond to the user's latest question. Integrate their specific data points into your response.`;

    let assistantResponse = '';

    if (GEMINI_API_KEY && GEMINI_API_KEY !== 'mock-key') {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // Structure the history
        const contents = chat.messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        }));
        
        // Add the system prompt context to the last message or as a systemInstruction
        const response = await axios.post(geminiUrl, {
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          }
        });
        
        assistantResponse = response.data.candidates[0].content.parts[0].text;
      } catch (geminiError) {
        console.error('Gemini API request failed, running mock response:', geminiError.message);
        assistantResponse = getMockResponse(question, latestReport, userDetails ? userDetails.name : 'User');
      }
    } else {
      assistantResponse = getMockResponse(question, latestReport, userDetails ? userDetails.name : 'User');
    }

    // Save assistant response
    chat.messages.push({ role: 'assistant', content: assistantResponse, timestamp: new Date() });
    await chat.save();

    res.status(200).json({ response: assistantResponse, chat });
  } catch (error) {
    res.status(500).json({ message: 'Error processing What-If question', error: error.message });
  }
});

// GET /api/whatif/history/:sessionId
router.get('/history/:sessionId', verifyToken, async (req, res) => {
  try {
    const chat = await ChatHistory.findOne({ userId: req.user.id, sessionId: req.params.sessionId });
    if (!chat) {
      return res.status(200).json({ messages: [] });
    }
    res.status(200).json(chat);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving chat history', error: error.message });
  }
});

// Helper for Mock responses if API key is not configured or fails
function getMockResponse(question, report, userName) {
  const q = question.toLowerCase();
  let advice = '';

  const disclaimer = "\n\n*Disclaimer: I am an AI assistant providing general educational insights based on your report. This is not medical advice. Please consult your physician before making any major changes to your healthcare regime.*";

  if (!report) {
    return `Hello ${userName}, I don't see any blood report on file yet. Please upload a report or log your lab values in the Dashboard so I can give you personalized 'What If' insights!` + disclaimer;
  }

  const glucose = report.parameters.get('glucose_fasting')?.value || 90;
  const hb = report.parameters.get('hemoglobin')?.value || 14;

  const intro = `Hi ${userName}, looking at your latest biomarkers: `;

  if (q.includes('step') || q.includes('walk') || q.includes('exercise')) {
    advice = intro + "Increasing physical activity, such as walking 10k steps a day, helps improve insulin sensitivity and glucose clearance. ";
    if (glucose > 100) {
      advice += `Since your Fasting Glucose is currently ${glucose} mg/dL (which is flagged as high), regular walking can help lower this value over 3-6 months. It could potentially lower your predicted Diabetes risk of ${Math.round(report.mlResult.diseaseRisks.get('diabetes') * 100)}% down to a normal range.`;
    } else {
      advice += "Your glucose is currently in a healthy range, and walking will help maintain cardiovascular health and keep your overall risk score low.";
    }
  } else if (q.includes('diet') || q.includes('sugar') || q.includes('eat')) {
    advice = intro + "Dietary changes have a direct impact on your blood values. Reducing simple carbohydrates and refined sugars will decrease fasting glucose peaks. ";
    if (glucose > 100) {
      advice += `With your current glucose level at ${glucose} mg/dL, replacing processed food with high-fiber grains and lean proteins can help normalize your blood sugar levels and reduce metabolic stress.`;
    } else {
      advice += "Your glucose level is stable, so eating a balanced diet rich in leafy greens, fiber, and lean proteins is ideal to keep your parameters stable.";
    }
  } else if (q.includes('iron') || q.includes('spinach') || q.includes('fatigue') || q.includes('tired')) {
    if (hb < 12) {
      advice = intro + `Your Hemoglobin is currently low at ${hb} g/dL, indicating a mild Anemia risk (${Math.round(report.mlResult.diseaseRisks.get('anemia') * 100)}%). Eating iron-rich foods (like spinach, lentils, red meat) combined with Vitamin C (which aids absorption) can help raise hemoglobin levels.`;
    } else {
      advice = intro + `Your Hemoglobin is in the normal range (${hb} g/dL). If you are feeling tired, it may be due to sleep, hydration, or other lifestyle factors rather than anemia.`;
    }
  } else {
    advice = intro + `Based on your overall risk score of ${report.mlResult.overallRiskScore}/100, maintaining regular physical exercise, eating a fiber-rich balanced diet, and staying hydrated are key to keeping your overall risk score low. Let me know if you want to explore the effect of any specific health habit!`;
  }

  return advice + disclaimer;
}

module.exports = router;
