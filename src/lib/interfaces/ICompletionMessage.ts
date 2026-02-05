export default interface ICompletionMessage {
    role: 'system' | 'assistant' | 'user' | 'function';
    content: string;
    reasoning_content?: string | null;
}
