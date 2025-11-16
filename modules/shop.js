import { App } from './app.js';

export class Shop {
    static categories = {
        1: 'flag',
        2: 'frame',
        3: 'skin',
    }

    static getIcon(categoryId, externalId) {
        switch (categoryId) {
            case 1:
                return Shop.getFlagIcon(externalId);
            case 2:
                return Shop.getFrameIcon(externalId);
            case 3:
                return Shop.getSkinIcon(externalId);
            default:
                App.error(`Некорректный categoryId ${categoryId} для предмета ${externalId}`);
                return [''];
        }
    }
    static getFlagIcon(externalId) {
        return [`url("content/flags/${externalId}.png")`];
    }
    static getFrameIcon(externalId) {
        let frameType_frameId = externalId.split('/');
        let frameType = Number(frameType_frameId[0]);
        let frameId = Math.max(0, Number(frameType_frameId[1]) - 1);
        return [
            `url("content/frames/${frameType + 0}.png")`,
            `url("content/frames/${frameType + 1}.png")`,
            `url("content/frames/${frameType + 2}.png")`,
            `url("content/frames/${frameType + 3}.png")`,
        ];
    }
    static getSkinIcon(externalId) {
        let heroId_skinId = externalId.split('/');
        let heroId = heroId_skinId[0];
        let skinId = heroId_skinId[1];
        return [`url("content/hero/${heroId}/${skinId}.webp")`, `url("content/hero/${heroId}/1.webp")`];
    }

    static getName(categoryId, externalId) {
        if (categoryId == 3) {
            let heroId_skinId = externalId.split('/');
            let heroId = heroId_skinId[0];
            let skinId = heroId_skinId[1];
            let name = `hero_${heroId}_skin_${skinId}_name`;
            let srcName = `hero_${heroId}_name`;
            return [name, srcName];
        }
        return [`${this.categories[categoryId]}_${externalId.replace('/', '_')}`]
    }
}