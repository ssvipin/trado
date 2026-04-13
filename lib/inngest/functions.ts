import { inngest } from "./client";
import { PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts";

export const sendSignUpEmail = inngest.createFunction(
    { id: 'sign-up-email', triggers: [{ event: 'app/user.created' }] },
    async ({ event, step }: { event: any; step: any }) => {
        const userProfile = `- country: ${event.data.country}
- investment goals: ${event.data.investmentGoals}
- risk tolerance: ${event.data.riskTolerance}
- preferred industry: ${event.data.preferredIndustry}
`
        const prompt = PERSONALIZED_WELCOME_EMAIL_PROMPT.replace("{{userProfile}}", userProfile)
        const response = await step.ai.infer('generate-welcome-intro', {
            model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
            body: {
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            }
        })
        await step.run('send-welcome-email', async () => {
            const part = response.candidates?.[0]?.content?.parts?.[0]
            return (part && 'text' in part ? part.text : null) || "Welcome to our trading app! We're excited to have you on board. If you have any questions or need assistance, feel free to reach out to our support team. Happy trading!"
        })
        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    });