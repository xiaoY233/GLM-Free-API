import _ from 'lodash';

import Request from '@/lib/request/Request.ts';
import Response from '@/lib/response/Response.ts';
import chat from '@/api/controllers/chat.ts';
import { createClaudeCompletion } from '@/api/controllers/claude-adapter.ts';

export default {

    prefix: '/v1',

    post: {

        '/messages': async (request: Request) => {
            request
                .validate('body.messages', _.isArray)
                .validate('body.model', _.isString)
                .validate('body.max_tokens', v => _.isUndefined(v) || _.isNumber(v))
                .validate('body.stream', v => _.isUndefined(v) || _.isBoolean(v))
                .validate('body.system', v => _.isUndefined(v) || _.isString(v) || _.isArray(v));

            // Get token from x-api-key header (Claude format) or Authorization header
            let authHeader = request.headers['x-api-key'] || request.headers.authorization;

            if (!authHeader) {
                throw new Error('Missing API key. Provide x-api-key header or Authorization header.');
            }

            // Ensure Bearer prefix
            if (!authHeader.startsWith('Bearer ')) {
                authHeader = 'Bearer ' + authHeader;
            }

            // Token split and random selection
            const tokens = chat.tokenSplit(authHeader);
            const token = _.sample(tokens);

            const { model, messages, system, stream, conversation_id: convId } = request.body;

            if (stream) {
                const claudeStream = await createClaudeCompletion(
                    model,
                    messages,
                    system,
                    token,
                    true,
                    convId
                );
                return new Response(claudeStream, {
                    type: "text/event-stream"
                });
            } else {
                const claudeResponse = await createClaudeCompletion(
                    model,
                    messages,
                    system,
                    token,
                    false,
                    convId
                );
                return claudeResponse;
            }
        }

    }

}