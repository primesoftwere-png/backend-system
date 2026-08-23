import { GoogleGenAI } from '@google/genai';
import Inquiry from '../models/Inquiry.js';

// Note: Ensure GEMINI_API_KEY is set in your .env file
let geminiClient = null;

const getGemini = () => {
    if (!geminiClient) {
        geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return geminiClient;
};

// Define priority list of Gemini models
const GEMINI_MODELS = [
    'gemini-3.1-pro-preview',
    'gemini-3.5-flash-lite',
    'gemini-3.7-flash',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-1.5-pro',
    'gemini-1.5-flash'
];

const SYSTEM_PROMPT = `You are a highly enthusiastic and professional AI sales assistant for a top-tier Web & Mobile App Developer's portfolio. Your PRIMARY GOAL is to get visitors excited about building an app or website, understand their needs, and guide them to submit their contact details so the developer can send them a proposal.

PERSONALITY:
- Be warm, energetic, and genuinely excited about every project idea 🚀
- Use occasional emojis to keep the tone friendly (but not too many)
- Sound like a knowledgeable tech consultant, NOT a generic chatbot
- Be confident — always show that YOU (the developer) can build whatever they need

CONVERSATION STRATEGY (follow this flow naturally):
1. GREET & DISCOVER: Ask what kind of project they're interested in (app, website, both?)
2. UNDERSTAND NEEDS: Ask about their industry/business, target audience, key features they want
3. RECOMMEND & EXCITE: Based on their answers, recommend specific solutions (e.g., "A cross-platform React Native app with payment integration would be perfect for your e-commerce store!")
4. CREATE URGENCY: Mention benefits like fast delivery, modern tech stack, competitive pricing, ongoing support
5. COLLECT DETAILS: When they seem interested, naturally ask for their name, email, and phone number to send a personalized proposal/quote
6. CONFIRM & CLOSE: Once you have their details, confirm the inquiry is submitted and they'll hear back soon

SERVICES TO ACTIVELY PROMOTE:
- Custom Web Apps: Business sites, SaaS platforms, E-commerce stores, Admin dashboards, Landing pages
- Mobile Apps: Android, iOS, Cross-platform (React Native), E-commerce apps, Booking apps, Social apps
- Backend Development: REST APIs, Authentication systems, Database design, Payment gateway integration
- AI Features: Chatbots, AI assistants, Smart recommendations, Automated workflows
- Tech Stack: React, Next.js, TypeScript, Tailwind CSS, Node.js, Express, MongoDB, MySQL, React Native

OFFERS & VALUE PROPOSITIONS (use these to persuade):
- "We use the latest tech stack for blazing-fast performance"
- "Cross-platform apps save you 40-50% compared to building separate Android and iOS apps"
- "Free consultation and project roadmap included"
- "Dedicated support even after project delivery"
- "Scalable architecture that grows with your business"

COLLECTING CONTACT DETAILS:
- When the visitor shows clear interest (asks about pricing, timeline, wants to proceed, or says something like "let's do it", "I'm interested", "how do I start"), naturally ask:
  "I'd love to get you a personalized proposal! Could you share your name, email, and phone number? 📩"
- Be flexible — they might give details all at once or one at a time. Collect whatever they provide.
- If they only give partial info, ask for the missing pieces naturally.

CRITICAL RULES:
1. Keep responses SHORT — 1-3 sentences max for normal replies. Use bullet points for lists (max 3-5 items).
2. NEVER make up specific prices, timelines, client names, or past project details. Say "It depends on scope" or "I'll include that in your custom quote."
3. ALWAYS steer the conversation toward collecting their contact details.
4. Do NOT be pushy — be helpful first, then guide them naturally.
5. If someone asks unrelated questions, answer briefly and redirect: "Great question! By the way, are you working on any project I can help with? 😊"

INQUIRY SUBMISSION:
When you have collected the visitor's contact information (at minimum: name and email), include this EXACT format at the END of your response (the visitor won't see this, it's for the system):

[INQUIRY_DATA]{"name":"visitor name","email":"visitor@email.com","phone":"phone if provided","subject":"brief project type","message":"summary of what they want built"}[/INQUIRY_DATA]

Rules for INQUIRY_DATA:
- "name" and "email" are REQUIRED. Do NOT generate the tag without both.
- "phone" is optional — include it only if the visitor provided it, otherwise omit the field entirely.
- "subject" should be a short label like "E-commerce Mobile App", "Business Website", "SaaS Dashboard", etc.
- "message" should be a 1-2 sentence summary of the project requirements discussed in the conversation.
- Only output [INQUIRY_DATA] ONCE per conversation. If you already submitted it, do NOT submit again.
- Place [INQUIRY_DATA] at the very end of your message, after your visible reply text.`;

/**
 * Extracts inquiry data from the AI response if present
 * Returns { cleanText, inquiryData } where inquiryData is null if not found
 */
const extractInquiryData = (responseText) => {
    const regex = /\[INQUIRY_DATA\](.*?)\[\/INQUIRY_DATA\]/s;
    const match = responseText.match(regex);

    if (!match) {
        return { cleanText: responseText.trim(), inquiryData: null };
    }

    try {
        const inquiryData = JSON.parse(match[1].trim());
        // Remove the inquiry tag from the visible text
        const cleanText = responseText.replace(regex, '').trim();
        return { cleanText, inquiryData };
    } catch (error) {
        console.error('Failed to parse inquiry data from AI response:', error.message);
        const cleanText = responseText.replace(regex, '').trim();
        return { cleanText, inquiryData: null };
    }
};

/**
 * Saves an inquiry to the database using the existing Inquiry model
 */
const saveInquiry = async (inquiryData) => {
    try {
        // Validate required fields
        if (!inquiryData.name || !inquiryData.email) {
            console.error('Inquiry missing required fields (name or email)');
            return null;
        }

        const inquiry = await Inquiry.create({
            name: inquiryData.name,
            email: inquiryData.email,
            phone: inquiryData.phone || '',
            subject: inquiryData.subject || 'AI Chat Inquiry',
            message: inquiryData.message || 'Inquiry submitted via AI chatbot',
        });

        console.log(`AI Chatbot auto-created inquiry: ${inquiry._id} for ${inquiryData.email}`);
        return inquiry;
    } catch (error) {
        console.error('Failed to save AI chatbot inquiry:', error.message);
        return null;
    }
};

/**
 * @desc    Generate chatbot response with priority fallback using multiple Gemini models
 * @route   POST /api/chat
 * @access  Public (or Private depending on your needs)
 */
export const generateChatResponse = async (req, res) => {
    try {
        const { message, conversation } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message to generate a response.',
            });
        }

        // Format conversation history for Gemini
        let chatContents = [];
        if (conversation && Array.isArray(conversation)) {
            chatContents = conversation.map(msg => ({
                role: (msg.role === 'assistant' || msg.role === 'model') ? 'model' : 'user',
                parts: [{ text: msg.content || msg.text || '' }]
            }));
        }

        // Append the current message
        chatContents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        const gemini = getGemini();
        let lastError = null;

        // Iterate through models in priority order
        for (const model of GEMINI_MODELS) {
            try {
                console.log(`Attempting to generate response using model: ${model}`);
                
                const response = await gemini.models.generateContent({
                    model: model,
                    contents: chatContents,
                    config: {
                        systemInstruction: SYSTEM_PROMPT
                    }
                });

                const rawText = response.text;

                // Extract inquiry data if the AI collected contact details
                const { cleanText, inquiryData } = extractInquiryData(rawText);

                // Build the API response
                const apiResponse = {
                    success: true,
                    provider: 'gemini',
                    modelUsed: model,
                    data: cleanText,
                };

                // If the AI collected inquiry data, auto-save it
                if (inquiryData) {
                    const savedInquiry = await saveInquiry(inquiryData);
                    if (savedInquiry) {
                        apiResponse.inquirySubmitted = true;
                        apiResponse.inquiryId = savedInquiry._id;
                    }
                }

                return res.status(200).json(apiResponse);
            } catch (error) {
                console.error(`Model ${model} failed:`, error.message);
                lastError = error;
                // Continue to the next model in the array
            }
        }

        // If all models failed, return an error response
        console.error('All Gemini models failed to generate a response.');
        return res.status(500).json({
            success: false,
            message: 'All AI models failed to generate a response.',
            error: lastError ? lastError.message : 'Unknown error',
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server Error during chat generation.',
            error: error.message,
        });
    }
};
