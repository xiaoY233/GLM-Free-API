import { PassThrough } from "stream";
import _ from "lodash";
import chat from "@/api/controllers/chat.ts";
import util from "@/lib/util.ts";
import logger from "@/lib/logger.ts";

const MODEL_NAME = "glm";

/**
 * Convert Gemini contents format to GLM format
 * 
 * @param contents Gemini contents array
 * @param systemInstruction Optional system instruction
 */
export function convertGeminiToGLM(contents: any[], systemInstruction?: any): any[] {
    const glmMessages: any[] = [];

    // Handle system instruction
    let systemText = "";
    if (systemInstruction) {
        if (typeof systemInstruction === "string") {
            systemText = systemInstruction;
        } else if (systemInstruction.parts) {
            systemText = systemInstruction.parts
                .filter((part: any) => part.text)
                .map((part: any) => part.text)
                .join("\n");
        }
    }

    let systemPrepended = false;

    for (const content of contents) {
        const role = content.role === "model" ? "assistant" : "user";

        // Extract text from parts
        let text = "";
        if (content.parts && Array.isArray(content.parts)) {
            text = content.parts
                .filter((part: any) => part.text)
                .map((part: any) => part.text)
                .join("\n");
        }

        // Prepend system instruction to first user message
        if (role === "user" && systemText && !systemPrepended) {
            text = `${systemText}\n\n${text}`;
            systemPrepended = true;
        }

        glmMessages.push({
            role: role,
            content: text
        });
    }

    return glmMessages;
}

/**
 * Convert GLM response to Gemini format
 * 
 * @param glmResponse GLM response object
 */
export function convertGLMToGemini(glmResponse: any): any {
    const content = glmResponse.choices[0].message.content;

    return {
        candidates: [
            {
                content: {
                    parts: [
                        {
                            text: content
                        }
                    ],
                    role: "model"
                },
                finishReason: glmResponse.choices[0].finish_reason === "stop" ? "STOP" : "MAX_TOKENS",
                index: 0,
                safetyRatings: []
            }
        ],
        usageMetadata: {
            promptTokenCount: glmResponse.usage?.prompt_tokens || 0,
            candidatesTokenCount: glmResponse.usage?.completion_tokens || 0,
            totalTokenCount: glmResponse.usage?.total_tokens || 0
        }
    };
}

/**
 * Convert GLM stream to Gemini SSE format
 * 
 * @param glmStream GLM stream
 */
export function convertGLMStreamToGemini(glmStream: any): PassThrough {
    const transStream = new PassThrough();
    let contentBuffer = "";

    glmStream.on("data", (chunk: Buffer) => {
        const lines = chunk.toString().split("\n");

        for (const line of lines) {
            if (!line.trim() || line.trim() === "data: [DONE]") continue;

            if (line.startsWith("data: ")) {
                try {
                    const data = JSON.parse(line.slice(6));

                    if (data.choices && data.choices[0]) {
                        const delta = data.choices[0].delta;

                        // Handle content delta
                        if (delta.content) {
                            contentBuffer += delta.content;
                            const geminiChunk = {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                {
                                                    text: delta.content
                                                }
                                            ],
                                            role: "model"
                                        },
                                        finishReason: null,
                                        index: 0,
                                        safetyRatings: []
                                    }
                                ]
                            };
                            transStream.write(`data: ${JSON.stringify(geminiChunk)}\n\n`);
                        }

                        // Handle finish
                        if (data.choices[0].finish_reason) {
                            const finalChunk = {
                                candidates: [
                                    {
                                        content: {
                                            parts: [
                                                {
                                                    text: ""
                                                }
                                            ],
                                            role: "model"
                                        },
                                        finishReason: "STOP",
                                        index: 0,
                                        safetyRatings: []
                                    }
                                ],
                                usageMetadata: {
                                    promptTokenCount: 1,
                                    candidatesTokenCount: 1,
                                    totalTokenCount: 2
                                }
                            };
                            transStream.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
                            transStream.end();
                        }
                    }
                } catch (err) {
                    logger.error(`Error parsing stream chunk: ${err}`);
                }
            }
        }
    });

    glmStream.on("error", (err: any) => {
        logger.error(`GLM stream error: ${err}`);
        transStream.end();
    });

    glmStream.on("close", () => {
        if (!transStream.closed) {
            transStream.end();
        }
    });

    return transStream;
}

/**
 * Create Gemini completion using GLM backend
 * 
 * @param model Model name
 * @param contents Gemini contents
 * @param systemInstruction Optional system instruction
 * @param refreshToken GLM refresh token
 * @param stream Whether to stream
 * @param conversationId Optional conversation ID
 */
export async function createGeminiCompletion(
    model: string,
    contents: any[],
    systemInstruction: any,
    refreshToken: string,
    stream: boolean = false,
    conversationId?: string
): Promise<any | PassThrough> {
    try {
        // Convert Gemini format to GLM format
        const glmMessages = convertGeminiToGLM(contents, systemInstruction);

        if (stream) {
            // Create streaming completion
            const glmStream = await chat.createCompletionStream(
                glmMessages,
                refreshToken,
                model,
                conversationId
            );
            
            // Convert GLM stream to Gemini SSE format
            return convertGLMStreamToGemini(glmStream);
        } else {
            // Create regular completion
            const glmResponse = await chat.createCompletion(
                glmMessages,
                refreshToken,
                model,
                conversationId
            );

            // Convert GLM response to Gemini format
            return convertGLMToGemini(glmResponse);
        }
    } catch (error) {
        logger.error(`Error creating Gemini completion: ${error}`);
        throw error;
    }
}