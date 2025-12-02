import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import chat from '@/api/controllers/chat.ts';
import { createGeminiCompletion } from '@/api/controllers/gemini-adapter.ts';

export default {

    prefix: '/v1beta',

    get: {
        '/models': async () => {
            return {
                models: [
                    {
                        name: 'models/gemini-1.5-pro',
                        displayName: 'Gemini 1.5 Pro',
                        description: 'Most capable model for complex reasoning tasks',
                        inputTokenLimit: 2097152,
                        outputTokenLimit: 8192,
                        supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
                    },
                    {
                        name: 'models/gemini-1.5-flash',
                        displayName: 'Gemini 1.5 Flash',
                        description: 'Fast model for high throughput',
                        inputTokenLimit: 1048576,
                        outputTokenLimit: 8192,
                        supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
                    },
                    {
                        name: 'models/gemini-pro',
                        displayName: 'Gemini Pro',
                        description: 'Previous generation model',
                        inputTokenLimit: 32768,
                        outputTokenLimit: 2048,
                        supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
                    },
                    {
                        name: 'models/glm-4',
                        displayName: 'GLM-4',
                        description: 'GLM chat model via adapter',
                        inputTokenLimit: 32768,
                        outputTokenLimit: 8192,
                        supportedGenerationMethods: ['generateContent', 'streamGenerateContent']
                    }
                ]
            };
        }
    },

    post: {

        // Gemini generateContent endpoint
        '/models/:model\\:generateContent': async (request: Request) => {
            request
                .validate('body.contents', _.isArray)
                .validate('body.systemInstruction', v => _.isUndefined(v) || _.isObject(v) || _.isString(v));

            // Get token from x-goog-api-key header (Gemini format) or Authorization header
            let authHeader = request.headers['x-goog-api-key'] || request.headers.authorization;

            if (!authHeader) {
                throw new Error('Missing API key. Provide x-goog-api-key header or Authorization header.');
            }

            // Ensure Bearer prefix
            if (!authHeader.startsWith('Bearer ')) {
                authHeader = 'Bearer ' + authHeader;
            }

            // Token split and random selection
            const tokens = chat.tokenSplit(authHeader);
            const token = _.sample(tokens);

            const model = request.params.model || 'gemini-pro';
            const { contents, systemInstruction, conversation_id: convId } = request.body;

            const geminiResponse = await createGeminiCompletion(
                model,
                contents,
                systemInstruction,
                token,
                false,
                convId
            );
            return geminiResponse;
        },

        // Gemini streamGenerateContent endpoint
        '/models/:model\\:streamGenerateContent': async (request: Request) => {
            request
                .validate('body.contents', _.isArray)
                .validate('body.systemInstruction', v => _.isUndefined(v) || _.isObject(v) || _.isString(v));

            // Get token from x-goog-api-key header (Gemini format) or Authorization header
            let authHeader = request.headers['x-goog-api-key'] || request.headers.authorization;

            if (!authHeader) {
                throw new Error('Missing API key. Provide x-goog-api-key header or Authorization header.');
            }

            // Ensure Bearer prefix
            if (!authHeader.startsWith('Bearer ')) {
                authHeader = 'Bearer ' + authHeader;
            }

            // Token split and random selection
            const tokens = chat.tokenSplit(authHeader);
            const token = _.sample(tokens);

            const model = request.params.model || 'gemini-pro';
            const { contents, systemInstruction, conversation_id: convId } = request.body;

            const geminiStream = await createGeminiCompletion(
                model,
                contents,
                systemInstruction,
                token,
                true,
                convId
            );
            return new Response(geminiStream, {
                type: "text/event-stream"
            });
        }

    }

}