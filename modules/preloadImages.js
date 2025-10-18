

export class PreloadImages {

    static load(callback, url) {

        let preload = new Image();

        preload.src = url;

        preload.addEventListener('load', () => {

            callback();

        });

    }

    static async loadAsync(url) {

        let image = new Image();

        image.src = url;

        return new Promise((resolve, reject) => {

            image.addEventListener('load', () => {
                resolve(image);
            });

            image.addEventListener('error', (error) => reject(error));

        });

    }

    constructor(target, callback) {

        this.target = target;

        this.callback = callback;

        this.observer = new IntersectionObserver((entries) => this.preload(entries));

    }

    add(element, target) {

        element.style.opacity = 0;

        this.observer.observe(element);

        if (target) {

            target.append(element);

        }
        else {

            this.target.append(element);

        }

    }

    preload(entries) {

        for (let entry of entries) {

            if (entry.isIntersecting) {

                let preload = new Image();

                preload.src = entry.target.dataset.url;

                preload.addEventListener('load', () => {

                    entry.target.style.backgroundImage = `url("${entry.target.dataset.url}")`;

                    let animation = entry.target.animate({ opacity: [0, 1], transform: ['scale(0.9)', 'scale(1)'] }, { duration: 500, easing: 'ease-out', fill: 'forwards' });

                    if (this.callback) {

                        animation.onfinish = () => {

                            this.callback(entry.target);

                            animation.onfinish = null;

                        }

                    }

                });

                this.observer.unobserve(entry.target);

            }

        }

    }

}