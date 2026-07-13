import { isMainPage, PageName } from './AppRoutes';

export class AppRouter {
    private readonly history: PageName[] = [];
    private activePage: PageName;

    constructor(initialPage: PageName = 'home') {
        this.activePage = initialPage;
    }

    get current() {
        return this.activePage;
    }

    navigate(target: PageName) {
        if (target === this.activePage) return this.activePage;

        if (isMainPage(target)) {
            this.history.length = 0;
        } else {
            this.history.push(this.activePage);
            if (this.history.length > 16) this.history.shift();
        }

        this.activePage = target;
        return this.activePage;
    }

    back(fallback: PageName = 'home') {
        const previous = this.history.pop();
        this.activePage = previous && previous !== this.activePage ? previous : fallback;
        return this.activePage;
    }

    reset(target: PageName = 'home') {
        this.history.length = 0;
        this.activePage = target;
        return this.activePage;
    }
}
