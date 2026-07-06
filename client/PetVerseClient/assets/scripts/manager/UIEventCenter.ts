export class UIEventCenter {

    private static events: Map<string, Function[]> = new Map();

    static on(event: string, callback: Function) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }

        this.events.get(event)!.push(callback);
    }

    static off(event: string, callback: Function) {
        const list = this.events.get(event);

        if (!list) {
            return;
        }

        this.events.set(
            event,
            list.filter(cb => cb !== callback),
        );
    }

    static emit(event: string, data?: any) {
        const list = this.events.get(event);

        if (!list) {
            return;
        }

        for (const callback of [...list]) {
            callback(data);
        }
    }
}

export default UIEventCenter;