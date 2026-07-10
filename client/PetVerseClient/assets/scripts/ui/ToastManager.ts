export class ToastManager {
    private static handler: ((message: string) => void) | null = null;

    static bind(handler: (message: string) => void) {
        this.handler = handler;
    }

    static unbind(handler?: (message: string) => void) {
        if (!handler || this.handler === handler) this.handler = null;
    }

    static show(message: any) {
        const text = String(message || '操作完成');
        if (this.handler) this.handler(text);
        else console.log('[Toast]', text);
    }
}
