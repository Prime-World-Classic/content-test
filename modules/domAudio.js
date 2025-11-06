import { App } from './app.js';

export class DomAudio {
    static eventMouseOver() {
        App.error("MouseOver");
        // TODO: Audio
    }
    static eventMouseDown() {
        App.error("MouseDown");
        // TODO: Audio
    }
    static eventMouseUp() {
        App.error("MouseUp");
        // TODO: Audio
    }

    eventMouseOverCallback = null;

    eventMouseDownCallback = null;

    eventMouseUpCallback = null;

    constructor(mouseover = DomAudio.eventMouseOver, mousedown = DomAudio.eventMouseDown, mouseup = DomAudio.eventMouseUp) {

        this.eventMouseOverCallback = mouseover;

        this.eventMouseDownCallback = mousedown;

        this.eventMouseUpCallback = mouseup;

    }
}