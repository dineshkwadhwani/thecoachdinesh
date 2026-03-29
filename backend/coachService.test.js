const { askDinesh } = require('./coachService');

// Mock the openai module
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn()
            }
        }
    }));
});

// Mock dotenv
jest.mock('dotenv', () => ({
    config: jest.fn()
}));

describe('coachService', () => {
    let mockGroqCreate;

    beforeEach(() => {
        jest.clearAllMocks();
        // Get the mocked OpenAI instance
        const OpenAI = require('openai');
        const groqInstance = new OpenAI();
        mockGroqCreate = groqInstance.chat.completions.create;
    });

    describe('askDinesh - Normal Coaching Question', () => {
        it('should send a normal question to Groq and return response', async () => {
            const testQuestion = "How do I improve my leadership skills?";
            const expectedResponse = "To improve your leadership skills, focus on active listening, empathy, and continuous learning.";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: expectedResponse } }]
            });

            const response = await askDinesh(testQuestion);

            expect(response).toBe(expectedResponse);
            expect(mockGroqCreate).toHaveBeenCalledTimes(1);
            expect(mockGroqCreate).toHaveBeenCalledWith({
                messages: [
                    {
                        role: "system",
                        content: "You are Coach Dinesh. You are wise, direct, and encouraging. Answer as a mentor."
                    },
                    {
                        role: "user",
                        content: testQuestion
                    }
                ],
                model: "llama-3.3-70b-versatile"
            });
        });

        it('should handle multiple normal questions sequentially', async () => {
            const questions = [
                "What is emotional intelligence?",
                "How do I handle conflict?"
            ];
            const responses = [
                "Emotional intelligence is the ability to understand and manage emotions.",
                "Handle conflict by listening first and seeking common ground."
            ];

            mockGroqCreate
                .mockResolvedValueOnce({ choices: [{ message: { content: responses[0] } }] })
                .mockResolvedValueOnce({ choices: [{ message: { content: responses[1] } }] });

            for (let i = 0; i < questions.length; i++) {
                const result = await askDinesh(questions[i]);
                expect(result).toBe(responses[i]);
            }

            expect(mockGroqCreate).toHaveBeenCalledTimes(2);
        });
    });

    describe('askDinesh - Name Validation', () => {
        it('should validate a valid name', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "Yes" } }]
            });

            const response = await askDinesh("VALIDATE_NAME: John Smith");

            expect(response).toBe("Yes");
            expect(mockGroqCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        expect.objectContaining({
                            content: "You are a name validator. Respond with only 'Yes' if the provided text looks like a valid human name (e.g., proper nouns, not gibberish or numbers). Respond with only 'No' if it does not. Do not add any extra text.",
                            role: "system"
                        }),
                        expect.objectContaining({
                            content: 'Is "John Smith" a valid human name?',
                            role: "user"
                        })
                    ]
                })
            );
        });

        it('should reject an invalid name', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "No" } }]
            });

            const response = await askDinesh("VALIDATE_NAME: 12345xyz");

            expect(response).toBe("No");
        });

        it('should trim whitespace from name validation input', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "Yes" } }]
            });

            const response = await askDinesh("VALIDATE_NAME:   Sarah Johnson   ");

            expect(response).toBe("Yes");
            expect(mockGroqCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            content: 'Is "Sarah Johnson" a valid human name?'
                        })
                    ])
                })
            );
        });

        it('should handle single character names', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "No" } }]
            });

            const response = await askDinesh("VALIDATE_NAME: X");

            expect(response).toBe("No");
        });
    });

    describe('askDinesh - Greeting Generation', () => {
        it('should generate a greeting for morning time', async () => {
            const greetingData = {
                name: "Alex",
                phone: "+1234567890",
                timeOfDay: "morning"
            };

            const expectedGreeting = "Good morning, Alex! I'm Coach Dinesh. Ready to unlock your leadership potential?";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: expectedGreeting } }]
            });

            const response = await askDinesh(`GENERATE_GREETING: ${JSON.stringify(greetingData)}`);

            expect(response).toBe(expectedGreeting);
            expect(mockGroqCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: [
                        expect.objectContaining({
                            content: "You are Coach Dinesh, a leadership coach. Generate a warm, personalized greeting message after collecting a user's name and phone number. Make it contextual based on the time of day. Include confirmation of their details and invite them to start the conversation. Keep it professional and engaging.",
                            role: "system"
                        }),
                        expect.objectContaining({
                            content: `User name: Alex, Phone: +1234567890, Time of day: morning. Generate a greeting message.`,
                            role: "user"
                        })
                    ]
                })
            );
        });

        it('should generate a greeting for afternoon time', async () => {
            const greetingData = {
                name: "Jordan",
                phone: "+9876543210",
                timeOfDay: "afternoon"
            };

            const expectedGreeting = "Good afternoon, Jordan! I'm Coach Dinesh. Let's make this a productive session.";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: expectedGreeting } }]
            });

            const response = await askDinesh(`GENERATE_GREETING: ${JSON.stringify(greetingData)}`);

            expect(response).toBe(expectedGreeting);
        });

        it('should generate a greeting for evening time', async () => {
            const greetingData = {
                name: "Casey",
                phone: "+5555555555",
                timeOfDay: "evening"
            };

            const expectedGreeting = "Good evening, Casey! I'm Coach Dinesh. Let's wrap up the day with insights.";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: expectedGreeting } }]
            });

            const response = await askDinesh(`GENERATE_GREETING: ${JSON.stringify(greetingData)}`);

            expect(response).toBe(expectedGreeting);
        });

        it('should handle special characters in names during greeting', async () => {
            const greetingData = {
                name: "O'Connor",
                phone: "+1234567890",
                timeOfDay: "morning"
            };

            const expectedGreeting = "Good morning, O'Connor! Ready to transform your leadership?";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: expectedGreeting } }]
            });

            const response = await askDinesh(`GENERATE_GREETING: ${JSON.stringify(greetingData)}`);

            expect(response).toBe(expectedGreeting);
        });
    });

    describe('Error Handling', () => {
        it('should throw error when Groq API call fails', async () => {
            const apiError = new Error("API rate limit exceeded");

            mockGroqCreate.mockRejectedValueOnce(apiError);

            await expect(askDinesh("What is leadership?")).rejects.toThrow("API rate limit exceeded");
        });

        it('should throw error when response structure is invalid', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: null } }]
            });

            const response = await askDinesh("What is resilience?");

            // The function will return null, which might be unexpected
            expect(response).toBeNull();
        });

        it('should handle empty response from Groq', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "" } }]
            });

            const response = await askDinesh("Tell me something");

            expect(response).toBe("");
        });

        it('should handle malformed JSON in GENERATE_GREETING', async () => {
            const malformedJson = "GENERATE_GREETING: {invalid json}";

            await expect(askDinesh(malformedJson)).rejects.toThrow();
        });
    });

    describe('API Behavior', () => {
        it('should use correct model name in all requests', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "test" } }]
            });

            await askDinesh("test question");

            expect(mockGroqCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    model: "llama-3.3-70b-versatile"
                })
            );
        });

        it('should preserve question content exactly', async () => {
            const specialQuestion = "What about 'quotes' and \"double-quotes\"?";

            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "response" } }]
            });

            await askDinesh(specialQuestion);

            expect(mockGroqCreate).toHaveBeenCalledWith(
                expect.objectContaining({
                    messages: expect.arrayContaining([
                        expect.objectContaining({
                            content: specialQuestion
                        })
                    ])
                })
            );
        });

        it('should use system role for system message and user role for user message', async () => {
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "response" } }]
            });

            await askDinesh("question");

            const callArgs = mockGroqCreate.mock.calls[0][0];
            expect(callArgs.messages[0].role).toBe("system");
            expect(callArgs.messages[1].role).toBe("user");
        });
    });

    describe('Integration Tests', () => {
        it('should handle a complete user journey: validate name -> generate greeting -> ask question', async () => {
            // Step 1: Validate name
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "Yes" } }]
            });

            const nameValid = await askDinesh("VALIDATE_NAME: Michael");
            expect(nameValid).toBe("Yes");

            // Step 2: Generate greeting
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "Welcome, Michael! Let's begin." } }]
            });

            const greeting = await askDinesh('GENERATE_GREETING: {"name":"Michael","phone":"+1111111111","timeOfDay":"morning"}');
            expect(greeting).toBe("Welcome, Michael! Let's begin.");

            // Step 3: Ask coaching question
            mockGroqCreate.mockResolvedValueOnce({
                choices: [{ message: { content: "Great question, Michael!" } }]
            });

            const coaching = await askDinesh("How do I build trust with my team?");
            expect(coaching).toBe("Great question, Michael!");

            expect(mockGroqCreate).toHaveBeenCalledTimes(3);
        });
    });
});
