import { getAllUsersForNewsDelivery } from "../actions/user.actions";
import { sendNewsSummaryEmail, sendWelcomeEmail } from "../nodemailer";
import { inngest } from "./client";
import { NEWS_SUMMARY_EMAIL_PROMPT, PERSONALIZED_WELCOME_EMAIL_PROMPT } from "./prompts";
import { getWatchlistSymbolsByEmail } from "../actions/watchlist.actions";
import { getNews } from "../actions/finnhub.actions";
import { model } from "mongoose";
import { getFormattedTodayDate } from "../utils";

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
            const introText = (part && 'text' in part ? part.text : null) || "Welcome to our trading app! We're excited to have you on board. If you have any questions or need assistance, feel free to reach out to our support team. Happy trading!"

            return await sendWelcomeEmail({
                email: event.data.email,
                name: event.data.name,
                intro: introText
            })
        })
        return {
            success: true,
            message: 'Welcome email sent successfully'
        }
    });

export const sendDailyNewsSummary = inngest.createFunction(
    { id: 'daily-news-summary', triggers: [{ event: 'app/daily.news.summary' }, { cron: '0 12 * * *' }] },
    async ({ event, step }: { event: any; step: any }) => {
        // step 1: get all user for news delivery
        const users = await step.run('get-all-users', getAllUsersForNewsDelivery);

        if (!users || users.length === 0) return { success: false, message: 'No users found for news delivery' };



        // step 2: fetch personalized news for each user using AI
        const results = await step.run('fetch-user-news', async () => {
            const perUser: Array<{ user: User; articles: MarketNewsArticle[] }> = [];
            for (const user of users as User[]) {
                try {
                    const symbols = await getWatchlistSymbolsByEmail(user.email);
                    let articles = await getNews(symbols);
                    // Enforce max 6 articles per user
                    articles = (articles || []).slice(0, 6);
                    // If still empty, fallback to general
                    if (!articles || articles.length === 0) {
                        articles = await getNews();
                        articles = (articles || []).slice(0, 6);
                    }
                    perUser.push({ user, articles });
                } catch (e) {
                    console.error('daily-news: error preparing user news', user.email, e);
                    perUser.push({ user, articles: [] });
                }
            }
            return perUser;
        });

        // step 3: summarize news using AI
        const userNewsSummaries: { user: User; newsContent: string | null; }[] = [];
        for (const { user, articles } of results) {
            try {
                const prompts = NEWS_SUMMARY_EMAIL_PROMPT.replace('{{newsData}}', JSON.stringify(articles, null, 2));

                const response = await step.ai.infer(`summarize-news-${user.email}`, {
                    model: step.ai.models.gemini({ model: 'gemini-2.5-flash-lite' }),
                    body: {
                        contents: [
                            {
                                role: 'user',
                                parts: [
                                    { text: prompts }
                                ]
                            }
                        ]
                    }
                })
                const part = response.candidates?.[0]?.content?.parts?.[0];
                const newsContent = (part && 'text' in part ? part.text : null) || 'No market news';
                userNewsSummaries.push({ user, newsContent });
            } catch (e) {
                console.error('daily-news: error summarizing news for', user.email, e);
                userNewsSummaries.push({ user, newsContent: null });
            }
        }
        // step 4: send email to each user with the news summary
        await step.run('send-news-emails', async () => {
            await Promise.all(
                userNewsSummaries.map(async ({ user, newsContent }) => {
                    if (!newsContent) return false;
                    try {
                        await sendNewsSummaryEmail({
                            email: user.email,
                            date: getFormattedTodayDate(),
                            newsContent
                        })
                    } catch (e) {
                        console.error('daily-news: error sending news email to', user.email, e);
                    }
                })
            )
        })

        return {
            success: true,
            message: 'Daily news summary sent successfully'
        }
    });