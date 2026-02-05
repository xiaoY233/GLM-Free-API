import _ from 'lodash';

// 支持的模型列表，基于官方API返回的模型
const SUPPORTED_MODELS = [
    {
        "id": "glm-4.7",
        "name": "GLM-4.7",
        "object": "model",
        "owned_by": "glm-free-api",
        "description": "高智能旗舰 - 通用对话、推理与智能体能力上实现全面升级 - 编程更强、更稳、审美更好"
    },
    {
        "id": "glm-4.6v",
        "name": "GLM-4.6v",
        "object": "model",
        "owned_by": "glm-free-api",
        "description": "超强性能 - 上下文提升至200K - 高级编码能力、强大推理以及工具调用能力"
    },
    {
        "id": "glm-4.6",
        "name": "GLM-4.6",
        "object": "model",
        "owned_by": "glm-free-api",
        "description": "超强性能 - 上下文提升至200K - 高级编码能力、强大推理以及工具调用能力"
    }
];

export default {

    prefix: '/v1',

    get: {
        '/models': async () => {
            return {
                "data": SUPPORTED_MODELS
            };
        }

    }
}

// 导出模型验证函数
export function isValidModel(modelId: string): boolean {
    return SUPPORTED_MODELS.some(model => model.id === modelId);
}

// 导出默认模型
export const DEFAULT_MODEL = "glm-4.6";