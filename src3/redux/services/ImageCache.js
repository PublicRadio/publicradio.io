import StateService from './__State__';

export class ImageCache extends StateService {
    cache = new Map();
    load (src) {
        let img;
        if (this.cache.has(src)) {
            img = this.cache.get(src);
        } else {
            img = document.createElement('img');
            img.src = src;
            img.loadPromise = new Promise((res, rej) => {
                if (img.complete) res(img);
                else {
                    img.addEventListener('onload', () => res(img));
                    img.addEventListener('onerror', rej);
                }
            });
            this.cache.set(src, img);
        }
        this.cache.set(src, img);

        return img.loadPromise;
    }
}